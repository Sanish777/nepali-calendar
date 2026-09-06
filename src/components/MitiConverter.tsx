"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, Calendar, Clock, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const bsMonths = [
  { value: 1, label: "Baisakh" },
  { value: 2, label: "Jestha" },
  { value: 3, label: "Asar" },
  { value: 4, label: "Shrawan" },
  { value: 5, label: "Bhadra" },
  { value: 6, label: "Ashoj" },
  { value: 7, label: "Kartik" },
  { value: 8, label: "Mangsir" },
  { value: 9, label: "Poush" },
  { value: 10, label: "Magh" },
  { value: 11, label: "Falgun" },
  { value: 12, label: "Chaitra" },
];

const adMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
].map((m, i) => ({ value: i + 1, label: m }));

type Mode = "BS_TO_AD" | "AD_TO_BS";

export default function MitiConverter() {
  const { lang, t } = useLanguage();
  const [mode, setMode] = useState<Mode>("BS_TO_AD");

  // Input states
  const [year, setYear] = useState<number>(2055);
  const [month, setMonth] = useState<number>(4);
  const [day, setDay] = useState<number>(17);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleModeToggle = (newMode: Mode) => {
    if (mode === newMode) return;
    setMode(newMode);
    if (newMode === "AD_TO_BS") {
      setYear(1998);
      setMonth(8);
      setDay(2);
    } else {
      setYear(2055);
      setMonth(4);
      setDay(17);
    }
  };

  useEffect(() => {
    const fetchConversion = async () => {
      setLoading(true);
      try {
        const apiKey = "np_live_demo1234567890abcdef12345678";
        const url =
          mode === "BS_TO_AD"
            ? `/api/v1/convert/bs-to-ad?year=${year}&month=${month}&day=${day}&api_key=${apiKey}`
            : `/api/v1/convert/ad-to-bs?year=${year}&month=${month}&day=${day}&api_key=${apiKey}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          setResult(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversion();
  }, [year, month, day, mode]);

  const years =
    mode === "BS_TO_AD"
      ? Array.from({ length: 91 }, (_, i) => 2000 + i)
      : Array.from({ length: 90 }, (_, i) => 1944 + i);

  const months = mode === "BS_TO_AD" ? bsMonths : adMonths;
  const days = Array.from({ length: mode === "BS_TO_AD" ? 32 : 31 }, (_, i) => i + 1);

  return (
    <div className="bg-transparent font-sans pt-6 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">{lang === "np" ? "मिति रूपान्तरण" : "Miti Converter"}</h1>
          <p className="text-slate-500 text-[15px] mt-1">
            Instantly convert between Bikram Sambat and Gregorian (AD) dates.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/50 p-6 md:p-8">
          <div className="space-y-6">
            {/* Date Header & Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="font-bold text-slate-900 text-lg">{lang === "np" ? "मिति चयन गर्नुहोस्" : "Select Date"}</span>
              <div className="flex bg-slate-100/80 p-1 rounded-xl text-sm font-bold">
                <button
                  onClick={() => handleModeToggle("BS_TO_AD")}
                  className={`px-6 py-2 rounded-lg transition-all ${
                    mode === "BS_TO_AD"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Bikram Sambat
                </button>
                <button
                  onClick={() => handleModeToggle("AD_TO_BS")}
                  className={`px-6 py-2 rounded-lg transition-all ${
                    mode === "AD_TO_BS"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Gregorian (AD)
                </button>
              </div>
            </div>

            {/* Date Selector Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-[15px] font-medium font-sans cursor-pointer appearance-none shadow-sm transition-all"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-1">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-[15px] font-medium font-sans cursor-pointer appearance-none shadow-sm transition-all"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-1">
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-800 text-[15px] font-medium font-sans cursor-pointer appearance-none shadow-sm transition-all"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Results Cards */}
            <div className="flex flex-col md:flex-row gap-6 pt-2">
              {/* BS Result */}
              <div className="flex-1 bg-primary/5 rounded-2xl p-5 md:p-6 border border-primary/10 relative overflow-hidden">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Bikram Sambat
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  {result ? `${result.bs.monthNameEn} ${result.bs.day}, ${result.bs.year}` : "..."}
                </div>
                <div className="text-slate-600 text-sm font-medium">
                  {result ? result.bs.dayOfWeekEn : "..."}
                </div>
              </div>

              {/* AD Result */}
              <div className="flex-1 bg-primary/5 rounded-2xl p-5 md:p-6 border border-primary/10 relative overflow-hidden">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Gregorian (AD)
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  {result ? `${adMonths[result.ad.month - 1]?.label} ${result.ad.day}, ${result.ad.year}` : "..."}
                </div>
                <div className="text-slate-600 text-sm font-medium">
                  {result ? result.ad.dayOfWeek : "..."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}