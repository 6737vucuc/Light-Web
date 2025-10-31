# Cloudinary Setup Guide

## 🌟 Overview

This project uses **Cloudinary** for image and video storage instead of AWS S3. Cloudinary provides:
- ✅ **Free tier**: 25GB storage and 25GB bandwidth per month
- ✅ **Automatic optimization**: Images are automatically compressed and optimized
- ✅ **Fast CDN**: Global content delivery network
- ✅ **Easy integration**: Simple API and SDK
- ✅ **Transformations**: Resize, crop, and transform images on-the-fly

---

## 📋 Configuration

### Environment Variables

Add these variables to your `.env` file or Vercel Environment Variables:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dju50upuw
CLOUDINARY_API_KEY=865927968512142
CLOUDINARY_API_SECRET=SdfoH8iC4xi_2joit-mcP0c1DBQ

# Public variable (accessible in browser)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dju50upuw
```

---

## 🚀 Features

### 1. **Image Upload**

All images are automatically uploaded to Cloudinary:
- **Avatars** → `light-web/avatars/`
- **Cover Photos** → `light-web/covers/`
- **Post Images** → `light-web/posts/`
- **Stories** → `light-web/stories/`
- **Group Covers** → `light-web/groups/`

### 2. **Automatic Optimization**

Cloudinary automatically:
- Compresses images (quality: auto:good)
- Converts to WebP format (when supported)
- Resizes images based on device
- Lazy loads images

### 3. **CDN Delivery**

All images are served through Cloudinary's global CDN:
```
https://res.cloudinary.com/dju50upuw/image/upload/v1234567890/light-web/avatars/avatar-123.jpg
```

---

## 📚 API Endpoints

### Upload Avatar
```typescript
POST /api/profile/avatar
Content-Type: multipart/form-data

Body:
- avatar: File (max 5MB)

Response:
{
  "message": "Avatar uploaded successfully",
  "avatarUrl": "https://res.cloudinary.com/..."
}
```

### Upload Cover Photo
```typescript
POST /api/profile/cover
Content-Type: multipart/form-data

Body:
- cover: File (max 10MB)

Response:
{
  "success": true,
  "message": "Cover photo updated successfully",
  "coverPhoto": "https://res.cloudinary.com/..."
}
```

### Upload General Image
```typescript
POST /api/upload/image
Content-Type: multipart/form-data

Body:
- image: File (max 10MB)
- folder: string (optional, default: 'general')

Response:
{
  "success": true,
  "message": "Image uploaded successfully",
  "url": "https://res.cloudinary.com/...",
  "publicId": "light-web/posts/post-123-1234567890",
  "width": 1920,
  "height": 1080,
  "format": "jpg"
}
```

---

## 🔧 Usage Examples

### Using the ImageUploader Component

```tsx
import ImageUploader from '@/components/ImageUploader';

export default function MyComponent() {
  const handleUpload = (url: string) => {
    console.log('Image uploaded:', url);
    // Save URL to database or state
  };

  return (
    <ImageUploader
      onUpload={handleUpload}
      folder="posts"
      maxSize={10}
      label="Upload Post Image"
      buttonText="Choose Image"
    />
  );
}
```

### Using the CloudinaryImage Component

```tsx
import CloudinaryImage from '@/components/CloudinaryImage';

export default function Profile() {
  return (
    <CloudinaryImage
      src="https://res.cloudinary.com/dju50upuw/image/upload/..."
      alt="User Avatar"
      width={100}
      height={100}
      className="rounded-full"
      quality={80}
    />
  );
}
```

### Using the Cloudinary Library Directly

```typescript
import { uploadAvatar, uploadPostImage, deleteFromCloudinary } from '@/lib/cloudinary';

// Upload avatar
const result = await uploadAvatar(fileBuffer, userId);
console.log(result.url); // Cloudinary URL

// Upload post image
const postResult = await uploadPostImage(fileBuffer, userId);
console.log(postResult.url);

// Delete image
const publicId = 'light-web/avatars/avatar-123-1234567890';
await deleteFromCloudinary(publicId);
```

---

## 🎨 Image Transformations

Cloudinary supports on-the-fly transformations:

### Resize Image
```
https://res.cloudinary.com/dju50upuw/image/upload/w_300,h_300,c_fill/v1234567890/light-web/avatars/avatar-123.jpg
```

### Optimize Quality
```
https://res.cloudinary.com/dju50upuw/image/upload/q_auto:good,f_auto/v1234567890/light-web/avatars/avatar-123.jpg
```

### Crop to Face
```
https://res.cloudinary.com/dju50upuw/image/upload/w_200,h_200,c_thumb,g_face/v1234567890/light-web/avatars/avatar-123.jpg
```

---

## 📊 Folder Structure

```
light-web/
├── avatars/          # User profile pictures
├── covers/           # User cover photos
├── posts/            # Post images
├── stories/          # Story media
├── groups/           # Group cover images
└── general/          # Other uploads
```

---

## 🔒 Security

### File Validation
- ✅ File type validation (images only)
- ✅ File size limits (5MB for avatars, 10MB for others)
- ✅ Authentication required for uploads
- ✅ Automatic malware scanning (Cloudinary feature)

### Access Control
- ✅ Public read access for all images
- ✅ Write access only through authenticated API
- ✅ Automatic deletion of old images when updating

---

## 💡 Best Practices

### 1. **Always Use Components**
Use `CloudinaryImage` component instead of `<img>` tag for automatic optimization.

### 2. **Delete Old Images**
When updating avatar/cover, the old image is automatically deleted to save storage.

### 3. **Use Appropriate Folders**
Organize images by type using the `folder` parameter.

### 4. **Optimize Transformations**
Use Cloudinary transformations for responsive images:
```tsx
<CloudinaryImage
  src={imageUrl}
  width={300}
  height={300}
  quality={80}
/>
```

### 5. **Handle Errors**
Always handle upload errors gracefully:
```typescript
const result = await uploadAvatar(file, userId);
if (!result.success) {
  console.error('Upload failed:', result.error);
}
```

---

## 📈 Monitoring

### Cloudinary Dashboard
Monitor your usage at: https://cloudinary.com/console

You can see:
- Storage used
- Bandwidth used
- Number of transformations
- Popular images

### Free Tier Limits
- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Images**: Unlimited

---

## 🔄 Migration from AWS S3

### Automatic Compatibility
The system automatically handles:
- ✅ Legacy S3 URLs (still works)
- ✅ Base64 images (still works)
- ✅ New Cloudinary URLs

### Gradual Migration
Old images will continue to work. New uploads automatically use Cloudinary.

---

## 🆘 Troubleshooting

### Upload Fails
1. Check environment variables are set correctly
2. Verify file size is within limits
3. Check file type is supported
4. Ensure user is authenticated

### Images Not Loading
1. Verify Cloudinary domain is in `next.config.js`
2. Check image URL is valid
3. Verify Cloudinary account is active

### Slow Loading
1. Use `CloudinaryImage` component for optimization
2. Enable WebP format
3. Use appropriate image sizes
4. Enable lazy loading

---

## 📞 Support

For Cloudinary-related issues:
- Documentation: https://cloudinary.com/documentation
- Support: https://support.cloudinary.com

---

## 🎯 Summary

✅ **Cloudinary is configured and ready to use**
✅ **All upload endpoints updated**
✅ **Components created for easy usage**
✅ **Automatic optimization enabled**
✅ **25GB free storage available**

**Start uploading images and enjoy fast, optimized delivery! 🚀**
