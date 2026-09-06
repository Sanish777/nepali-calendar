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
  { en: 'Sunday', np: 'आइतबार' },
  { en: 'Monday', np: 'सोमबार' },
  { en: 'Tuesday', np: 'मंगलबार' },
  { en: 'Wednesday', np: 'बुधबार' },
  { en: 'Thursday', np: 'बिहिबार' },
  { en: 'Friday', np: 'शुक्रबार' },
  { en: 'Saturday', np: 'शनिबार' }
];

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
       return `${firstMonthStr} ${firstDay.year_ad} / ${lastMonthStr} ${lastDay.year_ad}`;
    }
    return `${firstMonthStr} / ${lastMonthStr} ${firstDay.year_ad}`;
  };

  const getEventsToDisplay = (): CalendarEvent[] => {
    if (!data) return [];
    
    const dayNumberNp = (day: CalendarDay) => day.day_bs_np;
    const dayNumberEn = (day: CalendarDay) => String(day.day_bs);

    if (selectedDayBs !== null) {
      const selectedDay = data.days.find(d => d.day_bs === selectedDayBs);
      if (selectedDay && selectedDay.events) {
        return selectedDay.events.map(e => ({
          ...e,
          date_label_np: `${data.month_name_np} ${dayNumberNp(selectedDay)}`,
          date_label_en: `${data.month_name_en} ${dayNumberEn(selectedDay)}`
        }));
      }
      return [];
    }

    const allEvents: CalendarEvent[] = [];
    const seenEventIds = new Set<string>();
    
    data.days.forEach(day => {
      day.events?.forEach(event => {
        if (!seenEventIds.has(event.id)) {
          seenEventIds.add(event.id);
          allEvents.push({
            ...event,
            date_label_np: `${data.month_name_np} ${dayNumberNp(day)}`,
            date_label_en: `${data.month_name_en} ${dayNumberEn(day)}`
          });
        }
      });
    });
    return allEvents;
  };

  const displayEvents = getEventsToDisplay();

  return (
    <div className="w-full font-sans">
      <div className="w-full flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
        
        {/* Main Calendar Card */}
        <main className="flex-1 min-w-0 w-full bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/50 overflow-hidden">
          
          {/* Header Controls */}
          <div className="bg-white px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row items-center justify-between border-b border-slate-100/80 gap-4">
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex flex-col text-center sm:text-left">
                {lang === 'np' ? (
                    <h2 className="text-xl md:text-2xl font-semibold text-slate-900 font-np tracking-normal">
                      {data ? `${data.month_name_np} · ${getOverlapString()}` : '...'}
                    </h2>
                ) : (
                    <h2 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-normal">
                      {data ? `${data.month_name_en} · ${getOverlapString()}` : '...'}
                    </h2>
                )}
              </div>
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-center">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 md:p-2 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-colors hover:shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              
              <button 
                onClick={() => {
                  handleToday();
                }}
                className={`px-4 py-1.5 md:py-2 text-[13px] font-medium rounded-md transition-colors hover:bg-white hover:text-primary hover:shadow-sm ${lang === 'np' ? 'font-np' : ''} text-slate-600 flex-1 sm:flex-none text-center`}
              >
                {lang === 'np' ? 'आज' : 'Today'}
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-1"></div>

              <button 
                onClick={handleNextMonth}
                className="p-1.5 md:p-2 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-colors hover:shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
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
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS.map((day, idx) => (
                  <div key={idx} className={`text-center py-3 md:py-4 border-r last:border-r-0 border-slate-200 ${idx === 6 ? 'text-accent' : 'text-slate-600'}`}>
                    <div className={`font-medium text-xs md:text-sm truncate px-1 ${lang === 'np' ? 'font-np' : ''}`}>
                      {lang === 'np' ? day.np : day.en}
                    </div>
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 bg-slate-200 gap-[1px] border-b border-slate-200">
                {/* Empty cells */}
                {Array.from({ length: data.start_day_of_week }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-[#fafafa] min-h-[100px] md:min-h-[120px]"></div>
                ))}
                
                {/* Day cells */}
                {data.days.map((day) => {
                  const isSat = day.day_of_week === 6;
                  const isRed = isSat || day.is_holiday;
                  const isSelected = selectedDayBs === day.day_bs;
                  
                  let cellBg = "bg-white";
                  if (isSelected) cellBg = "bg-secondary/10";
                  else if (day.is_today) cellBg = "bg-blue-50/40";
                  else if (isRed) cellBg = "bg-secondary/10/20";

                  return (
                    <div 
                      key={`day-${day.day_bs}`} 
                      className={`relative flex flex-col p-1.5 md:p-2 min-h-[100px] md:min-h-[120px] transition-colors cursor-pointer hover:bg-slate-50 ${cellBg} ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
                      onClick={() => handleDayClick(day.day_bs)}
                    >
                      {/* Top Row: Tithi & AD Date */}
                      <div className="flex justify-between items-start w-full">
                        <span className="text-[10px] md:text-xs text-slate-500 font-np truncate max-w-[60%]">
                          {(lang === 'np' ? (day.tithi_name_np || day.tithi_short) : (day.tithi_name_en || day.tithi_short))}
                        </span>
                        <span className="text-[10px] md:text-xs text-slate-400 font-medium">
                          {day.day_ad}
                        </span>
                      </div>
                      
                      {/* Center: BS Date */}
                      <div className={`text-xl md:text-2xl font-medium text-center ${lang === 'np' ? 'font-np' : ''} my-auto py-1 ${isRed ? 'text-accent' : 'text-slate-800'}`}>
                        {lang === 'np' ? day.day_bs_np : day.day_ad}
                      </div>

                      {/* Events List */}
                      <div className="mt-auto space-y-[2px] w-full">
                        {day.events?.slice(0, 2).map((ev: any, i: number) => (
                          <div
                            key={i}
                            className={`w-full text-[9px] md:text-[10px] leading-tight truncate px-1 py-0.5 rounded-[2px] ${lang === 'np' ? 'font-np' : ''} ${
                              ev.is_public_holiday
                                ? "text-accent font-medium"
                                : "text-slate-600"
                            }`}
                            title={lang === 'np' ? ev.title_np : ev.title_en}
                          >
                            {lang === 'np' ? ev.title_np : ev.title_en}
                          </div>
                        ))}
                        {day.events && day.events.length > 2 && (
                          <div className={`text-[9px] text-slate-400 font-medium ${lang === 'np' ? 'font-np' : ''}`}>
                            {lang === 'np' ? `+${day.events.length - 2} थप` : `+${day.events.length - 2} more`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Fill remaining cells if needed */}
                {Array.from({ length: (7 - ((data.start_day_of_week + data.days_in_month) % 7)) % 7 }).map((_, idx) => (
                  <div key={`empty-end-${idx}`} className="bg-[#fafafa] min-h-[100px] md:min-h-[120px]"></div>
                ))}
              </div>
            </div>
          ) : null}
        </main>

        {/* Events Section */}
        {/* Events Section */}
        <section className="w-full xl:w-[420px] shrink-0 flex flex-col bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/50 overflow-hidden min-h-[500px]">
          {loading || !data ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <MitiLoader className="w-8 h-8 opacity-50" />
            </div>
          ) : (
            <>
            <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h3 className={`text-lg font-medium text-slate-800 ${lang === 'np' ? 'font-np' : ''}`}>
                  {selectedDayBs !== null ? (
                    lang === 'np' ? (
                      <>{data.year_bs_np} {data.month_name_np} {selectedDayBs} गतेका पर्वहरू</>
                    ) : (
                      <>Festivals on {data.month_name_en} {selectedDayBs}, {data.year_bs}</>
                    )
                  ) : (
                    lang === 'np' ? (
                      <>{data.year_bs_np} {data.month_name_np} महिनाका पर्वहरू</>
                    ) : (
                      <>Festivals of {data.month_name_en} {data.year_bs}</>
                    )
                  )}
                </h3>
              </div>
              
              {selectedDayBs !== null && (
                <button 
                  onClick={() => setSelectedDayBs(null)}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm transition"
                >
                  <X className="w-4 h-4" /> 
                  <span className="hidden sm:inline">{lang === 'np' ? 'सबै हेर्नुहोस्' : 'View all'}</span>
                </button>
              )}
            </div>
            
            <div className="divide-y divide-slate-100 xl:max-h-[800px] overflow-y-auto">
              {displayEvents.length > 0 ? (
                displayEvents.map((event: any, idx) => (
                  <div key={`${event.id}-${idx}`} className="p-4 md:p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <div className={`w-28 shrink-0 font-medium text-sm md:text-[15px] ${lang === 'np' ? 'font-np' : ''} ${event.is_public_holiday ? 'text-accent' : 'text-slate-700'}`}>
                      {lang === 'np' ? event.date_label_np : event.date_label_en}
                    </div>
                    <div>
                      <h4 className={`font-medium text-slate-900 text-sm md:text-[15px] ${lang === 'np' ? 'font-np' : ''}`}>
                        {lang === 'np' ? event.title_np : event.title_en}
                      </h4>
                      {lang === 'np' && <p className="text-sm text-slate-500 mt-0.5">{event.title_en}</p>}
                    </div>
                    {event.is_public_holiday && (
                      <span className="md:ml-auto mt-2 md:mt-0 inline-flex items-center px-2.5 py-1 text-xs font-medium text-accent bg-secondary/10 border border-secondary/20 rounded-md">
                        {lang === 'np' ? 'सार्वजनिक बिदा' : 'Public Holiday'}
                      </span>
                    )}
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
