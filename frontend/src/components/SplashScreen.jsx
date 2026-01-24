import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Progress Bar Animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2; 
      });
    }, 40);

    // 2. Start Exit Animation (Fade out)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    // 3. Unmount Component
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3500); // Extended slightly to ensure smooth fade

    return () => {
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    // ✅ Changed bg-black to bg-stone-950 to match your Homepage exactly
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-950 transition-all duration-1000 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 🔴 CRITICAL FIX FOR WHITE FLASH: Force body bg to match */}
      <style>{`
        body { background-color: #0c0a09; } /* stone-950 hex code */
      `}</style>

      {/* Background Gradient Spot */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-800/20 via-stone-950 to-stone-950 opacity-60"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO CONTAINER */}
        <div className="relative mb-8 group">
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition duration-1000"></div>
          
          <img 
            src="/Gallery/logo.jpg" 
            alt="Beauty Parlour Logo" 
            className="relative w-32 h-32 md:w-40 md:h-40 object-cover rounded-full border border-white/5 shadow-2xl animate-[fadeIn_1.5s_ease-out]"
          />
        </div>

        {/* TEXT - ✅ Changed to font-sans to match website */}
        <div className="text-center space-y-2 animate-[slideUp_1s_ease-out]">
          <h1 className="text-3xl md:text-4xl font-sans font-light tracking-[0.2em] uppercase text-white">
            Flawless
          </h1>
          <p className="text-stone-500 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase">
            by Drashti
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-12 w-32 h-[1px] bg-stone-900 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;