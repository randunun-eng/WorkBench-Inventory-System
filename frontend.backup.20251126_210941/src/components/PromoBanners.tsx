const PromoBanners = () => {
  const banners = [
    {
      title: 'Free Shipping',
      subtitle: 'On orders over $50',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      bg: 'from-green-400 to-green-600',
    },
    {
      title: 'Buyer Protection',
      subtitle: '100% secure payments',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bg: 'from-blue-400 to-blue-600',
    },
    {
      title: 'Fast Delivery',
      subtitle: '2-5 business days',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: 'from-orange-400 to-orange-600',
    },
    {
      title: '24/7 Support',
      subtitle: 'Always here to help',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bg: 'from-purple-400 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {banners.map((banner, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${banner.bg} rounded-lg p-6 text-white text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer transform hover:-translate-y-1 transition-transform`}
        >
          <div className="flex justify-center mb-3">{banner.icon}</div>
          <h3 className="font-bold text-lg mb-1">{banner.title}</h3>
          <p className="text-sm opacity-90">{banner.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

export default PromoBanners;
