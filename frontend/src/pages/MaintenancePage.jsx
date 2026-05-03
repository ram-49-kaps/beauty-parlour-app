import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Settings } from 'lucide-react';

const MaintenancePage = () => {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-stone-950 text-white' : 'bg-white text-gray-900'}`}>
      <div className="text-center max-w-2xl animate-fadeInUp">
        <div className="flex justify-center mb-6">
          <Settings className={`w-16 h-16 animate-spin-slow ${isDark ? 'text-stone-500' : 'text-gray-400'}`} />
        </div>
        <h1 className="text-4xl md:text-5xl font-light mb-6">
          We are currently <span className="font-semibold">updating</span> our services.
        </h1>
        <p className={`text-lg mb-8 font-light leading-relaxed ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
          Flawless By Drashti is undergoing scheduled maintenance to bring you our new 2026-27 bridal packages and an improved booking experience. We'll be back online shortly.
        </p>
        <div className={`inline-block py-2 px-6 border rounded-full ${isDark ? 'border-white/10 bg-white/5 text-stone-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
          <Sparkles className="inline-block w-4 h-4 mr-2" />
          Thank you for your patience!
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
