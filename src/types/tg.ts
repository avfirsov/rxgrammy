import { Context, Filter } from "grammy";

export type BaseMessageCtx = Filter<Context, "message">;
export type PhotoMessageCtx = Filter<Context, "message:photo">;
export type DocumentMessageCtx = Filter<Context, "message:document">;
