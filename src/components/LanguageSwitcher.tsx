'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm text-xs font-semibold text-slate-700"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="uppercase">{lang === 'np' ? 'NEP' : 'ENG'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button 
            onClick={() => { setLang('np'); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${lang === 'np' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            Nepali
          </button>
          <button 
            onClick={() => { setLang('en'); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
}
