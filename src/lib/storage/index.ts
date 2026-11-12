import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageDriver {
  name: "local" | "s3";
  /** Stores the file and returns its public URL */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
