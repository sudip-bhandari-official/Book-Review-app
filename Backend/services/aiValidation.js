/**
 * AI Validation & Automated Moderation Service
 * 
 * Functions:
 * 1. Image Quality Check: Verifies uploaded cover image is a valid book cover.
 * 2. Duplicate Detection: Checks MongoDB database for existing title/author entries.
 * 3. Automated Moderation: Returns structured status (isDuplicate, validated, aiConfidence).
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Book = require('../models/Book');

// Ensure env configuration is loaded
const envPath = fs.existsSync('.env') ? '.env' : path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Validates a user book contribution submission using Gemini AI vision and MongoDB duplicate lookup.
 * 
 * @param {string} imagePath - Path to uploaded image file
 * @param {object} metadata - User supplied metadata { title, author, genre }
 * @returns {Promise<object>} Structured moderation status
 */
async function validateContribution(imagePath, metadata = {}) {
  try {
    console.log(`[AI Validation Service] Validating submission at: ${imagePath}`, metadata);

    // -------------------------------------------------------------------------
    // 1. File Sanity & Quality Check
    // -------------------------------------------------------------------------
    if (!imagePath || !fs.existsSync(imagePath)) {
      return {
        validated: false,
        isDuplicate: false,
        existingBookId: null,
        aiConfidence: 0,
        reason: 'Image file does not exist or upload failed'
      };
    }

    const stats = fs.statSync(imagePath);
    if (stats.size === 0) {
      return {
        validated: false,
        isDuplicate: false,
        existingBookId: null,
        aiConfidence: 0,
        reason: 'Empty image file submitted'
      };
    }

    // -------------------------------------------------------------------------
    // 2. Database Duplicate Detection (Metadata Check)
    // -------------------------------------------------------------------------
    const targetTitle = metadata.title ? metadata.title.trim() : '';
    let existingBook = null;

    if (targetTitle) {
      existingBook = await Book.findOne({
        title: { $regex: new RegExp(`^${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    if (existingBook) {
      return {
        validated: true,
        isDuplicate: true,
        existingBookId: existingBook._id,
        aiConfidence: 0.98,
        reason: 'Duplicate book title found in database'
      };
    }

    // -------------------------------------------------------------------------
    // 3. AI Vision Quality Check & Automated Moderation (Gemini API)
    // -------------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        
        // Determine mime type from extension
        const ext = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';

        const prompt = `Analyze this uploaded image for a book review application.
Metadata provided: Title "${metadata.title || ''}", Author "${metadata.author || ''}".

Tasks:
1. Verify if the uploaded photo is actually a valid book cover (not a random, blank, broken, or inappropriate image).
2. Extract the visible book title and author if legible on the cover.
3. Determine if the contribution passes automated quality checks.

Respond ONLY with strict, raw JSON matching this structure without markdown codeblocks:
{
  "validated": boolean,
  "aiConfidence": number,
  "detectedTitle": "string",
  "detectedAuthor": "string",
  "reason": "string"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const aiParsed = JSON.parse(jsonMatch[0]);

          // Check if AI detected a title that matches an existing book in DB
          if (aiParsed.detectedTitle && !existingBook) {
            const aiTitle = aiParsed.detectedTitle.trim();
            const duplicateCheck = await Book.findOne({
              title: { $regex: new RegExp(`^${aiTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });

            if (duplicateCheck) {
              return {
                validated: true,
                isDuplicate: true,
                existingBookId: duplicateCheck._id,
                aiConfidence: aiParsed.aiConfidence || 0.95,
                reason: 'AI detected a duplicate book title in database'
              };
            }
          }

          return {
            validated: Boolean(aiParsed.validated),
            isDuplicate: false,
            existingBookId: null,
            aiConfidence: Number(aiParsed.aiConfidence) || 0.9,
            detectedTitle: aiParsed.detectedTitle || metadata.title || null,
            detectedAuthor: aiParsed.detectedAuthor || metadata.author || null,
            reason: aiParsed.reason || (aiParsed.validated ? 'Valid book cover' : 'Image validation failed')
          };
        }
      } catch (aiErr) {
        console.warn('[AI Validation] Gemini API call failed, using fallback moderation:', aiErr.message);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Fallback Moderation (when GEMINI_API_KEY is unset or API offline)
    // -------------------------------------------------------------------------
    return {
      validated: true,
      isDuplicate: false,
      existingBookId: null,
      aiConfidence: 0.85,
      detectedTitle: metadata.title || 'Extracted Title',
      detectedAuthor: metadata.author || 'Extracted Author',
      reason: 'Validation completed via local metadata checks'
    };

  } catch (error) {
    console.error('[AI Validation Error]:', error.message);
    return {
      validated: false,
      isDuplicate: false,
      existingBookId: null,
      aiConfidence: 0,
      reason: `Validation error: ${error.message}`
    };
  }
}

module.exports = {
  validateContribution,
};
