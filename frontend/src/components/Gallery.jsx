import { Instagram, ArrowRight, Play } from 'lucide-react';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config'; // Import Config

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);

  // Static Fallback Data
  const defaultItems = [
    {
      id: 1,
      type: 'image',
      url: '/Gallery/IMG_1242.PNG',
      category: 'Makeup Artistry'
    },
    {
      id: 2,
      type: 'video',
      url: '/Gallery/Public1.MP4',
      category: 'Hair Styling'
    },
    {
      id: 3,
      type: 'image',
      url: '/Gallery/IMG_0331.PNG',
      category: 'Bridal Look'
    },
    {
      id: 4,
      type: 'video',
      url: '/Gallery/Public3.MP4',
      category: 'Salon Ambience'
    },
    {
      id: 5,
      type: 'image',
      url: '/Gallery/Lense.jpeg',
      category: 'Lens'
    },
    {
      id: 6,
      type: 'video',
      url: '/Gallery/Public5.MP4',
      category: 'Premium Treatments'
    }
  ];

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        const data = await response.json();

        if (data && data.length > 0) {
          // Map DB keys to Component keys
          const mappedData = data.map(item => ({
            id: item.id,
            type: item.type || 'image',
            url: item.image_url,
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
    <section className="py-24 bg-stone-900 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <span className="text-stone-500 text-xs font-bold tracking-[0.2em] uppercase">
            Our Portfolio
          </span>
          <h2 className="text-4xl md:text-5xl font-light mt-4 mb-6">
            Exquisite <span className="font-semibold text-white">Gallery</span>
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto font-light">
            Explore our masterpiece creations and witness the transformations.
          </p>
        </div>

        {/* Grid Layout - Dark Theme */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-800 cursor-pointer"
            >
              {/* Logic to choose between Video and Image */}
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.category}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  onError={(e) => {
                    e.target.style.display = 'none'; // Safely hide if path is wrong
                    console.error(`Failed to load: ${item.url}`);
                  }}
                />
              )}

              {/* Dark Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                {item.type === 'video' ? (
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                ) : (
                  <div className="px-6 py-2 border border-white/50 rounded-full text-xs font-bold uppercase tracking-widest text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
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
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/10 rounded-full bg-white/5 hover:bg-white hover:text-black transition-all duration-300 text-sm font-bold tracking-widest uppercase group"
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