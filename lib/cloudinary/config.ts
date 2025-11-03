import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

// Upload image to Cloudinary
export async function uploadToCloudinary(
  file: Buffer | string,
  folder: string = 'light-of-life'
): Promise<{ url: string; publicId: string }> {
  try {
    // Convert Buffer to base64 data URI if needed
    const fileToUpload = Buffer.isBuffer(file)
      ? `data:image/png;base64,${file.toString('base64')}`
      : file;

    const result = await cloudinary.uploader.upload(fileToUpload, {
      folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload to Cloudinary');
  }
}

// Delete image from Cloudinary
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete from Cloudinary');
  }
}

// Upload video to Cloudinary
export async function uploadVideoToCloudinary(
  file: Buffer | string,
  folder: string = 'light-of-life/videos'
): Promise<{ url: string; publicId: string; duration: number }> {
  try {
    // Convert Buffer to base64 data URI if needed
    const fileToUpload = Buffer.isBuffer(file)
      ? `data:video/mp4;base64,${file.toString('base64')}`
      : file;

    const result = await cloudinary.uploader.upload(fileToUpload, {
      folder,
      resource_type: 'video',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || 0,
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Failed to upload video to Cloudinary');
  }
}
