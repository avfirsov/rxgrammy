import { Context, Filter } from "grammy";
import { BaseWrappedCtx } from "../types";
import { FetchedFile } from "../types/FetchChain";
import {
  BaseMessageCtx,
  DocumentMessageCtx,
  PhotoMessageCtx,
} from "../types/tg";

type WithoutArgReturnType<T extends Context> = {
  (wrapped: { ctx: T }): T;
};
type WithPredicateReturnType<T extends Context> = {
  (wrapped: { ctx: T }): boolean;
};
type WithTypeGuardReturnType<T extends Context, R extends T> = {
  (wrapped: { ctx: T }): wrapped is { ctx: R };
};

export function pluckCtx<T extends Context>(): WithoutArgReturnType<T>;
export function pluckCtx<T extends Context, R extends T>(
  p: (ctx: T) => ctx is R,
): WithTypeGuardReturnType<T, R>;
export function pluckCtx<T extends Context>(
  p: (ctx: T) => boolean,
): WithPredicateReturnType<T>;
export function pluckCtx<T extends Context, R extends T>(
  p?: ((ctx: T) => ctx is R) | ((ctx: T) => boolean),
):
  | WithPredicateReturnType<T>
  | WithTypeGuardReturnType<T, R>
  | WithTypeGuardReturnType<T, R> {
  return function (wrapped: { ctx: T }) {
    if (typeof p === "undefined") {
      return wrapped.ctx;
    }

    return p(wrapped.ctx);
  } as
    | WithPredicateReturnType<T>
    | WithTypeGuardReturnType<T, R>
    | WithTypeGuardReturnType<T, R>;
}

export const ctxHasPhoto = (ctx: BaseMessageCtx): boolean =>
  !!ctx.message.photo;
export const ctxHasDocument = (
  ctx: BaseMessageCtx,
): boolean => !!ctx.message.document;
export const ctxHasTextOnly = (ctx: BaseMessageCtx): boolean =>
  !ctxHasPhoto(ctx) && !ctxHasDocument(ctx);
export const isReplyMessage = (ctx: BaseMessageCtx): boolean =>
  !!ctx.message.reply_to_message;
export const getUserChatKeyByWrappedCtx = ({ ctx }: BaseWrappedCtx): string =>
  `${ctx.chat.id}-${ctx.message.message_id}`;
export const getMediaGroupIdFromWrapppedCtx = ({
  ctx,
}: BaseWrappedCtx): string => ctx.message.media_group_id!;

export const fetchFileFromCtx = async (
  ctx: DocumentMessageCtx | PhotoMessageCtx,
): Promise<FetchedFile | void> => {
  // Получаем объект файла
  const file =
    ctx.message?.document || ctx.message?.photo?.[ctx.message.photo.length - 1];
  console.log("=>(tg.ts:37) file", file);
  console.log("=>(tg.ts:38) file.file_id", file?.file_id);

  if (!file || !file.file_id) {
    throw new Error("Файл не найден");
  }

  try {
    // Получаем путь к файлу через Telegram API
    const fileInfo = await ctx.api.getFile(file.file_id);
    const fileUrl = getFileUrl(fileInfo.file_path || "");
    const data = await fetch(fileUrl);
    console.log("=>(tg.ts:193) data", data);

    return {
      data,
      fileInfo,
    };
  } catch (error) {
    console.error("Ошибка при получении файла:", error);
    await ctx.reply("Не удалось получить файл.");
  }
};

export const getFileUrl = (file_path: string): string =>
  `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file_path}`;
