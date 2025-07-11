
// src/lib/image-utils.ts

/**
 * Compresses an image from a data URI using the canvas API.
 * @param dataUrl The base64 data URI of the image.
 * @param options Options for compression (maxWidth, maxHeight, quality).
 * @returns A promise that resolves with the compressed image as a data URI.
 */
export function compressImage(
  dataUrl: string,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Failed to get canvas context.'));
      }

      let { width, height } = img;
      const { maxWidth, maxHeight, quality } = options;

      // Calculate the new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Get the data URL for the compressed image
      // 'image/jpeg' is generally smaller than 'image/png'
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      resolve(compressedDataUrl);
    };
    img.onerror = (error) => {
      console.error("Image loading failed for compression:", error);
      reject(new Error('Failed to load image for compression.'));
    };
  });
}
