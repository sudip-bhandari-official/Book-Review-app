# Book Review App

A full-stack Book Review Application divided into separate frontend and backend modules.

## Project Structure

```text
.
├── frontend/             # Frontend HTML, CSS, JavaScript, and asset files
│   ├── index.html        # Main landing page
│   ├── books.html        # Book catalog page
│   ├── css/              # Application stylesheets
│   ├── js/               # Frontend JavaScript logic
│   └── assets/           # Media & book cover assets
├── Backend/              # Node.js / Express backend server
│   ├── server.js         # Entry point for Express server
│   ├── package.json      # Backend dependencies and scripts
│   ├── models/           # Mongoose schemas & data models
│   ├── routes/           # API endpoints (auth, books, profile, etc.)
│   ├── middleware/       # Express middlewares (auth, upload, etc.)
│   └── services/         # Business logic services
├── README.md
└── LICENSE
```

## Getting Started

### 1. Backend Setup
```bash
cd Backend
npm install
npm run dev
```

### 2. Frontend Setup
Open `frontend/index.html` directly in your browser or serve it using a local static web server.