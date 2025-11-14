// src/components/Banner.jsx
import React, { useEffect, useState } from "react";

// Use your actual image files here
import img1 from "../assets/jorg-angeli-CAMwIxYk5Xg-unsplash copy 2.jpg";
import img2 from "../assets/jorg-angeli-CAMwIxYk5Xg-unsplash copy 2.jpg";
import img3 from "../assets/jorg-angeli-CAMwIxYk5Xg-unsplash copy 2.jpg";
import img4 from "../assets/jorg-angeli-CAMwIxYk5Xg-unsplash copy 2.jpg";

const IMAGES = [img1, img2, img3, img4];

export default function Banner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // auto-rotate
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % IMAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [IMAGES.length]);

  return (
    <section className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden">
      {/* Slides */}
      {IMAGES.map((src, idx) => (
        <img
          key={idx}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            idx === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          loading={idx === 0 ? "eager" : "lazy"}
        />
      ))}

      {/* Optional overlay for text readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

      {/* Content layer (put heading/search here if needed) */}
      <div className="relative z-10 h-full flex items-center justify-center md:justify-start px-4 md:px-10">
        <h1 className="text-white text-3xl md:text-5xl font-bold text-center md:text-left">
          Find your next stay
        </h1>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2.5 w-2.5  ${
              idx === currentIndex ? "bg-white" : "bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
