import { from } from "rxjs";
import { delay } from "rxjs/operators";
import { Bot } from "grammy";
import { makeGrammyReactive, Params } from "../createChain";
import { BaseMessageCtx } from "../types";
import { PartialDeep } from "type-fest";
import { PhotoSize } from "grammy/out/types";

// Mock the FIVE_MINUTES constant to 10 seconds
jest.mock("../utils/common", () => ({
  ...jest.requireActual("../utils/common"),
  FIVE_MINUTES: 10000,
}));

const mockBot = new Bot("dummy-token");

const createMockMessageCtx = (
  overrides: PartialDeep<BaseMessageCtx>,
): BaseMessageCtx =>
  ({
    message: {
      message_id: 1,
      from: { id: 1, is_bot: false, first_name: "Test" },
      chat: { id: 1, type: "private" },
      date: Math.floor(Date.now() / 1000),
      ...overrides,
    },
    update_id: 1,
    ...overrides,
  }) as BaseMessageCtx;

describe("createChain", () => {
  let params: Required<Params> & { apiToken: string };

  beforeEach(() => {
    params = { uxDebounce: 200, apiToken: "dummy-token" };
  });

  it("should filter messages that are replies", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { reply_to_message: {} } }) },
      { ctx: createMockMessageCtx({}) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).thatAreReplies;

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.reply_to_message).toBeDefined();
        done();
      },
    });

    messages$.subscribe();
  });

  it("should filter messages that are not replies", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({}) },
      { ctx: createMockMessageCtx({ message: { reply_to_message: {} } }) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).thatAreNotReplies;

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.reply_to_message).toBeUndefined();
        done();
      },
    });

    messages$.subscribe();
  });

  it("should filter messages with documents", (done) => {
    const messages$ = from([
      {
        ctx: createMockMessageCtx({
          message: { document: { file_id: "file1" } },
        }),
      },
      { ctx: createMockMessageCtx({}) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).withDocuments;

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.documents).toHaveLength(1);
        done();
      },
    });

    messages$.subscribe();
  });

  it("should filter messages with photos", (done) => {
    const messages$ = from([
      {
        ctx: createMockMessageCtx({
          message: { photo: [{ file_id: "file1" } as PhotoSize] },
        }),
      },
      { ctx: createMockMessageCtx({}) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).withPhotos;

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.photos).toHaveLength(1);
        done();
      },
    });

    messages$.subscribe();
  });

  it("should filter messages with text only", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { text: "Hello" } }) },
      {
        ctx: createMockMessageCtx({
          message: { photo: [{ file_id: "file1" } as PhotoSize] },
        }),
      },
    ]);

    const chain = makeGrammyReactive(mockBot, params).withTextOnly;

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.text).toBe("Hello");
        done();
      },
    });

    messages$.subscribe();
  });

  it("should handle delays between messages", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { text: "Hello" } }) },
      { ctx: createMockMessageCtx({ message: { text: "World" } }) },
    ]).pipe(delay(500));

    const chain = makeGrammyReactive(mockBot, params).withTextOnly;

    let count = 0;
    chain.$.subscribe({
      next: (msg) => {
        count++;
        if (count === 2) {
          done();
        }
      },
    });

    messages$.subscribe();
  });

  // New tests for filtering by user ID and chat ID
  it("should filter messages by user ID", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { from: { id: 1 } } }) },
      { ctx: createMockMessageCtx({ message: { from: { id: 2 } } }) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).from({ userIds: [1] });

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.from.id).toBe(1);
        done();
      },
    });

    messages$.subscribe();
  });

  it("should filter messages by chat ID", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { chat: { id: 1 } } }) },
      { ctx: createMockMessageCtx({ message: { chat: { id: 2 } } }) },
    ]);

    const chain = makeGrammyReactive(mockBot, params).from({ chatIds: [1] });

    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.chat.id).toBe(1);
        done();
      },
    });

    messages$.subscribe();
  });

  // New tests for chaining filters
  it("should chain filters correctly", (done) => {
    const messages$ = from([
      { ctx: createMockMessageCtx({ message: { from: { id: 1 }, chat: { id: 1 }, text: "Hello" } }) },
      { ctx: createMockMessageCtx({ message: { from: { id: 2 }, chat: { id: 1 }, text: "World" } }) },
      { ctx: createMockMessageCtx({ message: { from: { id: 1 }, chat: { id: 2 }, text: "Hello" } }) },
      { ctx: createMockMessageCtx({ message: { from: { id: 2 }, chat: { id: 2 }, text: "World" } }) },
    ]);

    const chain = makeGrammyReactive(mockBot, params)
      .from({ userIds: [1] })
      .from({ chatIds: [1] })
      .withTextOnly;

    const expectedMessages = [
      { ctx: createMockMessageCtx({ message: { from: { id: 1 }, chat: { id: 1 }, text: "Hello" } }) },
    ];

    let count = 0;
    chain.$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.from.id).toBe(expectedMessages[count].ctx.message.from.id);
        expect(msg.ctx.message.chat.id).toBe(expectedMessages[count].ctx.message.chat.id);
        expect(msg.ctx.message.text).toBe(expectedMessages[count].ctx.message.text);
        count++;
        if (count === expectedMessages.length) {
          done();
        }
      },
    });

    messages$.subscribe();
  });
});
