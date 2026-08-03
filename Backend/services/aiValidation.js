/**
 * AI Validation & Automated Book Contribution Service
 * 
 * Workflow:
 * 1. Step 1: AI OCR & Feature Extraction (Gemini API gemini-2.0-flash)
 * 2. Step 2: Quality & Image Validation Check
 * 3. Step 3: Database Duplicate Scan (Book Model)
 * 4. Step 4: Auto-Insert New Book to Database
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Book = require('../models/Book');

// Ensure environment configuration is loaded
const envPath = fs.existsSync('.env') ? '.env' : path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Validates an uploaded book cover contribution using Gemini AI vision OCR extraction,
 * performs database duplicate scanning, and auto-inserts the new book if valid.
 * 
 * @param {string} imagePath - Path to uploaded image file
 * @param {object} metadata - Optional user-supplied metadata { title, author, description, userId, contributedBy }
 * @returns {Promise<object>} Structured response object matching the specification:
 *   - Success: { success: true, status: "BOOK_CONTRIBUTED", message: "...", book: newSavedBook }
 *   - Duplicate: { success: false, status: "DUPLICATE_ENTRY", message: "...", existingBookId: book._id }
 *   - Invalid Cover: { success: false, status: "INVALID_COVER", message: "..." }
 */
async function validateContribution(imagePath, metadata = {}) {
  try {
    console.log(`[AI Validation Service] Processing contribution: ${imagePath}`, metadata);

    // -------------------------------------------------------------------------
    // File Sanity Check
    // -------------------------------------------------------------------------
    if (!imagePath || !fs.existsSync(imagePath)) {
      return {
        success: false,
        status: "INVALID_COVER",
        message: "Uploaded image does not appear to be a valid book cover.",
        validated: false,
        isDuplicate: false,
        reason: "File does not exist or upload failed"
      };
    }

    const stats = fs.statSync(imagePath);
    if (stats.size === 0) {
      return {
        success: false,
        status: "INVALID_COVER",
        message: "Uploaded image does not appear to be a valid book cover.",
        validated: false,
        isDuplicate: false,
        reason: "Empty image file submitted"
      };
    }

    // Extracted variables with defaults
    let isValidBookCover = true;
    let extractedTitle = (metadata.title || '').trim() || null;
    let extractedAuthor = (metadata.author || '').trim() || null;
    let extractedDescription = (metadata.description || '').trim() || null;
    let aiConfidence = 1.0;

    // -------------------------------------------------------------------------
    // Step 1: AI OCR & Feature Extraction (Gemini API)
    // -------------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');

        const ext = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';

        const prompt = `You are an AI OCR and book identification engine.
Scan this book cover image and extract text/graphics.

Optional metadata supplied by user:
- User Title: "${metadata.title || ''}"
- User Author: "${metadata.author || ''}"

Perform OCR & extraction:
1. Identify if this photo is a valid, readable book cover (not a blank image, screenshot, meme, or unrelated object).
2. Extract the book title visible on the cover.
3. Extract the author name visible on the cover.
4. Extract or infer a brief 1-2 sentence description or genre summary from the cover text and visuals.
5. Provide a confidence score between 0.0 and 1.0.

Respond ONLY with raw JSON (no markdown formatting, no code blocks):
{
  "isValidBookCover": boolean,
  "extractedTitle": "string or null",
  "extractedAuthor": "string or null",
  "extractedDescription": "string or null",
  "aiConfidence": number
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
          console.log('[AI Validation] Gemini OCR Result:', aiParsed);

          isValidBookCover = Boolean(aiParsed.isValidBookCover);
          if (aiParsed.extractedTitle) extractedTitle = aiParsed.extractedTitle.trim();
          if (aiParsed.extractedAuthor) extractedAuthor = aiParsed.extractedAuthor.trim();
          if (aiParsed.extractedDescription) extractedDescription = aiParsed.extractedDescription.trim();
          if (typeof aiParsed.aiConfidence === 'number') aiConfidence = aiParsed.aiConfidence;
        }
      } catch (aiErr) {
        console.warn('[AI Validation] Gemini API call failed or rate-limited. Falling back to metadata:', aiErr.message);
        // Graceful fallback to user metadata or default
      }
    } else {
      console.log('[AI Validation] GEMINI_API_KEY not set. Operating in fallback mode with metadata.');
    }

    // -------------------------------------------------------------------------
    // Step 2: Quality & Image Validation Check
    // -------------------------------------------------------------------------
    if (!isValidBookCover || aiConfidence < 0.4) {
      return {
        success: false,
        status: "INVALID_COVER",
        message: "Uploaded image does not appear to be a valid book cover.",
        validated: false,
        isDuplicate: false,
        reason: "Uploaded image does not appear to be a valid book cover."
      };
    }

    // Determine final title & author for database query and insertion
    const finalTitle = extractedTitle || (metadata.title || '').trim();
    const finalAuthor = extractedAuthor || (metadata.author || '').trim() || 'Unknown Author';

    if (!finalTitle) {
      return {
        success: false,
        status: "INVALID_COVER",
        message: "Uploaded image does not appear to be a valid book cover.",
        validated: false,
        isDuplicate: false,
        reason: "Could not extract title from book cover image."
      };
    }

    // -------------------------------------------------------------------------
    // Step 3: Database Duplicate Scan
    // -------------------------------------------------------------------------
    const escapedTitle = finalTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingBook = await Book.findOne({
      title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') }
    });

    if (existingBook) {
      return {
        success: false,
        status: "DUPLICATE_ENTRY",
        message: "This book already exists in BookNest database.",
        existingBookId: existingBook._id,
        validated: true,
        isDuplicate: true,
        reason: "This book already exists in BookNest database."
      };
    }

    // -------------------------------------------------------------------------
    // Step 4: Auto-Insert New Book to Database
    // -------------------------------------------------------------------------
    const userId = metadata.userId || metadata.contributedBy || metadata.addedBy || null;

    const newBook = new Book({
      title: finalTitle,
      author: finalAuthor,
      summary: extractedDescription || metadata.description || '',
      coverImageUrl: imagePath,
      addedBy: userId,
      duplicateCheckPass: true
    });

    const newSavedBook = await newBook.save();
    console.log(`[AI Validation Service] Book successfully auto-inserted (ID: ${newSavedBook._id})`);

    return {
      success: true,
      status: "BOOK_CONTRIBUTED",
      message: "Book successfully identified and added to BookNest!",
      book: newSavedBook,
      validated: true,
      isDuplicate: false,
      detectedTitle: finalTitle,
      detectedAuthor: finalAuthor,
      reason: "Book successfully identified and added to BookNest!"
    };

  } catch (error) {
    console.error('[AI Validation Error]:', error.message);
    return {
      success: false,
      status: "INVALID_COVER",
      message: `Validation error: ${error.message}`,
      validated: false,
      isDuplicate: false,
      reason: `Validation error: ${error.message}`
    };
  }
}

module.exports = {
  validateContribution,
};
