// 🌍 Global API Configuration
// In production (Vercel), VITE_API_URL set in env variables will be used.
// In development, it falls back to localhost.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Use the Backend URL (without /api) for uploads
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/uploads/${path}`;
};
