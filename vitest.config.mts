import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // เทสต์ใช้ Postgres ในหน่วยความจำ ห้ามแตะ .data/pglite ที่ dev server เปิดอยู่ (เปิดซ้อนแล้วไฟล์เสีย)
    env: { PGLITE_DIR: "memory://", DATABASE_URL: "" },
  },
});
