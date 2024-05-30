import { AllChains, BaseWrappedCtx, WrappedStream } from "./index.js";
import {
  DocumentMessagesAggregated,
  PhotoMessagesAggregated,
} from "./ContentTypeChain.js";
import { File } from "@grammyjs/types";
import { Response } from "node-fetch";
import { Document } from "@grammyjs/types/message";
import { PhotoSize } from "grammy/out/types";

export type FetchedFile =
  | {
      data: Buffer;
      fileInfo: File;
      document: Document;
    }
  | {
      data: Buffer;
      fileInfo: File;
      photo: PhotoSize;
    };
export type FetchError = { error: Error };
export type WithFetched = {
  fetched: (FetchedFile | FetchError)[];
};

export type FetchChain<
  //Fetch chain is only available after ContentType Chain
  AllowedChains extends Exclude<AllChains, "ContentType">,
  T extends BaseWrappedCtx &
    (DocumentMessagesAggregated | PhotoMessagesAggregated),
> = "Fetch" extends AllowedChains
  ? {
      readonly fetch: WrappedStream<
        Exclude<AllowedChains, "Fetch">,
        T & WithFetched
      >;
    }
  : {};
