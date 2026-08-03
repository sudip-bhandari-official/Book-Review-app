# Book Review Backend - AI Validation Integration Guide & Verification

This document provides technical documentation for the AI Validation & Automated Moderation service inside `Backend/services/aiValidation.js`.

---

## 🎯 Primary Roles of the AI Validation Service

1. **Image Quality Check**:
   - Uses Gemini Multimodal Vision (`gemini-2.0-flash`) to verify if the uploaded photo is an authentic, readable book cover (rejecting blank, random, broken, or inappropriate image uploads).
2. **Duplicate Detection**:
   - Performs a MongoDB query against the `Book` collection matching the submitted or AI-detected title & author to prevent double entries.
3. **Automated Moderation**:
   - Returns a uniform JSON output containing `{ validated: boolean, isDuplicate: boolean, existingBookId: string|null, aiConfidence: number, reason: string, detectedTitle?: string, detectedAuthor?: string }`.

---

## 📁 Service Architecture & Entry Point

```
Backend/
├── routes/
│   └── contribute.js        <-- Express upload endpoint (/contribute/upload)
├── services/
│   ├── aiValidation.js      <-- Core Gemini Vision & DB duplicate moderation engine
│   └── aiVerifier.js        <-- Schema structured verification service
```

---

## 🔄 API Output Format

`validateContribution(imagePath, metadata)` returns a Promise resolving to:

```javascript
{
  "validated": true,           // True if valid book cover & safe image
  "isDuplicate": false,        // True if existing book title/author match in MongoDB
  "existingBookId": null,      // Mongo _id if duplicate is found
  "aiConfidence": 0.95,        // Confidence score (0.0 to 1.0)
  "detectedTitle": "Dune",     // Title extracted from image by Gemini
  "detectedAuthor": "Frank Herbert", // Author extracted from image by Gemini
  "reason": "Valid book cover" // Human-readable moderation summary
}
```

---

## 🚀 How the Backend Reacts (`routes/contribute.js`)

- **Clean Approval (`validated: true` & `isDuplicate: false`)**:
  Backend automatically saves a new `Book` entry into MongoDB, sets `contribution.status = 'approved'`, and returns `200 OK` with the new `book`.
- **Duplicate (`isDuplicate: true`)**:
  Backend sets `contribution.status = 'rejected'`, links `finalBookId = existingBookId`, and returns `409 Conflict`.
- **Quality Failure (`validated: false`)**:
  Backend sets `contribution.status = 'rejected'` and returns `400 Bad Request` with the rejection reason.

---

## ⚙️ Environment Setup

Add your Gemini API key to `Backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

*Note: If `GEMINI_API_KEY` is omitted, the service gracefully falls back to local database & metadata moderation without crashing.*
