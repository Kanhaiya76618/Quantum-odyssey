import React, { useState, useCallback, useMemo, memo } from 'react';

interface AppImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  onClick?: () => void;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  fill?: boolean;
  [key: string]: any;
}

const AppImage = memo(function AppImage({
  src,
  alt,
  width,
  height,
  className = '',
  sizes,
  onClick,
  fallbackSrc = '/assets/images/no_image.png',
  loading = 'lazy',
  fill = false,
  ...props
}: AppImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    }
    setIsLoading(false);
  }, [hasError, imageSrc, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const imageClassName = useMemo(() => {
    const classes = [className];
    if (isLoading) classes.push('bg-stone-200');
    if (onClick) classes.push('cursor-pointer hover:opacity-90 transition-opacity duration-200');
    return classes.filter(Boolean).join(' ');
  }, [className, isLoading, onClick]);

  if (fill) {
    return (
      <div className="relative w-full h-full">
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover ${imageClassName}`}
          onError={handleError}
          onLoad={handleLoad}
          onClick={onClick}
          loading={loading}
          {...props}
        />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={imageClassName}
      onError={handleError}
      onLoad={handleLoad}
      onClick={onClick}
      loading={loading}
      {...props}
    />
  );
});

AppImage.displayName = 'AppImage';
export default AppImage;
