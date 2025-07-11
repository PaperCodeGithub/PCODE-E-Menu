
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

    if (!media?.url) {
      throw new Error('Image generation failed to return a valid image.');
    }

    // Ensure the URL is a full data URI
    if (media.url.startsWith('data:')) {
        return media.url;
    } else {
        // If the model returns raw base64, prepend the data URI scheme.
        return `data:image/png;base64,${media.url}`;
    }
  }
);
