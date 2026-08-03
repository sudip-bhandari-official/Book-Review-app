import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.process?.env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY });

function fileToGenerativePart(path, mimeType = "image/jpeg") {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

export const validateContribution = async (imagePath, metadata = {}) => {
  try {
    const imagePart = fileToGenerativePart(imagePath);

    const prompt = `
      You are validating a user book contribution.
      Claimed Book Title: "${metadata.title || 'Unknown'}"
      Claimed Author: "${metadata.author || 'Unknown'}"

      Tasks:
      1. Inspect the image: Is this a valid photo of a book cover?
      2. Does the image match a book cover (not random spam or gibberish)?
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [imagePart, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            validated: { type: Type.BOOLEAN },
            aiConfidence: { type: Type.NUMBER },
          },
          required: ["validated", "aiConfidence"],
        },
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text);

    return {
      isDuplicate: false,
      existingBookId: null,
      validated: Boolean(parsed.validated),
      aiConfidence: Number(parsed.aiConfidence || 0.9),
    };
  } catch (error) {
    console.error("AI Validation Error:", error.message || error);
    // Fallback response so backend doesn't crash
    return {
      isDuplicate: false,
      existingBookId: null,
      validated: false,
      aiConfidence: 0.0,
    };
  }
};
