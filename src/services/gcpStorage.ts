export function getGoogleCloudStorageBucketName(): string | undefined {
  return process.env.GOOGLE_CLOUD_STORAGE_BUCKET
    ?? process.env.GCP_STORAGE_BUCKET
    ?? process.env.GCS_BUCKET_NAME
    ?? process.env.GCP_UPLOAD_BUCKET
    ?? undefined;
}

export function isGoogleCloudStorageEnabled(): boolean {
  const bucketName = getGoogleCloudStorageBucketName();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GCP_PROJECT_ID ?? process.env.GCP_PROJECT ?? undefined;

  return Boolean(bucketName && projectId);
}

export async function uploadToGoogleCloudStorage(file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}): Promise<{ url: string; filename: string; objectName: string; bucket: string; provider: 'gcs' }> {
  const bucketName = getGoogleCloudStorageBucketName();
  if (!bucketName) {
    throw new Error('Google Cloud Storage bucket is not configured.');
  }

  try {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GCP_PROJECT_ID ?? process.env.GCP_PROJECT ?? undefined;
    const storage = new Storage({ projectId });
    const extension = file.originalname.includes('.') ? file.originalname.substring(file.originalname.lastIndexOf('.')) : '.png';
    const objectName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    const blob = storage.bucket(bucketName).file(objectName);

    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype || 'application/octet-stream'
      }
    });

    await blob.makePublic();

    return {
      provider: 'gcs',
      bucket: bucketName,
      filename: objectName,
      objectName,
      url: `https://storage.googleapis.com/${bucketName}/${objectName}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google Cloud Storage error';
    throw new Error(`GCS upload failed: ${message}`);
  }
}
