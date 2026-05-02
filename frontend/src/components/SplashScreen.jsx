import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Detect theme for splash
  const isDark = localStorage.getItem('flawless-theme') === 'dark' || 
    (!localStorage.getItem('flawless-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(progressInterval); return 100; }
        return prev + 2;
      });
    }, 40);

    const exitTimer = setTimeout(() => setIsExiting(true), 2500);
    const finishTimer = setTimeout(() => onFinish(), 3500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isDark ? 'bg-stone-950' : 'bg-white'}`}
    >
      <style>{`body { background-color: ${isDark ? '#0c0a09' : '#ffffff'}; }`}</style>

      {/* Background Gradient */}
      <div className={`absolute inset-0 ${isDark 
        ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-40'
        : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-100/40 via-white to-white opacity-60'
      }`}></div>

      <div className="relative z-10 flex flex-col items-center">
        {/* LOGO */}
        <div className="relative mb-8 group">
          <div className={`absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition duration-1000 ${
            isDark ? 'bg-gradient-to-r from-white/10 to-white/5' : 'bg-gradient-to-r from-rose-200/30 to-purple-200/30'
          }`}></div>
          <img
            src="/Gallery/logo.jpg"
            alt="Beauty Parlour Logo"
            className={`relative w-32 h-32 md:w-40 md:h-40 object-cover rounded-full shadow-2xl animate-[fadeIn_1.5s_ease-out] ${
              isDark ? 'border border-white/20' : 'border border-gray-200'
            }`}
          />
        </div>

        {/* TEXT */}
        <div className="text-center space-y-2 animate-[slideUp_1s_ease-out]">
          <h1 className={`text-3xl md:text-4xl font-sans font-light tracking-[0.2em] uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Flawless
          </h1>
          <p className={`text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase ${isDark ? 'text-stone-500' : 'text-gray-400'}`}>
            by Drashti
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className={`mt-12 w-32 h-[1px] rounded-full overflow-hidden relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
          <div
            className={`h-full transition-all duration-75 ease-out ${isDark ? 'bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-gray-800/60 shadow-[0_0_10px_rgba(0,0,0,0.2)]'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default SplashScreen;