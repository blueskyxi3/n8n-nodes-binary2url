import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

class LocalStorage {
  private static logger: any;

  static setLogger(logger: any) {
    this.logger = logger;
  }

  static async upload(workflowId: string, buffer: Buffer, contentType: string, ttlMs: number) {
    const baseDir = path.join(os.tmpdir(), 'n8n-binary-to-url', workflowId);
    this.logger?.info("baseDir",baseDir);
    await fs.mkdir(baseDir, { recursive: true });
    const fileKey = crypto.randomUUID();
    const dataPath = path.join(baseDir, `${fileKey}.data`);
    const metaPath = path.join(baseDir, `${fileKey}.json`);
    const meta = { contentType, expiresAt: Date.now() + ttlMs };
    await fs.writeFile(dataPath, buffer);
    await fs.writeFile(metaPath, JSON.stringify(meta));
    this.logger?.info(`Uploaded file ${fileKey} to ${dataPath}`);
    return { fileKey };
  }

  static async download(workflowId: string, fileKey: string) {
    const baseDir = path.join(os.tmpdir(), 'n8n-binary-to-url', workflowId);
    const dataPath = path.join(baseDir, `${fileKey}.data`);
    const metaPath = path.join(baseDir, `${fileKey}.json`);
    try {
      const metaStr = await fs.readFile(metaPath, 'utf8');
      const meta = JSON.parse(metaStr);
      if (Date.now() > meta.expiresAt) {
        await fs.unlink(dataPath).catch(() => {});
        await fs.unlink(metaPath).catch(() => {});
        return null;
      }
      const data = await fs.readFile(dataPath);
      return { data, contentType: meta.contentType };
    } catch (err) {
      this.logger?.error(`Error downloading ${fileKey}: ${(err as Error).message}`);
      return null;
    }
  }
}