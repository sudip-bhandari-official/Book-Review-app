require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bookRoutes = require('./routes/books');
const contributeRoutes = require('./routes/contribute');

const app = express();

// ---------------------------------------------------------------------------
// CORS — allow a configurable list of origins (comma-separated in CORS_ORIGINS)
// so the Vercel frontend can talk to this backend.
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl/Postman/mobile) and all whitelisted origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '5mb' }));

// Make sure uploads/ exists and serve it statically
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Use absolute path so it works regardless of CWD (important for Render/Heroku/etc.)
app.use('/uploads', express.static(uploadDir));

// Simple health-check endpoint (useful for Render "health check path")
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/books', bookRoutes);
app.use('/contribute', contributeRoutes);

// Root
app.get('/', (_req, res) => {
  res.json({ msg: 'BookNest API is running 📚', docs: '/health' });
});

// ---------------------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ msg: `Route not found: ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({ msg: err.message || 'Server Error' });
});

// ---------------------------------------------------------------------------
// DB + listener
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    '[warn] MONGODB_URI is not set. The server will start but DB calls will fail. Set it in your .env (Render/Vercel env vars).'
  );
}

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`   Allowed CORS origins: ${allowedOrigins.join(', ')}`);
      });
    })
    .catch((err) => {
      console.error('❌ Error connecting to MongoDB:', err);
      process.exit(1);
    });
} else {
  // Still start the server so Render's "deploy succeeds" check passes;
  // DB-dependent endpoints will simply error until MONGODB_URI is set.
  app.listen(PORT, () => {
    console.log(`⚠️  Server running on port ${PORT} WITHOUT a database connection`);
  });
}
