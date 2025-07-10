'use server';
/**
 * @fileOverview A flow for generating menu item descriptions.
 *
 * - generateDescription - A function that generates a description for a menu item.
 * - GenerateDescriptionInput - The input type for the generateDescription function.
 * - GenerateDescriptionOutput - The return type for the generateDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDescriptionInputSchema = z.object({
  dishName: z.string().describe('The name of the menu item.'),
});
export type GenerateDescriptionInput = z.infer<typeof GenerateDescriptionInputSchema>;

const GenerateDescriptionOutputSchema = z.string().describe('The generated description for the menu item.');
export type GenerateDescriptionOutput = z.infer<typeof GenerateDescriptionOutputSchema>;

export async function generateDescription(dishName: string): Promise<GenerateDescriptionOutput> {
  return generateDescriptionFlow({ dishName });
}

const prompt = ai.definePrompt({
  name: 'generateDescriptionPrompt',
  input: {schema: GenerateDescriptionInputSchema},
  prompt: `You are a world-class chef and food writer. Your task is to write a short, appealing, and delicious-sounding menu description for a dish.

The name of the dish is: {{{dishName}}}

Generate a single paragraph description. Do not use markdown or any special formatting. Just return the text of the description. If you are unable to generate a description for any reason, return the string "Unable to generate description."`,
});

const generateDescriptionFlow = ai.defineFlow(
  {
    name: 'generateDescriptionFlow',
    inputSchema: GenerateDescriptionInputSchema,
    outputSchema: GenerateDescriptionOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    const output = response.text;
    // Handle null or undefined output from the model to prevent schema validation errors.
    return output || "Unable to generate description.";
  }
);
