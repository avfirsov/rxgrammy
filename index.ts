import { makeGrammyReactive } from "./src/createChain";
import { Bot } from "grammy";

export * from "./src/types";

export {
  makeGrammyReactive,
  type Params,
  createChain,
} from "./src/createChain";

const bot = new Bot("7166306607:AAHGUhhOuIl2nHWMZNzMCz0RL4D2q6HQh-A");
const test = makeGrammyReactive(bot);

test.from({ userIds: [224132761] }).$.subscribe(({ ctx }) => {
  console.log("from userId=224132761", JSON.stringify(ctx.message));
  console.warn("ctx.message.media_group_id", ctx.message.media_group_id);
});

test.withDocuments.$.subscribe(({ ctx, text }) => {
  console.log("=>(index.ts:21) withDocuments.text", text);
});

test.withPhotos.$.subscribe(({ ctx, caption }) => {
  console.log("=>(index.ts:21) withPhotos.caption", caption);
});

test.withTextOnly.$.subscribe(({ ctx }) => {
  console.log("=>(index.ts:21) withTextOnly.text", ctx.message.text);
});

bot.start();
