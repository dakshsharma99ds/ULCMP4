import React, { useEffect } from 'react';

const About = () => {
  useEffect(() => {
    return () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, []);

  const socialPlatforms = [
    { name: "REDDIT", image: "./reddit.png" },
    { name: "INSTAGRAM", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4.162 4.162 0 1 1 0-8.324A4.162 4.162 0 0 1 12 16zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
    { name: "X", path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" },
    { name: "FACEBOOK", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
    { name: "LINKEDIN", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
    { name: "PINTEREST", path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.72-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.211-.174.256-.402.151-1.504-.699-2.445-2.895-2.445-4.659 0-3.793 2.757-7.279 7.942-7.279 4.167 0 7.407 2.97 7.407 6.942 0 4.141-2.611 7.476-6.233 7.476-1.217 0-2.36-.632-2.751-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.622 0 12-5.378 12-12S18.639 0 12.017 0z" },
    { name: "TUMBLR", image: "./tumblr.png" },
    { name: "SNAPCHAT", image: "./snap.png" },
    { name: "BILIBILI", image: "./bili.png" }
  ];

  return (
    <div className="z-10 w-full max-w-4xl flex flex-col items-center select-none scale-105 md:scale-100 origin-top pt-0 md:pt-0 -mt-12 md:mt-0">
      <div className="flex flex-col items-center w-full mb-6 md:mb-10">
        <h1 className="nico-font text-5xl md:text-8xl tracking-widest text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
          ABOUT
        </h1>
        <p className="text-emerald-500/60 text-[8px] md:text-[10px] tracking-[0.45em] md:tracking-[1.00em] mt-2 uppercase text-center w-full whitespace-nowrap">
          universal link convertor
        </p>
        <div className="h-0.5 w-fit bg-linear-to-r from-transparent via-emerald-500 to-transparent mt-4 opacity-50">
           <div className="invisible text-[8px] md:text-[10px] tracking-[0.45em] md:tracking-[1.00em] uppercase">universal link convertor</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 w-full px-4">
        {/* Main Card */}
        <div className="col-span-2 md:col-span-12 relative group order-1 outline-none" tabIndex="0">
          <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-700"></div>
          <div className="relative bg-white/2 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 backdrop-blur-xl flex items-center gap-4 md:gap-8 group-hover:border-emerald-500/30 group-focus:border-emerald-500/30 transition-all duration-500">
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-full border border-emerald-500/30 flex items-center justify-center bg-black/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                <div className="w-3 h-3 md:w-5 md:h-5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_25px_#10b981]"></div>
              </div>
            </div>
            <div>
              <h2 className="nico-font text-[10px] md:text-xl text-emerald-500/80 tracking-widest uppercase mb-1 md:mb-3">universal link convertor</h2>
              <p className="font-mono text-[9px] md:text-sm leading-relaxed text-gray-400 group-hover:text-gray-200 group-focus:text-gray-200 transition-colors duration-500 tracking-tight">
                ULC provides seamless access to high-quality social media content. One click downloads MP4/MP3 files directly without ads, logins, or quality loss.
              </p>
            </div>
          </div>
        </div>

        {/* Main Motive Card */}
        <div className="col-span-1 md:col-span-4 relative group order-2 outline-none" tabIndex="0">
          <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-700"></div>
          <div className="relative bg-white/2 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-6 backdrop-blur-xl h-32 md:h-44 flex flex-col items-center group-hover:border-emerald-500/30 group-focus:border-emerald-500/30 transition-all duration-500">
            <h3 className="nico-font text-[7px] md:text-[10px] text-emerald-400/80 tracking-widest uppercase mb-auto text-center">Main Motive</h3>
            <div className="flex flex-col items-center gap-1 md:gap-2 mb-auto">
              {["No Ads", "No Logins", "High Quality", "Universal"].map((text, i) => (
                <span key={i} className="font-mono text-[8px] md:text-[11px] text-gray-400 group-hover:text-white group-focus:text-white uppercase tracking-[0.12em] md:tracking-[0.2em] transition-colors duration-500 cursor-default">{text}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tech Stack Card */}
        <div className="col-span-1 md:col-span-4 relative group order-3 md:order-4 outline-none" tabIndex="0">
          <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-700"></div>
          <div className="relative bg-white/2 border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-6 backdrop-blur-xl h-32 md:h-44 flex flex-col items-center group-hover:border-emerald-500/30 group-focus:border-emerald-500/30 transition-all duration-500">
            <h3 className="nico-font text-[7px] md:text-[10px] text-emerald-400/80 tracking-widest uppercase mb-auto text-center">Tech Stack</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 md:gap-x-6 gap-y-2 md:gap-y-5 mb-auto">
              <div className="flex items-center gap-1.5 md:gap-2.5">
                <svg viewBox="-11.5 -10.23174 23 20.46348" className="w-3 h-3 md:w-5 md:h-5 fill-none stroke-emerald-500/80">
                  <circle cx="0" cy="0" r="2.05" fill="currentColor" className="text-emerald-500/80" />
                  <g stroke="currentColor" strokeWidth="1" fill="none" className="text-emerald-500/80">
                    <ellipse rx="11" ry="4.2" />
                    <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                    <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                  </g>
                </svg>
                <span className="font-mono text-[8px] md:text-[12px] text-gray-400 group-hover:text-white group-focus:text-white uppercase tracking-wider font-bold transition-colors duration-500">React</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2.5">
                <svg viewBox="0 0 24 24" className="w-3 h-3 md:w-5 md:h-5 fill-emerald-500/80">
                  <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
                </svg>
                <span className="font-mono text-[8px] md:text-[12px] text-gray-400 group-hover:text-white group-focus:text-white uppercase tracking-wider font-bold transition-colors duration-500">Tailwind</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2.5">
                <img src="/framer.png" alt="Framer" className="w-3 h-3 md:w-5 md:h-5 [filter:brightness(0)_saturate(100%)_invert(61%)_sepia(97%)_saturate(392%)_hue-rotate(113deg)_brightness(94%)_contrast(88%)]" />
                <span className="font-mono text-[8px] md:text-[12px] text-gray-400 group-hover:text-white group-focus:text-white uppercase tracking-wider font-bold transition-colors duration-500">Framer</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2.5">
                <img src="/ffmpeg.png" alt="FFmpeg" className="w-3 h-3 md:w-5 md:h-5 filter-[brightness(0)_saturate(100%)_invert(61%)_sepia(97%)_saturate(392%)_hue-rotate(113deg)_brightness(94%)_contrast(88%)]" />
                <span className="font-mono text-[8px] md:text-[12px] text-gray-400 group-hover:text-white group-focus:text-white uppercase tracking-wider font-bold transition-colors duration-500">FFmpeg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Platforms Card */}
        <div className="col-span-2 md:col-span-4 relative group order-4 md:order-3 outline-none" tabIndex="0">
          <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-700"></div>
          <div className="relative bg-white/2 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden h-28 md:h-44 flex flex-col items-center group-hover:border-emerald-500/30 group-focus:border-emerald-500/30 transition-all duration-500">
              <h3 className="nico-font text-[7px] md:text-[10px] text-emerald-400/80 tracking-widest uppercase mt-3 md:mt-6 mb-auto text-center">Supported Platforms</h3>
              <div className="flex animate-[marquee-h_12s_linear_infinite] whitespace-nowrap items-center w-max mb-auto">
                  {[...socialPlatforms, ...socialPlatforms, ...socialPlatforms].map((platform, index) => (
                  <div key={index} className="flex flex-col items-center mx-3 md:mx-5 gap-1 md:gap-1.5">
                    {platform.path ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-8 md:h-8 fill-gray-500 group-hover:fill-white group-focus:fill-white transition-colors duration-500">
                        <path d={platform.path} />
                      </svg>
                    ) : (
                      <img src={platform.image} alt={platform.name} className="w-5 h-5 md:w-8 md:h-8 opacity-50 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                    )}
                    <span className="font-mono text-[7px] md:text-[10px] text-gray-500 group-hover:text-white group-focus:text-white transition-colors duration-500 tracking-tight">
                      {platform.name}
                    </span>
                  </div>
                  ))}
              </div>
          </div>
        </div>

      </div>
      
      <style jsx>{`
        @keyframes marquee-h {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }

        /* PC View: Remove focus glow when mouse leaves, keep only hover */
        @media (min-width: 768px) {
          .group:focus:not(:hover) .absolute.-inset-1 {
            opacity: 0 !important;
          }
          .group:focus:not(:hover) {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
        }

        /* Mobile View: Allow focus to stay (tap to stay) */
        @media (max-width: 767px) {
          .group:focus .absolute.-inset-1 {
            opacity: 100 !important;
          }
          .group:focus {
            border-color: rgba(16, 185, 129, 0.3) !important;
          }
        }

        .outline-none:focus {
          outline: none !important;
        }
      `}</style>
    </div>
  );
};

export default About;
