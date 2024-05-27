import { FilterOptions } from "./types/BaseChain.js";
import {
  combineLatest,
  debounceTime,
  filter,
  first,
  from,
  fromEventPattern,
  groupBy,
  GroupedObservable,
  map,
  merge,
  mergeMap,
  Observable,
  share,
  startWith,
  takeUntil,
} from "rxjs";
import {
  AllChains,
  BaseMessageCtx,
  BaseWrappedCtx,
  DocumentMessageCtx,
  DocumentMessagesAggregated,
  PhotoMessageCtx,
  PhotoMessagesAggregated,
  WrappedStream,
} from "./types";
import {
  dropChain,
  FIVE_MINUTES,
  isNotUndefined,
  not,
} from "./utils/common.js";
import { Api, Bot, Context, RawApi } from "grammy";
import {
  ctxHasDocument,
  ctxHasPhoto,
  ctxHasTextOnly,
  fetchFileFromCtx,
  getMediaGroupIdFromWrapppedCtx,
  getUserChatKeyByWrappedCtx,
  isReplyMessage,
  pluckCtx,
} from "./utils/tg.js";
import { take, toArray } from "rxjs/operators";
import { WithFetched } from "./types/FetchChain.js";

export const createChain = <
  T extends BaseWrappedCtx,
  AllowedChainsTup extends AllChains[],
>(
  $: Observable<T>,
  allowedChains: AllowedChainsTup,
  params: Required<Params> & { apiToken: string },
): WrappedStream<AllowedChainsTup[number], T> => {
  const self = {
    $,
    notFrom(
      filterOpts: FilterOptions,
    ): WrappedStream<AllowedChainsTup[number], T> {
      const filtered = self.$.pipe(
        filter(({ ctx }) => {
          if (
            "userIds" in filterOpts &&
            filterOpts.userIds.includes(ctx.message.from.id)
          ) {
            return false;
          }

          if (
            "chatIds" in filterOpts &&
            filterOpts.chatIds.includes(ctx.message.chat.id)
          ) {
            return false;
          }

          return true;
        }),
      );

      return createChain(filtered, allowedChains, params);
    },
    from(
      filterOpts: FilterOptions,
    ): WrappedStream<AllowedChainsTup[number], T> {
      const filtered = self.$.pipe(
        filter(({ ctx }) => {
          if (
            "userIds" in filterOpts &&
            !filterOpts.userIds.includes(ctx.message.from.id)
          ) {
            return false;
          }

          if (
            "chatIds" in filterOpts &&
            !filterOpts.chatIds.includes(ctx.message.chat.id)
          ) {
            return false;
          }

          return true;
        }),
      );

      return createChain(filtered, allowedChains, params);
    },
  };

  if (allowedChains.includes("Replies")) {
    Object.defineProperties(self, {
      thatAreReplies: {
        get(): WrappedStream<Exclude<AllowedChainsTup[number], "Replies">, T> {
          const $: Observable<T> = self.$.pipe(
            filter(pluckCtx(isReplyMessage)),
          ) as Observable<T>;

          return createChain($, dropChain(allowedChains, "Replies"), params);
        },
      },
      thatAreNotReplies: {
        get(): WrappedStream<Exclude<AllowedChainsTup[number], "Replies">, T> {
          const $: Observable<T> = self.$.pipe(
            filter(pluckCtx(not(isReplyMessage))),
          ) as Observable<T>;
          return createChain($, dropChain(allowedChains, "Replies"), params);
        },
      },
    });
  }

  if (allowedChains.includes("ContentType")) {
    const selfTyped = self as unknown as WrappedStream<"ContentType", T>;

    const sameUserSameChatMessagesWithMedia$$: Observable<
      GroupedObservable<string, T>
    > = selfTyped.$.pipe(
      //берем только сообщения с медиа
      filter(({ ctx }) => !!ctx.message.media_group_id),
      groupBy<T, string>(getUserChatKeyByWrappedCtx, {
        duration: (sameUserSameChatMessages$) =>
          //если от юзера нет сообщений в течение 5 минут, закрываем поток
          sameUserSameChatMessages$.pipe(debounceTime(FIVE_MINUTES), take(1)),
      }),
    );

    const sameMediaGroupMessages$$ = sameUserSameChatMessagesWithMedia$$.pipe(
      mergeMap((sameUserSameChatMessagesWithSameMediaGroup$) =>
        sameUserSameChatMessagesWithSameMediaGroup$.pipe(
          //TODO: проверить, что у одиночных документов тоже создается медиа-группа
          groupBy<T, string>(
            (wrappedCtx) =>
              `${getUserChatKeyByWrappedCtx(wrappedCtx)}_${getMediaGroupIdFromWrapppedCtx(wrappedCtx)}`,
            {
              duration: (sameUserSameChatMessagesSameMediaGroup$) =>
                //ожидаем поступления сообщений в группу в течение 5 минут
                sameUserSameChatMessagesSameMediaGroup$.pipe(
                  debounceTime(FIVE_MINUTES),
                  take(1),
                ),
            },
          ),
        ),
      ),
    );

    Object.defineProperties(self, {
      withDocuments: {
        get(): WrappedStream<
          Exclude<AllowedChainsTup[number], "ContentType"> | "Fetch",
          T & DocumentMessagesAggregated
        > {
          const docMessagesBatches$ = merge(
            sameMediaGroupMessages$$.pipe(
              mergeMap((sameMediaGroupMessages$) =>
                sameMediaGroupMessages$.pipe(
                  first(),
                  filter(
                    //сообщения в группах документов начинаются либо с сообщения с ctx.message.document, либо с текстовой подписи - простого сообщения
                    //TODO: абстрагировать фильтр
                    ({ ctx }) => !!ctx.message.document || !!ctx.message.text,
                  ),
                  map((payload) =>
                    sameMediaGroupMessages$.pipe(startWith(payload)),
                  ),
                ),
              ),
              mergeMap((sameMediaGroupDocumentMessages$) =>
                sameMediaGroupDocumentMessages$.pipe(
                  //закрываем стрим пачки документов если не приходили новые документы в течение uxDebounce
                  takeUntil(
                    sameMediaGroupDocumentMessages$.pipe(
                      //TODO: абстрагировать условие
                      filter(pluckCtx(ctxHasDocument)),
                      debounceTime(params.uxDebounce),
                    ),
                  ),
                  toArray(),
                ),
              ),
            ),
            //TODO: abstract away
            selfTyped.$.pipe(
              filter(
                ({ ctx }) =>
                  !ctx.message.media_group_id && !!ctx.message.document,
              ),
              map((payload) => [payload]),
            ),
          );

          const $: Observable<T & DocumentMessagesAggregated> = combineLatest([
            //на всякий случай комбайним с последним ТЕКСТОВЫМ сообщением, потому что если отправлялась группа документов
            //с подписью, подпись будет отправлена текстовым сообщением перед группой И НЕ ВОЙДЕТ В ГРУППУ media_group_id - хз почему так апи телеграмма сделано
            selfTyped.withTextOnly.$.pipe(startWith(null)),
            docMessagesBatches$,
          ]).pipe(
            map(([textCtx, batch]) =>
              textCtx === null
                ? batch
                : batch.length
                  ? [textCtx, ...batch]
                  : batch,
            ),
            map((payloads: T[]) => ({
              ...(payloads[0] as T),
              //если в первом сообщении нет документа - это текстовая аннотация - мы добавляем ее в начало массива
              textCtx: !payloads[0].ctx.message.document
                ? payloads[0].ctx
                : null,
              documentCtxs: payloads
                .filter(pluckCtx(ctxHasDocument))
                .map(({ ctx }) => ctx as DocumentMessageCtx),
              documents: payloads
                .map(({ ctx }) => ctx.message.document)
                .filter(isNotUndefined),
              //если отправляют один документ, то текст записывается в нем как caption. Иначе, если документов больше - отправляется
              //предшествующим текстовым сообщением и мы добавляем его в начало массива
              text:
                payloads[0].ctx.message.text ??
                payloads[0].ctx.message.caption ??
                "",
            })),
          );

          return createChain(
            $,
            [...dropChain(allowedChains, "ContentType"), "Fetch"],
            params,
          );
        },
      },
      withPhotos: {
        get(): WrappedStream<
          Exclude<AllowedChainsTup[number], "ContentType"> | "Fetch",
          T & PhotoMessagesAggregated
        > {
          const photoMessagesBatches$ = merge(
            sameMediaGroupMessages$$.pipe(
              mergeMap((sameMediaGroupMessages$) =>
                sameMediaGroupMessages$.pipe(
                  first(),
                  filter(({ ctx }) => !!ctx.message.photo),
                  map((payload) =>
                    sameMediaGroupMessages$.pipe(startWith(payload)),
                  ),
                ),
              ),
              mergeMap((sameMediaGroupPhotoMessages$) =>
                sameMediaGroupPhotoMessages$.pipe(
                  //закрываем стрим пачки фоток если не приходили новые документы в течение uxDebounce
                  takeUntil(
                    sameMediaGroupPhotoMessages$.pipe(
                      debounceTime(params.uxDebounce),
                    ),
                  ),
                  toArray(),
                ),
              ),
            ),
            selfTyped.$.pipe(
              filter(
                ({ ctx }) => !ctx.message.media_group_id && !!ctx.message.photo,
              ),
              map((payload) => [payload]),
            ),
          );

          const $: Observable<T & PhotoMessagesAggregated> =
            photoMessagesBatches$.pipe(
              map((payloads: T[]) => ({
                ...(payloads[0] as T),
                photosCtxs: payloads
                  .filter(pluckCtx(ctxHasPhoto))
                  .map(({ ctx }) => ctx as PhotoMessageCtx),
                photos: payloads
                  .filter(pluckCtx(ctxHasPhoto))
                  .map(
                    ({ ctx }) =>
                      ctx.message.photo?.[ctx.message.photo?.length - 1],
                  )
                  .filter(isNotUndefined),
                caption:
                  payloads[0].ctx.message.caption ??
                  payloads[0].ctx.message.text ??
                  "",
              })),
            );

          return createChain(
            $,
            [...dropChain(allowedChains, "ContentType"), "Fetch"],
            params,
          );
        },
      },
      withTextOnly: {
        get(): WrappedStream<
          Exclude<AllowedChainsTup[number], "ContentType">,
          T
        > {
          const $: Observable<T> = selfTyped.$.pipe(
            //берем только сообщения с медиа
            filter<T>(pluckCtx(ctxHasTextOnly)),
          );

          return createChain(
            $,
            dropChain(allowedChains, "ContentType"),
            params,
          );
        },
      },
    });
  }

  if (allowedChains.includes("Fetch")) {
    const selfTyped = self as unknown as WrappedStream<
      "Fetch",
      BaseWrappedCtx & (DocumentMessagesAggregated | PhotoMessagesAggregated)
    >;

    Object.defineProperties(self, {
      fetch: {
        get(): WrappedStream<
          Exclude<AllowedChainsTup[number], "Fetch">,
          T & WithFetched
        > {
          const $: Observable<T & WithFetched> = selfTyped.$.pipe(
            map(async (payload) => {
              const toFetch =
                "documentCtxs" in payload
                  ? payload.documentCtxs
                  : "photosCtxs" in payload
                    ? payload.photosCtxs
                    : [];

              const fetchedWrapped = await Promise.allSettled(
                toFetch.map(fetchFileFromCtx),
              );

              const fetched = fetchedWrapped
                .map((wrapped) => {
                  if ("value" in wrapped) {
                    return wrapped.value;
                  }

                  if ("reason" in wrapped) {
                    return { error: wrapped.reason };
                  }
                })
                .filter(isNotUndefined);

              return {
                ...payload,
                fetched,
              };
            }),
            mergeMap((promise) => from(promise)),
          ) as unknown as Observable<T & WithFetched>;

          return createChain($, dropChain(allowedChains, "Fetch"), params);
        },
      },
    });
  }

  return self as WrappedStream<AllowedChainsTup[number], T>;
};

export type Params = {
  //max delay between messages in batch
  //default is 200ms
  uxDebounce?: number;
};

export const makeGrammyReactive = (
  bot: Bot<Context, Api<RawApi>>,
  params?: Params,
): WrappedStream<"Replies" | "ContentType"> => {
  const messages$ = fromEventPattern<{ ctx: BaseMessageCtx }>((handler) =>
    bot.on("message", async (ctx, next) => {
      await handler({ ctx });
      return next();
    }),
  ).pipe(share());

  return createChain(messages$, ["Replies", "ContentType"], {
    uxDebounce: params?.uxDebounce ?? 200,
    apiToken: bot.token,
  });
};
