
'use server';
/**
 * @fileOverview A flow for generating images for menu items and uploading them to Firebase Storage.
 *
 * - generateImage - A function that generates an image and returns its public URL.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase'; // Ensure app is initialized
import { v4 as uuidv4 } from 'uuid';

const storage = getStorage(app);

const GenerateImageInputSchema = z.object({
  dishName: z.string().describe('The name of the menu item.'),
  restaurantId: z.string().describe('The ID of the restaurant to associate the image with.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.string().describe('The public URL of the generated and stored image.');
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(dishName: string, restaurantId: string): Promise<GenerateImageOutput> {
  return generateImageFlow({ dishName, restaurantId });
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ dishName, restaurantId }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A simple, clean, appetizing photo of "${dishName}" on a plain white background, minimalist style. The image should be web-optimized with a small file size, suitable for a menu.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error(`Failed to generate an image for "${dishName}".`);
    }

    // Upload the image to Firebase Storage
    try {
      const imageId = uuidv4();
      const storageRef = ref(storage, `menu_items/${restaurantId}/${imageId}.jpeg`);
      
      // The media.url is a data URI (e.g., 'data:image/png;base64,...'). We need to upload it.
      // For simplicity and to avoid sending the full data URI, we'll use uploadString.
      await uploadString(storageRef, media.url, 'data_url', {
          contentType: 'image/jpeg'
      });

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;

    } catch (error) {
        console.error("Firebase Storage upload failed:", error);
        throw new Error("Failed to save the generated image to storage.");
    }
  }
);
