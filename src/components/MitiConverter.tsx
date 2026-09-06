"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, Calendar, Clock } from "lucide-react";
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
    <div className="bg-[#f8f9fa] font-sans pt-8 pb-28 md:pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">{lang === "np" ? "मिति रूपान्तरण" : "Miti Converter"}</h1>
          <p className="text-slate-500 text-[15px] mt-1">
            Instantly convert between Bikram Sambat and Gregorian (AD) dates.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="space-y-6">
            {/* Date Header & Toggle */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{lang === "np" ? "मिति" : "Date"}</span>
              <div className="flex bg-white border border-slate-300 rounded-lg overflow-hidden text-sm font-medium">
                <button
                  onClick={() => handleModeToggle("BS_TO_AD")}
                  className={`px-4 py-1.5 transition-colors ${
                    mode === "BS_TO_AD"
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  BS
                </button>
                <button
                  onClick={() => handleModeToggle("AD_TO_BS")}
                  className={`px-4 py-1.5 transition-colors ${
                    mode === "AD_TO_BS"
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  AD
                </button>
              </div>
            </div>

            {/* Date Selector Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 text-[15px] font-medium font-sans cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 text-[15px] font-medium font-sans cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="flex-1 pl-4 pr-10 py-3 bg-white border-2 border-primary rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 text-[15px] font-medium font-sans cursor-pointer"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Results Cards */}
            <div className="flex flex-col md:flex-row gap-6 pt-2">
              {/* BS Result */}
              <div className="flex-1 bg-[#fef5f5] rounded-xl p-5 md:p-6 border border-[#fbeaea]">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Bikram Sambat
                </div>
                <div className="text-2xl md:text-[28px] font-bold text-primary mb-1">
                  {result ? `${result.bs.monthNameEn} ${result.bs.day}, ${result.bs.year}` : "..."}
                </div>
                <div className="text-slate-600 text-sm font-medium">
                  {result ? result.bs.dayOfWeekEn : "..."}
                </div>
              </div>

              {/* AD Result */}
              <div className="flex-1 bg-[#fef5f5] rounded-xl p-5 md:p-6 border border-[#fbeaea]">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Gregorian (AD)
                </div>
                <div className="text-2xl md:text-[28px] font-bold text-primary mb-1">
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