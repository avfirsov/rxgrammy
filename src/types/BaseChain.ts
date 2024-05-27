import { Observable } from "rxjs";
import { AllChains, BaseWrappedCtx, WrappedStream } from "./index.js";

export type FilterOptions =
  | {
      userIds: number[];
    }
  | {
      chatIds: number[];
    };

export type BaseChain<
  AllowedChains extends AllChains,
  T extends BaseWrappedCtx = BaseWrappedCtx,
> = {
  $: Observable<T>;
  notFrom(filterOpts: FilterOptions): WrappedStream<AllowedChains, T>;
  from(filterOpts: FilterOptions): WrappedStream<AllowedChains, T>;
};
