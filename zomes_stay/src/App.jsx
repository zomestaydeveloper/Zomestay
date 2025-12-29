import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SearchProvider } from "./context/SearchContext";
import { PublicRoutes, UserRoutes, AgentRoutes, AdminRoutes, HostRoutes } from "./routes";

/**
 * App Component
 * - Main application entry point
 * - Uses organized route structure for better maintainability
 */
export default function App() {
  return (
    <BrowserRouter>
      <SearchProvider>
        <ToastContainer position="top-center" autoClose={5000} />
        
        {/* Organized Route Structure */}
        <PublicRoutes />
        <UserRoutes />
        <AgentRoutes />
        <AdminRoutes />
        <HostRoutes />
      </SearchProvider>
    </BrowserRouter>
  );
}
