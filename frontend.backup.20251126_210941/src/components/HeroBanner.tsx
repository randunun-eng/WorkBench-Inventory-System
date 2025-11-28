import { useState, useEffect } from 'react';

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Super Deals on Electrical Components',
      subtitle: 'Save up to 50% on selected items',
      bg: 'from-orange-500 to-red-600',
      image: 'https://picsum.photos/seed/electronics1/1200/400',
    },
    {
      title: 'New Arrivals - Solar Equipment',
      subtitle: 'Latest technology for renewable energy',
      bg: 'from-blue-500 to-cyan-600',
      image: 'https://picsum.photos/seed/solar/1200/400',
    },
    {
      title: 'Premium Tools & Instruments',
      subtitle: 'Professional grade equipment for your workshop',
      bg: 'from-purple-500 to-pink-600',
      image: 'https://picsum.photos/seed/tools/1200/400',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-64 md:h-80 rounded-lg overflow-hidden mb-6 shadow-lg">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.bg} opacity-75`}></div>
          </div>

          {/* Content */}
          <div className="relative flex flex-col justify-center items-start h-full px-8 md:px-16 text-white">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-2xl">{slide.title}</h1>
            <p className="text-lg md:text-2xl mb-6 drop-shadow-lg">{slide.subtitle}</p>
            <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-xl hover:shadow-2xl transform hover:scale-105">
              Shop Now
            </button>
          </div>
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;
