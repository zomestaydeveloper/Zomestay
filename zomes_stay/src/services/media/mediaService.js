import { API_BASE_URL } from "../api/apiEndpoints";

const mediaService = {
  // Get full media URL
  getMedia: (path) => {
    if (!path) return '';
    // If it's already a full URL, return as is
    if (path.startsWith('http')) return path;
    // Otherwise, construct the full URL
    return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
  }
};

export default mediaService;
