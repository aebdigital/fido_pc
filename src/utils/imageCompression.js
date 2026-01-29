/**
 * Compress and resize an image file to reduce storage and loading times
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1200)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.7)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
import heic2any from 'heic2any';

/**
 * Compress and resize an image file to reduce storage and loading times
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1200)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.7)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.7
  } = options;

  let imageFile = file;

  // Handle HEIC/HEIF files by converting them to JPEG first
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    try {
      console.log('Converting HEIC to JPEG...', file.name);
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9 // High quality for intermediate step
      });

      // heic2any can return a Blob or Blob[], ensure we have a single Blob
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      imageFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
    } catch (error) {
      console.error('Error converting HEIC:', error);
      // Try to proceed with original file if conversion fails, though it likely won't load
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // Use better image smoothing for downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG (or PNG for transparent images)
        // Ensure we always return JPEG for HEIC originals (which are now JPEGs or if standard jpeg)
        // If original was PNG, we keep PNG.
        const mimeType = imageFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);

        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(imageFile);
  });
};

/**
 * Compress multiple image files
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<string[]>} - Array of base64 encoded compressed images
 */
export const compressImages = async (files, options = {}) => {
  const compressedImages = [];

  for (const file of files) {
    try {
      const compressed = await compressImage(file, options);
      compressedImages.push(compressed);
    } catch (error) {
      console.error('Failed to compress image:', file.name, error);
      // Fallback to original if compression fails
      const original = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      compressedImages.push(original);
    }
  }

  return compressedImages;
};
