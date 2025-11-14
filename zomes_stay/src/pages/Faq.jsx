import React, { useState } from "react";

const accordionData = [
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
  {
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  },
];

const Faq = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleAccordion = (idx) => {
    setOpenIndex((prev) => (prev === idx ? -1 : idx));
  };

  return (
    <div className="min-h-[80vh] bg-[#f8fafc] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-4xl mx-auto">
        {/* Blue Header */}
        <div className="rounded-t-xl bg-[#004AAD] px-6 py-4 text-white font-semibold text-lg md:text-xl shadow-md">
        FAQ's
        </div>
        {/* White Card Container */}
        <div className="bg-white rounded-b-xl shadow-md pb-2">
          {accordionData.map((item, idx) => (
            <div
              key={idx}
              className={`border-b border-[#f1f5f9] last:border-none transition-all duration-300`}
            >
              <button
                className="w-full flex items-center justify-between text-left px-6 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/40"
                aria-expanded={openIndex === idx}
                aria-controls={`panel-${idx}`}
                onClick={() => toggleAccordion(idx)}
              >
                <span className="font-semibold text-[#004AAD] text-sm md:text-base">
                  {item.title}
                </span>
                <span className="ml-2">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-300 ${openIndex === idx ? "rotate-180" : "rotate-0"}`}
                  >
                    <path
                      d="M7 10l5 5 5-5"
                      stroke="#222"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                id={`panel-${idx}`}
                className={`overflow-hidden transition-all duration-300 px-6 ${openIndex === idx ? "max-h-[400px] py-2" : "max-h-0 py-0"}`}
                style={{
                  opacity: openIndex === idx ? 1 : 0,
                  pointerEvents: openIndex === idx ? "auto" : "none",
                }}
              >
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Faq;