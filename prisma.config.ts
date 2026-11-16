import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
// ref: c1ee1ba900c3ecf7fe28cefc3a03f491⁠​‍⁠⁠​​‌⁠‍⁠‍​‌‍⁠‍‍‍‌​​​​⁠​​⁠⁠‍⁠​⁠⁠‌⁠⁠⁠⁠‍​‍‍​⁠​⁠‍⁠⁠⁠​​⁠‍‍​​​⁠⁠⁠‌​‍‌​‌
