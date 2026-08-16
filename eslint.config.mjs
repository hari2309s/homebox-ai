import path from "node:path";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// eslint-config-next still ships its rules as a legacy "extends" string
// (next/core-web-vitals), not a native flat config export — FlatCompat
// bridges that into flat-config-compatible objects. baseDirectory must be
// apps/web itself (not the repo root) — some of its rules (e.g.
// no-html-link-for-pages) resolve the app/pages directory relative to it.
const compat = new FlatCompat({ baseDirectory: path.join(import.meta.dirname, "apps/web") });

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "apps/web/e2e/.auth/**",
      "apps/web/public/sw.js",
      "apps/web/public/sw.js.map",
      "apps/web/public/swe-worker*.js",
      "**/*.d.ts",
      "packages/db/src/migrations/**",
    ],
  },
  js.configs.recommended,
  // Base rules for every TS/TSX file in the monorepo.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Common, deliberate pattern in this codebase (destructured/ignored
      // params, catch bindings) — only flag genuinely unused bindings.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // JS's own version of the rule above doesn't understand TS types and
      // false-positives on e.g. function overloads — the TS rule replaces it.
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
  // apps/web additionally gets Next.js's recommended + Core Web Vitals rules
  // (react-hooks correctness, accessibility, performance footguns like
  // next/image, next/link usage).
  ...compat.extends("next/core-web-vitals").map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx}"],
  })),
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      // The rule's own implementation resolves this relative to
      // process.cwd() regardless of FlatCompat's baseDirectory above, which
      // is the repo root when linting from there — point it at the actual
      // App Router directory explicitly instead (this project has no
      // pages/ directory at all, so the rule would otherwise never find
      // one and print a confusing "cannot be found" notice every run).
      "@next/next/no-html-link-for-pages": ["error", "apps/web/app"],
    },
  },
  // Always last: turns off any stylistic ESLint/typescript-eslint rules that
  // would otherwise conflict with Prettier's own formatting decisions.
  prettierConfig,
];
