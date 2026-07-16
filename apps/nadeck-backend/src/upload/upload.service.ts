import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  private readonly isConfigured: boolean;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    this.isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && this.bucket && this.publicUrl);

    this.client = new S3Client({
      region: 'auto',
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }

  // `folder` groups uploads by feature (e.g. "medicines", "categories") so the bucket stays organized.
  async uploadImage(file: Express.Multer.File | undefined, folder: string): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Use PNG, JPEG, WEBP, GIF or SVG');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File is too large (max 5MB)');
    }
    if (!this.isConfigured) {
      throw new InternalServerErrorException('R2 storage is not configured. Set R2_* env vars.');
    }

    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `${folder}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      console.error('Error uploading to R2:', err);
      throw new InternalServerErrorException('Failed to upload file');
    }

    return { url: `${this.publicUrl}/${key}` };
  }
}
