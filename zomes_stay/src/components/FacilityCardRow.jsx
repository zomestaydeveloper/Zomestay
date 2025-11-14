import React, { useRef } from "react";
import FacilityCard from "./FacilityCard";

export default function FacilityCardRow({ facilities = [] }) {
  const scrollerRef = useRef(null);

  const scroll = (dx) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Row scroller */}
      
      <div
  ref={scrollerRef}
  className="flex items-stretch gap-4 overflow-x-auto px-4 py-4 hide-scrollbar"
>
        {facilities.map((f, i) => (
          <div key={i} className="shrink-0">
            <FacilityCard title={f.title} image={f.image} />
          </div>
        ))}
      </div>

      {/* Arrows (show on md+ screens) */}
      <button
        onClick={() => scroll(-300)}
        aria-label="Scroll left"
        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow"
      >
        ‹
      </button>
      <button
        onClick={() => scroll(300)}
        aria-label="Scroll right"
        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow"
      >
        ›
      </button>
    </div>
  );
}
