import { AllChains, BaseWrappedCtx, WrappedStream } from "./index.js";

export type RepliesChain<
  AllowedChains extends AllChains,
  T extends BaseWrappedCtx = BaseWrappedCtx,
> = "Replies" extends AllowedChains
  ? {
      //applying Replies filter is one-way road
      readonly thatAreReplies: WrappedStream<
        Exclude<AllowedChains, "Replies">,
        T
      >;
      readonly thatAreNotReplies: WrappedStream<
        Exclude<AllowedChains, "Replies">,
        T
      >;
    }
  : {};
