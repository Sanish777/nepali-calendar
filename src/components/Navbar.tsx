'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Shield, BookOpen, RefreshCw } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [todayString, setTodayString] = useState("वि.सं. ...");
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/calendar/today?api_key=np_live_demo1234567890abcdef12345678")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const bs = data.data.bs;
          setTodayString(`${bs.dayOfWeekNp}, ${bs.yearBsNp} ${bs.monthNameNp} ${bs.dayBsNp}`);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (pathname?.startsWith("/admin")) return null;


  return (
    <>
    <nav className="sticky top-0 z-50 bg-primary text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[64px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
              <div className="h-[36px] md:h-[46px] flex items-center justify-center">
                <img src="/logo_nav_gold.png" alt="Miti Logo" className="h-full w-auto object-contain" />
              </div>
            </Link>
          </div>

          {/* Center Links (Desktop) */}
          {(!user || user.role !== "ADMIN") && (
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-[14px] font-semibold transition ${
                pathname === "/"
                  ? "bg-white/20 text-white"
                  : "text-neutral hover:bg-white/10"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </Link>
            <Link
              href="/converter"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-[14px] font-semibold transition ${
                pathname.startsWith("/converter")
                  ? "bg-white/20 text-white"
                  : "text-neutral hover:bg-white/10"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Converter
            </Link>
          </div>
          )}

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Date pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-md border border-white/10 text-xs font-semibold text-white font-np">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
              <span>{todayString}</span>
            </div>

            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 px-3 py-1.5 bg-white rounded-xl transition shadow-sm text-slate-900"
                >
                  <div className="w-8 h-8 md:w-6 md:h-6 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold text-sm md:text-xs">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                    <div className="text-[9px] text-slate-500 leading-tight">{user.email}</div>
                  </div>
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-accent hover:bg-secondary/10"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Bottom Navigation */}
    {(!user || user.role !== "ADMIN") && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[64px]">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${
              pathname === "/" ? "text-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className={`w-5 h-5 ${pathname === "/" ? "fill-primary/10" : ""}`} />
            <span className="text-[10px] font-semibold">Calendar</span>
          </Link>
          <Link
            href="/converter"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${
              pathname.startsWith("/converter") ? "text-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${pathname.startsWith("/converter") ? "fill-primary/10" : ""}`} />
            <span className="text-[10px] font-semibold">Converter</span>
          </Link>
        </div>
      </div>
    )}
    </>
  );

}
