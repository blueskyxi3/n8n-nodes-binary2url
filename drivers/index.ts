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
  bucket: string
): Promise<StorageDriver> {
  const credentials = await context.getCredentials('s3Api');

  if (!credentials) {
    throw new Error('No S3 credentials found. Please configure S3 credentials.');
  }

  const region = context.getNodeParameter('region', 0) as string;
  const endpoint = context.getNodeParameter('endpoint', 0) as string;
  const forcePathStyle = context.getNodeParameter('forcePathStyle', 0) as boolean;

  // Extract credentials from S3 API credential
  const creds = credentials as Record<string, string>;

  const accessKeyId = creds.accessKeyId || '';
  const secretAccessKey = creds.secretAccessKey || '';
  const credentialEndpoint = creds.s3Api;
  const credentialRegion = creds.region;

  // Use credential endpoint if node parameter is empty
  const finalEndpoint = endpoint || credentialEndpoint;

  // Use credential region if node parameter is empty
  const finalRegion = region || credentialRegion || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Invalid credentials. Missing access key or secret key.');
  }

  // Auto-determine if path style should be forced
  let shouldForcePathStyle = forcePathStyle;

  // Force path style by default if custom endpoint is provided
  // This is needed for MinIO, Wasabi, DigitalOcean Spaces, Alibaba OSS, Tencent COS, etc.
  if (finalEndpoint && finalEndpoint !== '') {
    shouldForcePathStyle = true;
  }

  const config: S3StorageConfig = {
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    region: finalRegion,
    bucket,
    endpoint: finalEndpoint || undefined,
    forcePathStyle: shouldForcePathStyle,
  };

  return new S3Storage(config);
}
