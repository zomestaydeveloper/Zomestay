import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { siteConfigService, mediaService } from "../services";

export default function Footer() {
  const [siteConfig, setSiteConfig] = useState({
    logo: null,
    phoneNumber: null,
    supportEmail: null,
    address: null,
    socialMedia: {}
  });

  // Accordion state for mobile
  const [openAccordions, setOpenAccordions] = useState({
    company: false,
    helpCenter: false,
    contactInfo: false
  });

  const toggleAccordion = (section) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await siteConfigService.getSiteConfig();

        if (response?.data?.success && response?.data?.data) {
          const config = response.data.data;

          setSiteConfig({
            logo: config.logo ? mediaService.getMedia(config.logo) : null,
            phoneNumber: config.phoneNumber || null,
            supportEmail: config.supportEmail || null,
            address: config.address || null,
            socialMedia: config.socialMedia || {}
          });
        }
      } catch (error) {
        console.error("Failed to fetch site configuration:", error);
      }
    };

    fetchSiteConfig();
  }, []);

  return (
    <footer className="bg-[#004AAD] border-t border-gray-300">
      <div className="mx-auto w-full px-8 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1 h-[115px]">
            {siteConfig.logo && (
              <img
                src={siteConfig.logo}
                alt="Logo"
                className="h-20 w-auto brightness-0 invert"
              />
            )}
            <p className="mt-3 max-w-md text-sm text-white">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          {/* Company */}
          <div className="border-b border-white/20 md:border-none">
            <button
              onClick={() => toggleAccordion("company")}
              className="w-full flex justify-between items-center py-2 md:cursor-default"
            >
              <h3 className="text-sm font-semibold text-white uppercase">Company</h3>
              <ChevronDown className={`md:hidden text-white transition-transform ${openAccordions.company ? "rotate-180" : ""}`} />
            </button>

            <ul className={`mt-4 space-y-2 text-sm text-white transition-all ${openAccordions.company ? "block" : "hidden md:block"}`}>
              <li><Link to="/app/about_us">About Us</Link></li>
              <li><Link to="/app/legal_info">Legal Information</Link></li>
              <li><Link to="/app/contact_us">Contact Us</Link></li>
              <li><Link to="/app/blogs">Blogs</Link></li>
            </ul>
          </div>

          {/* Help Center */}
          <div className="border-b border-white/20 md:border-none">
            <button
              onClick={() => toggleAccordion("helpCenter")}
              className="w-full flex justify-between items-center py-2 md:cursor-default"
            >
              <h3 className="text-sm font-semibold text-white uppercase">Help Center</h3>
              <ChevronDown className={`md:hidden text-white transition-transform ${openAccordions.helpCenter ? "rotate-180" : ""}`} />
            </button>

            <ul className={`mt-4 space-y-2 text-sm text-white transition-all ${openAccordions.helpCenter ? "block" : "hidden md:block"}`}>
              <li><Link to="/app/find_a_property">Find a Property</Link></li>
              <li><Link to="/app/how_to_agent">How To Host?</Link></li>
              <li><Link to="/app/why-us">Why Us?</Link></li>
              <li><Link to="/app/faq">FAQs</Link></li>
              <li><Link to="/guides">Rental Guides</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="border-b border-white/20 md:border-none">
            <button
              onClick={() => toggleAccordion("contactInfo")}
              className="w-full flex justify-between items-center py-2 md:cursor-default"
            >
              <h3 className="text-sm font-semibold text-white uppercase">Contact Info</h3>
              <ChevronDown className={`md:hidden text-white transition-transform ${openAccordions.contactInfo ? "rotate-180" : ""}`} />
            </button>

            <div className={`mt-4 text-sm text-white space-y-2 transition-all ${openAccordions.contactInfo ? "block" : "hidden md:block"}`}>
              {siteConfig.phoneNumber && <p>Phone: {siteConfig.phoneNumber}</p>}
              {siteConfig.supportEmail && <p>Email: {siteConfig.supportEmail}</p>}
              {siteConfig.address && <p>Location: {siteConfig.address}</p>}

              {/* Social Media */}
              <div className="flex gap-3 mt-4">
                {siteConfig.socialMedia?.facebook && (
                  <a href={siteConfig.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <hr className="border-white/30" />

      <div className="h-[80px] flex items-center justify-between px-8 text-sm text-white">
        <div>© 2025 Zomestay | All rights reserved</div>
      </div>
    </footer>
  );
}
