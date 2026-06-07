/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  resolver: "<rootDir>/jest.resolver.js",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  moduleNameMapper: {
    "^next/server$": "<rootDir>/node_modules/next/dist/server/web/exports/index.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};
