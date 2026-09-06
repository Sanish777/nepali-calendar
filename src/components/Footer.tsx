'use client';

import { useLanguage } from "./LanguageProvider";

export default function Footer() {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();
  const npDigits = ['०','१','२','३','४','५','६','७','८','९'];
  const yearNp = String(year).split('').map((d) => npDigits[Number(d)]).join('');

  return (
    <footer className="border-t border-accent/20 bg-neutral py-8 text-center text-sm text-primary/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4">
        <span className={`font-bold text-primary ${lang === 'np' ? 'font-np' : ''}`}>
          {lang === 'np' ? `मिति@${yearNp}` : `miti@${year}`}
        </span>
      </div>
    </footer>
  );
}