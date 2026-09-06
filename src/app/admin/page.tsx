"use client";
import MitiLoader from "@/components/MitiLoader";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NepCalendarScrape from "@/components/NepCalendarScrape";
import MitiConverter from "@/components/MitiConverter";
import {
  Shield,
  Key, BookOpen,
  Calendar,
  ArrowRightLeft,
  Users,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Sliders,
  Settings,
  Play,
  Search,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Menu,
} from "lucide-react";

function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <span className="text-[11px] text-slate-500">
        {total.toLocaleString()} total
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition"
        >
          Prev
        </button>
        <span className="text-xs font-bold text-slate-700">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: any;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-extrabold ${accent ? "text-primary" : "text-slate-900"}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value ?? 0}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "calendar"
    | "view"
    | "converter"
    | "events"
    | "users"
    | "settings"
    | "scraper"
    | "keys"
  >("dashboard");

  // Stats
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [todayString, setTodayString] = useState("वि.सं. ...");
  const [scraperFromYear, setScraperFromYear] = useState(2083);
  const [scraperToYear, setScraperToYear] = useState(2083);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user?.role === "ADMIN") {
          setAdminUser(data.user);
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    fetch("/api/v1/calendar/today?api_key=np_live_demo1234567890abcdef12345678")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const bs = data.data.bs;
          setTodayString(`${bs.dayOfWeekNp}, ${bs.yearBsNp} ${bs.monthNameNp} ${bs.dayBsNp}`);
          setScraperFromYear(bs.year);
          setScraperToYear(bs.year);
        }
      })
      .catch(() => {});
  }, []);

  // Keys tab state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [keysPage, setKeysPage] = useState(1);
  const [keysTotalPages, setKeysTotalPages] = useState(1);
  const [keysTotal, setKeysTotal] = useState(0);
  const [keySearch, setKeySearch] = useState("");
  const [keyForm, setKeyForm] = useState({
    userId: "",
    customRpm: "",
    customMonthlyLimit: "",
    expiresAt: "",
  });
  const [keyMessage, setKeyMessage] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [usersOptionList, setUsersOptionList] = useState<any[]>([]);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(
        `/api/admin/api-keys?search=${encodeURIComponent(keySearch)}&page=${keysPage}&limit=10`,
      );
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.data || []);
        setKeysTotalPages(data.totalPages || 1);
        setKeysTotal(data.total || 0);
      }
    } catch {}
  };

  const openKeyModal = async () => {
    if (usersOptionList.length === 0) {
      try {
        const res = await fetch("/api/admin/users?limit=100");
        const data = await res.json();
        if (data.success) setUsersOptionList(data.users || []);
      } catch {}
    }
    setShowKeyModal(true);
  };


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would hit a PUT /api/auth/me or similar
    // We'll just show success for now
    alert("Profile updated successfully (Mock)");
    setShowProfileModal(false);
  };
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {}
  };


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (data.success) {
        setUserCreateMessage("User created successfully!");
        fetchUsers();
        setUserForm({ name: "", email: "", password: "" });
        setTimeout(() => {
          setShowCreateUserModal(false);
          setUserCreateMessage("");
        }, 1500);
      } else {
        setUserCreateMessage(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setUserCreateMessage(`Error: ${err.message}`);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyMessage("Generating...");
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: keyForm.userId,
          customRpm: keyForm.customRpm ? parseInt(keyForm.customRpm) : null,
          customMonthlyLimit: keyForm.customMonthlyLimit ? parseInt(keyForm.customMonthlyLimit) : null,
          expiresAt: keyForm.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKeyMessage(`Key generated successfully! Token: ${data.data.key} (Store this securely!)`);
        fetchApiKeys();
        fetchDashboard();
        setKeyForm({
          userId: "",
          customRpm: "",
          customMonthlyLimit: "",
          expiresAt: "",
        });
        setTimeout(() => {
           setShowKeyModal(false);
           setKeyMessage("");
        }, 8000);
      } else {
        setKeyMessage(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setKeyMessage(`Error: ${err.message}`);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this key?")) return;
    try {
      await fetch(`/api/admin/api-keys?id=${id}`, { method: "DELETE" });
      fetchApiKeys();
      fetchDashboard();
    } catch {}
  };

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userUsageSearch, setUserUsageSearch] = useState("");

  // Calendar tab
  const [yearBs, setYearBs] = useState(2083);
  const [monthBs, setMonthBs] = useState(5);
  const [monthData, setMonthData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [customTithi, setCustomTithi] = useState("");
  const [isHolidayOverride, setIsHolidayOverride] = useState(false);
  const [holidayReason, setHolidayReason] = useState("");

  // Events tab
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [eventSearch, setEventSearch] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    id: "",
    titleNp: "",
    titleEn: "",
    eventType: "FESTIVAL",
    isPublicHoliday: false,
    bsYear: 2083,
    bsMonth: 5,
    bsDay: 20,
  });

  // Users tab
  const [usersList, setUsersList] = useState<any[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState("");
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "" });
  const [userCreateMessage, setUserCreateMessage] = useState("");

  // Scraper tab
  const [scraperLogs, setScraperLogs] = useState<any[]>([]);
  const [scraperProgress, setScraperProgress] = useState("");
  const [scraperRunning, setScraperRunning] = useState(false);
  const [scraperMessage, setScraperMessage] = useState<string | null>(null);
  const [scraperPage, setScraperPage] = useState(1);
  const [scraperTotalPages, setScraperTotalPages] = useState(1);
  const [scraperTotal, setScraperTotal] = useState(0);
  const [scraperStatusFilter, setScraperStatusFilter] = useState("");
  const [scraperSource, setScraperSource] = useState("PATROSCRAPE");
  const [activeSource, setActiveSource] = useState("PATROSCRAPE");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setActiveSource(data.data.calendarSource);
        setScraperSource(data.data.calendarSource);
        setSettingsDirty(false);
      }
    } catch {}
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarSource: activeSource }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage(`Active calendar source set to ${data.data.calendarSource}.`);
        setScraperSource(data.data.calendarSource);
        setSettingsDirty(false);
        fetchMonthCalendar();
        void fetchScraperLogs();
      } else {
        setSettingsMessage(`Error: ${data.message}`);
      }
    } catch (err: any) {
      setSettingsMessage(`Error: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard?days=15");
      const data = await res.json();
      if (data.success) setDashboard(data.dashboard);
    } catch {}
  };

  const fetchMonthCalendar = async () => {
    try {
      const res = await fetch(
        `/api/v1/calendar/month?bs_year=${yearBs}&bs_month=${monthBs}&api_key=np_live_demo1234567890abcdef12345678`,
      );
      const data = await res.json();
      if (data.success) setMonthData(data.data);
    } catch {}
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(
        `/api/admin/events?year=${yearBs}&month=${monthBs}&search=${encodeURIComponent(eventSearch)}&page=${eventsPage}&limit=20`,
      );
      const data = await res.json();
      if (data.success) {
        setEventsList(data.events || []);
        setEventsTotalPages(data.totalPages || 1);
        setEventsTotal(data.total || 0);
      }
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(usersSearch)}&role=${usersRole}&page=${usersPage}&limit=10`,
      );
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
        setPlansList(data.plans || []);
        setUsersTotalPages(data.totalPages || 1);
        setUsersTotal(data.total || 0);
      }
    } catch {}
  };

  const fetchScraperLogs = async () => {
    try {
      const res = await fetch(
        `/api/admin/scraper/logs?search=${encodeURIComponent(scraperSource)}&status=${scraperStatusFilter}&page=${scraperPage}&limit=10`,
      );
      const data = await res.json();
      if (data.success) {
        setScraperLogs(data.logs || []);
        setScraperTotalPages(data.totalPages || 1);
        setScraperTotal(data.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "calendar") fetchMonthCalendar();
    if (activeTab === "events") fetchEvents();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "scraper") fetchScraperLogs();
    if (activeTab === "dashboard") fetchDashboard();
    if (activeTab === "settings") fetchSettings();
    if (activeTab === "keys") {
      fetchApiKeys();
    }
  }, [
    activeTab,
    yearBs,
    monthBs,
    eventSearch,
    eventsPage,
    usersSearch,
    usersRole,
    usersPage,
    scraperSource,
    scraperStatusFilter,
    scraperPage,
    keySearch,
    keysPage,
  ]);

  const handleSaveDateOverride = async () => {
    if (!selectedDay) return;
    try {
      await fetch("/api/admin/dates/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bsYear: selectedDay.year_bs,
          bsMonth: selectedDay.month_bs,
          bsDay: selectedDay.day_bs,
          customTithiNp: customTithi || undefined,
          isHolidayOverride,
          holidayReason: holidayReason || undefined,
        }),
      });
      setSelectedDay(null);
      fetchMonthCalendar();
      fetchDashboard();
    } catch {}
  };

  const handleSaveEvent = async () => {
    try {
      if (eventForm.id) {
        await fetch("/api/admin/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventForm),
        });
      } else {
        await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventForm),
        });
      }
      setShowEventModal(false);
      fetchEvents();
      fetchDashboard();
    } catch {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
      fetchEvents();
      fetchDashboard();
    } catch {}
  };

  const handleRunScraper = async () => {
    setScraperRunning(true);
    setScraperMessage(null);
    setScraperProgress("");
    const fromY = Math.min(scraperFromYear, scraperToYear);
    const toY = Math.max(scraperFromYear, scraperToYear);
    const jobs: { yr: number; mo: number }[] = [];
    for (let yr = fromY; yr <= toY; yr++) {
      for (let mo = 1; mo <= 12; mo++) {
        jobs.push({ yr, mo });
      }
    }

    let totalSynced = 0;
    let failed = 0;
    let done = 0;
    const CONCURRENCY = 6;
    const runJob = async (job: { yr: number; mo: number }) => {
      try {
        const res = await fetch("/api/admin/scraper/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yearBs: job.yr, monthBs: job.mo, source: scraperSource }),
        });
        const data = await res.json();
        if (data.success) totalSynced++;
        else failed++;
      } catch { failed++; }
      finally {
        done++;
        setScraperProgress(`Scraping ${job.yr}/${job.mo}... (${done}/${jobs.length})`);
      }
    };

    try {
      let cursor = 0;
      const worker = async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor++];
          await runJob(job);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

      setScraperMessage(`Done! Synced ${totalSynced} months across BS ${fromY}–${toY}. ${failed > 0 ? `${failed} failed.` : ""}`);
      setScraperProgress("");
      fetchScraperLogs();
      fetchDashboard();
    } catch (err: any) {
      setScraperMessage(`Error: ${err.message}`);
    } finally {
      setScraperRunning(false);
    }
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <MitiLoader className="w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">

      {/* Red Top Navbar */}
      <nav className="sticky top-0 z-50 bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[56px]">
            {/* Left: Menu toggle + Logo */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/20 -ml-1"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
                <div className="h-[28px] md:h-[32px] flex items-center justify-center">
                  <img src="/logo_nav_gold.png" alt="Miti Logo" className="h-full w-auto object-contain" />
                </div>
                <span className="font-extrabold text-[14px] tracking-tight text-white/90 hidden sm:block ml-1 border-l border-white/20 pl-2">
                  Admin
                </span>
              </Link>
            </div>

            {/* Right: Date pill + user profile */}
            <div className="flex items-center gap-3">
              {/* Date pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-md border border-white/10 text-xs font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                <span className="font-np">{todayString}</span>
              </div>

              {/* User profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {adminUser.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-white leading-tight">{adminUser.name}</div>
                    <div className="text-[10px] text-red-100 leading-tight">{adminUser.email}</div>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white/50 border-b border-slate-100"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-primary/10"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <div
            className={`${sidebarCollapsed ? "lg:w-24" : "lg:w-72"} w-full flex-shrink-0 space-y-6 ${
              sidebarOpen ? "" : "hidden lg:block"
            }`}
          >
          {/* Navigation Menu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col gap-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center px-4 py-1.5 text-slate-400 hover:bg-white/50 rounded-xl transition mb-1"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "dashboard"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => { setActiveTab("calendar"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "calendar"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              {!sidebarCollapsed && <span>Interactive Calendar</span>}
            </button>

            <button
              onClick={() => { setActiveTab("view"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "view"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {!sidebarCollapsed && <span>View Calendar</span>}
            </button>

            <button
              onClick={() => { setActiveTab("converter"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "converter"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              {!sidebarCollapsed && <span>Converter</span>}
            </button>

            <button
              onClick={() => { setActiveTab("events"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "events"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {!sidebarCollapsed && <span>Events & Festivals</span>}
            </button>

            <button
              onClick={() => { setActiveTab("users"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "users"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <Users className="w-4 h-4" />
              {!sidebarCollapsed && <span>Users</span>}
            </button>

            <button
              onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "settings"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <Settings className="w-4 h-4" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>

            <button
              onClick={() => { setActiveTab("scraper"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "scraper"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {!sidebarCollapsed && <span>Scraper Center</span>}
            </button>

            <button
              onClick={() => { setActiveTab("keys"); setSidebarOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition ${
                sidebarCollapsed ? "justify-center" : "text-left"
              } ${
                activeTab === "keys"
                  ? "bg-primary text-white shadow-md shadow-red-900/10"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              <Key className="w-4 h-4" />
              {!sidebarCollapsed && <span>API Keys</span>}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* TAB: Dashboard */}
          {activeTab === "dashboard" &&
            (() => {
              const k = dashboard?.kpis || {};
              const byDay = dashboard?.usageByDay || [];
              const maxDay = Math.max(...byDay.map((d: any) => d.requests), 1);
              const byEndpoint = dashboard?.usageByEndpoint || [];
              const maxEndpoint = Math.max(...byEndpoint.map((e: any) => e.requests), 1);
              const q = userUsageSearch.trim().toLowerCase();
              const users = (dashboard?.usageByUser || []).filter(
                (u: any) =>
                  !q ||
                  (u.name || "").toLowerCase().includes(q) ||
                  (u.email || "").toLowerCase().includes(q)
              );
              const recent = dashboard?.recentRequests || [];

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Dashboard</h2>
                      <p className="text-xs text-slate-500">
                        API usage analytics over the last {dashboard?.windowDays || 15} days. Set
                        filters to see who is using the API and how.
                      </p>
                    </div>
                  </div>

                  {!dashboard ? (
                    <div className="text-center py-16 text-slate-400 text-sm">
                      Loading analytics…
                    </div>
                  ) : (
                    <>
                      {/* KPI cards */}
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        <KpiCard label="Total Requests" value={k.totalRequests} accent />
                        <KpiCard label="Requests Today" value={k.requestsToday} />
                        <KpiCard label="Requests (Month)" value={k.requestsThisMonth} />
                        <KpiCard label="Active Keys (Month)" value={k.activeKeysThisMonth} />
                        <KpiCard label="Avg. Response" value={`${k.avgResponseTimeMs} ms`} />
                        <KpiCard label="Total Users" value={k.totalUsers} />
                        <KpiCard label="API Keys" value={k.totalApiKeys} />
                        <KpiCard label="Events" value={k.totalEvents} />
                        <KpiCard label="Synced Dates" value={k.totalDates} />
                      </div>

                      {/* Charts */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900">
                              Requests per Day
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              last {byDay.length} days
                            </span>
                          </div>
                          {byDay.length === 0 ? (
                            <p className="text-xs text-slate-400 mt-6">No request data yet.</p>
                          ) : (
                            <div className="flex items-end gap-1 h-44 mt-6">
                              {byDay.map((d: any) => (
                                <div
                                  key={d.date}
                                  title={`${d.date}: ${d.requests} requests`}
                                  className="flex-1 flex flex-col items-center justify-end h-full group"
                                >
                                  <div
                                    className={`w-full rounded-t-md transition-all ${
                                      d.requests > 0
                                        ? "bg-primary/80 group-hover:bg-primary"
                                        : "bg-slate-100"
                                    }`}
                                    style={{
                                      height: `${Math.max((d.requests / maxDay) * 100, d.requests > 0 ? 6 : 2)}%`,
                                    }}
                                  ></div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-mono">
                            <span>{byDay[0]?.date}</span>
                            <span>{byDay[byDay.length - 1]?.date}</span>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">Top Endpoints</h3>
                          {byEndpoint.length === 0 ? (
                            <p className="text-xs text-slate-400 mt-6">No usage yet.</p>
                          ) : (
                            <div className="space-y-3 mt-5">
                              {byEndpoint.map((e: any) => (
                                <div key={`${e.method}-${e.endpoint}`}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-mono text-slate-700 truncate">
                                      <span className="text-slate-400">{e.method}</span>{" "}
                                      {e.endpoint}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {e.requests.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${(e.requests / maxEndpoint) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Usage by user + recent requests */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between p-5 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">
                              API Usage by User
                            </h3>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                              <input
                                type="text"
                                value={userUsageSearch}
                                onChange={(e) => setUserUsageSearch(e.target.value)}
                                placeholder="Filter by user…"
                                className="pl-8 pr-3 py-1.5 text-xs bg-transparent border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                              <p className="text-xs text-slate-400 px-5 py-6">No matching users.</p>
                            ) : (
                              users.map((u: any, i: number) => (
                                <div key={u.userId} className="flex items-center gap-3 px-5 py-3">
                                  <span className="w-6 text-center text-sm font-extrabold text-slate-300">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-800 truncate">
                                      {u.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {u.email} · {u.keys} key(s)
                                    </div>
                                  </div>
                                  <span className="text-sm font-extrabold text-primary">
                                    {u.requests.toLocaleString()}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-5 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">
                              Recent Requests
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-transparent text-slate-500 uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="px-4 py-2">Method</th>
                                  <th className="px-4 py-2">Endpoint</th>
                                  <th className="px-4 py-2">Status</th>
                                  <th className="px-4 py-2">User</th>
                                  <th className="px-4 py-2 text-right">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {recent.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-6 text-slate-400">
                                      No requests yet.
                                    </td>
                                  </tr>
                                ) : (
                                  recent.map((r: any) => (
                                    <tr key={r.id}>
                                      <td className="px-4 py-2 font-mono">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            r.method === "GET"
                                              ? "bg-emerald-50 text-emerald-700"
                                              : r.method === "POST"
                                                ? "bg-sky-50 text-sky-700"
                                                : "bg-amber-50 text-amber-700"
                                          }`}
                                        >
                                          {r.method}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 font-mono text-slate-700 truncate max-w-[160px]">
                                        {r.endpoint}
                                      </td>
                                      <td className="px-4 py-2">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            r.statusCode < 300
                                              ? "bg-emerald-50 text-emerald-700"
                                              : r.statusCode < 500
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-primary/10 text-primary"
                                          }`}
                                        >
                                          {r.statusCode}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 truncate max-w-[140px]">
                                        <div className="text-slate-700 font-semibold">
                                          {r.userName || "—"}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          {r.keyPrefix || ""}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right text-slate-400 whitespace-nowrap">
                                        {new Date(r.timestamp).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

          {/* TAB 1: Calendar & Date Overrides */}

          {activeTab === "keys" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    API Keys Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Generate, view, and revoke API keys for clients.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={keySearch}
                      onChange={(e) => {
                        setKeySearch(e.target.value);
                        setKeysPage(1);
                      }}
                      placeholder="Search by prefix / user…"
                      className="pl-8 pr-3 py-1.5 text-xs bg-transparent border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <a
                    href="/docs/nepali-calendar-api-docs.pdf"
                    download="Miti-API-Docs.pdf"
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> Download PDF Docs
                  </a>
                  <button
                    onClick={openKeyModal}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow hover:bg-red-800 transition flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" /> Generate New Key
                  </button>
                </div>
              </div>

              {keyMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 font-mono text-sm">
                  {keyMessage}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-transparent border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Key Prefix</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-4 py-3">Expires At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-white/50">
                        <td className="px-4 py-3 font-mono text-xs">
                          {k.keyPrefix}••••••••
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            {k.user?.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {k.user?.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {k.monthlyUsage} /{" "}
                          {k.monthlyLimit ||
                            k.user?.subscription?.customMonthlyLimit ||
                            "∞"}
                        </td>
                        <td className="px-4 py-3">
                          {k.expiresAt ? (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-100 text-amber-700 rounded-md border border-amber-200">
                              {new Date(k.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-green-100 text-green-700 rounded-md border border-green-200">
                              Never
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={keysPage}
                totalPages={keysTotalPages}
                total={keysTotal}
                onPage={setKeysPage}
              />
            </div>
          )}

                    {activeTab === "calendar" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Admin Interactive Calendar
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click on any date to override tithi, force public holiday
                    status, or add custom events.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={monthBs}
                    onChange={(e) => setMonthBs(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 text-xs font-bold bg-transparent border border-slate-200 rounded-lg"
                  >
                    <option value={1}>१ - वैशाख (Baisakh)</option>
                    <option value={2}>२ - जेठ (Jestha)</option>
                    <option value={3}>३ - असार (Ashadh)</option>
                    <option value={4}>४ - साउन (Shrawan)</option>
                    <option value={5}>५ - भाद्र (Bhadra)</option>
                    <option value={6}>६ - असोज (Ashwin)</option>
                    <option value={7}>७ - कात्तिक (Kartik)</option>
                    <option value={8}>८ - मंसिर (Mangsir)</option>
                    <option value={9}>९ - पुस (Poush)</option>
                    <option value={10}>१० - माघ (Magh)</option>
                    <option value={11}>११ - फागुन (Falgun)</option>
                    <option value={12}>१२ - चैत (Chaitra)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"].map(
                  (day, i) => (
                    <div
                      key={day}
                      className={`text-center py-2 text-xs font-bold ${i === 6 ? "text-primary" : "text-slate-600"}`}
                    >
                      {day}
                    </div>
                  ),
                )}

                {/* Empty padding */}
                {monthData &&
                  Array.from({ length: monthData.start_day_of_week }).map(
                    (_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="p-2 rounded-xl border border-transparent h-24"
                      ></div>
                    ),
                  )}

                {(monthData?.days || []).map((day: any) => (
                  <div
                    key={day.day_bs}
                    onClick={() => {
                      setSelectedDay(day);
                      setCustomTithi(day.tithi_short || "");
                      setIsHolidayOverride(day.is_holiday);
                      setHolidayReason(day.holiday_reason || "");
                    }}
                    className={`p-2 rounded-xl border transition cursor-pointer hover:border-rose-500 flex flex-col justify-between h-24 ${
                      day.is_holiday
                        ? "bg-primary/10/40 border-rose-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold font-np">
                        {day.day_bs_np}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {day.day_ad}
                      </span>
                    </div>
                    <div className="text-[10px] font-np text-slate-500 truncate">
                      {day.tithi_short}
                    </div>
                    <div className="text-[9px] font-semibold text-primary truncate">
                      {day.is_holiday ? "बिदा" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Override Modal */}
          {selectedDay && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900 font-np">
                  Update Date: वि.सं. {selectedDay.year_bs} महिना{" "}
                  {selectedDay.month_bs} गते {selectedDay.day_bs_np}
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Custom Tithi (तिथि)
                    </label>
                    <input
                      type="text"
                      value={customTithi}
                      onChange={(e) => setCustomTithi(e.target.value)}
                      placeholder="e.g. एकादशी / पूर्णिमा"
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="holidayCheck"
                      checked={isHolidayOverride}
                      onChange={(e) => setIsHolidayOverride(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <label
                      htmlFor="holidayCheck"
                      className="font-semibold text-slate-800"
                    >
                      Mark as Public Holiday (सार्वजनिक बिदा)
                    </label>
                  </div>

                  {isHolidayOverride && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Holiday Reason / Title
                      </label>
                      <input
                        type="text"
                        value={holidayReason}
                        onChange={(e) => setHolidayReason(e.target.value)}
                        placeholder="e.g. गौरा पर्व / संविधान दिवस"
                        className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDateOverride}
                    className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/80 text-white rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: View Calendar (public) */}
          {activeTab === "view" && (
            <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <NepCalendarScrape />
            </div>
          )}

          {/* TAB: Converter (public) */}
          {activeTab === "converter" && (
            <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <MitiConverter />
            </div>
          )}

          {/* TAB 2: Events & Festivals Manager */}
          {activeTab === "events" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Manage Calendar Events & Festivals
                  </h2>
                  <p className="text-xs text-slate-500">
                    Create new festivals or holidays, edit descriptions, or
                    delete outdated items.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={(e) => {
                        setEventSearch(e.target.value);
                        setEventsPage(1);
                      }}
                      placeholder="Search events..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-transparent border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEventForm({
                        id: "",
                        titleNp: "",
                        titleEn: "",
                        eventType: "FESTIVAL",
                        isPublicHoliday: false,
                        bsYear: yearBs,
                        bsMonth: monthBs,
                        bsDay: 1,
                      });
                      setShowEventModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white font-semibold text-xs rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 pr-4">Event (Nepali)</th>
                      <th className="py-2.5 pr-4">Event (English)</th>
                      <th className="py-2.5 pr-4">Date (वि.सं.)</th>
                      <th className="py-2.5 pr-4">Type</th>
                      <th className="py-2.5 pr-4">Holiday</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventsList.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-2.5 pr-4 font-bold font-np text-slate-900">
                          {ev.titleNp}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {ev.titleEn}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-800">
                          {ev.bsYear || 2083}-
                          {String(ev.bsMonth).padStart(2, "0")}-
                          {String(ev.bsDay).padStart(2, "0")}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                            {ev.eventType}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          {ev.isPublicHoliday ? (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold text-[10px]">
                              Public Holiday
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              Regular
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEventForm({
                                id: ev.id,
                                titleNp: ev.titleNp,
                                titleEn: ev.titleEn,
                                eventType: ev.eventType,
                                isPublicHoliday: ev.isPublicHoliday,
                                bsYear: ev.bsYear || 2083,
                                bsMonth: ev.bsMonth,
                                bsDay: ev.bsDay,
                              });
                              setShowEventModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 text-slate-400 hover:text-primary"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={eventsPage}
                totalPages={eventsTotalPages}
                total={eventsTotal}
                onPage={setEventsPage}
              />
            </div>
          )}

          {/* Event Add/Edit Modal */}
          {showEventModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {eventForm.id ? "Edit Event" : "Create New Event"}
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Title (Nepali) *
                    </label>
                    <input
                      type="text"
                      value={eventForm.titleNp}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, titleNp: e.target.value })
                      }
                      placeholder="e.g. हरितालिका तीज"
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Title (English)
                    </label>
                    <input
                      type="text"
                      value={eventForm.titleEn}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, titleEn: e.target.value })
                      }
                      placeholder="e.g. Haritalika Teej"
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        BS Year
                      </label>
                      <input
                        type="number"
                        value={eventForm.bsYear}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            bsYear: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full px-3 py-1.5 bg-transparent border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        BS Month
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={eventForm.bsMonth}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            bsMonth: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full px-3 py-1.5 bg-transparent border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        BS Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={eventForm.bsDay}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            bsDay: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full px-3 py-1.5 bg-transparent border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="evHoliday"
                      checked={eventForm.isPublicHoliday}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          isPublicHoliday: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-primary"
                    />
                    <label
                      htmlFor="evHoliday"
                      className="font-semibold text-slate-800"
                    >
                      Is Official Public Holiday (सार्वजनिक बिदा)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/80 text-white rounded-lg transition"
                  >
                    Save Event
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Users */}
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Users Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Create and manage platform users. Rate limits are configured per API key
                    in the API Keys module.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow hover:bg-red-800 transition flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Create New User
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    placeholder="Search by name / email…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-transparent border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={usersRole}
                  onChange={(e) => {
                    setUsersRole(e.target.value);
                    setUsersPage(1);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-transparent border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 pr-4">User</th>
                      <th className="py-2.5 pr-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 pr-4">
                          <div className="font-bold text-slate-900">
                            {u.name}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {u.email}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded font-semibold text-[10px]">
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={usersPage}
                totalPages={usersTotalPages}
                total={usersTotal}
                onPage={setUsersPage}
              />
            </div>
          )}

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Create New User
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                    <input
                      required
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                    <input
                      required
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                      placeholder="Secure password"
                    />
                  </div>
                  
                  {userCreateMessage && (
                    <div className="text-xs text-primary font-bold bg-primary/10 p-2 rounded">{userCreateMessage}</div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/80 text-white rounded-lg transition"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: Scraper Center */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Calendar Data Source</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose which source the public calendar, API, and admin calendar use. Manual admin events and
                    system events always appear regardless of source.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Active Source</label>
                    <select
                      value={activeSource}
                      onChange={(e) => { setActiveSource(e.target.value); setSettingsDirty(true); }}
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                    >
                      <option value="PATROSCRAPE">Patro Scrape</option>
                      <option value="NEPCALENDARSCRAPE">Nep Calendar Scrape (rat32)</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving || !settingsDirty}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition"
                    >
                      <Settings className="w-4 h-4" />
                      {settingsSaving ? "Saving..." : "Save & Apply"}
                    </button>
                  </div>
                </div>

                {settingsMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg font-semibold max-w-xl">
                    {settingsMessage}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-xl">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Sources</h4>
                  <ul className="text-[11px] text-slate-500 space-y-1.5">
                    <li>
                      <span className="font-bold text-slate-700">PATROSCRAPE</span> — scraped from hamropatro.com
                      (tithi, festivals, panchanga in Nepali + English).
                    </li>
                    <li>
                      <span className="font-bold text-slate-700">NEPCALENDARSCRAPE</span> — scraped from
                      nepalicalendar.rat32.com (site is behind an anti-bot challenge handled automatically).
                      English tithi/festival names; festival titles fall back to English where Devanagari is not
                      published.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scraper" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="p-6 rounded-xl bg-transparent border border-slate-200 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Year-wise Bulk Scraper</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Scrape all 12 months for a range of BS years into the database.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">From Year (BS)</label>
                    <input
                      type="number"
                      value={scraperFromYear}
                      min={2060}
                      max={2090}
                      onChange={(e) => setScraperFromYear(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">To Year (BS)</label>
                    <input
                      type="number"
                      value={scraperToYear}
                      min={2060}
                      max={2090}
                      onChange={(e) => setScraperToYear(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Source</label>
                    <select
                      value={scraperSource}
                      onChange={(e) => setScraperSource(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                    >
                      <option value="PATROSCRAPE">Patro Scrape</option>
                      <option value="NEPCALENDARSCRAPE">Nep Calendar Scrape (rat32)</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleRunScraper}
                      disabled={scraperRunning}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition"
                    >
                      <RefreshCw className={`w-4 h-4 ${scraperRunning ? "animate-spin" : ""}`} />
                      {scraperRunning ? "Scraping..." : "Start Scraper"}
                    </button>
                  </div>
                </div>
                {scraperProgress && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-4 py-2.5 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    {scraperProgress}
                  </div>
                )}
                {scraperMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg font-semibold">
                    {scraperMessage}
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Will scrape {Math.abs(scraperToYear - scraperFromYear) + 1} year(s) × 12 months ={" "}
                  {(Math.abs(scraperToYear - scraperFromYear) + 1) * 12} total requests
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Recent Scraper Job Executions
                  </h3>
                  <select
                    value={scraperStatusFilter}
                    onChange={(e) => {
                      setScraperStatusFilter(e.target.value);
                      setScraperPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-transparent border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 pr-4">Job ID</th>
                        <th className="py-2.5 pr-4">Source</th>
                        <th className="py-2.5 pr-4">Target (वि.सं.)</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5 pr-4">Synced Items</th>
                        <th className="py-2.5 text-right">Started At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {scraperLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 pr-4 text-slate-500">{log.id.slice(0, 10)}...</td>
                          <td className="py-2.5 pr-4 font-sans font-bold text-slate-800">{log.source}</td>
                          <td className="py-2.5 pr-4 font-sans font-medium text-slate-700">{log.targetYear}-{log.targetMonth || "All"}</td>
                          <td className="py-2.5 pr-4">
                            {log.status === "SUCCESS" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-sans font-bold rounded text-[10px]">SUCCESS</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary font-sans font-bold rounded text-[10px]">{log.status}</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-700 font-sans font-medium">{log.itemsSynced} records</td>
                          <td className="py-2.5 text-right text-slate-500 font-sans text-[11px]">{new Date(log.startedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={scraperPage}
                  totalPages={scraperTotalPages}
                  total={scraperTotal}
                  onPage={setScraperPage}
                />
              </div>
            </div>
          )}
              

          {/* Generate API Key Modal */}
          {showKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" /> Generate New API
                  Key
                </h3>

                <form onSubmit={handleGenerateKey} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Select User
                    </label>
                    <select
                      required
                      value={keyForm.userId}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, userId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">-- Choose User --</option>
                      {usersOptionList.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Requests per minute
                      </label>
                      <input
                        type="number"
                        value={keyForm.customRpm}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, customRpm: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Requests per month
                      </label>
                      <input
                        type="number"
                        value={keyForm.customMonthlyLimit}
                        onChange={(e) =>
                          setKeyForm({
                            ...keyForm,
                            customMonthlyLimit: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 10000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Expires At (Optional)
                    </label>
                    <input
                      type="date"
                      value={keyForm.expiresAt}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, expiresAt: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Leave blank for never ending token.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/80 text-white rounded-lg transition"
                    >
                      Generate Key
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Admin Profile Modal */}
          {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Admin Profile
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                    <input
                      required
                      type="text"
                      defaultValue={adminUser.name}
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      defaultValue={adminUser.email}
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">New Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="w-full px-3 py-2 bg-transparent border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/80 text-white rounded-lg transition"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </div>
  );
}

