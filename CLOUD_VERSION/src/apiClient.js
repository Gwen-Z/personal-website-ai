import axios from 'axios';

// This function determines the correct API base URL based on the environment.
const getBaseURL = () => {
  // When running the local development server (`npm run dev`),
  // process.env.NODE_ENV is automatically set to 'development'.
  if (process.env.NODE_ENV === 'development') {
    // In development, we explicitly point to the backend server running on port 3001.
    return 'http://localhost:3001';
  }
  // In production (when deployed to Vercel), the frontend and backend are on the same domain.
  // An empty baseURL means the requests will be relative to the current domain (e.g., '/api/...').
  return ''; 
};

// Create a dedicated axios instance with the dynamic base URL.
const apiClient = axios.create({
  baseURL: getBaseURL(),
});

export default apiClient;
