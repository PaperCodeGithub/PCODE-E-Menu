
'use server';
/**
 * @fileOverview A flow for generating images for menu items.
 *
 * - generateImage - A function that generates an image for a menu item.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  dishName: z.string().describe('The name of the menu item.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.string().describe('The data URI of the generated image.');
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(dishName: string): Promise<GenerateImageOutput> {
  return generateImageFlow({ dishName });
}

const MAX_RETRIES = 3;
// Set a safe size limit in bytes for the data URI string (e.g., 500 KB)
// to avoid exceeding Firestore's 1 MiB document limit after compression.
const MAX_SIZE_BYTES = 500 * 1024; 

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ dishName }) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `A simple, clean, appetizing photo of ${dishName} on a plain white background, minimalist style. The image should be web-optimized and have a small file size.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (media?.url) {
        let imageUrl = media.url;
        if (!imageUrl.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${imageUrl}`;
        }
        
        // The length of the base64 string is a good proxy for byte size.
        if (imageUrl.length <= MAX_SIZE_BYTES) {
          return imageUrl;
        }
        // If the image is too large, the loop will continue to the next attempt.
        console.log(`Attempt ${i + 1}: Generated image is too large (${imageUrl.length} bytes). Retrying...`);
      }
    }

    // If all retries fail, throw an error.
    throw new Error(`Failed to generate an image of a suitable size for "${dishName}" after ${MAX_RETRIES} attempts.`);
  }
);
