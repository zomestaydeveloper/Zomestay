import PropertyCard from "./PropertyCard";
import img1 from "../../assets/properties/00acaa13af90807d056e9b0d2b6b230f0c25e866.png";
import img2 from "../../assets/properties/0b7ca167bf837c2c427e5f93e9c05049d7698be7.png";
import img3 from "../../assets/properties/37ad2afedc12a52b4d00c6371919bd39f9838614.png";
import img4 from "../../assets/properties/3a20656f67ba7ec6b2b8a4b599a552cd62690c66.png";
import img5 from "../../assets/properties/4591f90b15ec2f4d76bc1e953c01759bd99c23c9.png";
import img6 from "../../assets/properties/46ab545a8d8d02afc8ef2a39ae5ac3e202ed29e3.png";
import img7 from "../../assets/properties/cf0560bdec606946e386cd79747ee6d492d83e6c.png";
import img8 from "../../assets/properties/f1013d6657be94ee12de5d97ee7e24998df2e884.png";
import { useNavigate } from "react-router-dom";

const cards = [
  { image: img1, title: "Beach Vibes", location: "Malibu, USA" },
  { image: img2, title: "Mountain Retreat", location: "Aspen, USA" },
  { image: img3, title: "City Lights", location: "Tokyo, Japan" },
  { image: img4, title: "Desert Escape", location: "Dubai, UAE" },
  { image: img5, title: "Tropical Paradise", location: "Bali, Indonesia" },
  { image: img6, title: "Snowy Peak", location: "Swiss Alps" },
  { image: img7, title: "Beach Vibes", location: "Malibu, USA" },
  { image: img8, title: "Mountain Retreat", location: "Aspen, USA" },
];

/**
 * Why do you see **4 cards at 768px**?
 * Tailwind's `md:` breakpoint activates at **min-width: 768px**.
 * Your class `md:grid-cols-4` tells the grid to use **4 columns** once the viewport is >= 768px.
 *
 * FIX: If you want 3 columns at 768px and 4 only on larger screens,
 * use `md:grid-cols-3 lg:grid-cols-4`.
 */

export default function PropertyCardRow() {
  const navigate = useNavigate()
  return (
   
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  xl:grid-cols-4 gap-4 ">
        {cards.map((card, index) => (
          <div key={index} onClick={()=>navigate('/app/properties/1')}>
            <PropertyCard  image={card.image} title={card.title} location={card.location} />
          </div>
        ))}
      </div>
    
  );
}

/* Notes:
 * - Added `gap-6` for consistent spacing.
 * - Wrapped each <Card> in a `w-full` div to avoid fixed widths fighting the grid.
 * - If your Card has a fixed width (e.g., `w-72`), remove it to make cards fully responsive:
 *   change Card root container to `w-full`.
 */
