// menuData.js
import {
  Home,
  
  Users,
  BedDouble,
  Shield,
  LayoutList,
  ClipboardList,
  
  CalendarCheck,
  Wallet,
  Wrench,
  MessageCircle,
  BarChart2,
  Settings,
  HelpCircle,
  Phone,
  BadgeDollarSign,
  PackageSearch,
  Receipt,
  FileCog,
  UserCheck,
  FolderOpen
} from "lucide-react";

export const MENU = [
  {
    label: "Front Desk",
    icon: <Home className="w-4 h-4" />,
    path: "front-desk",
  },

  {
    label: "Properties Management",
    icon: <BarChart2 className="w-4 h-4" />,
    children: [
      { label: "Amenities", path: "amenities", icon: <LayoutList className="w-4 h-4" /> },
      { label: "Facilities", path: "facilities", icon: <Wrench className="w-4 h-4" /> },
      { label: "Safety Features", path: "safety_features", icon: <Shield className="w-4 h-4" /> },
      { label: "Room Types", path: "room_types", icon: <BedDouble className="w-4 h-4" /> },
      { label: "Property Types", path: "property_types", icon: <Wrench className="w-4 h-4" /> },
      { label: "Cancellation Policies", path: "cancellation_policies", icon: <ClipboardList className="w-4 h-4" /> },
      { label: "Properties", path: "properties", icon: <FolderOpen className="w-4 h-4" /> },
    ],
  },

  {
    label: "Booking Management",
    icon: <CalendarCheck className="w-4 h-4" />,
    children: [
      { label: "All Bookings", path: "all_bookings", icon: <CalendarCheck className="w-4 h-4" /> },
    ],
  },

  {
    label: "Travel Agents",
    icon: <Users className="w-4 h-4" />,
    children: [
      { label: "Travel Agents List", path: "travel_agents_list", icon: <UserCheck className="w-4 h-4" /> },
      { label: "Travel Agents Rate", path: "travel_agents_rate", icon: <BadgeDollarSign className="w-4 h-4" /> },
    ],
  },

  {
    label: "Inventory Management",
    icon: <PackageSearch className="w-4 h-4" />,
    children: [
      { label: "Inventory", path: "inventory_management", icon: <PackageSearch className="w-4 h-4" /> },
    ],
  },

  {
    label: "Guest Management",
    icon: <Users className="w-4 h-4" />,
    children: [
      { label: "Registered Users", path: "registred_users", icon: <Users className="w-4 h-4" /> },
    ],
  },

  {
    label: "Payment & Transaction",
    icon: <Wallet className="w-4 h-4" />,
    children: [
      { label: "All Payments", path: "transactions", icon: <Receipt className="w-4 h-4" /> },
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

  {
    label: "Cancellation Requests",
    icon: <HelpCircle className="w-4 h-4" />,
    path: "cancellation-requests",
  },
];
