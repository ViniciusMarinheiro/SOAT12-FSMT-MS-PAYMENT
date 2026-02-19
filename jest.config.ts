import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleFileExtensions: ["ts", "js", "json"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.e2e-spec.ts",
    "!src/__tests__/**/*",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    ".module.ts$",
    ".dto.ts$",
    "main.ts$",
    ".interface.ts$",
    "index.ts$",
    "src/common/decorators",
    "src/common/log/",
    "src/common/strategies/",
    "src/common/service/",
    "src/app.controller.ts",
    "src/app.service.ts",
    "src/config/",
    ".*\\.spec\\.ts$",
    ".*\\.test\\.ts$",
    ".*\\.e2e-spec\\.ts$",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
