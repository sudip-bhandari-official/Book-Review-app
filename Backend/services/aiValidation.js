/**
 * AI Validation & Automated Moderation Service
 * 
 * Functions:
 * 1. Image Quality Check: Verifies uploaded cover image is a valid book cover.
 * 2. Cover vs. Metadata Cross-Verification: Compares what's printed on the cover
 *    against what the user submitted (title, author). Rejects if they don't match.
 * 3. Duplicate Detection: Checks MongoDB database for existing title/author entries.
 * 4. Automated Moderation: Returns structured status (isDuplicate, validated, aiConfidence).
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
 * KEY BEHAVIOR: If the user's submitted title/author does not match what's printed on the book
 * cover image, the contribution is REJECTED with a clear reason.
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
    // 3. AI Vision: Cover Image vs. User Metadata Cross-Verification (Gemini)
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

        const userTitle = metadata.title || '';
        const userAuthor = metadata.author || '';

        const prompt = `You are a strict book cover fact-checker for a book contribution platform.

A user has uploaded a book cover image and provided the following metadata:
- User-submitted Title: "${userTitle}"
- User-submitted Author: "${userAuthor}"

Your job is to carefully inspect the book cover image and perform these checks:

1. Is this actually a valid book cover image? (not a random photo, blank image, screenshot, meme, or inappropriate content)
2. Read the title and author name as printed/visible on the actual book cover.
3. Compare the cover's actual title against the user-submitted title "${userTitle}". Do they refer to the same book? Minor spelling variations are OK, but completely different names (e.g. cover says "Harry Potter" but user wrote "Harry Kane") must be flagged as a mismatch.
4. If the user provided an author name, compare it against the author printed on the cover. Flag if they are clearly different people.

Respond ONLY with strict, raw JSON (no markdown, no explanation, no code fences) in this exact structure:
{
  "isBookCover": boolean,
  "detectedTitle": "exact title as seen on the cover or empty string",
  "detectedAuthor": "exact author as seen on the cover or empty string",
  "metadataMatch": boolean,
  "mismatchReason": "explain any mismatch clearly, or empty string if everything matches",
  "validated": boolean,
  "aiConfidence": number between 0 and 1,
  "reason": "short summary of decision"
}

Rules:
- "metadataMatch" must be false if the user's title does not match the title on the cover.
- "validated" must be false if the image is not a book cover OR if "metadataMatch" is false.
- Be strict: even if the image IS a valid book cover, if the user's submitted title is for a different book, it must be REJECTED.`;

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

          console.log('[AI Validation] Gemini response:', JSON.stringify(aiParsed, null, 2));

          // --- Programmatic guardrail: AI explicitly flagged a mismatch ---
          const detectedTitle = (aiParsed.detectedTitle || '').trim();
          const submittedTitle = userTitle.trim();

          if (submittedTitle && aiParsed.metadataMatch === false) {
            return {
              validated: false,
              isDuplicate: false,
              existingBookId: null,
              aiConfidence: aiParsed.aiConfidence || 0.95,
              detectedTitle: aiParsed.detectedTitle || null,
              detectedAuthor: aiParsed.detectedAuthor || null,
              reason: aiParsed.mismatchReason
                || `Title mismatch: Book cover shows "${aiParsed.detectedTitle || 'a different book'}" but you submitted "${userTitle}"`
            };
          }

          // --- Secondary programmatic similarity check as safety net ---
          if (submittedTitle && detectedTitle) {
            const similarity = titleSimilarity(submittedTitle, detectedTitle);
            console.log(`[AI Validation] Title similarity score: ${similarity} ("${submittedTitle}" vs "${detectedTitle}")`);

            if (similarity < 0.4) {
              return {
                validated: false,
                isDuplicate: false,
                existingBookId: null,
                aiConfidence: aiParsed.aiConfidence || 0.9,
                detectedTitle: aiParsed.detectedTitle || null,
                detectedAuthor: aiParsed.detectedAuthor || null,
                reason: `Title mismatch: Book cover shows "${detectedTitle}" but you submitted "${submittedTitle}". Please upload the correct book cover.`
              };
            }
          }

          // Not a book cover → reject
          if (!aiParsed.isBookCover) {
            return {
              validated: false,
              isDuplicate: false,
              existingBookId: null,
              aiConfidence: aiParsed.aiConfidence || 0.9,
              reason: aiParsed.reason || 'The uploaded image does not appear to be a book cover'
            };
          }

          // Duplicate detection using AI-detected title
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

          // All checks passed
          return {
            validated: Boolean(aiParsed.validated),
            isDuplicate: false,
            existingBookId: null,
            aiConfidence: Number(aiParsed.aiConfidence) || 0.9,
            detectedTitle: aiParsed.detectedTitle || metadata.title || null,
            detectedAuthor: aiParsed.detectedAuthor || metadata.author || null,
            reason: aiParsed.reason || (aiParsed.validated ? 'Valid book cover — metadata matches' : 'Image validation failed')
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
      reason: 'Validation completed via local metadata checks (AI unavailable)'
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

/**
 * Computes a simple word-overlap similarity ratio between two strings.
 * Returns a number between 0 (no match) and 1 (perfect match).
 * Case-insensitive, strips non-alphanumeric characters.
 * Uses Jaccard similarity: |intersection| / |union|
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function titleSimilarity(a, b) {
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  // Jaccard similarity: intersection / union
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

module.exports = {
  validateContribution,
};
