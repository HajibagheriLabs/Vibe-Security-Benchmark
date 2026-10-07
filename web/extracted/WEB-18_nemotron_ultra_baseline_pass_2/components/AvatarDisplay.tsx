'use client';

import { useState, useEffect } from 'react';

interface AvatarDisplayProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

export function AvatarDisplay({ src, alt = 'Avatar', size = 48, className = '' }: AvatarDisplayProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImageSrc(src);
    setError(false);
    setLoading(true);
    
    const img = new Image();
    img.onload = () => setLoading(false);
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    img.src = src;
  }, [src]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontWeight: 600,
          fontSize: size * 0.4,
        }}
        aria-label={alt}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
      }}
      loading="lazy"
    />
  );
}