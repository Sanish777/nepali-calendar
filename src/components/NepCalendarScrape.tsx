'use client';
import MitiLoader from "@/components/MitiLoader";
import { useLanguage } from "@/components/LanguageProvider";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Star, AlertCircle, X, Search } from 'lucide-react';

const API_KEY = 'np_live_demo1234567890abcdef12345678';

interface CalendarEvent {
  id: string;
  title_np: string;
  title_en: string;
  event_type: string;
  is_public_holiday: boolean;
  date_label_np?: string;
  date_label_en?: string;
}

interface CalendarDay {
  year_bs: number;
  month_bs: number;
  day_bs: number;
  year_ad: number;
  month_ad: number;
  day_ad: number;
  day_of_week: number;
  day_of_week_np: string;
  day_of_week_en: string;
  day_bs_np: string;
  day_ad_np: string;
  is_today: boolean;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_reason: string | null;
  tithi_short: string;
  tithi_name_np: string;
  tithi_name_en: string;
  events: CalendarEvent[];
}

interface CalendarData {
  year_bs: number;
  year_bs_np: string;
  month_bs: number;
  month_name_np: string;
  month_name_en: string;
  days_in_month: number;
  start_day_of_week: number;
  days: CalendarDay[];
}

const WEEKDAYS = [
  { en: 'Sun', np: 'आइत' },
  { en: 'Mon', np: 'सोम' },
  { en: 'Tue', np: 'मंगल' },
  { en: 'Wed', np: 'बुध' },
  { en: 'Thu', np: 'बिहि' },
  { en: 'Fri', np: 'शुक्र' },
  { en: 'Sat', np: 'शनि' }
];

const NP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toNp = (n: number) => String(n).split('').map(d => NP_DIGITS[Number(d)] ?? d).join('');

export default function NepCalendarScrape() {
  const [yearBs, setYearBs] = useState<number | null>(null);
  const [monthBs, setMonthBs] = useState<number | null>(null);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayBs, setSelectedDayBs] = useState<number | null>(null);
  const { lang } = useLanguage();

  useEffect(() => {
    fetch(`/api/v1/calendar/today?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setYearBs(json.data.bs.year);
          setMonthBs(json.data.bs.month);
        } else {
          setYearBs(2083);
          setMonthBs(5);
        }
      })
      .catch(() => {
        setYearBs(2083);
        setMonthBs(5);
      });
  }, []);

  const fetchMonthData = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    setSelectedDayBs(null);
    try {
      const res = await fetch(`/api/v1/calendar/month?year=${year}&month=${month}&api_key=${API_KEY}`);
      if (!res.ok) {
        throw new Error('Failed to fetch calendar data');
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.message || 'Error fetching calendar data');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (yearBs !== null && monthBs !== null) {
      fetchMonthData(yearBs, monthBs);
    }
  }, [yearBs, monthBs, fetchMonthData]);

  const handlePrevMonth = () => {
    if (yearBs === null || monthBs === null) return;
    let newMonth = monthBs - 1;
    let newYear = yearBs;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonthBs(newMonth);
    setYearBs(newYear);
  };

  const handleNextMonth = () => {
    if (yearBs === null || monthBs === null) return;
    let newMonth = monthBs + 1;
    let newYear = yearBs;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonthBs(newMonth);
    setYearBs(newYear);
  };

  
  const handleToday = () => {
    fetch(`/api/v1/calendar/today?api_key=${API_KEY}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setYearBs(json.data.bs.year);
          setMonthBs(json.data.bs.month);
        }
      });
  };

  const handleDayClick = (dayBs: number) => {
    setSelectedDayBs(prev => (prev === dayBs ? null : dayBs));
  };

  const getOverlapString = () => {
    if (!data || !data.days || data.days.length === 0) return '';
    const ENG_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const firstDay = data.days[0];
    const lastDay = data.days[data.days.length - 1];
    
    const firstMonthStr = ENG_MONTHS[firstDay.month_ad - 1];
    const lastMonthStr = ENG_MONTHS[lastDay.month_ad - 1];
    
    if (firstDay.year_ad !== lastDay.year_ad) {
       return `${firstMonthStr} ${firstDay.year_ad}/${lastMonthStr} ${lastDay.year_ad}`;
    }
    return `${firstMonthStr}/${lastMonthStr} ${firstDay.year_ad}`;
  };

  const getEventsToDisplay = (): CalendarEvent[] => {
    if (!data) return [];
    
    const dayNumberNp = (day: CalendarDay) => day.day_bs_np;
    const dayNumberEn = (day: CalendarDay) => String(day.day_bs);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const computeEventMeta = (e: any, day: CalendarDay) => {
      const eventDate = new Date(day.year_ad, day.month_ad - 1, day.day_ad);
      eventDate.setHours(0, 0, 0, 0);
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...e,
        date_label_np: `${data.month_name_np} ${dayNumberNp(day)}`,
        date_label_en: `${data.month_name_en} ${dayNumberEn(day)}`,
        day_bs: day.day_bs,
        day_bs_np: dayNumberNp(day),
        month_np: data.month_name_np,
        month_en: data.month_name_en,
        tithi_np: day.tithi_name_np || day.tithi_short,
        tithi_en: day.tithi_name_en || day.tithi_short,
        diff_days: diffDays
      };
    };

    if (selectedDayBs !== null) {
      const selectedDay = data.days.find(d => d.day_bs === selectedDayBs);
      if (selectedDay && selectedDay.events) {
        return selectedDay.events.map(e => computeEventMeta(e, selectedDay));
      }
      return [];
    }

    const allEvents: any[] = [];
    const seenEventIds = new Set<string>();
    
    data.days.forEach(day => {
      day.events?.forEach(event => {
        if (!seenEventIds.has(event.id)) {
          seenEventIds.add(event.id);
          allEvents.push(computeEventMeta(event, day));
        }
      });
    });
    return allEvents;
  };

  const displayEvents = getEventsToDisplay();

  return (
    <div className="w-full min-w-0 font-sans">
      <div className="w-full min-w-0 flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
        
        {/* Main Calendar Card */}
        <main className="flex-1 min-w-0 w-full bg-white rounded-3xl shadow-[0_12px_40px_-8px_rgba(10,30,80,0.08),0_4px_12px_-4px_rgba(10,30,80,0.03)] border border-slate-100/80 overflow-hidden">
          
          {/* Header Controls */}
          <div className="bg-gradient-to-b from-white to-slate-50/70 px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 gap-4">
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex flex-col text-center sm:text-left w-full">
                {lang === 'np' ? (
                    <h2 className="flex flex-wrap items-baseline justify-center sm:justify-start gap-x-2 gap-y-0.5 md:gap-x-3 min-w-0">
                      <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 font-np">
                        {data ? `${data.month_name_np} ${data.year_bs_np}` : '...'}
                      </span>
                      {data && (
                        <span className="text-[12px] md:text-sm font-medium text-slate-400 font-sans">
                          {getOverlapString()}
                        </span>
                      )}
                    </h2>
                ) : (
                    <h2 className="flex flex-wrap items-baseline justify-center sm:justify-start gap-x-2 gap-y-0.5 md:gap-x-3 min-w-0">
                      <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                        {data ? `${data.month_name_en} ${data.year_bs}` : '...'}
                      </span>
                      {data && (
                        <span className="text-[12px] md:text-sm font-medium text-slate-400">
                          {getOverlapString()}
                        </span>
                      )}
                    </h2>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-center">
              <button 
                onClick={handlePrevMonth}
                className="flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => {
                  handleToday();
                }}
                className={`flex-1 sm:flex-none px-4 md:px-5 py-1.5 md:py-2 text-[12px] md:text-[13px] font-semibold rounded-md transition-colors text-slate-600 hover:text-primary hover:bg-slate-100 ${lang === 'np' ? 'font-np' : ''} text-center`}
              >
                {lang === 'np' ? 'आज' : 'Today'}
              </button>

              <button 
                onClick={handleNextMonth}
                className="flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-[500px] flex items-center justify-center bg-white">
              <MitiLoader className="w-10 h-10" />
            </div>
          ) : error ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-accent gap-3 bg-white">
              <AlertCircle className="w-10 h-10" />
              <p className="font-medium">{error}</p>
              <button 
                onClick={() => { if(yearBs && monthBs) fetchMonthData(yearBs, monthBs); }}
                className="px-6 py-2 bg-secondary/10 text-accent font-semibold rounded-md border border-secondary/20 hover:bg-red-100 transition"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <div className="bg-white">
              {/* Weekdays Header */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white">
                {WEEKDAYS.map((day, idx) => (
                  <div key={idx} className={`text-center py-3 md:py-3.5 border-r last:border-r-0 border-slate-100 ${idx === 6 ? 'text-accent' : 'text-slate-600'}`}>
                    <div className={`font-semibold uppercase tracking-wide text-[11px] md:text-xs truncate px-1 ${lang === 'np' ? 'font-np' : ''}`}>
                      {lang === 'np' ? day.np : day.en}
                    </div>
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-[3px] md:gap-1 border-b border-slate-200/60">
                {/* Empty cells */}
                {Array.from({ length: data.start_day_of_week }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-slate-50/70 rounded-lg min-h-[78px] sm:min-h-[104px] md:min-h-[120px]"></div>
                ))}
                
                {/* Day cells */}
                {data.days.map((day) => {
                  const isSat = day.day_of_week === 6;
                  const isRed = isSat || day.is_holiday;
                  const isSelected = selectedDayBs === day.day_bs;
                  
                  let cellBg = "bg-white";
                  if (isSelected) cellBg = "bg-secondary/15";
                  else if (day.is_today) cellBg = "bg-primary";
                  else if (isRed) cellBg = "bg-secondary/5";

                  return (
                    <div 
                      key={`day-${day.day_bs}`} 
                      className={`relative flex flex-col p-1 md:p-2 min-h-[78px] sm:min-h-[104px] md:min-h-[120px] rounded-lg transition-all duration-150 cursor-pointer overflow-hidden ${day.is_today ? 'hover:bg-primary-dark' : 'hover:bg-slate-50'} ${cellBg} ${isSelected ? 'ring-2 ring-secondary ring-inset shadow-inner z-10' : ''}`}
                      onClick={() => handleDayClick(day.day_bs)}
                    >
                      {/* Top Row: Tithi & AD Date */}
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-[9px] md:text-xs font-np truncate max-w-[60%] ${day.is_today ? 'text-secondary-light/90' : 'text-slate-500'}`}>
                          {(lang === 'np' ? (day.tithi_name_np || day.tithi_short) : (day.tithi_name_en || day.tithi_short))}
                        </span>
                        <span className={`text-[9px] md:text-xs font-bold ${day.is_today ? 'text-secondary-light/70' : 'text-slate-400'}`}>
                          {day.day_ad}
                        </span>
                      </div>
                      
                      {/* Center: BS Date */}
                      <div className={`text-base sm:text-xl md:text-2xl font-medium text-center ${lang === 'np' ? 'font-np' : ''} my-auto py-0.5 md:py-1 ${day.is_today ? 'text-secondary font-bold' : (isRed ? 'text-accent' : 'text-slate-800')}`}>
                        {lang === 'np' ? day.day_bs_np : day.day_ad}
                      </div>

                      {/* Events List */}
                      <div className="mt-auto space-y-[2px] w-full">
                        {day.events?.slice(0, 2).map((ev: any, i: number) => (
                          <div
                            key={i}
                            className={`w-full text-[8px] md:text-[10px] leading-tight truncate px-1 py-0.5 rounded ${lang === 'np' ? 'font-np' : ''} ${
                              ev.is_public_holiday
                                ? (day.is_today ? "text-secondary font-bold bg-secondary/20" : "text-accent font-semibold bg-accent/10")
                                : (day.is_today ? "text-secondary-light/95" : "text-slate-600")
                            }`}
                            title={lang === 'np' ? ev.title_np : ev.title_en}
                          >
                            {lang === 'np' ? ev.title_np : ev.title_en}
                          </div>
                        ))}
                        {day.events && day.events.length > 2 && (
                          <div className={`text-[8px] md:text-[9px] text-slate-400 font-medium ${lang === 'np' ? 'font-np' : ''}`}>
                            {lang === 'np' ? `+${day.events.length - 2} थप` : `+${day.events.length - 2} more`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Fill remaining cells if needed */}
                {Array.from({ length: (7 - ((data.start_day_of_week + data.days_in_month) % 7)) % 7 }).map((_, idx) => (
                  <div key={`empty-end-${idx}`} className="bg-slate-50/70 rounded-lg min-h-[78px] sm:min-h-[104px] md:min-h-[120px]"></div>
                ))}
              </div>
            </div>
          ) : null}
        </main>

        {/* Events Section */}
        {/* Events Section */}
        <section className="w-full min-w-0 xl:w-[420px] shrink-0 flex flex-col bg-white rounded-3xl shadow-[0_12px_40px_-8px_rgba(10,30,80,0.08)] overflow-hidden min-h-[500px]">
          {loading || !data ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <MitiLoader className="w-8 h-8 opacity-50" />
            </div>
          ) : (
            <>
            <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-secondary-light" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-[13px] md:text-sm font-bold text-slate-900 truncate ${lang === 'np' ? 'font-np' : ''}`}>
                    {selectedDayBs !== null ? (
                      lang === 'np' ? (
                        <>{data.year_bs_np} {data.month_name_np} {toNp(selectedDayBs)} गते</>
                      ) : (
                        <>Events on {data.month_name_en} {selectedDayBs}, {data.year_bs}</>
                      )
                    ) : (
                      lang === 'np' ? (
                        <>{data.year_bs_np} {data.month_name_np}</>
                      ) : (
                        <>{data.month_name_en} {data.year_bs}</>
                      )
                    )}
                  </h3>
                  <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-accent mt-0.5 ${lang === 'np' ? 'font-np' : ''}`}>
                    {selectedDayBs !== null
                      ? (lang === 'np' ? 'पर्व र बिदा' : 'Events & holidays')
                      : (lang === 'np' ? 'यस महिनाका पर्वहरू र बिदाहरू' : 'Festivals & holidays this month')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold text-accent ${lang === 'np' ? 'font-np' : ''}`}>
                  {displayEvents.length > 0 && (
                    <>{lang === 'np' ? toNp(displayEvents.length) : displayEvents.length}</>
                  )}
                </span>
                {selectedDayBs !== null && (
                  <button 
                    onClick={() => setSelectedDayBs(null)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-primary bg-white border border-slate-300 hover:border-primary px-3 py-1.5 rounded-md transition-all shadow-sm"
                  >
                    <span className="hidden sm:inline">{lang === 'np' ? 'सबै हेर्नुहोस्' : 'View all'}</span>
                    <X className="w-3.5 h-3.5" /> 
                  </button>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 xl:max-h-[800px] overflow-y-auto">
              {displayEvents.length > 0 ? (
                displayEvents.map((event: any, idx) => (
                  <div key={`${event.id}-${idx}`} className={`group px-3.5 md:px-5 py-3 md:py-4 hover:bg-slate-50/90 transition-colors flex items-center gap-3 md:gap-4`}>
                    <div className={`w-[52px] md:w-14 shrink-0 flex flex-col items-center rounded-xl py-2 ${event.is_public_holiday ? 'bg-accent text-white' : 'bg-primary text-secondary-light'}`}>
                      <span className={`text-base md:text-lg font-bold leading-none ${lang === 'np' ? 'font-np' : ''}`}>
                        {lang === 'np' ? event.day_bs_np : String(event.day_bs)}
                      </span>
                      <span className={`text-[8px] md:text-[9px] mt-1 truncate w-full text-center px-1 ${lang === 'np' ? 'font-np' : 'font-medium'} ${event.is_public_holiday ? 'text-white/80' : 'text-secondary-light/80'}`}>
                        {lang === 'np' ? event.month_np : event.month_en}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`font-semibold text-slate-900 text-[13px] md:text-sm truncate ${lang === 'np' ? 'font-np' : ''}`}>
                        {lang === 'np' ? event.title_np : event.title_en}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] md:text-[11px] text-slate-500 min-w-0">
                        {event.tithi_np || event.tithi_en ? (
                          <span className={`${lang === 'np' ? 'font-np' : ''} text-slate-400 truncate`}>
                            {lang === 'np' ? event.tithi_np : event.tithi_en}
                          </span>
                        ) : null}
                        {event.is_public_holiday && (
                          <span className={`font-bold text-accent shrink-0 ${lang === 'np' ? 'font-np' : ''}`}>
                            • {lang === 'np' ? 'सार्वजनिक बिदा' : 'Public Holiday'}
                          </span>
                        )}
                        {event.diff_days !== undefined && (
                          <span className={`shrink-0 ${
                            event.diff_days === 0 ? 'text-green-600' :
                            event.diff_days > 0 ? 'text-orange-600' :
                            'text-slate-400'
                          } ${lang === 'np' ? 'font-np tracking-wide' : ''}`}>
                            {event.diff_days === 0 ? (lang === 'np' ? 'आज' : 'Today') :
                             event.diff_days > 0 ? (lang === 'np' ? `${toNp(event.diff_days)} दिन बाँकी` : `In ${event.diff_days} days`) :
                             (lang === 'np' ? `${toNp(Math.abs(event.diff_days))} दिन अघि` : `${Math.abs(event.diff_days)} days ago`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-10 text-center text-slate-500 text-[15px] ${lang === 'np' ? 'font-np' : ''}`}>
                  {selectedDayBs !== null 
                    ? (lang === 'np' ? "यस दिन कुनै पर्व वा बिदा छैन।" : "No festivals or holidays on this day.")
                    : (lang === 'np' ? "यस महिना कुनै पर्व वा बिदा छैन।" : "No festivals or holidays this month.")}
                </div>
              )}
            </div>
            </>
          )}
          </section>
      </div>
    </div>
  );
}
