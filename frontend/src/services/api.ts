import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.1.10:3000',
  headers: {
    skip_zrok_interstitial: 1, // Header to avoid CORS due to interstitial page when making call to BE
  }
});
