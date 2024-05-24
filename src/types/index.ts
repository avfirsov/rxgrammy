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