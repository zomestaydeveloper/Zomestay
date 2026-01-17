// menuData.js
import {
    Home,
    Building,
    Users,
    FileText,
    DollarSign,
    Wrench,
    MessageSquare,
    BarChart2,
    Settings,
    HelpCircle,
  } from "lucide-react"; 
  
  
  
  
  export const MENU_HOST = [
   
    {
      label: "Front Desk Management",
      icon: <Home className="w-4 h-4" />,
      path: "host-front-desk", 
    },
    {
      label: "Properties Management",
      icon: <Building className="w-4 h-4" />,
      children: [
        { label: "Amenities", path: "host-amenities" },
        { label: "Facilities", path: "host-facilities" },
        { label: "Safety Features", path: "host-safety_features" },
        { label: "Room Types", path: "host-room_types" },
        { label: "Property Types", path: "host-property_types" },
        { label: "Properties", path: "host-properties" },
      ],
    },
    {
      label: "Booking Management",
      icon: <Users className="w-4 h-4" />,
      children: [
        { label: "All Bookings", path: "host-all_bookings" },
       
      ],
    },
    {
      label: "inventory Management",
      icon: <Users className="w-4 h-4" />,
      children: [
        { label: "Inventory", path: "inventory_management" },
        { label: "Meal Plan", path: "meal_plans" },

       
      ],
    },
    {
      label: "Rate Plan Management",
      icon: <Users className="w-4 h-4" />,
      children: [
        { label: "Best Rates", path: "best_available_rates" },

       
      ],
    },
    {
      label: "Guest Management",
      icon: <DollarSign className="w-4 h-4" />,
      children: [
        { label: " Registred Users", path: "host-registred_users" },
        
      ],
    },
  
    {
      label: "Payment  & Transaction",
      icon: <Wrench className="w-4 h-4" />,
      children: [
        { label: "All Payments", path: "host-transactions" },
       
      ],
    }
   
  
   
  ];
  
  
