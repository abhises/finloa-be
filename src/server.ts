import { createApp } from "./app";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";
import { syncBuiltins } from "./lib/sections/sync";

const server = createApp().listen(env.PORT, () => {
  console.log(`Finloa API listening on http://localhost:${env.PORT}`);
  // Built-in section types live in code; keep the database copy up to date
  syncBuiltins().catch((e) => console.error("Could not sync the built-in section types", e));
});

function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
