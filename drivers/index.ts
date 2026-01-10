import { S3Storage, StorageConfig as S3StorageConfig } from './S3Storage';
import { IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';

export { S3Storage } from './S3Storage';
export type { StorageConfig as S3StorageConfig } from './S3Storage';

export interface StorageDriver {
  uploadStream(
    data: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ fileKey: string; contentType: string }>;
  downloadStream(fileKey: string): Promise<{ data: Buffer; contentType: string }>;
  deleteFile(fileKey: string): Promise<void>;
}

export async function createStorageDriver(
  context: IExecuteFunctions | IWebhookFunctions,
  storageDriver: string,
  bucket: string
): Promise<StorageDriver> {
  if (storageDriver === 's3') {
    const credentials = await context.getCredentials('awsS3Api');

    if (!credentials) {
      throw new Error('AWS S3 credentials are required');
    }

    const region = context.getNodeParameter('region', 0) as string;
    const endpoint = context.getNodeParameter('endpoint', 0) as string;
    const forcePathStyle = context.getNodeParameter('forcePathStyle', 0) as boolean;

    const config: S3StorageConfig = {
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      region,
      bucket,
      endpoint: endpoint || undefined,
      forcePathStyle,
    };

    return new S3Storage(config);
  }

  throw new Error(`Unknown storage driver: ${storageDriver}`);
}
