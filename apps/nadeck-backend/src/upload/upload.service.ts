import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Upper bound for the admin media library listing. Keys are UUIDs, so the bucket's own
// (lexicographic) order is meaningless to a human - we pull up to this many and sort by
// upload date instead. Well above the current bucket size; raise it if the bucket grows.
const LIBRARY_MAX_OBJECTS = 2000;

export interface StoredImage {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
}

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

  // Lists what is already in the bucket so the admin panel can reuse an existing image
  // instead of re-uploading it. Read-only by design - nothing here deletes objects, since a
  // key can still be referenced by Product.images / Category.icon.
  async listImages(folder?: string): Promise<{ images: StoredImage[]; truncated: boolean }> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('R2 storage is not configured. Set R2_* env vars.');
    }

    const images: StoredImage[] = [];
    let continuationToken: string | undefined;
    let truncated = false;

    try {
      do {
        const page = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: folder ? `${folder}/` : undefined,
            ContinuationToken: continuationToken,
          }),
        );

        for (const object of page.Contents || []) {
          // Skip the zero-byte "folder" placeholders some S3 clients create.
          if (!object.Key || object.Key.endsWith('/')) continue;
          images.push({
            key: object.Key,
            url: `${this.publicUrl}/${object.Key}`,
            size: object.Size || 0,
            lastModified: object.LastModified ? object.LastModified.toISOString() : null,
          });
        }

        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        if (continuationToken && images.length >= LIBRARY_MAX_OBJECTS) {
          truncated = true;
          break;
        }
      } while (continuationToken);
    } catch (err) {
      console.error('Error listing R2 objects:', err);
      throw new InternalServerErrorException('Failed to list files');
    }

    images.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));

    return { images, truncated };
  }
}
