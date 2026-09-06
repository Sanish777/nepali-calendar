'use client';
import { useLanguage } from "./LanguageProvider";

export default function HeroSection() {
  const { lang } = useLanguage();
  
  return (
    <div className="relative pt-16 pb-12 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          {lang === 'np' ? 'मिति API प्रत्यक्ष रूपमा उपलब्ध छ' : 'Miti API is Live'}
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto mb-6 leading-tight">
          {lang === 'np' ? (
            <>
              आधुनिक विकासकर्ताहरूको लागि <span className="text-primary font-np">मानक पात्रो API</span>
            </>
          ) : (
            <>
              The Standard Calendar API for <span className="text-primary">Modern Developers</span>
            </>
          )}
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          {lang === 'np' 
            ? 'विक्रम संवत (BS) बाट ई.सं. (AD) रूपान्तरण, सही तिथि, पञ्चाङ्ग, चाडपर्वहरू, र तपाईंको एपमा राख्न मिल्ने पात्रो विजेटहरूको लागि उच्च गतिको REST API।' 
            : 'High-performance REST API for Bikram Sambat (BS) to AD conversion, accurate tithi, panchanga, festivals, and embeddable Nepali calendar widgets.'}
        </p>
      </div>
    </div>
  );
}
