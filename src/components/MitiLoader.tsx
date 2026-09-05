import React from 'react';

export default function MitiLoader({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative flex items-center justify-center ${className}`}>
        <img 
          src="/spinner.png" 
          alt="Loading spinner" 
          className="w-full h-full object-contain animate-spin" 
        />
      </div>
      <span className="mt-3 text-xl font-bold font-np text-primary tracking-widest animate-pulse">
        मिति
      </span>
    </div>
  );
}
