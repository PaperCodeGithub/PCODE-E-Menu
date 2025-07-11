
'use server';

import axios from 'axios';

/**
 * Uploads an image buffer to an anonymous image hosting service (Imgur).
 * @param imageBuffer The image data as a Buffer.
 * @returns A promise that resolves with the direct URL to the hosted image.
 */
export async function uploadImage(imageBuffer: Buffer): Promise<string> {
  if (!process.env.IMGUR_CLIENT_ID) {
    throw new Error('Imgur client ID is not configured.');
  }

  try {
    const response = await axios.post(
      'https://api.imgur.com/3/image',
      imageBuffer,
      {
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
          'Content-Type': 'image/png', // Or detect mime type if necessary
        },
      }
    );

    if (response.data && response.data.success) {
      return response.data.data.link; // This is the direct URL to the image
    } else {
      throw new Error(response.data.data.error || 'Unknown error uploading to Imgur');
    }
  } catch (error: any) {
    console.error('Imgur upload failed:', error.response?.data || error.message);
    throw new Error('Failed to upload image.');
  }
}
