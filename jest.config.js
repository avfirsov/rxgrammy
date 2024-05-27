import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  preset: "ts-jest/presets/default-esm",
  globals: {
    "ts-jest": {
      useESM: true,
      tsconfig: "tsconfig.json",
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.[tj]sx?$": [
      "babel-jest",
      { configFile: resolve(__dirname, "babel.config.cjs") },
    ], // Обновляем путь к Babel конфигурации
  },
  extensionsToTreatAsEsm: [".ts"],
  transformIgnorePatterns: [
    // "/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob)/)", // Указываем, чтобы не игнорировать node-fetch
    // "/node_modules/**",
  ],
  roots: ["<rootDir>"],
  modulePaths: ["<rootDir>"],
  moduleDirectories: ["node_modules"],
};
