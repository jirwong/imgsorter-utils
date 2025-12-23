## Plan: Add TypeScript Support to imgsorter-utils

Set up TypeScript in this minimal Node utility package by adding TS tooling, wiring config, and defining a starting structure that you can grow into as the project evolves.

### Steps

1. **Create basic source layout and entrypoint**
   - Decide on a source directory: recommended `src/`.
   - Move or create your main code as `src/index.ts` (if `index.js` exists at the root, plan to migrate its contents into `src/index.ts` later).
   - Adjust the conceptual “build” output to a `dist/` folder where compiled JS will live.

2. **Install TypeScript dependencies**
   - Add dev dependencies in `package.json`:
     - `typescript`
     - `@types/node`
   - Use `pnpm` (as per `packageManager`) for installs.

3. **Create and configure `tsconfig.json`**
   - Add `tsconfig.json` in the project root with Node-friendly settings:
     - `target`: `ES2020` (or later, depending on your Node version).
     - `module`: `commonjs` (unless you explicitly want ESM and will adjust `package.json` accordingly).
     - `rootDir`: `src`
     - `outDir`: `dist`
     - `strict`: `true` (or start with `false` and tighten later).
     - `esModuleInterop`: `true`
     - `skipLibCheck`: `true`
     - `forceConsistentCasingInFileNames`: `true`
     - `moduleResolution`: `node` or `node16` (matching your runtime).
   - Set `include` to `["src/**/*"]` and `exclude` to `["node_modules", "dist"]`.

4. **Wire up npm/pnpm scripts in `package.json`**
   - Update `main` to point to the built file, e.g. `"main": "dist/index.js"`.
   - Add scripts:
     - `"build": "tsc"`
     - `"clean": "rm -rf dist"` (or a cross-platform tool like `rimraf` if needed later).
     - Optionally `"dev": "ts-node src/index.ts"` if you choose to add `ts-node` in the future.
   - Keep or adjust `"test"` when you introduce a testing setup; for now it can remain a placeholder.

5. **Initial TypeScript entry implementation**
   - In `src/index.ts`, define a minimal, typed public API for this package (even if it’s just a placeholder function or a single exported utility).
   - If `index.js` currently exists and has logic, plan how to translate it:
     - Copy the logic into `src/index.ts`.
     - Replace `require`/`module.exports` with `import`/`export` syntax.
     - Add simple types to function parameters and return values.

6. **Build and runtime expectations**
   - Run a TypeScript build (`pnpm run build`) to generate `dist/index.js`.
   - Ensure Node consumers will import from the compiled output (`main` now points to `dist/index.js`).
   - For local testing, run Node on the built file (e.g. `node dist/index.js`) once you have some logic there.

7. **Optional incremental migration strategy**
   - If you later add more JS files:
     - Either convert them directly to `.ts` inside `src/`, **or**
     - Temporarily enable `allowJs: true` in `tsconfig.json` to compile both `.js` and `.ts` as you gradually migrate.
   - As the codebase grows, keep adding explicit types and interfaces to improve safety.

### Further Considerations

1. Do you want this library to remain CommonJS, or should we plan an ESM setup (e.g. `"type": "module"` and `module`/`moduleResolution` tweaks)?
2. How strict should typing be at first? Option A: `strict: true` from day one. Option B: relaxed now, tighten later.
3. Will this be consumed only by Node scripts, or also by browser/other tooling? That may affect `target` and lib settings.
