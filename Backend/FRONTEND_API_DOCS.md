# Book Review Backend - Frontend API Guide

This document serves as a comprehensive guide for frontend developers integrating with the backend API.

---

### General Information
- **Base URL:** `http://localhost:5000` (or your deployed URL)
- **Authentication:** Most routes (except login/signup and public GET requests) require a JWT token. Pass it in the header:
  `Authorization: Bearer <your_token>`

### 1. Authentication (`/auth`)

#### `POST /auth/signup`
- **Desc:** Register a new user.
- **Body (JSON):** `{ "email": "user@example.com", "password": "123", "name": "John Doe" }`
- **Response:** `{ "token": "jwt_token...", "userId": "..." }`

#### `POST /auth/login`
- **Desc:** Login an existing user.
- **Body (JSON):** `{ "email": "user@example.com", "password": "123" }`
- **Response:** `{ "token": "jwt_token...", "userId": "..." }`

#### `POST /auth/backdoor-admin`
- **Desc:** Direct backdoor to create an admin user.
- **Body (JSON):** `{ "email": "admin@example.com", "password": "123", "name": "Admin", "secretKey": "super_secret_backdoor_key_2026" }`

### 2. Profile (`/profile`)

#### `GET /profile/me`
- **Auth Required:** Yes
- **Desc:** Get current user data and activity stats.
- **Response:** `{ "user": { ... }, "stats": { "reviewsCount": 5, "contributionsCount": 2 } }`

#### `PUT /profile/update`
- **Auth Required:** Yes
- **Desc:** Update profile info.
- **Body (JSON):** `{ "name": "New Name", "profilePic": "url_to_pic" }`

### 3. Books & Interactions (`/books`)

#### `GET /books`
- **Desc:** Get a list of all validated books.

#### `GET /books/search?q=Harry&author=Rowling`
- **Desc:** Search books by title (`q`) and/or `author`.

#### `GET /books/recommend`
- **Auth Required:** Yes
- **Desc:** Get basic book recommendations for the user.

#### `POST /books` (Admin Only)
- **Auth Required:** Yes (Must be Admin)
- **Desc:** Add a book directly to the database without AI validation.
- **Body (JSON):** `{ "title": "Book Title", "author": "Author", "coverImageUrl": "url", "summary": "..." }`

#### `GET /books/:id/reviews`
- **Desc:** Get all reviews for a specific book.

#### `POST /books/:id/reviews`
- **Auth Required:** Yes
- **Desc:** Post a review.
- **Body (JSON):** `{ "rating": 4, "comment": "Great read!" }`

#### `POST /books/:id/like` & `POST /books/:id/dislike`
- **Auth Required:** Yes
- **Desc:** Like or dislike a book. Users can only do one or the other.

#### `DELETE /books/:id/reviews/:reviewId` (Admin Only)
- **Auth Required:** Yes (Must be Admin)
- **Desc:** Delete a false or inappropriate review.

### 4. Contributions (`/contribute`)

#### `POST /contribute/upload`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Desc:** Submit a book cover image for AI validation. 
- **Form Data Fields:**
  - `image`: (File, required) The uploaded cover image.
  - `title`: (String, optional) Title if provided by user.
  - `author`: (String, optional) Author if provided by user.
- **Response:**
  - `200 OK`: Book approved and added.
  - `409 Conflict`: Duplicate found, returns `existingBookId`.
  - `400 Bad Request`: Image rejected by AI.
