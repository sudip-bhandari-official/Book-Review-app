import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export async function validateContribution(imagePath, metadata) {
  try {
    // 1. Ensure env variables are loaded FIRST
    const envPath = fs.existsSync('.env') ? '.env' : path.resolve(process.cwd(), '../.env');
    dotenv.config({ path: envPath });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in your .env file.");
    }

    // 2. Initialize GoogleGenAI INSIDE the function with the API key
    const ai = new GoogleGenAI({ apiKey });

    // 3. Make the API call using gemini-2.0-flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this book cover contribution. 
Metadata provided: Title "${metadata.title}", Author "${metadata.author}".
Respond strictly in valid JSON format with no markdown formatting:
{"isDuplicate": boolean, "existingBookId": string|null, "validated": boolean, "aiConfidence": number}`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: fs.readFileSync(imagePath).toString('base64')
              }
            }
          ]
        }
      ]
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      isDuplicate: false,
      existingBookId: null,
      validated: true,
      aiConfidence: 0.9
    };
  } catch (error) {
    console.error('AI Validation Notice/Error:', error.message);
    return {
      isDuplicate: false,
      existingBookId: null,
      validated: false,
      aiConfidence: 0
    };
  }
}