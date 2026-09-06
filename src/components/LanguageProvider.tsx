'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'np';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    dashboard: "Dashboard",
    interactive_calendar: "Interactive Calendar",
    view_calendar: "View Calendar",
    converter: "Converter",
    events_festivals: "Events & Festivals",
    users: "Users",
    api_keys: "API Keys",
    scraper_center: "Scraper Center",
    settings: "Settings",
    overview: "Overview",
    management: "Management",
    system: "System",
    admin: "Admin",
    search: "Search everywhere...",
    log_out: "Log Out",
    profile_settings: "Profile Settings",
    requests_per_day: "Requests per Day",
    top_endpoints: "Top Endpoints",
    recent_requests: "Recent Requests",
    no_usage: "No usage yet.",
    calendar: "Calendar",
    // Frontend
    home: "Home",
    features: "Features",
    docs: "Documentation",
    pricing: "Pricing",
    login: "Login",
    name: "Name",
    email: "Email",
    actions: "Actions",
    user: "User",
    role: "Role",
    status: "Status",
    time: "Time",
    method: "Method",
    endpoint: "Endpoint",
    usage: "Usage",
    owner: "Owner",
    keys: "Keys",
    key: "Key",
    key_prefix: "Key Prefix",
    expires_at: "Expires At",
    started_at: "Started At",
    synced_items: "Synced Items",
    source: "Source",
    sources: "Sources",
    response: "Response",
    holiday: "Holiday",
    type: "Type",
    ip: "IP",
    job_id: "Job ID",
    person: "Person",
    organization: "Organization",
    password: "Password",
    generate_key: "Generate Key",
    add_user: "Add User",
    run_scraper: "Run Scraper",
    cancel: "Cancel",
    save_profile: "Save Profile",
  },
  np: {
    dashboard: "ड्यासबोर्ड",
    interactive_calendar: "अन्तरक्रियात्मक पात्रो",
    view_calendar: "पात्रो हेर्नुहोस्",
    converter: "मिति रूपान्तरण",
    events_festivals: "चाडपर्व र कार्यक्रमहरू",
    users: "प्रयोगकर्ताहरू",
    api_keys: "API कुञ्जीहरू",
    scraper_center: "स्क्र्यापर केन्द्र",
    settings: "सेटिङहरू",
    overview: "सिंहावलोकन",
    management: "व्यवस्थापन",
    system: "प्रणाली",
    admin: "प्रशासक",
    search: "सबैतिर खोज्नुहोस्...",
    log_out: "लग आउट",
    profile_settings: "प्रोफाइल सेटिङहरू",
    requests_per_day: "दैनिक अनुरोधहरू",
    top_endpoints: "मुख्य एन्डपोइन्टहरू",
    recent_requests: "भर्खरका अनुरोधहरू",
    no_usage: "कुनै उपयोग छैन।",
    calendar: "पात्रो",
    // Frontend
    home: "गृह",
    features: "विशेषताहरू",
    docs: "कागजात",
    pricing: "मूल्य निर्धारण",
    login: "लग इन",
    name: "नाम",
    email: "इमेल",
    actions: "कार्यहरू",
    user: "प्रयोगकर्ता",
    role: "भूमिका",
    status: "स्थिति",
    time: "समय",
    method: "प्रक्रिया (Method)",
    endpoint: "एन्डपोइन्ट",
    usage: "उपयोग",
    owner: "मालिक",
    keys: "कुञ्जीहरू",
    key: "कुञ्जी",
    key_prefix: "कुञ्जी उपसर्ग",
    expires_at: "म्याद सकिने मिति",
    started_at: "सुरु भएको समय",
    synced_items: "सिंक गरिएका वस्तुहरू",
    source: "स्रोत",
    sources: "स्रोतहरू",
    response: "प्रतिक्रिया",
    holiday: "बिदा",
    type: "प्रकार",
    ip: "आईपी",
    job_id: "कार्य आईडी",
    person: "व्यक्ति",
    organization: "संस्था",
    password: "पासवर्ड",
    generate_key: "कुञ्जी बनाउनुहोस्",
    add_user: "प्रयोगकर्ता थप्नुहोस्",
    run_scraper: "स्क्र्यापर चलाउनुहोस्",
    cancel: "रद्द गर्नुहोस्",
    save_profile: "प्रोफाइल सुरक्षित गर्नुहोस्",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('np');
  
  useEffect(() => {
    const saved = localStorage.getItem('miti_lang') as Language;
    if (saved && (saved === 'en' || saved === 'np')) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('miti_lang', newLang);
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations['en'];
    // @ts-ignore
    return dict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
