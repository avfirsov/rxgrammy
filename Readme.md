# RxGrammy

## Описание проекта

RxGrammy - это обертка вокруг библиотеки Grammy, использующая RxJS для работы с потоками сообщений в Telegram. Проект позволяет легко обрабатывать группы сообщений, фильтровать их по различным условиям и загружать медиафайлы.

## Преимущества

- Удобная работа с группами сообщений (документы, фотографии).
- Возможность фильтрации сообщений по различным условиям.
- Автоматическая загрузка медиафайлов.
- Использование RxJS для реактивного программирования.

## Возможности

- Фильтрация сообщений по пользователям и чатам.
- Обработка сообщений, содержащих документы и фотографии.
- Автоматическая загрузка медиафайлов из сообщений.
- Многоуровневая фильтрация потоков сообщений.

## Примеры использования

### Основное использование

```typescript
import { Bot } from "grammy";
import { makeGrammyReactive } from "./src/createChain";

const bot = new Bot("YOUR_BOT_TOKEN");
const reactiveBot = makeGrammyReactive(bot);

reactiveBot.from({ userIds: [123456789] }).$.subscribe(({ ctx }) => {
  console.log("Сообщен ие от пользователя 123456789:", ctx.message);
});
reactiveBot.withDocuments.$.subscribe(({ ctx, text }) => {
  console.log("Докумен ты:", ctx.message.document, "Текст:", text);
});
reactiveBot.withPhotos.$.subscribe(({ ctx, caption }) => {
  console.log("Фотогра фии:", ctx.message.photo, "Подпись:", caption);
});
reactiveBot.withTextOnly.$.subscribe(({ ctx }) => {
  console.log("Текстов ое сообщение:", ctx.message.text);
});

bot.start();
```

### Сложные примеры использования

#### Многоуровневая фильтрация

```typescript
import { Bot } from "grammy";
import { makeGrammyReactive } from "./src/createChain";

const bot = new Bot("YOUR_BOT_TOKEN");
const reactiveBot = makeGrammyReactive(bot);

// Фильтрация сообщений от пользователя 123456789 в чате 987654321, содержащих только текст
reactiveBot
  .from({ userIds: [123456789] })
  .from({ chatIds: [987654321] })
  .withTextOnly.$.subscribe(({ ctx }) => {
    console.log(
      "Текстов ое сообщение от пользователя 123456789 в чате 987654321:",
      ctx.message.text,
    );
  });

// Фильтрация сообщений с документами, не от пользователя 123456789, которые являются ответами
reactiveBot.withDocuments
  .notFrom({ userIds: [123456789] })
  .thatAreReplies.$.subscribe(({ ctx }) => {
    console.log(
      "Докумен т в ответе, не от пользователя 123456789:",
      ctx.message.document,
    );
  });

// Фильтрация сообщений с фотографиями, не являющихся ответами, и загрузка файлов
reactiveBot.withPhotos.thatAreNotReplies.fetch.$.subscribe(
  ({ ctx, fetched }) => {
    console.log(
      "Фотографии, не являющиеся ответами, загруженные файлы:",
      fetched,
    );
  },
);

bot.start();
```

## Установка

npm install rxgrammy

## Запуск тестов

npm run test

# Лицензия

Проект распространяется под лицензией MIT.
