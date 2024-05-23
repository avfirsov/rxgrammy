import { FilterOptions } from "./types/BaseChain";
import {
  debounceTime,
  filter,
  first,
  from,
  fromEventPattern,
  groupBy,
  GroupedObservable,
  map,
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
import { dropChain, FIVE_MINUTES, isNotUndefined, not } from "./utils/common";
import { Bot } from "grammy";
import {
  ctxHasDocument,
  ctxHasPhoto,
  ctxHasTextOnly,
  fetchFileFromCtx,
  getMediaGroupIdFromWrapppedCtx,
  getUserChatKeyByWrappedCtx,
  isReplyMessage,
  pluckCtx,
} from "./utils/tg";
import { take, toArray } from "rxjs/operators";
import { WithFetched } from "./types/FetchChain";

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
          const userId = ctx.message.from.id;

          if ("userIds" in filterOpts && filterOpts.userIds.includes(userId)) {
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
          const userId = ctx.message.from.id;

          if ("userIds" in filterOpts && !filterOpts.userIds.includes(userId)) {
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
          groupBy<T, string>(getMediaGroupIdFromWrapppedCtx, {
            duration: (sameUserSameChatMessagesSameMediaGroup$) =>
              //ожидаем поступления сообщений в группу в течение 5 минут
              sameUserSameChatMessagesSameMediaGroup$.pipe(
                debounceTime(FIVE_MINUTES),
                take(1),
              ),
          }),
        ),
      ),
    );

    Object.defineProperties(self, {
      withDocuments: {
        get(): WrappedStream<
          Exclude<AllowedChainsTup[number], "ContentType"> | "Fetch",
          T & DocumentMessagesAggregated
        > {
          const docMessagesBatches$ = sameMediaGroupMessages$$.pipe(
            mergeMap((sameMediaGroupMessages$) =>
              sameMediaGroupMessages$.pipe(
                first(),
                filter(
                  //сообщения в группах документов начинаются либо с сообщения с ctx.message.document, либо с текстовой подписи - простого сообщения
                  //TODO: проверить это утверждение
                  //TODO: абстрагировать фильтр
                  //TODO: проверить будет ли везде reply_message
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
          );

          const $: Observable<T & DocumentMessagesAggregated> =
            docMessagesBatches$.pipe(
              map((payloads: T[]) => ({
                ...(payloads[0] as T),
                //если в первом сообщении нет документа - это текстовая аннотация
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
                //предшествующим текстовым сообщением
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
          const photoMessagesBatches$ = sameMediaGroupMessages$$.pipe(
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
                    ({ ctx }) => ctx.message.photo?.[ctx.message.photo?.length],
                  )
                  .filter(isNotUndefined),
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
  bot: Bot,
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
