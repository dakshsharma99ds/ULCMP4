import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Toaster, toast } from 'sonner';
import About from './About';
import Contact from './Contact';

/**
 * CUSTOM TOOLTIP COMPONENT
 * Renders platform metadata on mouse hover
 */
const CustomTooltip = ({ text, mousePos }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      transition: { delay: 0.4, duration: 0.2, ease: "easeOut" } 
    }}
    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
    style={{
      position: 'fixed',
      left: mousePos.x + 15,
      top: mousePos.y + 15,
      pointerEvents: 'none',
      zIndex: 9999,
    }}
    className="bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-2xl"
  >
    <p className="text-emerald-400 font-mono text-[10px] leading-tight tracking-[0.2em] uppercase font-bold">
      {text}
    </p>
  </motion.div>
);

function App() {
  // --- STATE ---
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dlProcessing, setDlProcessing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // --- MOUSE TRACKING ---
  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // --- HELPERS ---
  const getPlatformName = (link) => {
    const low = link.toLowerCase();
    if (low.includes('instagram.com')) return 'INSTAGRAM';
    if (low.includes('linkedin.com')) return 'LINKEDIN';
    if (low.includes('tumblr.com')) return 'TUMBLR';
    if (low.includes('pinterest.com') || low.includes('pin.it')) return 'PINTEREST';
    if (low.includes('youtube.com') || low.includes('youtu.be')) return 'YOUTUBE';
    if (low.includes('reddit.com')) return 'REDDIT';
    if (low.includes('x.com') || low.includes('twitter.com')) return 'X / TWITTER';
    if (low.includes('facebook.com') || low.includes('fb.watch')) return 'FACEBOOK';
    return 'SOURCE LINK';
  };

  const isYouTube = (link) => /youtube\.com|youtu\.be/i.test(link);
  const isInstagramStory = (link) => /instagram\.com\/stories\//i.test(link);

  // --- URL SANITIZATION ---
  const sanitizeUrl = (input) => {
    let target = input.trim();
    if (!target) return "";
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    
    try {
      const urlObj = new URL(target);
      // Remove Instagram tracking tokens that break extractors
      if (urlObj.hostname.includes('instagram.com')) {
        return urlObj.origin + urlObj.pathname;
      }
      return target;
    } catch (e) {
      return target;
    }
  };

  // --- CORE: FETCH INFO ---
  const fetchInfo = async (manualUrl = null) => {
    const targetUrl = sanitizeUrl(manualUrl || url);
    
    if (!targetUrl || targetUrl === 'https://') {
      toast.error("PLEASE ENTER A VALID URL");
      return;
    }

    if (isYouTube(targetUrl)) {
      toast.error("YOUTUBE IS RESTRICTED. USE CNVMP4.COM");
      return;
    }

    if (isInstagramStory(targetUrl)) {
      toast.error("INSTAGRAM STORIES ARE NOT SUPPORTED");
      return;
    }
    
    setLoading(true);
    setInfo(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      const data = await res.json();
      
      // If server error or empty data
      if (!res.ok || data.error) {
        toast.error("UNABLE TO PROCESS LINK. IT MAY BE PRIVATE.");
        setLoading(false);
        return;
      }

      // FALLBACK LOGIC: Ensure we always have a title and a display
      const finalTitle = data.title && data.title !== "Video" 
        ? data.title 
        : `Instagram_Media_${new Date().getTime().toString().slice(-6)}`;

      const finalThumbnail = data.thumbnail || "";

      setInfo({ ...data, title: finalTitle, thumbnail: finalThumbnail, fetchedUrl: targetUrl });

      setHistory(prev => {
          const filtered = prev.filter(item => item.url !== targetUrl);
          return [{ title: finalTitle, url: targetUrl }, ...filtered].slice(0, 100);
      });
      
    } catch (err) { 
      toast.error("SERVER CONNECTION FAILED");
    } finally {
      setLoading(false);
    }
  };

  // --- CORE: DOWNLOAD ---
  const startDownload = (type) => {
    if (!info) return;
    setDlProcessing(true);
    
    const downloadUrl = `/api/download?url=${encodeURIComponent(info.fetchedUrl)}&type=${type}&title=${encodeURIComponent(info.title)}`; 
    
    // Create hidden trigger
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
   
    // Auto-clear overlay after timeout
    setTimeout(() => setDlProcessing(false), 12000); 
  };

  // --- INTERFACE ---
  const handleKeyDown = (e) => e.key === 'Enter' && fetchInfo();

  useEffect(() => {
    if (isNavOpen || isSearchMode) {
      const timer = setTimeout(() => setScrollbarVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setScrollbarVisible(false);
    }
  }, [isNavOpen, isSearchMode]);

  const textTransitionStyle = (isVisible) => ({
    clipPath: isVisible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    opacity: isVisible ? 1 : 0,
    transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-block'
  });

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlatformLogo = (fetchedUrl) => {
    const iconClasses = "w-12 h-12 text-white/50"; 
    if (fetchedUrl?.includes('instagram.com')) {
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClasses}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
    }
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClasses}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4 }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex overflow-hidden fixed inset-0" onMouseMove={handleMouseMove}>
      
      {/* TOOLTIP */}
      <AnimatePresence>{hoveredItem && <CustomTooltip text={hoveredItem} mousePos={mousePos} />}</AnimatePresence>

      <Toaster theme="dark" position="bottom-right" />

      {/* AMBIENT BACKGROUND */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      {/* SIDEBAR NAVIGATION */}
      <nav className={`fixed left-0 top-0 h-full z-50 bg-black/50 backdrop-blur-3xl border-r border-white/5 transition-all duration-500 flex flex-col p-4 pt-8 rounded-tr-[3rem] rounded-br-[3rem] 
        ${isNavOpen || isSearchMode ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        
        {/* Toggle & Search UI */}
        <div className="flex items-center mb-10 px-2 shrink-0 h-10">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="shrink-0 text-emerald-400 hover:scale-110 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          <div className="flex-1 ml-4 overflow-hidden">
            <AnimatePresence>
              {(isNavOpen || isSearchMode) && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-1 text-[10px] font-mono outline-none focus:border-emerald-500/40" 
                    placeholder="Search history..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Links Area */}
        <div className="flex-1 flex flex-col px-2 min-h-0">
          <div className={`space-y-8 mb-12 transition-opacity ${isSearchMode ? 'opacity-20' : 'opacity-100'}`}>
            <div onClick={() => {setCurrentPage('home'); setIsNavOpen(false);}} className="flex items-center gap-6 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${currentPage === 'home' ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`} />
              <span className="nico-font text-xs tracking-[0.2em] uppercase" style={textTransitionStyle(isNavOpen)}>HOME</span>
            </div>
            <div onClick={() => {setCurrentPage('about'); setIsNavOpen(false);}} className="flex items-center gap-6 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${currentPage === 'about' ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`} />
              <span className="nico-font text-xs tracking-[0.2em] uppercase" style={textTransitionStyle(isNavOpen)}>ABOUT</span>
            </div>
          </div>

          {/* Dynamic History */}
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-[9px] text-white/20 font-mono mb-4 tracking-[0.3em] uppercase" style={textTransitionStyle(isNavOpen || isSearchMode)}>History</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {filteredHistory.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => {setUrl(item.url); fetchInfo(item.url); setIsNavOpen(false);}}
                  onMouseEnter={() => setHoveredItem(getPlatformName(item.url))}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="text-[11px] font-mono text-white/30 hover:text-emerald-400 cursor-pointer truncate border-l border-white/5 pl-4 py-1 hover:border-emerald-400 transition-all"
                >
                  {item.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-auto px-2 pb-8">
           <div onClick={() => {setCurrentPage('contact'); setIsNavOpen(false);}} className="flex items-center gap-6 cursor-pointer group opacity-40 hover:opacity-100 transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span className="nico-font text-xs tracking-[0.2em]" style={textTransitionStyle(isNavOpen)}>CONTACT</span>
           </div>
        </div>
      </nav>

      {/* MOBILE TRIGGER */}
      {!isNavOpen && !isSearchMode && (
        <button onClick={() => setIsNavOpen(true)} className="fixed top-8 left-6 z-40 md:hidden text-white/80">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      )}

      {/* MAIN VIEWPORT */}
      <main className={`flex-1 flex flex-col items-center justify-center p-6 transition-all duration-500 ${isNavOpen || isSearchMode ? 'md:ml-72' : 'ml-0'}`}>
        
        {/* DOWNLOAD LOADER */}
        <AnimatePresence>
          {dlProcessing && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mb-8"></div>
              <h2 className="nico-font text-2xl text-emerald-400 tracking-[0.4em] animate-pulse">GENERATING_DOWNLOAD</h2>
              <p className="text-white/30 font-mono text-[9px] mt-4 tracking-widest">PLEASE DO NOT REFRESH THE PAGE</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div key="home" {...pageVariants} className="w-full max-w-4xl flex flex-col items-center">
              
              {/* Header */}
              <div className="text-center mb-16">
                <h1 className="nico-font text-7xl md:text-[9rem] leading-none mb-4 drop-shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                  ULC<span className="text-emerald-400">MP4</span>
                </h1>
                <p className="text-emerald-500/40 tracking-[1em] text-[10px] uppercase font-bold ml-4">Universal Link Converter</p>
              </div>

              {/* Interaction Box */}
              <div className="w-full bg-white/[0.02] border border-white/10 backdrop-blur-2xl rounded-[3rem] p-4 md:p-10 shadow-3xl">
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="PASTE MEDIA LINK HERE..."
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-5 focus:border-emerald-500/40 transition-all outline-none text-emerald-100 font-mono text-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button 
                    onClick={() => fetchInfo()} 
                    disabled={loading}
                    className="bg-white text-black px-12 py-5 rounded-2xl hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all font-black text-sm disabled:opacity-30"
                  >
                    {loading ? "SEARCHING..." : "CONVERT"}
                  </button>
                </div>

                {/* Info Display Card */}
                <AnimatePresence>
                  {info && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="mt-10 overflow-hidden"
                    >
                      <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                           {info.thumbnail ? (
                             <img 
                               src={`https://images.weserv.nl/?url=${encodeURIComponent(info.thumbnail)}&w=400&output=webp`} 
                               className="w-full h-full object-cover" 
                               alt="Preview" 
                               onError={(e) => e.target.style.display='none'}
                             />
                           ) : getPlatformLogo(info.fetchedUrl)}
                        </div>
                        
                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{info.title}</h3>
                          <p className="text-emerald-400/50 font-mono text-[9px] tracking-[0.2em] uppercase mb-8">Metadata_Verified</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                              onClick={() => startDownload('mp4')} 
                              className="py-4 bg-emerald-500 text-black nico-font text-[9px] rounded-xl hover:bg-emerald-400 transition-all font-black active:scale-95"
                            >
                              VIDEO (.MP4)
                            </button>
                            <button 
                              onClick={() => startDownload('mp3')} 
                              className="py-4 bg-white/5 border border-white/10 text-white nico-font text-[9px] rounded-xl hover:bg-white hover:text-black transition-all active:scale-95"
                            >
                              AUDIO (.MP3)
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {currentPage === 'about' && (
            <motion.div key="about" {...pageVariants} className="w-full max-w-2xl"><About /></motion.div>
          )}

          {currentPage === 'contact' && (
            <motion.div key="contact" {...pageVariants} className="w-full max-w-2xl"><Contact /></motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .nico-font { font-family: 'Nico Moji', sans-serif; letter-spacing: 0.15em; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}} />
    </div>
  );
}

export default App;
