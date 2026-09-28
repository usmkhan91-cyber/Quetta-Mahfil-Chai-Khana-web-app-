import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fallbackColor?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className, 
  containerClassName, 
  fallbackColor = "bg-stone-100",
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 ${fallbackColor} animate-pulse`}
          />
        )}
      </AnimatePresence>
      
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
        {...props}
      />

      {hasError && (
        <div className={`absolute inset-0 ${fallbackColor} flex items-center justify-center p-4 text-center`}>
          <span className="text-[10px] uppercase font-bold text-stone-400">Image not available</span>
        </div>
      )}
    </div>
  );
}
