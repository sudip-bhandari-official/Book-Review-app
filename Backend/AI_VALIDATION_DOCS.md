# Book Review Backend - AI Validation Integration Guide

This document is for the AI developer implementing the book cover validation logic.

---

### Integration Point
The AI validation logic lives entirely in **`services/aiValidation.js`**. The backend controller already imports and awaits the `validateContribution` function.

### Function Signature
```javascript
const validateContribution = async (imagePath, metadata) => {
  // Your AI Logic Here
}
```

### Inputs
1. **`imagePath` (String):** The absolute or relative local path to the image saved on the server (e.g., `uploads/1691028371.png`). You can use `fs` to read this file and send it to your ML model or OCR API.
2. **`metadata` (Object):** Any additional form data sent by the frontend (e.g., `{ title: "...", author: "..." }`). This may be empty if the frontend only uploads the image.

### Expected Output
The function **MUST** return a Promise that resolves to an object matching the following structure exactly:

```javascript
{
  isDuplicate: boolean,    // True if the book already exists in our database
  existingBookId: string,  // The MongoDB _id of the existing book (if duplicate), otherwise null
  validated: boolean,      // True if it is a valid book cover, False if it's a random image/spam
  aiConfidence: number     // (Optional) Confidence score of the AI prediction (0 to 1)
}
```

### How the Backend Reacts
The backend controller (`routes/contribute.js`) handles the rest based on your output:
- **If `validated: true` & `isDuplicate: false`**: The backend automatically creates a new Book record, marks the user's contribution as `approved`, and links them.
- **If `isDuplicate: true`**: The backend rejects the creation, marks the contribution as `rejected` (due to duplicate), and returns a `409` to the frontend with the `existingBookId`.
- **If `validated: false`**: The backend outright rejects the contribution and returns a `400` to the frontend.

### Next Steps for the AI Developer
1. Open `services/aiValidation.js`.
2. Remove the mock `setTimeout`.
3. Implement your OCR (e.g., Tesseract.js, Google Cloud Vision) or custom image comparison logic.
4. Implement a database check (e.g., `await Book.findOne({ title: parsedTitle })`) to set the `isDuplicate` and `existingBookId` flags appropriately.
