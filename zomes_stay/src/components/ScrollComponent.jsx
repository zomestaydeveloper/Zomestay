import React, { useRef, useEffect, useState } from 'react';

const LocationScroll = ({ onLocationSelect }) => {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const locations = [
    'Lonavala', 'Karjat', 'Kasauli', 'Ooty', 'Mussoorie',
    'Panchgani', 'Udaipur', 'Goa', 'Alibaug', 'Manali',
    'Coorg', 'Nashik', 'Jaipur', 'Alleppey', 'Wayanad',
    'Shimla', 'Munnar', 'Rishikesh', 'Mahabaleshwar', 'Kochi'
  ];

  // Auto-rotation
  useEffect(() => {
    if (isPaused) return;
    
    const autoScroll = setInterval(() => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        
        if (container.scrollLeft >= maxScroll - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: 180, behavior: 'smooth' });
        }
      }
    }, 3000);

    return () => clearInterval(autoScroll);
  }, [isPaused]);

  return (
    <div className="w-full py-20 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Simple Header */}
        <h2 
          className="text-4xl text-neutral-800 mb-12 text-center"
          style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontWeight: 400 }}
        >
          Where to?
        </h2>

        {/* Scrollable Cards */}
        <div 
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {locations.map((location, index) => (
              <div
                key={index}
                onClick={() => onLocationSelect && onLocationSelect(location)}
                className="flex-shrink-0 cursor-pointer group"
              >
                <div className="bg-white px-8 py-6 rounded-lg border border-neutral-200 hover:border-neutral-400 transition-all duration-300 min-w-[160px] hover:shadow-lg">
                  <p 
                    className="text-neutral-700 text-lg text-center"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
                  >
                    {location}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-neutral-50 to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-neutral-50 to-transparent pointer-events-none"></div>
        </div>

      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
    alert(`You selected: ${location}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <LocationScroll onLocationSelect={handleLocationSelect} />
    </div>
  );
}

