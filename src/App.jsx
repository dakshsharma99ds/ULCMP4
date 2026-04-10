import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Toaster, toast } from 'sonner';
import About from './About';
import Contact from './Contact';

// Custom Tooltip Component
const CustomTooltip = ({ text, mousePos, isThumbnailOption }) => (
  <motion.div
    key={text} 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      transition: { 
        delay: 0.5, 
        duration: 0.2,
        ease: "easeOut"
      } 
    }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
    style={{
      position: 'fixed',
      left: mousePos.x + 15,
      top: mousePos.y + 15,
      pointerEvents: 'none',
      zIndex: 9999,
    }}
    className={`${isThumbnailOption ? 'bg-black/80' : 'bg-white/10'} border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-2xl`}
  >
    <p className="text-emerald-400 font-mono text-[10px] leading-tight tracking-[0.2em] uppercase font-bold">
      {text}
    </p>
  </motion.div>
);

function App() {
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    if (hoveredItem === "EXPAND" || hoveredItem === "COLLAPSE") {
      setHoveredItem(isNavOpen || isSearchMode ? "COLLAPSE" : "EXPAND");
    }
  }, [isNavOpen, isSearchMode, hoveredItem]);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setIsVertical(naturalHeight > naturalWidth);
  };

  const getPlatformName = (link) => {
    const lower = link.toLowerCase();
    if (lower.includes('instagram.com')) return 'INSTAGRAM';
    if (lower.includes('linkedin.com')) return 'LINKEDIN';
    if (lower.includes('tumblr.com')) return 'TUMBLR';
    if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'PINTEREST';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YOUTUBE';
    if (lower.includes('reddit.com')) return 'REDDIT';
    if (lower.includes('x.com') || lower.includes('twitter.com')) return 'X / TWITTER';
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) return 'FACEBOOK';
    return 'SOURCE LINK';
  };

  const isYouTube = (link) => (link.toLowerCase().includes('youtube.com') || link.toLowerCase().includes('youtu.be'));
  const isInstagramStory = (link) => link.toLowerCase().includes('instagram.com/stories/');

  const showInvalidLinkError = () => {
    toast.error(
      <div className="font-mono text-[10px] leading-relaxed tracking-wider text-left w-full select-none">
        <span className="text-emerald-400 font-bold block text-[13px]">VALIDATION ERROR:</span>
        <div className="h-px w-full bg-emerald-500/30 my-2"></div>
        <span className="text-white/90 block">THE PROVIDED MEDIA LINK IS INVALID OR THE API IS DOWN.</span>
      </div>,
      { duration: 6000, icon: null }
    );
  };

  const fetchInfo = async (manualUrl = null) => {
    let targetUrl = (manualUrl || url).trim();
    if (!targetUrl) return;

    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

    if (isYouTube(targetUrl)) return toast.error("YouTube is not supported.");
    if (isInstagramStory(targetUrl)) return toast.error("Instagram Stories are not supported.");
    
    setLoading(true);
    setInfo(null); 
    
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      const data = await res.json();
      console.group("API Debugging");
      console.log("Status:", res.status);
      console.log("Raw Response:", data);
      console.groupEnd();

      if (!res.ok || data.error) {
        showInvalidLinkError();
        setLoading(false);
        return;
      }

      // RESILIENT DATA EXTRACTION
      // 1. Thumbnail Extraction
      let thumb = data.thumbnail || data.display_url || data.image;
      if (!thumb && data.medias?.length > 0) {
        thumb = data.medias[0].thumbnail || data.medias[0].url;
      }

      // 2. Title Extraction
      let title = data.title || "Social Media Content";

      // If we have at least one media link, we show it
      if (data.medias || thumb) {
        setInfo({ ...data, title, thumbnail: thumb, fetchedUrl: targetUrl });
        setHistory(prev => {
          const filtered = prev.filter(item => item.url !== targetUrl);
          return [{ title, url: targetUrl }, ...filtered].slice(0, 100);
        });
      } else {
        showInvalidLinkError();
      }

    } catch (err) { 
      console.error("Fetch failure:", err);
      showInvalidLinkError(); 
    }
    setLoading(false);
  };

  const startDownload = (type, quality = '1080p') => {
    setDlProcessing(true);
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&type=${type}&quality=${quality}&title=${encodeURIComponent(info.title)}`; 
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDlProcessing(false), 10000); 
  };

  const textTransitionStyle = (isVisible) => ({
    clipPath: isVisible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    opacity: isVisible ? 1 : 0,
    transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-block'
  });

  const filteredHistory = history.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex overflow-hidden fixed inset-0" onMouseMove={handleMouseMove}>
      <AnimatePresence>
        {hoveredItem && window.innerWidth >= 768 && <CustomTooltip text={hoveredItem} mousePos={mousePos} isThumbnailOption={['DOWNLOAD', 'CLOSE'].includes(hoveredItem)} />}
      </AnimatePresence>
      <Toaster theme="dark" position="bottom-right" />

      {/* MODAL FOR PREVIEW */}
      <AnimatePresence>
        {isModalOpen && info?.thumbnail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="relative bg-[#1a1a1a] rounded-[2rem] border-[8px] border-[#97CEBB] max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
               <img src={`https://images.weserv.nl/?url=${encodeURIComponent(info.thumbnail)}`} className="max-h-[85vh] object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* SIDEBAR */}
      <nav className={`fixed left-0 top-0 h-full z-50 bg-black/40 backdrop-blur-2xl border-r border-white/10 transition-all duration-500 ${isNavOpen || isSearchMode ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="hidden md:block mb-10 text-white hover:text-emerald-400">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div onClick={() => setCurrentPage('home')} className="flex items-center gap-6 cursor-pointer mb-8 group">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${currentPage === 'home' ? 'text-emerald-400' : ''}`}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
             <span className="nico-font text-xs tracking-widest" style={textTransitionStyle(isNavOpen)}>HOME</span>
          </div>
          <div onClick={() => setCurrentPage('about')} className="flex items-center gap-6 cursor-pointer mb-8 group">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-6 h-6 ${currentPage === 'about' ? 'text-emerald-400' : ''}`}><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
             <span className="nico-font text-xs tracking-widest" style={textTransitionStyle(isNavOpen)}>ABOUT</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col items-center justify-center p-6 transition-all duration-500 ${isNavOpen ? 'md:ml-72' : 'ml-0'}`}>
        
        {dlProcessing && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-t-2 border-emerald-400 animate-spin rounded-full mb-6"></div>
             <h2 className="nico-font text-3xl text-emerald-400">PROCESSING</h2>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl flex flex-col items-center">
              <div className="text-center mb-12">
                <h1 className="nico-font text-7xl md:text-9xl mb-2">ULC<span className="text-emerald-400">MP4</span></h1>
                <p className="text-emerald-500/60 tracking-[0.5em] text-[10px] uppercase font-bold">link to mp4 converter</p>
              </div>

              <div className="w-full bg-white/5 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] p-6">
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="PASTE LINK HERE"
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50 font-mono text-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                  />
                  <button onClick={() => fetchInfo()} className="bg-white text-black px-8 rounded-2xl font-bold hover:bg-emerald-400 transition-all">
                    {loading ? "..." : "FETCH"}
                  </button>
                </div>

                {info && (
                  <div className="bg-black/20 border border-white/5 rounded-3xl p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div onClick={() => setIsModalOpen(true)} className="w-full md:w-48 aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer shrink-0 bg-black">
                        {info.thumbnail && <img src={`https://images.weserv.nl/?url=${encodeURIComponent(info.thumbnail)}`} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <h3 className="font-bold truncate text-sm mb-4">{info.title}</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <button onClick={() => startDownload('mp4')} className="py-3 bg-emerald-500 text-black rounded-xl nico-font text-[10px] font-bold hover:bg-emerald-300">DOWNLOAD MP4</button>
                          <button onClick={() => startDownload('mp3')} className="py-3 bg-white/10 rounded-xl nico-font text-[10px] font-bold hover:bg-white hover:text-black">DOWNLOAD MP3</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {currentPage === 'about' && <About />}
          {currentPage === 'contact' && <Contact />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
\
