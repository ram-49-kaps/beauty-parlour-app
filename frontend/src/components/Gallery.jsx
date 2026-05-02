import { Instagram, ArrowRight, Play } from 'lucide-react';

import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL, getImageUrl } from '../config';

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const { isDark } = useTheme();

  const defaultItems = [
    { id: 1, type: 'image', url: '/Gallery/IMG_1242.PNG', category: 'Makeup Artistry' },
    { id: 2, type: 'video', url: '/Gallery/Public1.MP4', category: 'Hair Styling' },
    { id: 3, type: 'image', url: '/Gallery/IMG_0331.PNG', category: 'Bridal Look' },
    { id: 4, type: 'video', url: '/Gallery/Public3.MP4', category: 'Salon Ambience' },
    { id: 5, type: 'image', url: '/Gallery/Lense.jpeg', category: 'Lens' },
    { id: 6, type: 'video', url: '/Gallery/Public5.MP4', category: 'Premium Treatments' }
  ];

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        const data = await response.json();

        if (data && data.length > 0) {
          const mappedData = data.map(item => ({
            id: item.id,
            type: item.type || 'image',
            url: getImageUrl(item.image_url),
            category: item.category
          }));
          setGalleryItems(mappedData);
        } else {
          setGalleryItems(defaultItems);
        }
      } catch (error) {
        console.error("Failed to load dynamic gallery, using default.", error);
        setGalleryItems(defaultItems);
      }
    };

    fetchGallery();
  }, []);

  return (
    <section className={`py-24 ${isDark ? 'bg-stone-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isDark ? 'text-stone-500' : 'text-gray-400'}`}>
            Our Portfolio
          </span>
          <h2 className={`text-4xl md:text-5xl font-light mt-4 mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Exquisite <span className={`font-semibold ${isDark ? 'text-stone-300' : 'text-gray-700'}`}>Gallery</span>
          </h2>
          <p className={`max-w-xl mx-auto font-light ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            Explore our masterpiece creations and witness the transformations.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.id}
              className={`group relative aspect-square overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-2xl transition-shadow duration-500 ${isDark ? 'bg-stone-800' : 'bg-gray-200'}`}
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-108 transition-all duration-700 ease-out"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.category}
                  className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-108 opacity-90 group-hover:opacity-100"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.error(`Failed to load: ${item.url}`);
                  }}
                />
              )}

              {/* Overlay on Hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out flex items-center justify-center ${isDark ? 'bg-gradient-to-t from-black/70 via-black/40 to-transparent' : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'}`}>
                {item.type === 'video' ? (
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-700 ease-out shadow-lg hover:bg-white/30">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                ) : (
                  <div className={`px-6 py-2 border rounded-full text-xs font-bold uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-all duration-700 ease-out shadow-lg ${isDark ? 'border-white/80 text-white bg-black/60' : 'border-white/60 text-white bg-white/15'}`}>
                    {item.category}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <a
            href="https://www.instagram.com/flawless_by_drashti?igsh=MWtyM2QyYW40YWdrMA%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-3 px-8 py-4 border rounded-full transition-all duration-300 text-sm font-bold tracking-widest uppercase group shadow-sm ${isDark ? 'border-white/10 bg-stone-800 text-white hover:bg-white hover:text-black hover:border-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900'}`}
          >
            <Instagram className="w-5 h-5" />
            Follow on Instagram
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Gallery;