import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";
import type { StorageDriver } from "./index";

export class S3Storage implements StorageDriver {
  name = "s3" as const;
  private client = new S3Client({ region: env.s3.region });

  constructor() {
    if (!env.s3.bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
  }

  private objectKey(key: string) {
    return env.s3.prefix + key;
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: this.objectKey(key),
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const base = env.s3.publicUrl || `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com`;
    return `${base}/${this.objectKey(key)}`;
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: this.objectKey(key) }));
  }
}
