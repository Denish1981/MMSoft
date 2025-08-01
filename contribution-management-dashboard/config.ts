const isProduction = import.meta.env?.PROD ?? !['localhost', '127.0.0.1', ''].includes(window.location.hostname);

// In production, the backend is served from the same origin, so we use a relative path.
// In development, the Vite dev server is on a different port than the backend, so we use an absolute path.
export const API_URL = isProduction ? '/api' : 'http://localhost:3001/api';