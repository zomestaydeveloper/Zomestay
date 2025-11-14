import React from "react";
import FeatureCard from "./FeatureCard";

export default function FeatureCardRow() {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div
      className="
        flex flex-nowrap overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 px-2
        sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4 sm:px-8 sm:overflow-visible
      "
      aria-label="Feature cards"
    >
      {items.map((_, idx) => (
        <div
          key={idx}
          className="
            flex-none w-[85%] max-w-[22rem] snap-start
            sm:w-full sm:max-w-none sm:flex-initial
          "
        >
          <FeatureCard />
        </div>
      ))}
      {/* end spacer for nicer scroll feel on mobile */}
      <div className="flex-none w-4 sm:hidden" />
    </div>
  );
}
