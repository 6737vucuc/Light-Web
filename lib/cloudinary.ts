import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param file - File buffer or base64 string
 * @param folder - Folder name in Cloudinary (e.g., 'avatars', 'posts', 'covers')
 * @param publicId - Optional custom public ID
 * @returns Cloudinary upload result with secure_url
 */
export async function uploadToCloudinary(
  file: string | Buffer,
  folder: string = 'light-web',
  publicId?: string
) {
  try {
    const uploadOptions: any = {
      folder: `light-web/${folder}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // If file is a buffer, convert to base64
    let fileToUpload = file;
    if (Buffer.isBuffer(file)) {
      fileToUpload = `data:image/png;base64,${file.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(fileToUpload as string, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Deletion result
 */
export async function deleteFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get optimized image URL
 * @param publicId - Public ID of the image
 * @param transformations - Cloudinary transformations
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  }
) {
  const options: any = {
    quality: transformations?.quality || 'auto:good',
    fetch_format: transformations?.format || 'auto',
  };

  if (transformations?.width) {
    options.width = transformations.width;
  }

  if (transformations?.height) {
    options.height = transformations.height;
  }

  if (transformations?.crop) {
    options.crop = transformations.crop;
  }

  return cloudinary.url(publicId, options);
}

/**
 * Upload avatar image
 * @param file - File buffer or base64 string
 * @param userId - User ID for unique naming
 * @returns Upload result
 */
export async function uploadAvatar(file: string | Buffer, userId: number) {
  return uploadToCloudinary(file, 'avatars', `avatar-${userId}-${Date.now()}`);
}

/**
 * Upload cover photo
 * @param file - File buffer or base64 string
 * @param userId - User ID for unique naming
 * @returns Upload result
 */
export async function uploadCoverPhoto(file: string | Buffer, userId: number) {
  return uploadToCloudinary(file, 'covers', `cover-${userId}-${Date.now()}`);
}

/**
 * Upload post image
 * @param file - File buffer or base64 string
 * @param userId - User ID for unique naming
 * @returns Upload result
 */
export async function uploadPostImage(file: string | Buffer, userId: number) {
  return uploadToCloudinary(file, 'posts', `post-${userId}-${Date.now()}`);
}

/**
 * Upload story media
 * @param file - File buffer or base64 string
 * @param userId - User ID for unique naming
 * @returns Upload result
 */
export async function uploadStoryMedia(file: string | Buffer, userId: number) {
  return uploadToCloudinary(file, 'stories', `story-${userId}-${Date.now()}`);
}

/**
 * Upload group cover
 * @param file - File buffer or base64 string
 * @param groupId - Group ID for unique naming
 * @returns Upload result
 */
export async function uploadGroupCover(file: string | Buffer, groupId: number) {
  return uploadToCloudinary(file, 'groups', `group-${groupId}-${Date.now()}`);
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID or null
 */
export function extractPublicId(url: string): string | null {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.jpg
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    return matches ? matches[1] : null;
  } catch (error) {
    return null;
  }
}

export default cloudinary;
