/* ============================================================
   BookNest — Runtime Config
   Centralises the backend base URL so it works in local dev
   AND in production (Vercel / any static host).
   ============================================================ */

// Vite exposes VITE_* vars on import.meta.env at build time.
// In dev we fall back to http://localhost:5000 if not set.
export const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:5000';

// Small helper for building absolute asset URLs (uploaded covers).
// If the URL is already absolute / a blob / a local asset path we leave it alone;
// otherwise we treat it as a path served from the backend.
export function toAssetUrl(url) {
  if (!url) return 'https://placehold.co/300x400/6d5efc/ffffff?text=BookCover';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('assets/')
  ) {
    return url;
  }
  // Normalise leading slash
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${path}`;
}
