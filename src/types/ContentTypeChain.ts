import { AllChains, BaseWrappedCtx, WrappedStream } from "./index.js";
import { BaseMessageCtx, DocumentMessageCtx, PhotoMessageCtx } from "./tg.js";
import { PhotoSize } from "grammy/out/types";
import { Document } from "@grammyjs/types/message";

export type PhotoMessagesAggregated = {
  photosCtxs: PhotoMessageCtx[];
  caption: string;
  photos: PhotoSize[];
};
export type DocumentMessagesAggregated = {
  //ctx of text message prepending a batch of docs
  //but if only one doc was sent, the text content is embedded within it and no prepending text message is sent
  textCtx: BaseMessageCtx | null;
  documentCtxs: DocumentMessageCtx[];
  documents: Document[];
};

export type ContentTypeChain<
  AllowedChains extends AllChains,
  T extends BaseWrappedCtx = BaseWrappedCtx,
> = "ContentType" extends AllowedChains
  ? {
      //applying ContentType filter is one-way road
      readonly withDocuments: WrappedStream<
        Exclude<AllowedChains, "ContentType"> | "Fetch",
        T & DocumentMessagesAggregated
      >;
      readonly withPhotos: WrappedStream<
        Exclude<AllowedChains, "ContentType"> | "Fetch",
        T & PhotoMessagesAggregated
      >;
      readonly withTextOnly: WrappedStream<
        Exclude<AllowedChains, "ContentType">,
        T
      >;
    }
  : {};
