import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

export async function verifyBookSubmission({
  bookName,
  author,
  genre,
  userReview,
  username,
  imagePath,
  imageMimeType,
}) {
  const imagePart = fileToGenerativePart(imagePath, imageMimeType);

  const prompt = `
    Please verify this user book contribution submission:
    - Claimed Book Name: "${bookName}"
    - Claimed Author: "${author}"
    - Claimed Genre: "${genre}"
    - Expected Username in Photo: "${username}"
    - User Review Text: "${userReview}"

    Tasks:
    1. Check if the book cover in the photo matches "${bookName}".
    2. Check if "${username}" is written/visible on a note in the photo.
    3. Fact-check if "${author}" is the real author of "${bookName}".
    4. Ensure the review is genuine, not spam or gibberish.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [imagePart, prompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_approved: { type: Type.BOOLEAN },
          image_verified: { type: Type.BOOLEAN },
          fact_verified: { type: Type.BOOLEAN },
          review_safe: { type: Type.BOOLEAN },
          confidence_score: { type: Type.NUMBER },
          reasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "is_approved",
          "image_verified",
          "fact_verified",
          "review_safe",
          "confidence_score",
          "reasons",
        ],
      },
      temperature: 0.1,
    },
  });

  return JSON.parse(response.text);
}
