interface CategoryBannerProps {
  onCategorySelect?: (category: string) => void;
}

const CategoryBanner = ({ onCategorySelect }: CategoryBannerProps) => {
  const categories = [
    {
      name: 'Electronics',
      image: 'https://picsum.photos/seed/electronics/200/200',
      color: 'from-blue-400 to-blue-600',
    },
    {
      name: 'Tools',
      image: 'https://picsum.photos/seed/tools2/200/200',
      color: 'from-orange-400 to-orange-600',
    },
    {
      name: 'Components',
      image: 'https://picsum.photos/seed/components/200/200',
      color: 'from-green-400 to-green-600',
    },
    {
      name: 'Solar',
      image: 'https://picsum.photos/seed/solar2/200/200',
      color: 'from-yellow-400 to-yellow-600',
    },
    {
      name: 'Equipment',
      image: 'https://picsum.photos/seed/equipment/200/200',
      color: 'from-purple-400 to-purple-600',
    },
    {
      name: 'Sensors',
      image: 'https://picsum.photos/seed/sensors/200/200',
      color: 'from-pink-400 to-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {categories.map((category, index) => (
        <div
          key={index}
          onClick={() => onCategorySelect?.(category.name)}
          className="group cursor-pointer"
        >
          <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="aspect-square relative">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-40 group-hover:opacity-30 transition-opacity`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-white font-bold text-sm md:text-base text-center drop-shadow-lg px-2">
                {category.name}
              </h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryBanner;
