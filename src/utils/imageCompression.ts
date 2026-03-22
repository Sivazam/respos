/**
 * Image Compression Utility
 * 
 * Compresses images to WebP format with balanced quality
 * Target: 150-300KB file size while maintaining good visual quality
 */

export interface CompressionOptions {
  quality: number;        // 0.0 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  format: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dataUrl: string;
}

/**
 * Compress an image file to WebP format
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as Blob with metadata
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {
    quality: 0.7,          // 70% quality - balanced compression
    format: 'image/webp'
  }
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if max dimensions specified
          if (options.maxWidth && width > options.maxWidth) {
            height = (height * options.maxWidth) / width;
            width = options.maxWidth;
          }
          if (options.maxHeight && height > options.maxHeight) {
            width = (width * options.maxHeight) / height;
            height = options.maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // White background for transparency (WebP supports alpha, but just in case)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Get original size
          const originalSize = file.size;

          // Compress to WebP
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              const compressedSize = blob.size;
              const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

              // Convert to data URL for upload
              const dataUrl = canvas.toDataURL(options.format, options.quality);

              resolve({
                blob,
                originalSize,
                compressedSize,
                compressionRatio,
                dataUrl
              });
            },
            options.format,
            options.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress image with adaptive quality to reach target file size
 * @param file - The image file to compress
 * @param targetSizeKB - Target file size in KB (default: 300KB)
 * @returns Compressed image
 */
export async function compressImageToTargetSize(
  file: File,
  targetSizeKB: number = 300
): Promise<CompressionResult> {
  let quality = 0.8;
  
  // First compression attempt
  let result = await compressImage(file, { quality, format: 'image/webp' });
  
  // Continue compressing if above target and quality allows
  while (result.compressedSize > targetSizeKB * 1024 && quality > 0.4) {
    quality -= 0.1;
    result = await compressImage(file, { quality, format: 'image/webp' });
  }
  
  return result;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
