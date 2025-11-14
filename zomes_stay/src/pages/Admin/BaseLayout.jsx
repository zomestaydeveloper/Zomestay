import { useState, useEffect } from "react";
import SideCard from "../../components/Admin/SideCard";
import Header from "../../components/Admin/Header";
import Footer from "../../components/Admin/Footer";
import { Outlet } from "react-router-dom";

const BaseLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log("BaseLayout");

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    }
  }, [sidebarOpen]);

  return (
    <div className="w-full h-screen bg-white flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 lg:w-72 h-screen sticky top-0">
        <SideCard className="w-64 lg:w-72 sticky top-0" />
      </div>

      {/* Mobile sidebar (off-canvas) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div
            className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <SideCard className="h-full" onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default BaseLayout;