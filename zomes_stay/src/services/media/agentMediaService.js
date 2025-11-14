import { API_BASE_URL } from "../api/apiEndpoints";

const agentMediaService = {
  // Resolve full URL for agent-related media (e.g., certificates)
  getMedia: (path) => {
    if (!path) return '';
    if (typeof path !== 'string') return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
  }
};

export default agentMediaService;


