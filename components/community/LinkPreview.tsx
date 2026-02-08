'use client';

import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface LinkPreviewProps {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  isMine: boolean;
}

export default function LinkPreview({
  url,
  title,
  description,
  image,
  isMine,
}: LinkPreviewProps) {
  const getDomain = (urlString: string) => {
    try {
      return new URL(urlString).hostname.replace('www.', '');
    } catch {
      return 'Link';
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-2xl overflow-hidden border transition-all hover:scale-105 duration-300 ${
        isMine
          ? 'bg-white/10 border-white/20 hover:bg-white/20'
          : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
      }`}
    >
      {image && (
        <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
          <Image
            src={image}
            alt={title || 'Link preview'}
            fill
            className="object-cover hover:scale-110 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-xs font-black uppercase tracking-widest ${
            isMine ? 'text-white/60' : 'text-gray-500'
          }`}>
            {getDomain(url)}
          </p>
          <ExternalLink size={14} className={isMine ? 'text-white/40' : 'text-gray-400'} />
        </div>

        {title && (
          <h4 className={`font-black text-sm line-clamp-2 mb-1 ${
            isMine ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h4>
        )}

        {description && (
          <p className={`text-xs line-clamp-2 ${
            isMine ? 'text-white/70' : 'text-gray-600'
          }`}>
            {description}
          </p>
        )}
      </div>
    </a>
  );
}
