import { Api, Bot, Context, RawApi } from "grammy";
import { makeGrammyReactive, Params } from "../createChain";
import { BaseMessageCtx } from "../types";
import { PartialDeep } from "type-fest";
import { PhotoSize, Update } from "grammy/out/types";
import { FetchedFile } from "../types/FetchChain";
import objectContaining = jasmine.objectContaining;

// Mock the fetchFileFromCtx function
jest.mock("../utils/tg", () => ({
  ...jest.requireActual("../utils/tg"),
  fetchFileFromCtx: jest
    .fn()
    .mockResolvedValue({ data: "file-data", fileInfo: { file_id: "file-id" } }),
}));

const createMockBot = (): Bot<Context, Api<RawApi>> & {
  next(ctx: Context): Promise<void>;
} => {
  const _mockBot = {
    $handlers: [] as ((ctx: Context, nextFn: () => any) => Promise<void>)[],
    on(
      type: string,
      handler: (ctx: Context, nextFn: () => any) => Promise<void>,
    ) {
      _mockBot.$handlers.push(handler);
    },
    async next(ctx: BaseMessageCtx) {
      for (const handler of _mockBot.$handlers) {
        await handler(ctx, () => 42);
      }
    },
  } as const;

  return _mockBot as unknown as Bot<Context, Api<RawApi>> & {
    next(ctx: Context): Promise<void>;
  };
};

let mockBot: Bot<Context, Api<RawApi>> & {
  next(ctx: Context): Promise<void>;
} = createMockBot();

const createMockMessageCtx = (
  overrides: PartialDeep<BaseMessageCtx>,
  options?: {
    mediaType?: "document" | "photo";
    chatId?: number;
    userId?: number;
    text?: string;
    mediaGroupId?: string;
    fileIds?: string[];
  },
): BaseMessageCtx => {
  const {
    mediaType,
    chatId = 1,
    userId = 1,
    text = "",
    mediaGroupId,
    fileIds = [],
  } = options || {};

  let media = {};
  if (mediaType) {
    if (!mediaGroupId) {
      throw new Error("media_group_id is required when mediaType is specified");
    }
    if (mediaType === "document" && fileIds.length) {
      media = { document: { file_id: fileIds[0] } };
    } else if (mediaType === "photo") {
      media = { photo: fileIds.map((file_id) => ({ file_id })) };
    }
  }

  return {
    ...overrides,
    chat: { id: chatId, type: "private", ...(overrides.message?.chat || {}) },
    message: {
      message_id: 1,
      from: { id: userId, is_bot: false, first_name: "Test" },
      chat: { id: chatId, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text,
      media_group_id: mediaGroupId,
      ...media,
      ...overrides.message,
    },
    update_id: 1,
  } as BaseMessageCtx;
};

describe("createChain", () => {
  let params: Required<Params> & { apiToken: string };

  beforeEach(() => {
    params = { uxDebounce: 200, apiToken: "dummy-token" };
    mockBot = createMockBot();
  });

  it("should filter messages that are replies", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).thatAreReplies.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.reply_to_message).toBeDefined();
        done();
      },
    });

    mockBot.next(createMockMessageCtx({ message: { reply_to_message: {} } }));
    mockBot.next(createMockMessageCtx({}));
  });

  it("should filter messages that are not replies", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).thatAreNotReplies.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.reply_to_message).toBeUndefined();
        done();
      },
    });

    mockBot.next(createMockMessageCtx({}));
    mockBot.next(createMockMessageCtx({ message: { reply_to_message: {} } }));
  });

  it("should filter messages with documents", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withDocuments.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.documents).toHaveLength(1);
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "document", mediaGroupId: "group1", fileIds: ["file1"] },
      ),
    );
    mockBot.next(createMockMessageCtx({}));
  });

  it("should filter messages with photos", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withPhotos.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.photos).toHaveLength(1);
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "photo", mediaGroupId: "group1", fileIds: ["file1"] },
      ),
    );
    mockBot.next(createMockMessageCtx({}));
  });

  it("should filter messages with text only", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withTextOnly.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.text).toBe("Hello");
        done();
      },
    });

    mockBot.next(createMockMessageCtx({ message: { text: "Hello" } }));
    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "photo", mediaGroupId: "group1", fileIds: ["file1"] },
      ),
    );
  });

  it("should handle delays between messages", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withTextOnly.$;

    let count = 0;
    messages$.subscribe({
      next: (msg) => {
        count++;
        if (count === 2) {
          done();
        }
      },
    });

    mockBot.next(createMockMessageCtx({ message: { text: "Hello" } }));
    setTimeout(() => {
      mockBot.next(createMockMessageCtx({ message: { text: "World" } }));
    }, 500);
  });

  // New tests for filtering by user ID and chat ID
  it("should filter messages by user ID", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).from({
      userIds: [1],
    }).$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.from.id).toBe(1);
        done();
      },
    });

    mockBot.next(createMockMessageCtx({ message: { from: { id: 1 } } }));
    mockBot.next(createMockMessageCtx({ message: { from: { id: 2 } } }));
  });

  it("should filter messages by chat ID", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).from({
      chatIds: [1],
    }).$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.chat.id).toBe(1);
        done();
      },
    });

    mockBot.next(createMockMessageCtx({ message: { chat: { id: 1 } } }));
    mockBot.next(createMockMessageCtx({ message: { chat: { id: 2 } } }));
  });

  // New tests for chaining filters
  it("should chain filters correctly", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params)
      .from({ userIds: [1] })
      .from({ chatIds: [1] }).withTextOnly.$;

    const expectedMessages = [
      {
        ctx: createMockMessageCtx({
          message: { from: { id: 1 }, chat: { id: 1 }, text: "Hello" },
        }),
      },
    ];

    let count = 0;
    messages$.subscribe({
      next: (msg) => {
        expect(msg.ctx.message.from.id).toBe(
          expectedMessages[count].ctx.message.from.id,
        );
        expect(msg.ctx.message.chat.id).toBe(
          expectedMessages[count].ctx.message.chat.id,
        );
        expect(msg.ctx.message.text).toBe(
          expectedMessages[count].ctx.message.text,
        );
        count++;
        if (count === expectedMessages.length) {
          done();
        }
      },
    });

    mockBot.next(
      createMockMessageCtx({
        message: { from: { id: 1 }, chat: { id: 1 }, text: "Hello" },
      }),
    );
    mockBot.next(
      createMockMessageCtx({
        message: { from: { id: 2 }, chat: { id: 1 }, text: "World" },
      }),
    );
    mockBot.next(
      createMockMessageCtx({
        message: { from: { id: 1 }, chat: { id: 2 }, text: "Hello" },
      }),
    );
    mockBot.next(
      createMockMessageCtx({
        message: { from: { id: 2 }, chat: { id: 2 }, text: "World" },
      }),
    );
  });

  // New tests for fetch chain
  it("should fetch files correctly", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withDocuments.fetch.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.fetched).toHaveLength(1);
        expect((msg.fetched[0] as FetchedFile).data).toBe("file-data");
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "document", mediaGroupId: "group1", fileIds: ["file1"] },
      ),
    );
  });

  // Test for receiving a text message followed by documents
  it("should handle text message followed by documents", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withDocuments.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.documents).toHaveLength(3);
        expect(msg.textCtx?.message.text).toBe("Annotation");
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        { message: { text: "Annotation" } },
        { mediaType: "document", mediaGroupId: "group1" },
      ),
    );
    setTimeout(() => {
      mockBot.next(
        createMockMessageCtx(
          {},
          { mediaType: "document", mediaGroupId: "group1", fileIds: ["file1"] },
        ),
      );
      mockBot.next(
        createMockMessageCtx(
          {},
          { mediaType: "document", mediaGroupId: "group1", fileIds: ["file2"] },
        ),
      );
      mockBot.next(
        createMockMessageCtx(
          {},
          { mediaType: "document", mediaGroupId: "group1", fileIds: ["file3"] },
        ),
      );
    }, 2000);
  });

  // Test for receiving a single document with a caption
  it("should handle single document with caption", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withDocuments.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.documents).toHaveLength(1);
        expect(msg.text).toBe("Caption");
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        {},
        {
          mediaType: "document",
          mediaGroupId: "group1",
          fileIds: ["file1"],
          text: "Caption",
        },
      ),
    );
  });

  // Test for receiving multiple photos
  it("should handle multiple photos", (done) => {
    const messages$ = makeGrammyReactive(mockBot, params).withPhotos.$;

    messages$.subscribe({
      next: (msg) => {
        expect(msg.photos).toHaveLength(2);
        done();
      },
    });

    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "photo", mediaGroupId: "group1", fileIds: ["file1"] },
      ),
    );
    mockBot.next(
      createMockMessageCtx(
        {},
        { mediaType: "photo", mediaGroupId: "group1", fileIds: ["file2"] },
      ),
    );
  });
});
