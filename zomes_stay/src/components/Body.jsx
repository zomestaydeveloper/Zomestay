import Header from "./Header";
import Footer from "./Footer";
import { Outlet, useLocation } from "react-router-dom";
import Card from "./Card";
import DefaultHeader from "./DefaultHeader";
import { useState } from "react"; // Add this import


export default function Body() {

  const location = useLocation()
  const isHome = location.pathname ==='/app/home'|location.pathname ==='/app/agent/home'
   const [searchParams, setSearchParams] = useState(null);

   const handleSearch = (params) => {
    setSearchParams(params);
    
  };
   
  return (
    <div className="min-h-screen w-full flex flex-col">

     {isHome ? <Header onSearch={handleSearch} /> : <DefaultHeader />}
       
      <main className="flex-1">
        <Outlet context={{ searchParams }} />
      </main>

      <Footer />
    </div>
  );
}
