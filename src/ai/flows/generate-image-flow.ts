
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

const GenerateImageOutputSchema = z.any().describe('The buffer of the generated image.');
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(dishName: string): Promise<GenerateImageOutput> {
  return generateImageFlow({ dishName });
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({ dishName }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `A simple, clean, appetizing photo of ${dishName} on a plain white background, minimalist style. The image should be web-optimized and have a small file size.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (media?.url) {
      // The Gemini API returns a data URI, we need to extract the base64 part and convert it to a buffer.
      const base64Data = media.url.substring(media.url.indexOf(',') + 1);
      return Buffer.from(base64Data, 'base64');
    }

    // If generation fails entirely, throw an error.
    throw new Error(`Failed to generate an image for "${dishName}".`);
  }
);
