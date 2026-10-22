import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
// Cloudflare (in front of the origin) rejects request bodies over 100MB, so stay under that.
const MAX_VIDEO_SIZE = 95 * 1024 * 1024;
// Upper bound for the admin media library listing. Keys are UUIDs, so the bucket's own
// (lexicographic) order is meaningless to a human - we pull up to this many and sort by
// upload date instead. Well above the current bucket size; raise it if the bucket grows.
const LIBRARY_MAX_OBJECTS = 2000;
// R2/S3 caps a single DeleteObjects call at 1000 keys.
const DELETE_BATCH_SIZE = 1000;

export interface StoredImage {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
  // True while a product gallery or a category icon still points at this image - the admin
  // panel greys those out and the delete below refuses them.
  inUse: boolean;
}

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  private readonly isConfigured: boolean;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
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

  // Videos for the feed under the catalog - same bucket and URL scheme as the images.
  async uploadVideo(file: Express.Multer.File | undefined): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!VIDEO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported video type. Use MP4, WEBM or MOV');
    }
    if (file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Video is too large (max 95MB)');
    }
    if (!this.isConfigured) {
      throw new InternalServerErrorException('R2 storage is not configured. Set R2_* env vars.');
    }

    const ext = (file.originalname.split('.').pop() || 'mp4').toLowerCase();
    const key = `videos/${randomUUID()}.${ext}`;

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
      console.error('Error uploading video to R2:', err);
      throw new InternalServerErrorException('Failed to upload video');
    }

    return { url: `${this.publicUrl}/${key}` };
  }

  // Every image URL the catalog currently points at: every product photo plus every category
  // icon, plus every video/photo of the media feed. Deleting one of these would leave a broken picture on the live site, so it's what
  // listImages() flags and deleteImages() refuses.
  private async collectUsedUrls(): Promise<Set<string>> {
    const [products, categories, mediaItems] = await Promise.all([
      this.prisma.product.findMany({ select: { images: true } }),
      this.prisma.category.findMany({ select: { icon: true } }),
      this.prisma.mediaItem.findMany({ select: { src: true, poster: true } }),
    ]);

    const used = new Set<string>();
    const add = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) used.add(value.trim());
    };

    for (const product of products) {
      for (const url of Array.isArray(product.images) ? product.images : []) add(url);
    }
    for (const category of categories) add(category.icon);
    for (const item of mediaItems) {
      add(item.src);
      add(item.poster);
    }

    return used;
  }

  // Lists what is already in the bucket so the admin panel can reuse an existing image
  // instead of re-uploading it.
  async listImages(folder?: string): Promise<{ images: StoredImage[]; truncated: boolean }> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('R2 storage is not configured. Set R2_* env vars.');
    }

    const usedUrls = await this.collectUsedUrls();
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
          // Video files are not pickable images - the image library leaves them out.
          if (!folder && object.Key.startsWith('videos/')) continue;
          const url = `${this.publicUrl}/${object.Key}`;
          images.push({
            key: object.Key,
            url,
            size: object.Size || 0,
            lastModified: object.LastModified ? object.LastModified.toISOString() : null,
            inUse: usedUrls.has(url),
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

  // Permanently removes objects from the bucket - there is no recycle bin in R2, so a key that
  // the catalog still points at is reported back as skipped rather than deleted. The caller
  // gets both lists so the admin panel can say which images survived and why.
  async deleteImages(keys: unknown): Promise<{ deleted: string[]; skipped: { key: string; reason: 'in_use' }[] }> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('R2 storage is not configured. Set R2_* env vars.');
    }

    const requested = Array.from(
      new Set(
        (Array.isArray(keys) ? keys : [])
          .filter((key): key is string => typeof key === 'string')
          .map((key) => key.trim())
          .filter((key) => key.length > 0 && !key.startsWith('/') && !key.endsWith('/') && !key.includes('..')),
      ),
    );

    if (requested.length === 0) {
      throw new BadRequestException('No image keys to delete');
    }

    const usedUrls = await this.collectUsedUrls();
    const skipped: { key: string; reason: 'in_use' }[] = [];
    const deletable: string[] = [];
    for (const key of requested) {
      if (usedUrls.has(`${this.publicUrl}/${key}`)) {
        skipped.push({ key, reason: 'in_use' });
      } else {
        deletable.push(key);
      }
    }

    const deleted: string[] = [];
    try {
      for (let i = 0; i < deletable.length; i += DELETE_BATCH_SIZE) {
        const batch = deletable.slice(i, i + DELETE_BATCH_SIZE);
        const result = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: false },
          }),
        );
        for (const object of result.Deleted || []) {
          if (object.Key) deleted.push(object.Key);
        }
        for (const error of result.Errors || []) {
          console.error('Error deleting R2 object:', error.Key, error.Code, error.Message);
        }
      }
    } catch (err) {
      console.error('Error deleting R2 objects:', err);
      throw new InternalServerErrorException('Failed to delete files');
    }

    return { deleted, skipped };
  }
}
