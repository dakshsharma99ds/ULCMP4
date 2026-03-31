import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import About from './About';
import Contact from './Contact';

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
  
  const isYouTube = (link) => {
    return link.toLowerCase().includes('youtube.com') || link.toLowerCase().includes('youtu.be');
  };

  const isInstagramStory = (link) => {
    return link.toLowerCase().includes('instagram.com/stories/');
  };

  const showYoutubeError = () => {
    toast.error(
      <div className="font-mono text-[10px] leading-relaxed tracking-wider text-left w-full select-none">
        <span className="text-emerald-400 font-bold block text-[13px]">SERVER ERROR:</span>
        <div className="h-px w-full bg-emerald-500/30 my-2"></div>
        <span className="text-white/90 block">
          UNFORTUNATELY YOUTUBE IS RESTRICTED DUE TO PROVIDER LIMITS. ALL OTHER PLATFORMS ARE FULLY SUPPORTED! USE{" "}
          <a 
            href="https://cnvmp4.com" 
            target="_blank" 
            rel="noreferrer" 
            className="text-emerald-400 hover:text-emerald-300 transition-colors duration-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] text-[12px] font-bold"
            style={{ textDecoration: 'none' }}
          >
            CNVMP4
          </a>{" "}
          FOR YOUTUBE.
        </span>
      </div>,
      { duration: 8000, icon: null }
    );
  };

  const showInstagramStoryError = () => {
    toast.error(
      <div className="font-mono text-[10px] leading-relaxed tracking-wider w-full select-none">
        <span className="text-emerald-400 font-bold block text-[13px]">SERVER ERROR:</span>
        <div className="h-px w-full bg-emerald-500/30 my-2"></div>
        <span className="text-white/90 block text-justify">
          UNFORTUNATELY INSTAGRAM STORIES ARE RESTRICTED DUE TO PROVIDER LIMITS. POSTS & REELS ARE FULLY SUPPORTED! USE{" "}
          <a 
            href="https://igram.world/story-saver" 
            target="_blank" 
            rel="noreferrer" 
            className="text-emerald-400 hover:text-emerald-300 transition-colors duration-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] text-[11px] font-bold"
            style={{ textDecoration: 'none' }}
          >
            IGRAM
          </a>{" "}
          FOR STORIES.
        </span>
      </div>,
      { duration: 8000, icon: null }
    );
  };

  useEffect(() => {
    if (isNavOpen || isSearchMode) {
      const timer = setTimeout(() => setScrollbarVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setScrollbarVisible(false);
    }
  }, [isNavOpen, isSearchMode]);

  const fetchInfo = async (manualUrl = null) => {
    const targetUrl = manualUrl || url;
    if (!targetUrl) return;

    if (isYouTube(targetUrl)) {
      showYoutubeError();
      return;
    }

    if (isInstagramStory(targetUrl)) {
      showInstagramStoryError();
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      setInfo({ ...data, fetchedUrl: targetUrl });
      if (data.title) {
        setHistory(prev => {
            const filtered = prev.filter(item => item.url !== targetUrl);
            return [{ title: data.title, url: targetUrl }, ...filtered].slice(0, 100);
        });
      }
    } catch (err) { alert("Error fetching info"); }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchInfo();
    }
  };

  const handleHistoryClick = (item) => {
    setCurrentPage('home'); 
    setUrl(item.url); 
    fetchInfo(item.url); 
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
   
    setTimeout(() => {
        setDlProcessing(false);
    }, 12000); 
  };

  const textTransitionStyle = (isVisible) => ({
    clipPath: isVisible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    opacity: isVisible ? 1 : 0,
    transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-block'
  });

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleHamburgerClick = () => {
    if (isNavOpen || isSearchMode) {
      setIsNavOpen(false);
      setIsSearchMode(false);
      setSearchTerm('');
    } else {
      setIsNavOpen(true);
    }
  };

  const closeMobileNav = () => {
    setIsNavOpen(false);
    setIsSearchMode(false);
    setSearchTerm('');
  };

  const pageVariants = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
    transition: { duration: 0.5, ease: "easeOut" }
  };

  const getPlatformLogo = (fetchedUrl) => {
    const lowerUrl = fetchedUrl?.toLowerCase() || "";
    const iconClasses = "w-12 h-12 text-white/70"; 

    if (lowerUrl.includes('linkedin.com')) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconClasses} draggable="false">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      );
    }
    if (lowerUrl.includes('instagram.com')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClasses} draggable="false">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      );
    }
    if (lowerUrl.includes('tumblr.com')) {
      return <img src="./tumblr.png" alt="tumblr" className={iconClasses} draggable="false" />; 
    }
    return null;
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex overflow-hidden fixed inset-0">
      <Toaster theme="dark" position="bottom-right" toastOptions={{
        style: { 
          background: 'rgba(0,0,0,0.9)', 
          border: '1px solid rgba(16, 185, 129, 0.4)', 
          color: '#10b981', 
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '0.1em'
        },
      }} />

      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[40%] md:top-[-15%] md:left-[-10%] md:w-[60%] md:h-[60%] bg-emerald-500/20 rounded-full blur-[120px] md:blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[40%] md:bottom-[-15%] md:right-[-10%] md:w-[60%] md:h-[60%] bg-blue-500/20 rounded-full blur-[120px] md:blur-[180px] pointer-events-none"></div>
      
      <div 
        onClick={closeMobileNav}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-500 ease-in-out md:hidden ${
          isNavOpen || isSearchMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <nav className={`fixed left-0 top-0 h-full z-50 bg-black/40 backdrop-blur-2xl md:backdrop-blur-xl border-r border-white/10 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col p-4 pt-8 rounded-tr-[40px] rounded-br-[40px] 
        ${isNavOpen || isSearchMode ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        
        <div className="flex items-center mb-6 px-2 shrink-0 relative h-10 overflow-hidden">
          <button 
            onClick={handleHamburgerClick} 
            className={`cursor-pointer shrink-0 z-50 bg-transparent hamburger-hover transition-none ${(isNavOpen || isSearchMode) ? 'text-emerald-400 opacity-100' : 'opacity-0 md:opacity-100'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-none pointer-events-none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="flex-1 ml-4 relative h-full flex items-center overflow-hidden">
            <div className={`absolute right-0 transition-all duration-400 ease-in-out ${isSearchMode ? 'opacity-100 translate-x-0 w-full' : 'opacity-0 translate-x-10 pointer-events-none w-0'}`}>
                <div className="relative w-full pr-2">
                  <input 
                    type="text" 
                    autoFocus={isSearchMode}
                    placeholder="Search..." 
                    className="w-full bg-white/5 border border-white/20 rounded-full px-4 py-1.5 text-xs font-mono outline-none focus:border-emerald-500/50 transition-all placeholder:select-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
            </div>
            <button 
              onClick={() => setIsSearchMode(true)} 
              className="ml-auto block cursor-pointer group transition-all duration-300"
              style={{ 
                opacity: (isNavOpen && !isSearchMode) ? 1 : 0, 
                pointerEvents: (isNavOpen && !isSearchMode) ? 'auto' : 'none',
                transform: (isNavOpen && !isSearchMode) ? 'scale(1)' : 'scale(0.8)'
              }}
            >
              <img src="/search.png" alt="search" draggable="false" className="w-5 h-5 icon-hover-trigger" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col px-2 min-h-0 relative overflow-hidden">
          <div className="flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden shrink-0"
            style={{ 
              maxHeight: isSearchMode ? '0px' : '150px',
              opacity: isSearchMode ? 0 : 1,
              marginBottom: isSearchMode ? '0px' : '32px',
              transform: isSearchMode ? 'translateY(-20px)' : 'translateY(0px)',
              pointerEvents: isSearchMode ? 'none' : 'auto'
            }}
          >
            <div onClick={() => {setCurrentPage('home'); if(window.innerWidth < 768) setIsNavOpen(false);}} className="shrink-0 flex items-center gap-6 cursor-pointer group mb-8">
              <img src="/home.png" alt="home" draggable="false" className={`w-6 h-6 shrink-0 ${currentPage === 'home' ? 'icon-emerald-active' : 'icon-hover-trigger'}`} />
              <span className={`nico-font text-sm tracking-widest whitespace-nowrap transition-colors duration-300 ${currentPage === 'home' ? 'text-emerald-400' : 'group-hover:text-gray-500'}`} style={textTransitionStyle(isNavOpen)}>HOME</span>
            </div>
            <div onClick={() => {setCurrentPage('about'); if(window.innerWidth < 768) setIsNavOpen(false);}} className="shrink-0 flex items-center gap-6 cursor-pointer group">
              <img src="/about.png" alt="about" draggable="false" className={`w-6 h-6 shrink-0 ${currentPage === 'about' ? 'icon-emerald-active' : 'icon-hover-trigger'}`} />
              <span className={`nico-font text-sm tracking-widest whitespace-nowrap transition-colors duration-300 ${currentPage === 'about' ? 'text-emerald-400' : 'group-hover:text-gray-500'}`} style={textTransitionStyle(isNavOpen)}>ABOUT</span>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div onClick={() => { if(!isSearchMode) { setIsSearchMode(true); setIsNavOpen(true); } }}
              className={`shrink-0 flex items-center gap-6 cursor-pointer mb-4 group`}
            >
              <img src="/recent.png" alt="history" draggable="false" className={`w-6 h-6 shrink-0 ${isSearchMode ? 'icon-emerald-active' : 'icon-hover-trigger'}`} />
              <span className={`nico-font text-sm tracking-[0.2em] whitespace-nowrap transition-colors duration-300 ${isSearchMode ? 'text-emerald-400' : 'group-hover:text-gray-500'}`} style={textTransitionStyle(isNavOpen || isSearchMode)}>RECENT</span>
            </div>
            <div className="ml-3 flex flex-col flex-1 min-h-0 transition-all duration-300"
              style={{ opacity: (isNavOpen || isSearchMode) ? 1 : 0, visibility: (isNavOpen || isSearchMode) ? 'visible' : 'hidden', overflow: 'hidden' }}
            >
              <div className={`pr-4 flex flex-col h-full pb-4 custom-scrollbar overflow-y-auto ${scrollbarVisible ? 'scrollbar-visible' : ''}`}>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item, i) => (
                    <div key={i} className="flex items-stretch group">
                      <div className="flex flex-col items-center mr-4"><div className="w-px bg-white/10 flex-1"></div></div>
                      <div onClick={() => handleHistoryClick(item)} className="text-[14px] py-1 text-gray-500 font-mono truncate group-hover:text-gray-500 cursor-pointer shrink-0 transition-colors flex-1" title={item.title}>{item.title}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-stretch select-none">
                    <div className="flex flex-col items-center mr-4"><div className="w-px bg-white/10 flex-1"></div></div>
                    <div className="text-[15px] text-gray-700 font-mono italic shrink-0 mt-2 whitespace-nowrap">{(isSearchMode && searchTerm) ? "No results" : "Empty"}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto px-2 pt-4 pb-6 shrink-0 overflow-hidden">
          {isSearchMode ? (
            <div onClick={() => { setIsSearchMode(false); setSearchTerm(''); }} className="flex items-center gap-6 cursor-pointer group">
              <img src="/back.png" alt="back" draggable="false" className="w-6 h-6 shrink-0 icon-hover-trigger" />
              <span className="nico-font text-sm tracking-widest transition-colors duration-300 group-hover:text-gray-500" style={textTransitionStyle(isNavOpen || isSearchMode)}>BACK</span>
            </div>
          ) : (
            <div onClick={() => {setCurrentPage('contact'); if(window.innerWidth < 768) setIsNavOpen(false);}} className="flex items-center gap-6 cursor-pointer group">
              <img src="/contact.png" alt="contact" draggable="false" className={`w-6 h-6 shrink-0 ${currentPage === 'contact' ? 'icon-emerald-active' : 'icon-hover-trigger'}`} />
              <span className={`nico-font text-sm tracking-widest whitespace-nowrap transition-colors duration-300 ${currentPage === 'contact' ? 'text-emerald-400' : 'group-hover:text-gray-500'}`} style={textTransitionStyle(isNavOpen)}>CONTACT</span>
            </div>
          )}
        </div>
      </nav>

      <button 
        onClick={() => setIsNavOpen(true)} 
        className={`fixed top-8 left-6 z-40 md:hidden text-white transition-none hamburger-hover ${(!isNavOpen && !isSearchMode) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="select-none pointer-events-none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      
      <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-6 transition-all duration-500 ease-in-out h-full overflow-hidden ${isNavOpen || isSearchMode ? 'md:ml-72' : 'ml-0'}`}>
        
        {dlProcessing && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center select-none">
            <div className="w-16 h-16 md:w-20 md:h-20 border-t-4 border-emerald-400 border-solid rounded-full animate-spin mb-10"></div>
            <div className="flex flex-col w-fit items-stretch px-4">
               <h2 className="nico-font text-2xl md:text-5xl text-emerald-400 tracking-widest text-center whitespace-nowrap">DOWNLOADING</h2>
               <div className="flex justify-between w-full mt-6 text-gray-500 text-[10px] md:text-xs font-mono uppercase tracking-widest">
                 {"PLEASE WAIT UNTIL THE FILE IS READY".split("").map((char, i) => (
                   <span key={i} className={char === " " ? "w-1" : ""}>{char}</span>
                 ))}
               </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div 
              key="home" initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageVariants.transition}
              className="w-full flex flex-col items-center justify-center md:max-h-none overflow-visible"
            >
              <div className="w-full flex flex-col items-center scale-[0.95] md:scale-100 origin-center mt-0 md:mt-0 py-4 md:py-0">
                <div id="header-section" className="z-10 text-center mb-6 md:mb-8 flex flex-col items-center pt-2 md:pt-0 -mt-20 md:mt-0 overflow-visible">
                  <h1 className="nico-font text-6xl md:text-8xl mb-1 md:mb-2 pt-6 md:pt-3 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                    <span className="text-white">ULC</span>
                    <span className="text-emerald-400">MP4</span>
                  </h1>
                  <div className="relative inline-block">
                    <p className="text-emerald-500/80 tracking-[0.65em] md:tracking-[0.95em] text-[8px] md:text-[11px] uppercase font-bold">link to mp4 in seconds</p>
                    <div className="h-0.5 w-full bg-linear-to-r from-transparent via-emerald-500 to-transparent mt-3 opacity-50"></div>
                  </div>
                </div>

                <div className={`z-10 w-full max-w-85 md:max-w-2xl bg-white/2 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-all duration-500`}>
                  <div className={`flex flex-row gap-2 md:gap-4 items-stretch ${info ? 'mb-6' : 'mb-0'}`}>
                    <input
                      type="text"
                      placeholder="INPUT MEDIA URL"
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-black/60 border border-white/5 rounded-2xl px-4 py-4 md:px-8 md:py-5 focus:border-emerald-500/30 transition-all outline-none text-emerald-100 font-mono text-[10px] md:text-sm placeholder:select-none"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <button onClick={() => fetchInfo()} className="bg-white text-black px-4 md:px-10 py-4 rounded-2xl hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-15 md:min-w-35 select-none">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5 md:h-7 md:w-7 text-black" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      )}
                    </button>
                  </div>

                  {info && (
                    <div className="bg-black/40 border border-white/10 rounded-3xl md:rounded-4xl overflow-hidden p-4 md:p-6 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch">
                        <div className="relative shrink-0 w-full md:w-56 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black md:h-auto select-none">
                          <div className="relative z-10 w-full h-full flex items-center justify-center">
                            {info.thumbnail ? (
                              <img key={info.thumbnail} src={`https://images.weserv.nl/?url=${encodeURIComponent(info.thumbnail)}`} referrerPolicy="no-referrer" className="w-full h-full object-cover shadow-2xl" alt="preview" draggable="false" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-white/70">{getPlatformLogo(info.fetchedUrl)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="overflow-hidden">
                            <h3 className="text-[14px] md:text-[16px] font-bold text-white mb-4 whitespace-nowrap truncate leading-tight tracking-tight">{info.title}</h3>
                          </div>
                          <div className="flex flex-col gap-3 mt-auto select-none">
                            <button onClick={() => startDownload('mp4', '1080p')} className="w-full py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-300 transition-all flex justify-center items-center gap-2 text-[10px] md:text-[11px] uppercase nico-font cursor-pointer active:scale-[0.98]">Download MP4 (1080P)</button>
                            <button onClick={() => startDownload('mp3')} className="w-full py-4 bg-white/10 border border-white/10 text-white font-black rounded-xl hover:bg-white hover:text-black transition-all flex justify-center items-center gap-2 text-[10px] md:text-[11px] uppercase nico-font cursor-pointer active:scale-[0.98]">Download MP3 (320kb/s)</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {currentPage === 'about' && (
            <motion.div key="about" initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageVariants.transition} className="w-full flex justify-center"><About /></motion.div>
          )}
          {currentPage === 'contact' && (
            <motion.div key="contact" initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageVariants.transition} className="w-full flex justify-center"><Contact /></motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
