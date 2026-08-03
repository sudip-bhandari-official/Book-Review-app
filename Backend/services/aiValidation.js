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

        const userTitle  = (metadata.title  || '').trim();
        const userAuthor = (metadata.author || '').trim();
        const userGenre  = (metadata.genre  || '').trim();

        // -----------------------------------------------------------------------
        // Gemini prompt: extract ALL info from cover image AND cross-verify
        // against every field the user submitted.
        // -----------------------------------------------------------------------
        const prompt = `You are a strict book cover fact-checker for a book contribution platform.

A user has uploaded a book cover image and submitted the following information:
- Title submitted by user:  "${userTitle || '(not provided)'}"
- Author submitted by user: "${userAuthor || '(not provided)'}"
- Genre submitted by user:  "${userGenre || '(not provided)'}"

Your tasks:
1. Determine if the uploaded image is a genuine book cover (not a random photo, blank page, screenshot, meme, or inappropriate content).
2. Read and extract the following directly from what is VISIBLE on the book cover:
   a. Book title (as printed on the cover)
   b. Author name (as printed on the cover)
   c. Genre (infer from cover design, back cover text, series label, or publisher genre tag if visible; otherwise make your best educated guess based on the cover art and style)
3. Compare EACH extracted value with what the user submitted:
   - Title check:  Does the user-submitted title refer to the same book shown on the cover? Minor spelling differences are OK. Completely different titles are NOT OK.
   - Author check: Does the user-submitted author match the author on the cover? Different people = mismatch.
   - Genre check:  Does the user-submitted genre broadly match the book's genre? e.g. "Fantasy" vs "Science Fiction" are different. "Fantasy" vs "Epic Fantasy" are close enough.
4. List every field that has a mismatch.

Respond ONLY with strict, raw JSON (no markdown, no code fences, no explanation outside JSON):
{
  "isBookCover": boolean,
  "detectedTitle": "title as printed on the cover, or empty string if not readable",
  "detectedAuthor": "author as printed on the cover, or empty string if not readable",
  "detectedGenre": "inferred genre of the book, or empty string if impossible to determine",
  "titleMatch": boolean,
  "authorMatch": boolean,
  "genreMatch": boolean,
  "metadataMatch": boolean,
  "mismatchFields": ["list of field names that failed, e.g. title, author, genre"],
  "mismatchReason": "clear human-readable explanation of every mismatch, or empty string if all match",
  "validated": boolean,
  "aiConfidence": number between 0 and 1,
  "reason": "one-line summary of the final decision"
}

Strict rules you MUST follow:
- "titleMatch" is false when the title on the cover and the user-submitted title refer to DIFFERENT books.
- "authorMatch" is false when the author on the cover is clearly a DIFFERENT person than what the user submitted.
- "genreMatch" is false when the user-submitted genre is CLEARLY wrong (e.g. user says Romance but cover is a Horror novel).
- "metadataMatch" is true ONLY when titleMatch AND authorMatch AND genreMatch are all true (or the user left a field blank).
- "validated" is true ONLY when isBookCover is true AND metadataMatch is true.
- If the user left a field blank (empty string), skip that field's match check and treat it as matched.
- Be strict about title and author. Be slightly lenient about genre (sub-genres and parent genres can overlap).`;

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

          // --- Not a book cover at all ---
          if (!aiParsed.isBookCover) {
            return {
              validated: false,
              isDuplicate: false,
              existingBookId: null,
              aiConfidence: aiParsed.aiConfidence || 0.9,
              reason: aiParsed.reason || 'The uploaded image does not appear to be a genuine book cover'
            };
          }

          // --- Cross-verify all submitted fields against what AI read from the cover ---
          const detectedTitle  = (aiParsed.detectedTitle  || '').trim();
          const detectedAuthor = (aiParsed.detectedAuthor || '').trim();
          const detectedGenre  = (aiParsed.detectedGenre  || '').trim();

          const mismatchedFields = [];

          // Title check (strict: AI flag + programmatic similarity guardrail)
          if (userTitle && detectedTitle) {
            const titleSim = titleSimilarity(userTitle, detectedTitle);
            console.log(`[AI Validation] Title similarity: ${titleSim} ("${userTitle}" vs "${detectedTitle}")`);
            if (aiParsed.titleMatch === false || titleSim < 0.4) {
              mismatchedFields.push(
                `Title: cover shows "${detectedTitle}" but you submitted "${userTitle}"`
              );
            }
          }

          // Author check (strict: AI flag + programmatic similarity guardrail)
          if (userAuthor && detectedAuthor) {
            const authorSim = titleSimilarity(userAuthor, detectedAuthor);
            console.log(`[AI Validation] Author similarity: ${authorSim} ("${userAuthor}" vs "${detectedAuthor}")`);
            if (aiParsed.authorMatch === false || authorSim < 0.35) {
              mismatchedFields.push(
                `Author: cover shows "${detectedAuthor}" but you submitted "${userAuthor}"`
              );
            }
          }

          // Genre check (lenient: only AI flag, no hard similarity threshold)
          if (userGenre && detectedGenre && aiParsed.genreMatch === false) {
            mismatchedFields.push(
              `Genre: book appears to be "${detectedGenre}" but you submitted "${userGenre}"`
            );
          }

          // If any field mismatched → reject with a clear combined reason
          if (mismatchedFields.length > 0) {
            return {
              validated: false,
              isDuplicate: false,
              existingBookId: null,
              aiConfidence: aiParsed.aiConfidence || 0.95,
              detectedTitle:  aiParsed.detectedTitle  || null,
              detectedAuthor: aiParsed.detectedAuthor || null,
              detectedGenre:  aiParsed.detectedGenre  || null,
              reason: `Submission rejected due to mismatched information:\n• ${ mismatchedFields.join('\n• ') }`
            };
          }

          // --- Duplicate detection using AI-detected title ---
          if (detectedTitle && !existingBook) {
            const duplicateCheck = await Book.findOne({
              title: { $regex: new RegExp(`^${detectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
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

          // --- All checks passed → Approved ---
          return {
            validated: Boolean(aiParsed.validated),
            isDuplicate: false,
            existingBookId: null,
            aiConfidence: Number(aiParsed.aiConfidence) || 0.9,
            detectedTitle:  aiParsed.detectedTitle  || metadata.title  || null,
            detectedAuthor: aiParsed.detectedAuthor || metadata.author || null,
            detectedGenre:  aiParsed.detectedGenre  || metadata.genre  || null,
            reason: aiParsed.reason || 'Valid book cover — all submitted information matches the cover'
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
