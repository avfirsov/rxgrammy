import { BaseChain } from "./BaseChain.js";
import { RepliesChain } from "./RepliesChain.js";
import {
  ContentTypeChain,
  DocumentMessagesAggregated,
  PhotoMessagesAggregated,
} from "./ContentTypeChain.js";
import { FetchChain, FetchError, FetchedFile } from "./FetchChain.js";
import { BaseMessageCtx, PhotoMessageCtx, DocumentMessageCtx } from "./tg.js";

export {
  BaseChain,
  RepliesChain,
  ContentTypeChain,
  DocumentMessagesAggregated,
  PhotoMessagesAggregated,
  BaseMessageCtx,
  PhotoMessageCtx,
  DocumentMessageCtx,
  FetchError,
  FetchedFile,
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
