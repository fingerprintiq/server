import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    hono: "src/hono.ts",
    express: "src/express.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: false,
  external: ["hono", "express"],
});
