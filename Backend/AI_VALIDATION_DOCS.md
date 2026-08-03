# Book Review Backend - AI Validation Integration Guide & Verification

This document provides technical documentation for the AI-powered Book Contribution workflow inside `Backend/services/aiValidation.js`.
The service uses **Google Gemini** (`gemini-2.0-flash`) via the `@google/genai` SDK for visual text extraction (OCR), duplicate detection, and automated database insertion.

---

## 🎯 4-Step AI-Powered Contribution Workflow

### 1. 🔍 Step 1: AI OCR & Feature Extraction (Gemini API)
- Scans the uploaded book cover image using Google Gemini (`gemini-2.0-flash`).
- Performs visual text extraction (OCR) to read `bookTitle`, `authorName`, and a brief `description`/`genre`.
- Returns structured JSON from Gemini:
  ```json
  {
    "isValidBookCover": true,
    "extractedTitle": "Dune",
    "extractedAuthor": "Frank Herbert",
    "extractedDescription": "A science fiction masterpiece set on the desert planet Arrakis.",
    "aiConfidence": 0.98
  }
  ```

### 2. 🛡️ Step 2: Quality & Image Validation Check
- If `isValidBookCover` is `false` or confidence is too low (< 0.4), the submission is rejected immediately:
  ```json
  {
    "success": false,
    "status": "INVALID_COVER",
    "message": "Uploaded image does not appear to be a valid book cover."
  }
  ```

### 3. 🔎 Step 3: Database Duplicate Scan
- Uses `extractedTitle` and `extractedAuthor` (or user inputs as fallback).
- Queries the MongoDB `Book` collection using case-insensitive regex matching.
- **If book already exists in DB**:
  ```json
  {
    "success": false,
    "status": "DUPLICATE_ENTRY",
    "message": "This book already exists in BookNest database.",
    "existingBookId": "65b1c..."
  }
  ```

### 4. 💾 Step 4: Auto-Insert New Book to Database
- **If book does not exist in DB**:
  Automatically creates and saves a new `Book` entry in MongoDB with the extracted info and uploaded cover image path:
  - `title`: `extractedTitle`
  - `author`: `extractedAuthor`
  - `summary`: `extractedDescription`
  - `coverImageUrl`: `imagePath`
  - `addedBy`: `userId`
  - `duplicateCheckPass`: `true`
- Returns success response:
  ```json
  {
    "success": true,
    "status": "BOOK_CONTRIBUTED",
    "message": "Book successfully identified and added to BookNest!",
    "book": { ... }
  }
  ```

---

## 📁 Service Architecture

```
Backend/
├── routes/
│   └── contribute.js        <-- Express upload controller (/contribute/upload)
├── services/
│   ├── aiValidation.js      <-- Core 4-step Gemini OCR & Auto-DB insertion service
│   └── aiVerifier.js        <-- Structured verification helper
```

---

## ⚙️ Environment Setup

Add your Gemini API key to `Backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

*Note: If `GEMINI_API_KEY` is omitted or rate-limited, the service gracefully falls back to user metadata and local database moderation without crashing.*
