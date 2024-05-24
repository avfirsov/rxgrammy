import { BaseChain } from "./BaseChain";
import { RepliesChain } from "./RepliesChain";
import {
  ContentTypeChain,
  DocumentMessagesAggregated,
  PhotoMessagesAggregated,
} from "./ContentTypeChain";
import { FetchChain } from "./FetchChain";
import { BaseMessageCtx, PhotoMessageCtx, DocumentMessageCtx } from "./tg";

export {
  BaseChain,
  RepliesChain,
  ContentTypeChain,
  DocumentMessagesAggregated,
  PhotoMessagesAggregated,
  BaseMessageCtx,
  PhotoMessageCtx,
  DocumentMessageCtx,
};

export type AllChains = "Replies" | "ContentType" | "Fetch";

export type BaseWrappedCtx = { ctx: BaseMessageCtx; text?: string };

export type WrappedStream<
  AllowedChains extends AllChains,
  T extends BaseWrappedCtx = BaseWrappedCtx,
> = BaseChain<AllowedChains, T> &
  RepliesChain<AllowedChains, T> &
  ContentTypeChain<AllowedChains, T> &
  ("ContentType" extends AllowedChains
    ? {}
    : T extends BaseWrappedCtx &
          (DocumentMessagesAggregated | PhotoMessagesAggregated)
      ? FetchChain<Exclude<AllowedChains, "ContentType">, T>
      : {});

/**
 * 1. Сейчас намоканный bot не эмитирует messages$. Вообще ни один тест не запускается. Исправь это в каждом тесте.
 * Сейчас намоканный bot не эмитирует messages$. Вообще ни один тест не выполняется. Исправь это в каждом тесте. messages$ нигде не используются.
 * 2. Также добавь тесты для чейнинга фильтров и withDocuments/withTe xtOnly/withPhotos в перемешку
 * 3. намокай fetchFileFromCtx и добавь тесты на цепочку fetch
 * 4. добавь тесты на кейс когда в цепочке withDocuments сначала приходит текстовое сообщение, а потом через 2 секунды подряд приходит три документа
 * 5. добавь тесты на кейс когда в цепочке withDocuments приходит один документ с подписью caption 6. добавь тесты когда приходит сразу несколько фотографий
 */
