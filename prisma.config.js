try {
  require('dotenv').config();
} catch {
  // In production Docker, env vars are injected directly by docker-compose
}

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
