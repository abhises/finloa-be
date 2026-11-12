import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env";
import type { StorageDriver } from "./index";

export const uploadRoot = path.resolve(env.UPLOAD_DIR);

/** Files on the server's disk, served by the API at /api/uploads/<key>. */
export class LocalStorage implements StorageDriver {
  name = "local" as const;

  private resolve(key: string) {
    const full = path.resolve(uploadRoot, key);
    if (!full.startsWith(uploadRoot + path.sep)) throw new Error("Invalid key");
    return full;
  }

  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return `${env.publicUrl}/api/uploads/${key}`;
  }

  async remove(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}
