
'use server';
/**
 * @fileOverview A flow for generating images for menu items.
 *
 * - generateImage - A function that generates an image and returns its base64 data URI.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  dishName: z.string().describe('The name of the menu item.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

// The output is the raw image data URI
const GenerateImageOutputSchema = z.string().describe('The base64 data URI of the generated image.');
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
      prompt: `A simple, clean, appetizing photo of "${dishName}" on a plain white background, minimalist style. Create the image as instructed, but strictly ensure that the final image file size does not exceed 500 KB. Use appropriate compression techniques, reduce resolution (e.g., maximum 800×800), simplify detail, and optimize the image format (prefer JPEG or WebP) to stay within the limit. This size constraint is mandatory. If the design is too complex to remain under 500 KB, simplify the image while preserving the core idea.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error(`Failed to generate an image for "${dishName}".`);
    }

    // Return the data URI directly
    return media.url;
  }
);
