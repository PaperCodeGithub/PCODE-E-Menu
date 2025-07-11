
export function compressImage(
  dataUrl: string,
  quality = 0.7,
  maxWidth = 800,
  maxHeight = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      let { width, height } = img;

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

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get canvas context'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Return as JPEG data URL with specified quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = (error) => {
      console.error('Image loading error:', error);
      reject(new Error('Failed to load image for compression'));
    };
  });
}

    