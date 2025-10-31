'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CloudinaryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * CloudinaryImage Component
 * Handles both Cloudinary URLs and legacy base64/S3 URLs
 */
export default function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className = '',
  fill = false,
  priority = false,
  quality = 80,
  sizes,
  objectFit = 'cover',
}: CloudinaryImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  // Check if it's a Cloudinary URL
  const isCloudinary = src?.includes('cloudinary.com');
  
  // Check if it's a base64 image
  const isBase64 = src?.startsWith('data:');
  
  // Check if it's an S3 URL
  const isS3 = src?.includes('s3.amazonaws.com') || src?.includes('s3.us-east');

  // Get optimized Cloudinary URL
  const getOptimizedUrl = (url: string) => {
    if (!isCloudinary) return url;

    // Already optimized or has transformations
    if (url.includes('/upload/')) {
      const parts = url.split('/upload/');
      const transformations = [];

      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      transformations.push(`q_${quality}`);
      transformations.push('f_auto');
      transformations.push('c_fill');

      return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
    }

    return url;
  };

  const optimizedSrc = getOptimizedUrl(imgSrc);

  const handleError = () => {
    // Fallback to default avatar if image fails to load
    setImgSrc('/default-avatar.png');
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // For base64 images, use them directly
  if (isBase64) {
    return (
      <div className={`relative ${className}`}>
        {fill ? (
          <Image
            src={imgSrc}
            alt={alt}
            fill
            className={className}
            style={{ objectFit }}
            onError={handleError}
            onLoad={handleLoad}
            unoptimized
          />
        ) : (
          <Image
            src={imgSrc}
            alt={alt}
            width={width || 100}
            height={height || 100}
            className={className}
            style={{ objectFit }}
            onError={handleError}
            onLoad={handleLoad}
            unoptimized
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
        )}
      </div>
    );
  }

  // For Cloudinary and S3 images
  return (
    <div className={`relative ${className}`}>
      {fill ? (
        <Image
          src={optimizedSrc}
          alt={alt}
          fill
          className={className}
          style={{ objectFit }}
          onError={handleError}
          onLoad={handleLoad}
          priority={priority}
          sizes={sizes}
          quality={quality}
        />
      ) : (
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width || 100}
          height={height || 100}
          className={className}
          style={{ objectFit }}
          onError={handleError}
          onLoad={handleLoad}
          priority={priority}
          quality={quality}
        />
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  );
}
