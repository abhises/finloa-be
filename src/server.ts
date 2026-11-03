import { createApp } from "./app";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";

const server = createApp().listen(env.PORT, () => {
  console.log(`Finloa API listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
