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
  Phone,
} from "lucide-react"; 




export const MENU = [

  {
    label: "Front Desk",
    icon: <Home className="w-4 h-4" />,
    path: "front-desk",
  },
  {
    label: "Properties Management",
    icon: <Building className="w-4 h-4" />,
    children: [
      { label: "  Amenities", path: "amenities" },
      { label: "  Facilities", path: "facilities" },
      { label: "  Safety Features", path: "safety_features" },
      { label: "  Room Types", path: "room_types" },
      { label: "  Property Types", path: "property_types" },
      { label: "  Cancellation Policies", path: "cancellation_policies" },
      { label: "  Properties", path: "properties" },
    ],
  },
  {
    label: "Booking Management",
    icon: <Users className="w-4 h-4" />,
    children: [
      { label: "All Bookings", path: "all_bookings" },
     
    ],
  },
  {
    label: "Travel Agents",
    icon: <Users className="w-4 h-4" />,
    children: [
      { label: " Travel Agents List  ", path: "travel_agents_list" },
      { label: " Travel Agents Rate", path: "travel_agents_rate" },
    ],
  },
  {
    label: "Inventory Management",
    icon: <Users className="w-4 h-4" />,
    children: [
      { label: " Inventory", path: "inventory_management" },
    ],
  },
  {
    label: "Guest Management",
    icon: <DollarSign className="w-4 h-4" />,
    children: [
      { label: " Registred Users", path: "registred_users" },
      
    ],
  },
  
  {
    label: "Payment  & Transaction",
    icon: <Wrench className="w-4 h-4" />,
    children: [
      { label: "All Payments", path: "transactions" },
     
    ],
  },
  {
    label: "Site Settings",
    icon: <Settings className="w-4 h-4" />,
    path: "site-configuration",
  },
  {
    label: "Callback Requests",
    icon: <Phone className="w-4 h-4" />,
    path: "callback-requests",
  },
  
  
];

