import React, { useRef, useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { toast } from 'sonner';

const Contact = () => {
  const form = useRef();
  const containerRef = useRef();
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsTouched(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const sendEmail = (e) => {
    e.preventDefault();
    const formData = new FormData(form.current);
    const name = formData.get('from_name');
    const email = formData.get('reply_to');
    const message = formData.get('message');

    if (!name || !email || !message) {
      return toast.error("DENIED: ALL_FIELDS_REQUIRED");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("ERROR: INVALID_EMAIL_ID");
    }

    const SERVICE_ID = "service_5ks9xov"; 
    const TEMPLATE_ID = "template_08now6i"; 
    const PUBLIC_KEY = "vnd8tCPWyeI93Spta";

    const loadingToast = toast.loading("INITIATING_TRANSFER...");

    emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY)
      .then((result) => {
          toast.success("TRANSMISSION_SUCCESSFUL: Data received.", { id: loadingToast });
          e.target.reset();
          setIsTouched(false);
      }, (error) => {
          toast.error("TRANSMISSION_FAILED: Node disconnected.", { id: loadingToast });
      });
  };

  return (
    <>
      <div className="z-10 w-full max-w-7xl flex flex-col md:flex-row items-center md:justify-center gap-10 md:gap-16 md:pl-14 pt-20 md:pt-0 animate-contact-unified scale-[0.85] md:scale-100 -mt-20 md:mt-0">
        <style>{`
          @keyframes unifiedArrival {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-contact-unified {
            animation: unifiedArrival 0.5s ease-out forwards;
          }
          .glitch-stabilizer {
            will-change: transform, opacity;
            backface-visibility: hidden;
          }
        `}</style>

        <div className="space-y-6 md:space-y-10 min-w-fit flex flex-col items-center md:items-start">
          <div className="flex flex-col items-center w-full max-w-132.5 md:max-w-none md:w-fit">
            <h1 className="nico-font text-6xl md:text-8xl tracking-widest text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.3)] w-full text-center md:text-left">
              CONTACT
            </h1>
            
            <p className="text-emerald-500/60 text-[8px] md:text-[10px] tracking-[0.45em] md:tracking-[0.74em] mt-2 uppercase text-center w-full whitespace-nowrap">
              Contact me if you have any suggestions
            </p>
            <div className="h-0.5 w-full bg-linear-to-r from-transparent via-emerald-500 to-transparent mt-4"></div>
            
            <div className="space-y-8 md:space-y-10 w-full mt-10">
              <div className="grid grid-cols-2 md:flex md:flex-row gap-y-8 md:justify-between items-center md:items-start">
                <div className="group text-center md:text-left">
                  <p className="font-mono text-[9px] md:text-[10px] text-emerald-500/50 tracking-[0.3em] uppercase mb-1">Developer</p>
                  <p className="nico-font text-lg md:text-2xl text-white group-hover:text-emerald-400 transition-colors duration-300">
                    <span className="block md:inline">Daksh</span> <span className="block md:inline">Sharma</span>
                  </p>
                </div>

                <div className="group text-center md:text-left">
                  <p className="font-mono text-[9px] md:text-[10px] text-emerald-500/50 tracking-[0.3em] uppercase mb-2">Digital Presence</p>
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                    <a href="https://github.com/dakshsharma99ds" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm md:text-lg text-gray-300 hover:text-emerald-400 transition-all group/link">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 group-hover/link:scale-110 transition-transform"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                      Github
                    </a>
                    <a href="https://www.linkedin.com/in/dakshsharma2939" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm md:text-lg text-gray-300 hover:text-emerald-400 transition-all group/link">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 group-hover/link:scale-110 transition-transform"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex md:flex-row gap-y-8 md:justify-between items-center md:items-end">
                <div className="space-y-1 text-center md:text-left">
                  <p className="font-mono text-[9px] md:text-[10px] text-emerald-500/50 tracking-[0.3em] uppercase mb-2">Direct Communication</p>
                  <div className="space-y-1 flex flex-col items-center md:items-start">
                    <a href="mailto:dakshsharma999ds@gmail.com" className="font-mono text-[10px] md:text-sm text-gray-300 hover:text-emerald-400 transition-colors w-fit break-all">
                      dakshsharma999ds@gmail.com
                    </a>
                    <a href="tel:+918368919353" className="font-mono text-[10px] md:text-sm text-gray-300 hover:text-emerald-400 transition-colors w-fit">
                      +91 83689 19353
                    </a>
                  </div>
                </div>

                <div className="pb-1 flex flex-col items-center md:items-start">
                  <p className="font-mono text-[9px] md:text-[10px] text-emerald-500/50 tracking-[0.3em] uppercase mb-3 text-center md:text-left">System Link</p>
                  <div className="flex items-center gap-3 md:gap-4 bg-white/5 w-fit md:w-63 px-3 md:px-6 py-2 md:py-3 rounded-full border border-white/10">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-ping"></div>
                    <p className="font-mono text-[8px] md:text-[10px] pl-1 md:pl-3 tracking-[0.15em] md:tracking-[0.2em] text-emerald-400">NODE_STATUS: ACTIVE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div 
          ref={containerRef}
          onTouchStart={() => setIsTouched(true)}
          className="w-full max-w-[320px] md:max-w-md relative group shrink-0 glitch-stabilizer"
        >
          <div className={`absolute -inset-1 bg-linear-to-r from-emerald-500/20 to-blue-500/20 rounded-[30px] md:rounded-[40px] blur-2xl transition duration-1000 ${isTouched ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}></div>
          <div className="relative bg-black/40 border border-white/10 rounded-[30px] md:rounded-[40px] p-7 md:p-10 backdrop-blur-3xl shadow-2xl">
            <form ref={form} onSubmit={sendEmail} className="space-y-4 md:space-y-5">
              <input name="from_name" type="text" className="w-full bg-white/3 border border-white/10 rounded-xl md:rounded-2xl px-5 md:px-6 py-3 md:py-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono text-xs md:text-sm transition-all placeholder:text-gray-600 text-white" placeholder="IDENT_NAME" />
              <input name="reply_to" type="text" className="w-full bg-white/3 border border-white/10 rounded-xl md:rounded-2xl px-5 md:px-6 py-3 md:py-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono text-xs md:text-sm transition-all placeholder:text-gray-600 text-white" placeholder="COMM_CHANNEL (EMAIL)" />
              <textarea name="message" className="w-full h-24 md:h-32 bg-white/3 border border-white/10 rounded-xl md:rounded-2xl px-5 md:px-6 py-3 md:py-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono text-xs md:text-sm resize-none transition-all placeholder:text-gray-600 text-white custom-scrollbar" placeholder="TRANSMIT_DATA..."></textarea>
              <button type="submit" className="w-full py-3 md:py-4 bg-emerald-500 text-black nico-font text-[9px] md:text-[10px] tracking-[0.3em] rounded-xl md:rounded-2xl hover:bg-emerald-300 transition-all shadow-[0_0_25px_rgba(52,211,153,0.2)] active:scale-95 uppercase font-bold">
                Initiate Transfer
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
