import img1 from "../assets/banners/1b6d1e7b93df1bfb92eedff58a32d2e265408692.png";

const AboutUs = () => {
  return (
    <div className="w-full flex flex-col md:flex-row justify-between gap-8 px-4 md:px-16 py-10">
      
      {/* Left Content */}
      <div className="w-full md:w-[60%] flex flex-col gap-6">
        
        <h1 className="font-bold text-[22px] lg:text-[36px] text-[#484848] leading-tight">
          About Us – Zomestay
        </h1>

        <hr className="h-1 w-40 bg-blue-800 border-0 rounded" />

        {/* About */}
        <p className="text-gray-600 text-[14px] leading-relaxed">
          Zomestay was born from a simple yet powerful thought — that the most
          memorable stays are often found away from crowded hotels, hidden in
          nature, culture, and authentic local experiences. We envisioned a
          platform that uncovers India’s hidden gems and transforms them into
          meaningful staycations.
        </p>

        <p className="text-gray-600 text-[14px] leading-relaxed">
          Zomestay curates unique homestays, boutique resorts, and experiential
          properties that offer more than just accommodation — they offer
          stories, serenity, and a genuine connection to the destination. Every
          property on Zomestay is carefully selected to ensure guests experience
          comfort, character, and a sense of belonging.
        </p>

        {/* Mission */}
        <h2 className="text-[#484848] text-[18px] font-bold mt-2">
          Our Mission
        </h2>
        <p className="text-gray-600 text-[14px] leading-relaxed">
          Our mission is to redefine staycations by connecting travelers with
          distinctive, experience-driven stays while empowering property owners
          with the right technology, marketing, and revenue support. Through
          transparent systems, trusted partnerships, and personalized service,
          Zomestay makes experiential travel accessible, reliable, and rewarding
          for both guests and hosts. We actively support sustainable tourism by
          promoting locally owned properties and responsible travel practices.
        </p>

        {/* Vision */}
        <h2 className="text-[#484848] text-[18px] font-bold mt-2">
          Our Vision
        </h2>
        <p className="text-gray-600 text-[14px] leading-relaxed">
          Our vision is to become India’s most trusted platform for experiential
          stays and hidden retreats, setting new standards in authenticity,
          service, and guest satisfaction. We aspire to build a community where
          travelers discover meaningful escapes and property owners grow with
          confidence and clarity. As Zomestay evolves, our goal remains constant —
          to celebrate unique spaces, unforgettable experiences, and the joy of
          staying somewhere that truly feels special.
        </p>

        <button className="bg-[#004AAD] text-white h-[42px] w-[140px] text-sm rounded-2xl mt-2">
          Discover More
        </button>
      </div>

      {/* Right Image */}
      <div className="w-full md:w-[40%] flex md:justify-end justify-center">
        <img
          src={img1}
          alt="Zomestay Experience"
          className="w-full md:w-[420px] h-[420px] object-cover rounded-2xl"
        />
      </div>
    </div>
  );
};

export default AboutUs;
