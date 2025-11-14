import React, { useEffect, useRef } from "react";

const SignInSuccess = ({ onClose, onContinue }) => {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const continueBtnRef = useRef(null);

  // Trap focus inside modal
  useEffect(() => {
    const focusableEls = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    function handleTab(e) {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      } else if (e.key === "Escape") {
        handleClose();
      }
    }
    modalRef.current.focus();
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
    // eslint-disable-next-line
  }, []);

  function handleClose() {
    if (onClose) onClose();
    // else, fallback: window.history.back();
  }

  function handleContinue() {
    if (onContinue) onContinue();
    // else, fallback: window.location.href = "/";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-60 "
      aria-modal="true"
      role="dialog"
      tabIndex="-1"

    >
      <div
        ref={modalRef}
        tabIndex="-1"
        className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-[480px] px-6  sm:px-10 py-8 sm:py-10 flex flex-col items-center outline-none"
        style={{ minWidth: 320 }}
      >
        {/* Close Button */}
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-5 right-5 text-black hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#004AAD]/40 rounded-full p-1"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {/* Green Check Icon */}
        <div className="flex items-center justify-center mt-2 mb-6">
          <div className="bg-[#22C55E] rounded-full flex items-center justify-center" style={{ width: 80, height: 80 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="22" fill="#22C55E" />
              <path d="M15 23.5L20.5 29L29 17" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        {/* Headline */}
        <h2 className="text-center font-bold text-[#222] text-[1.35rem] sm:text-[1.45rem] leading-tight mb-2">
          You have successfully<br className="hidden sm:block" /> signed in as an agent.
        </h2>
        {/* Subtext */}
        <p className="text-center text-gray-500 text-base sm:text-[1.03rem] mb-7 max-w-xs sm:max-w-sm mx-auto">
          Welcome back! You can now access your agent pages, manage properties enquiry.
        </p>
        {/* Continue Button */}
        <button
          ref={continueBtnRef}
          type="button"
          onClick={handleContinue}
          className="w-full h-12 rounded-full bg-[#004AAD] text-white font-medium text-base shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-[#004AAD]/50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SignInSuccess;