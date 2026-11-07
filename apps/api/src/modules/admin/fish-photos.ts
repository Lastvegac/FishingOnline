import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { fishPhotoMaxBytes, type FishPhotoUpload } from '@fwo/contracts';
import type { Tx } from '../../db.js';
import { ApiError } from '../../lib/errors.js';

export async function prepareFishPhoto(upload?: FishPhotoUpload) {
  if (!upload) return undefined;
  try {
    const bytes = Buffer.from(upload.data, 'base64');
    if (
      !bytes.length ||
      bytes.length > fishPhotoMaxBytes ||
      bytes.toString('base64') !== upload.data
    )
      throw new Error('Invalid upload');
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: 'warning',
    });
    const metadata = await image.metadata();
    if (
      !(
        ['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
        (metadata.format === 'heif' && metadata.compression === 'av1')
      ) ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error('Unsupported photograph');
    const content = await image
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    if (content.length > fishPhotoMaxBytes) throw new Error('Image too large');
    return {
      content,
      checksum: createHash('sha256').update(content).digest('hex'),
    };
  } catch {
    throw new ApiError(
      400,
      'INVALID_FISH_PHOTO',
      'Please choose a valid fish photo.',
      {
        fields: {
          photoUpload: [
            'Choose a JPEG, PNG, WebP or AVIF photo up to 5 MB and 20 megapixels.',
          ],
        },
      },
    );
  }
}

/** Called under the game-config advisory lock and within the same transaction. */
export async function saveFishPhoto(
  tx: Tx,
  photo: NonNullable<Awaited<ReturnType<typeof prepareFishPhoto>>>,
) {
  const asset =
    (await tx.fishPhotoAsset.findUnique({
      where: { checksum: photo.checksum },
      select: { id: true },
    })) ??
    (await tx.fishPhotoAsset.create({ data: photo, select: { id: true } }));
  return `/api/v1/fish-photos/${asset.id}`;
}
