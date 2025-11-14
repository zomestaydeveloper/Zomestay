import Logo from "../../assets/loginPage/logo.png";
import SidebarItem from "./SidebarItem";
import { MENU} from "../../data/menuData";
import { MENU_HOST} from "../../data/menuData-host";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

const SideCard = ({ className = "", onNavigate = () => {} }) => {
  const { pathname } = useLocation();
  
  // Determine role based on current pathname (handles both admin and host logged in simultaneously)
  const adminAuth = useSelector((state) => state.adminAuth);
  const hostAuth = useSelector((state) => state.hostAuth);
  
  // Use pathname to determine which role context we're in
  let role = '';
  if (pathname.startsWith('/admin/base')) {
    role = 'admin';
  } else if (pathname.startsWith('/host/base')) {
    role = 'host';
  } else {
    // Fallback: check which auth has token (admin takes priority)
    role = adminAuth?.adminAccessToken ? 'admin' : hostAuth?.hostAccessToken ? 'host' : '';
  }

  const menu = role === "host" ? MENU_HOST : MENU;

  return (
  <aside className={`h-screen bg-white shadow-sm flex flex-col ${className}`}>
    <div className="flex h-full w-full flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <img src={Logo} alt="Logo" className="w-50 h-auto " />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {menu.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            return hasChildren ? (
              <li key={item.label}>
                <SidebarItem item={item} />
              </li>
            ) : (
              <li key={item.label} onClick={onNavigate}>
                <SidebarItem item={item} />
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        © {new Date().getFullYear()} Your Company
      </div>
    </div>
  </aside>
)
}

export default SideCard;
