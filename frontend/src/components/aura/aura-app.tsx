"use client";

import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Flame,
  Gift,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  Check,
  BellRing,
  Bot,
  Mail,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth.actions";
import { createUserAction } from "@/actions/user.actions";
import { awardAuraAction, getAuraBalanceAction, getCumulativeAuraAction } from "@/actions/aura.actions";
import { createTaskAction, submitTaskAction, reviewTaskAction, deleteTaskAction, updateAssignmentStatusAction } from "@/actions/task.actions";
import { createStoreItemAction, redeemStoreItemAction, fulfillRedemptionAction } from "@/actions/store.actions";
import { createTeamAction, sendKudosAction } from "@/actions/team.actions";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  triggerStreakRemindersAction,
  triggerReviewDigestAction,
  triggerEmailProcessorAction,
  updatePreferenceAction,
  resetPreferencesAction,
} from "@/actions/notification.actions";
import {
  getDeliverySummaryAction,
  getDeliveriesAction,
  getDeliveryDetailAction,
  retryDeliveryAction,
} from "@/actions/observability.actions";
import { breakdownTaskAction, getTeamInsightsAction } from "@/actions/ai.actions";
import { getDashboardMetricsAction, getMemberAnalyticsAction } from "@/actions/analytics.actions";
import { getAuditLogsAction } from "@/actions/audit.actions";

type Role = "Member" | "Admin" | "Superadmin";
type Page =
  | "home"
  | "tasks"
  | "reviews"
  | "members"
  | "leaderboard"
  | "wall"
  | "store"
  | "history"
  | "profile"
  | "tag"
  | "analytics"
  | "audit"
  | "deliveries"
  | "settings";

// The 7-Level Gamified Tier System - Allotments based on Lifetime Cumulative Aura
export interface AuraTier {
  level: number;
  name: string;
  min: number;
  max: number;
  badgeUrl: string;
}

export const AURA_TIERS: AuraTier[] = [
  { level: 1, name: "Cosmic Rookie", min: 0, max: 5000, badgeUrl: "/badges/level-1-cosmic-rookie.png" },
  { level: 2, name: "Lunar Explorer", min: 5000, max: 15000, badgeUrl: "/badges/level-2-lunar-explorer.png" },
  { level: 3, name: "Stellar Riser", min: 15000, max: 30000, badgeUrl: "/badges/level-3-stellar-riser.png" },
  { level: 4, name: "Solar Flare", min: 30000, max: 50000, badgeUrl: "/badges/level-4-solar-flare.png" },
  { level: 5, name: "Cosmic Force", min: 50000, max: 100000, badgeUrl: "/badges/level-5-cosmic-force.png" },
  { level: 6, name: "Galactic Legend", min: 100000, max: 200000, badgeUrl: "/badges/level-6-galactic-legend.png" },
  { level: 7, name: "Universal Icon", min: 200000, max: Infinity, badgeUrl: "/badges/level-7-universal-icon.png" },
];

export function getTierForAura(points: number = 0): AuraTier {
  const pts = Math.max(0, points || 0);
  return AURA_TIERS.find((t) => pts >= t.min && pts < t.max) || AURA_TIERS[AURA_TIERS.length - 1];
}

let members = [
  "Aarav Sharma",
  "Maya Patel",
  "Noah Williams",
  "Olivia Chen",
  "Kabir Singh",
  "Emma Davis",
  "Rohan Mehta",
  "Sophia Martin",
  "Ishaan Gupta",
  "Mia Wilson",
  "Arjun Kapoor",
  "Ava Brown",
  "Vihaan Rao",
  "Charlotte Lee",
  "Dev Malhotra",
  "Amelia Clark",
  "Neil Verma",
  "Isla Thomas",
  "Kunal Shah",
  "Grace Hall",
  "Aditya Joshi",
  "Lily Moore",
  "Samar Bansal",
  "Ella Young",
  "Reyansh Jain",
];

const batch = { name: "KAI AI Team", year: "Batch 2026", initials: "KAI" };

const memberNav: [Page, string, LucideIcon][] = [
  ["home", "Home", Home],
  ["tasks", "Tasks", Target],
  ["leaderboard", "Leaderboard", Trophy],
  ["wall", "Aura Wall", Sparkles],
  ["store", "Store", Store],
  ["history", "Aura History", ReceiptText],
  ["profile", "Profile", Users],
  ["settings", "Settings", Settings],
];

const adminNav: [Page, string, LucideIcon][] = [
  ["home", "Dashboard", LayoutDashboard],
  ["tasks", "Tasks", Target],
  ["reviews", "Reviews", FileCheck2],
  ["members", "Members", Users],
  ["leaderboard", "Leaderboard", Trophy],
  ["wall", "Aura Wall", Sparkles],
  ["store", "Store", Store],
  ["tag", "Tag Teams", Users],
  ["analytics", "Analytics", BarChart3],
  ["audit", "Audit Log", ReceiptText],
  ["deliveries", "Deliveries", Mail],
  ["settings", "Settings", Settings],
];

const STORE_GRADIENTS = [
  "from-orange-500 to-amber-600",
  "from-sky-500 to-cyan-600",
  "from-orange-400 to-rose-500",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-indigo-600",
  "from-slate-600 to-slate-800",
];

export function AuraApp({
  initialRole = "Member",
  userName = "",
  initialUsers = [],
  initialAuraBalance = 0,
  initialCumulativeAura = 0,
  initialHistory = [],
  initialTasks = [],
  initialStoreItems = [],
  initialRedemptions = [],
  initialTeams = [],
  initialKudos = [],
  initialNotifications = [],
  initialPreferences = [],
  initialDeliverySummary = null,
  initialDeliveriesData = null,
  initialTab = "home",
}: {
  initialRole?: string;
  userName?: string;
  initialUsers?: any[];
  initialAuraBalance?: number;
  initialCumulativeAura?: number;
  initialHistory?: any[];
  initialTasks?: any[];
  initialStoreItems?: any[];
  initialRedemptions?: any[];
  initialTeams?: any[];
  initialKudos?: any[];
  initialNotifications?: any[];
  initialPreferences?: any[];
  initialDeliverySummary?: any;
  initialDeliveriesData?: any;
  initialTab?: string;
}) {
  if (initialUsers && initialUsers.length > 0) {
    const realNames = initialUsers.map((u) => u.name || u.email);
    const combined = [...realNames, ...members];
    members = Array.from(new Set(combined)).slice(0, 25);
  }

  const currentUser = initialUsers?.find((u) => u.email === userName) || null;

  // Strict role binding to session JWT
  const role: Role = (initialRole as Role) || "Member";

  const isAllowedPage = (p: Page, r: Role) => {
    if (r === "Member") {
      return !["reviews", "members", "analytics", "audit", "deliveries"].includes(p);
    }
    return true;
  };

  const [page, setPageState] = useState<Page>(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab") as Page;
      if (urlTab && isAllowedPage(urlTab, role)) return urlTab;
    }
    return (initialTab as Page) || "home";
  });

  const setPage = (newPage: Page) => {
    const targetPage = isAllowedPage(newPage, role) ? newPage : "home";
    setPageState(targetPage);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (targetPage === "home") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", targetPage);
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlTab = (new URLSearchParams(window.location.search).get("tab") as Page) || "home";
      setPageState(isAllowedPage(urlTab, role) ? urlTab : "home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [role]);

  const [task, setTask] = useState<any | null>(null);
  const [toast, setToast] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAwardAura, setShowAwardAura] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSendKudos, setShowSendKudos] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // Notifications & Global Search state
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Dynamic Authoritative Aura Balance State
  const [auraBalance, setAuraBalance] = useState<number>(initialAuraBalance ?? 0);
  const [cumulativeAura, setCumulativeAura] = useState<number>(initialCumulativeAura ?? 0);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [currentStoreItems, setCurrentStoreItems] = useState<any[]>(initialStoreItems);
  const [currentRedemptions, setCurrentRedemptions] = useState<any[]>(initialRedemptions);

  useEffect(() => {
    if (typeof initialAuraBalance === "number") {
      setAuraBalance(initialAuraBalance);
    }
  }, [initialAuraBalance]);

  useEffect(() => {
    if (typeof initialCumulativeAura === "number") {
      setCumulativeAura(initialCumulativeAura);
    }
  }, [initialCumulativeAura]);

  useEffect(() => {
    if (initialStoreItems) setCurrentStoreItems(initialStoreItems);
  }, [initialStoreItems]);

  useEffect(() => {
    if (initialRedemptions) setCurrentRedemptions(initialRedemptions);
  }, [initialRedemptions]);

  // Refresh balance and cumulative points from authoritative backend API
  const refreshBalance = async () => {
    setIsBalanceLoading(true);
    setBalanceError(null);
    try {
      const [res, cumRes] = await Promise.all([
        getAuraBalanceAction(),
        getCumulativeAuraAction(),
      ]);
      if (res.success && typeof res.data === "number") {
        setAuraBalance(res.data);
      } else {
        setBalanceError((res as any)?.error || "Unable to retrieve balance");
      }
      if (cumRes.success && typeof cumRes.data === "number") {
        setCumulativeAura(cumRes.data);
      }
    } catch (err: any) {
      setBalanceError(err.message || "Failed to reach balance service");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  // Re-fetch authoritative balance when navigating to store
  useEffect(() => {
    if (page === "store") {
      refreshBalance();
    }
  }, [page]);

  const nav = role === "Member" ? memberNav : adminNav;

  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2200);
  };

  async function handleRedeemItem(item: any) {
    if (auraBalance < item.basePrice) {
      notify(`Insufficient Aura! You need ${item.basePrice.toLocaleString()} Aura.`);
      return;
    }
    const fd = new FormData();
    fd.append("storeItemId", item.id);
    notify(`Redeeming ${item.name}...`);
    const res = await redeemStoreItemAction(fd);
    if (res.success) {
      notify(`Successfully redeemed ${item.name}!`);
      if (typeof res.data?.remainingBalance === "number") {
        setAuraBalance(res.data.remainingBalance);
      } else {
        await refreshBalance();
      }
      setCurrentStoreItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock: Math.max(0, i.stock - 1) } : i))
      );
      if (res.data?.redemption) {
        setCurrentRedemptions((prev) => [res.data.redemption, ...prev]);
      }
    } else {
      notify((res as any).error || "Failed to redeem");
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] text-zinc-900">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-20 hidden border-r border-zinc-200 bg-white p-4 lg:flex flex-col transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20 px-2"
      )}>
        <div className={cn("flex w-full items-center", isSidebarOpen ? "justify-between" : "justify-center")}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-zinc-100 transition focus:outline-none"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Brand collapsed={!isSidebarOpen} />
          </button>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="ml-2 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav className="mt-8 space-y-1 w-full">
          {nav.map(([k, l, I]) => (
            <Nav key={k} active={page === k} icon={I} label={l} click={() => setPage(k)} collapsed={!isSidebarOpen} />
          ))}
        </nav>
      </aside>

      {/* Floating Streak Element */}
      <div className="fixed bottom-4 right-4 z-20 w-56 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 p-3 text-white shadow-xl pointer-events-none hidden sm:block">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <b className="text-[11px] uppercase tracking-wider">Keep your streak alive</b>
        </div>
        <p className="mt-1 text-[10px] text-orange-100 leading-tight">One more task this week unlocks a bonus badge.</p>
      </div>

      {/* Main Container */}
      <div className={cn("transition-all duration-300", isSidebarOpen ? "lg:pl-64" : "lg:pl-20")}>
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/85 px-5 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Brand />
          </div>
          <h1 className="hidden font-bold lg:block">{nav.find((x) => x[0] === page)?.[1]}</h1>
          <div className="flex items-center gap-3">
            {/* Top Member Balance Badge */}
            {role === "Member" && (
              <button
                onClick={() => setPage("history")}
                className="group relative flex items-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm transition hover:scale-105 hover:border-amber-400"
                title="Your available Aura balance — click to view history"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                <span className="text-sm">✨</span>
                <span className="font-extrabold text-orange-950 tracking-tight">
                  {(auraBalance ?? 0).toLocaleString()}
                </span>
                <span className="hidden font-semibold text-orange-800/90 sm:inline">Aura</span>
              </button>
            )}

            {/* Interactive Search Bar */}
            <div className="relative hidden sm:block">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600 transition focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100">
                <Search className="h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search tasks, store, teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchModal(true)}
                  className="w-48 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:w-64"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {showSearchModal && searchQuery.trim().length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowSearchModal(false)}
                  />
                  <div className="absolute right-0 top-12 z-40 w-96 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Search Results for &ldquo;{searchQuery}&rdquo;
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {/* Matching Tasks */}
                      {initialTasks
                        ?.filter((t: any) =>
                          t.title?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 4)
                        .map((t: any) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setTask(t);
                              setShowSearchModal(false);
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition hover:bg-orange-50"
                          >
                            <div>
                              <div className="text-xs font-semibold text-zinc-800">{t.title}</div>
                              <div className="text-[10px] text-zinc-400">Task • {t.status}</div>
                            </div>
                            <span className="rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                              +{t.auraPoints} Aura
                            </span>
                          </div>
                        ))}

                      {/* Matching Store Items */}
                      {initialStoreItems
                        ?.filter((s: any) =>
                          s.name?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 3)
                        .map((s: any) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setPage("store");
                              setShowSearchModal(false);
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition hover:bg-orange-50"
                          >
                            <div>
                              <div className="text-xs font-semibold text-zinc-800">{s.name}</div>
                              <div className="text-[10px] text-zinc-400">Store Reward • {s.stock} in stock</div>
                            </div>
                            <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                              {s.basePrice} Aura
                            </span>
                          </div>
                        ))}

                      {/* Matching Users/Members */}
                      {initialUsers
                        ?.filter(
                          (u: any) =>
                            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 3)
                        .map((u: any) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setPage("members");
                              setShowSearchModal(false);
                            }}
                            className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition hover:bg-orange-50"
                          >
                            <div>
                              <div className="text-xs font-semibold text-zinc-800">{u.name || u.email}</div>
                              <div className="text-[10px] text-zinc-400">Member • {u.email}</div>
                            </div>
                            <span className="text-[10px] font-medium text-orange-600">View</span>
                          </div>
                        ))}

                      {initialTasks?.filter((t: any) => t.title?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                        initialStoreItems?.filter((s: any) => s.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                        initialUsers?.filter((u: any) => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                          <div className="py-6 text-center text-xs text-zinc-400">
                            No matching tasks, rewards, or members found.
                          </div>
                        )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Interactive Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter((n) => !n.readAt).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {notifications.filter((n) => !n.readAt).length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowNotifDropdown(false)}
                  />
                  <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:w-96">
                    <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-orange-600" />
                        <h4 className="text-sm font-bold text-zinc-800">Notifications</h4>
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                          {notifications.filter((n) => !n.readAt).length} unread
                        </span>
                      </div>
                      {notifications.some((n) => !n.readAt) && (
                        <button
                          onClick={async () => {
                            await markAllNotificationsAsReadAction();
                            setNotifications((prev) =>
                              prev.map((n) => ({ ...n, readAt: new Date() }))
                            );
                            notify("Marked all as read");
                          }}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n: any) => (
                          <div
                            key={n.id}
                            onClick={async () => {
                              if (!n.readAt) {
                                await markNotificationAsReadAction(n.id);
                                setNotifications((prev) =>
                                  prev.map((item) =>
                                    item.id === n.id ? { ...item, readAt: new Date() } : item
                                  )
                                );
                              }
                            }}
                            className={cn(
                              "cursor-pointer rounded-xl p-3 text-left transition",
                              n.readAt
                                ? "bg-zinc-50/70 hover:bg-zinc-100"
                                : "border border-orange-100 bg-orange-50/50 hover:bg-orange-100/60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-bold text-zinc-900">{n.title}</div>
                              <span className="whitespace-nowrap text-[10px] text-zinc-400">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-600">{n.message}</p>
                            {!n.readAt && (
                              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                                Unread
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Authenticated Role Badge & Profile Hover */}
            <div className="group relative">
              <span className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 cursor-default">
                {role}
              </span>
              
              <div className="absolute right-0 top-full mt-2 hidden w-64 flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl group-hover:flex z-50 transition-all duration-200">
                <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                    {(currentUser?.name || currentUser?.email || "U")[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="truncate text-sm font-bold text-zinc-900">{currentUser?.name || "Admin"}</div>
                    <div className="truncate text-xs text-zinc-500">{currentUser?.email || userName}</div>
                  </div>
                </div>
                {role === "Member" && currentUser?.teamMembers?.[0]?.team && (
                  <div className="pt-1 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500">Team</span>
                      <span className="font-semibold text-zinc-900">{currentUser.teamMembers[0].team.name}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500">Team ID</span>
                      <span className="font-mono text-zinc-700">{currentUser.teamMembers[0].teamId.slice(0, 8)}...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => logoutAction()}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="mx-auto max-w-7xl px-5 pb-24 pt-7 sm:px-8 lg:pb-10">
          {page === "home" &&
            (role === "Member" ? (
              <MemberHome
                go={setPage}
                open={setTask}
                balance={auraBalance}
                availableAura={auraBalance}
                cumulativeAura={cumulativeAura}
                initialTasks={initialTasks}
                userName={userName}
                topTeam={initialTeams?.[0]}
              />
            ) : (
              <AdminHome
                superadmin={role === "Superadmin"}
                go={setPage}
                openAward={() => setShowAwardAura(true)}
                openCreateTask={() => setShowCreateTask(true)}
                initialTasks={initialTasks}
                topTeam={initialTeams?.[0]}
              />
            ))}
          {page === "tasks" && (
            <Tasks
              open={setTask}
              admin={role !== "Member"}
              openCreateTask={() => setShowCreateTask(true)}
              initialTasks={initialTasks}
            />
          )}
          {page === "reviews" && <Reviews notify={notify} initialTasks={initialTasks} />}
          {page === "members" && (
            <Members notify={notify} openAddUser={() => setShowAddUser(true)} />
          )}
          {page === "leaderboard" && <Leaderboard />}
          {page === "wall" && (
            <Wall
              notify={notify}
              kudos={initialKudos}
              openSendKudos={() => setShowSendKudos(true)}
            />
          )}
          {page === "store" && (
            <StorePage
              admin={role !== "Member"}
              notify={notify}
              storeItems={currentStoreItems}
              availableAura={auraBalance}
              isBalanceLoading={isBalanceLoading}
              balanceError={balanceError}
              onRefreshBalance={refreshBalance}
              onRedeemItem={handleRedeemItem}
              openAddProduct={() => setShowAddProduct(true)}
              redemptions={currentRedemptions}
            />
          )}
          {page === "history" && <History history={initialHistory} />}
          {page === "profile" && <Profile userName={userName} balance={auraBalance} cumulativeAura={cumulativeAura} />}
          {page === "tag" && (
            <TagTeams
              teams={initialTeams}
              openCreateTeam={() => setShowCreateTeam(true)}
            />
          )}
          {page === "analytics" && <Analytics />}
          {page === "audit" && <Audit />}
          {page === "deliveries" && (
            <EmailDeliveriesDashboard
              initialSummary={initialDeliverySummary}
              initialData={initialDeliveriesData}
              notify={notify}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              notify={notify}
              role={role}
              initialPreferences={initialPreferences}
              onNavigate={setPage}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        {nav.slice(0, 4).map(([k, l, I]) => (
          <button
            key={k}
            onClick={() => setPage(k)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 text-[10px] font-medium",
              page === k ? "text-orange-700" : "text-zinc-500"
            )}
          >
            <I className="h-5 w-5" />
            {l}
          </button>
        ))}
        <button
          onClick={() => setPage("profile")}
          className="flex flex-1 flex-col items-center gap-1 text-[10px] text-zinc-500"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      {/* Modals */}
      {showAwardAura && (
        <AwardAuraModal
          close={() => setShowAwardAura(false)}
          notify={notify}
          onSuccess={() => {
            setShowAwardAura(false);
            window.location.reload();
          }}
          users={initialUsers}
        />
      )}
      {showAddUser && (
        <AddUserModal
          close={() => setShowAddUser(false)}
          notify={notify}
          onSuccess={() => {
            setShowAddUser(false);
            window.location.reload();
          }}
          teams={initialTeams}
        />
      )}
      {showCreateTask && (
        <CreateTaskModal
          close={() => setShowCreateTask(false)}
          notify={notify}
          onSuccess={() => {
            setShowCreateTask(false);
            window.location.reload();
          }}
          users={initialUsers}
        />
      )}
      {showAddProduct && (
        <AddProductModal
          close={() => setShowAddProduct(false)}
          notify={notify}
          onSuccess={() => {
            setShowAddProduct(false);
            window.location.reload();
          }}
        />
      )}
      {showSendKudos && (
        <SendKudosModal
          close={() => setShowSendKudos(false)}
          notify={notify}
          onSuccess={() => {
            setShowSendKudos(false);
            window.location.reload();
          }}
          users={initialUsers}
        />
      )}
      {showCreateTeam && (
        <CreateTeamModal
          close={() => setShowCreateTeam(false)}
          notify={notify}
          onSuccess={() => {
            setShowCreateTeam(false);
            window.location.reload();
          }}
        />
      )}
      {task && (
        <TaskModal
          task={task}
          close={() => setTask(null)}
          notify={notify}
          onSuccess={() => {
            setTask(null);
            window.location.reload();
          }}
          role={role}
        />
      )}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Subcomponents
function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 text-white">
        <Zap className="h-5 w-5 fill-current" />
      </span>
      {!collapsed && <b className="text-xl tracking-tight">Aura</b>}
    </div>
  );
}

function Nav({
  active,
  icon: I,
  label,
  click,
  collapsed = false,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  click: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={click}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition",
        collapsed ? "justify-center px-0" : "px-3",
        active ? "bg-orange-50 text-orange-700 font-semibold" : "text-zinc-500 hover:bg-zinc-50"
      )}
    >
      <I className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </button>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-zinc-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

function Head({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-orange-600">Aura workspace</p>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-zinc-500">{copy}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: I,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-5">
      <div className="flex justify-between text-sm text-zinc-500">
        {label}
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
          <I className="h-4 w-4" />
        </span>
      </div>
      <b className="mt-5 block text-2xl">{value}</b>
    </Card>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
      {children}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-amber-200 text-xs font-bold text-orange-700">
      {initials}
    </span>
  );
}

function MemberHome({
  go,
  open,
  balance = 0,
  availableAura,
  cumulativeAura,
  initialTasks,
  userName,
  topTeam,
}: {
  go: (p: Page) => void;
  open: (t: any) => void;
  balance?: number;
  availableAura?: number;
  cumulativeAura?: number;
  initialTasks?: any[];
  userName?: string;
  topTeam?: any;
}) {
  const displayName = userName ? (userName.includes("@") ? userName.split("@")[0] : userName) : "✨";

  const displayCumulative = cumulativeAura ?? balance ?? 0;
  const displayAvailable = availableAura ?? balance ?? 0;

  // The 7-Level Gamified Tier System - Based on Lifetime Cumulative Aura
  const tiers = AURA_TIERS;
  const currentTier = getTierForAura(displayCumulative);
  const nextTier = tiers.find((t) => t.level === currentTier.level + 1) || null;
  const progressPercent = nextTier
    ? Math.min(100, Math.max(0, Math.round(((displayCumulative - currentTier.min) / (nextTier.min - currentTier.min)) * 100)))
    : 100;
  const auraToNext = nextTier ? Math.max(0, nextTier.min - displayCumulative) : 0;

  return (
    <>
      <Head
        title={`Good morning, ${displayName}`}
        copy="Your progress is building something meaningful."
      />

      {/* INNOVATIVE TOP-LOCATION AURA BALANCE SHOWCASE */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 p-6 text-white shadow-[0_20px_50px_rgba(234,88,12,0.28)] sm:p-9">
        {/* Dynamic ambient glowing aura backgrounds */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-orange-400/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_65%)]" />

        {/* Top Header inside balance card: Batch & Live Status */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 text-sm font-black tracking-wider text-white shadow-inner backdrop-blur-md">
              {batch.initials}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                AURA NEXUS · {batch.name}
              </p>
              <p className="text-sm font-semibold text-white/90">{batch.year} Performance Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE ENERGY SYNC
            </span>
            <span className="hidden sm:inline-flex rounded-full border border-white/20 bg-amber-400/20 px-3 py-1 text-xs font-semibold">
              ⚡ 1.25x Streak Surge
            </span>
          </div>
        </div>

        {/* Main Balance Hero & Gamified Power Tier */}
        <div className="relative z-10 mt-7 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block text-xs font-extrabold uppercase tracking-[0.2em] text-amber-200">
                CUMULATIVE AURA EARNED
              </span>
              <span className="rounded-full bg-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Level {currentTier.level} · {currentTier.name}
              </span>
            </div>

            {/* Eye-catching glowing cumulative number display */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.25)] sm:text-7xl lg:text-8xl">
                ✨ {displayCumulative.toLocaleString()}
              </span>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-wide text-amber-200 sm:text-3xl">AURA</span>
                <span className="text-xs font-semibold text-white/80">Lifetime earned across tasks & awards</span>
              </div>
            </div>

            {/* Available to Spend in Store Showcase Badge */}
            <div className="mt-4 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-black/25 px-4 py-2 text-xs backdrop-blur-md shadow-inner">
                <span className="text-amber-400 font-extrabold text-sm">⚡</span>
                <span className="font-medium text-amber-100">Available to Spend in Store:</span>
                <span className="font-black text-white text-sm">{displayAvailable.toLocaleString()} Aura</span>
              </div>
            </div>

            {/* Innovative Action Pills directly in Balance Hero */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => go("tasks")}
                className="group flex items-center gap-1.5 rounded-xl border border-white/30 bg-white px-3.5 py-2 text-xs font-bold text-orange-700 shadow-md transition hover:scale-105 hover:bg-amber-50"
              >
                <Target className="h-4 w-4 text-orange-600 transition group-hover:rotate-12" />
                Earn Aura Tasks
              </button>
              <button
                onClick={() => go("store")}
                className="group flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3.5 py-2 text-xs font-bold text-white shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-white/25"
              >
                <Gift className="h-4 w-4 text-amber-200 transition group-hover:rotate-12" />
                Redeem Rewards
              </button>
              <button
                onClick={() => go("history")}
                className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/90 backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
              >
                <ReceiptText className="h-4 w-4 text-amber-200" />
                Aura Ledger
              </button>
            </div>
          </div>

          {/* Gamified Tier Card with Circular Cosmic Badge */}
          <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-white/15 p-5 sm:p-6 shadow-inner backdrop-blur-lg">
            {/* Ambient Cosmic Aura Glow in background */}
            <div className="pointer-events-none absolute -left-8 -top-8 h-48 w-48 rounded-full bg-amber-400/25 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              {/* Enlarged Badge covering the left corner + Label aligned at the bottom */}
              <div className="flex items-end gap-4 sm:gap-5">
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40 flex-shrink-0 transition-transform duration-300 hover:scale-105">
                  <img
                    src={currentTier.badgeUrl}
                    alt={currentTier.name}
                    className="h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  />
                </div>
                <div className="pb-1 sm:pb-2">
                  <p className="text-[11px] sm:text-xs font-extrabold tracking-wider text-amber-200 uppercase">
                    CURRENT TIER · LEVEL {currentTier.level}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    {currentTier.name}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold text-white shadow-sm backdrop-blur-sm">
                {progressPercent}%
              </span>
            </div>

            {/* Glowing Progress Bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-medium text-amber-100">
                <span>{displayCumulative.toLocaleString()} Aura</span>
                <span>{nextTier ? `${nextTier.min.toLocaleString()} Aura` : "Max Tier (200k+)"}</span>
              </div>
              <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-black/20 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-white shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2.5 text-xs text-amber-100/90 font-medium">
                {nextTier
                  ? `⚡ Only ${auraToNext.toLocaleString()} Aura needed to unlock Level ${nextTier.level} · ${nextTier.name}!`
                  : "🌟 Maximum Tier reached! You are a Universal Icon."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <div className="space-y-6">
          <TaskList open={open} initialTasks={initialTasks} />
          <Feed />
        </div>
        <div className="space-y-6">
          <TagCard topTeam={topTeam} />
          <Card className="p-5">
            <b>Quick actions</b>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                [Target, "View Tasks", "tasks"],
                [FileCheck2, "Submit Task", "tasks"],
                [Gift, "Visit Store", "store"],
                [Trophy, "Leaderboard", "leaderboard"],
              ].map(([I, l, p]) => {
                const Icon = I as LucideIcon;
                return (
                  <button
                    key={String(l)}
                    onClick={() => go(p as Page)}
                    className="rounded-xl border border-orange-100 p-3 text-left transition hover:-translate-y-0.5 hover:bg-orange-50"
                  >
                    <Icon className="h-4 w-4 text-orange-600" />
                    <span className="mt-3 block text-xs font-bold">{String(l)}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <b>Recent achievements</b>
            <p className="mt-4 text-sm">
              ⚡ First mover <span className="block text-xs text-zinc-500">Started 5 tasks this month</span>
            </p>
            <p className="mt-4 text-sm">
              ♥ Team player <span className="block text-xs text-zinc-500">Gave 10 Kudos</span>
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function AdminHome({
  superadmin,
  go,
  openAward,
  openCreateTask,
  initialTasks,
  topTeam,
}: {
  superadmin: boolean;
  go: (p: Page) => void;
  openAward: () => void;
  openCreateTask: () => void;
  initialTasks?: any[];
  topTeam?: any;
}) {
  const stat = superadmin
    ? [
        ["Team members", "25", Users],
        ["Pending approvals", "3", Clock3],
        ["Aura issued", "18,640", Sparkles],
        ["Aura redeemed", "6,220", Gift],
        ["This month", "4,860", Flame],
      ]
    : [
        ["Pending approvals", "3", Clock3],
        ["Awaiting review", "8", FileCheck2],
        ["Team Aura", "4,860", Sparkles],
        ["Completed", "42", CheckCircle2],
        ["Redemptions", "5", Gift],
      ];

  const pendingSubmissions = (initialTasks || [])
    .filter((t: any) => t.assignments?.some((a: any) => a.status === "SUBMITTED"))
    .slice(0, 3);

  return (
    <>
      <Head
        title={superadmin ? "Aura, at a glance" : "Good morning, Admin"}
        copy="Here’s what needs attention across the team."
        action={
          <div className="flex gap-2">
            {superadmin && (
              <Button onClick={openAward}>
                <Sparkles className="mr-2 h-4 w-4" />
                Award Aura
              </Button>
            )}
            <Button variant="outline" onClick={openCreateTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create task
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stat.map(([l, v, I]) => (
          <Metric key={String(l)} label={String(l)} value={String(v)} icon={I as LucideIcon} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <b>Tasks awaiting review</b>
          {pendingSubmissions.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">No submissions awaiting review.</div>
          ) : (
            pendingSubmissions.map((t: any) => (
              <div className="mt-4 flex items-center gap-3" key={t.id}>
                <span className="flex-1 text-sm">
                  <b>{t.title}</b>
                  <small className="block text-zinc-500">
                    Submitted recently · {t.baseAura} Aura
                  </small>
                </span>
                <button
                  onClick={() => go("reviews")}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Review
                </button>
              </div>
            ))
          )}
        </Card>
        <div className="space-y-6">
          <TagCard topTeam={topTeam} />
          <Feed />
        </div>
      </div>
    </>
  );
}

// Safely handles both Assignment objects (a.task.title) and Task objects (a.title)
function TaskList({ open, initialTasks }: { open: (t: any) => void; initialTasks?: any[] }) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-600" />
          <b className="text-zinc-900">Your Assigned Tasks</b>
        </div>
        <span className="text-xs font-semibold text-zinc-400">Tabular Summary</span>
      </div>
      {!initialTasks || initialTasks.length === 0 ? (
        <div className="py-8 text-center text-zinc-400">No tasks assigned yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-2.5">Task Title</th>
                <th className="pb-2.5">Reward</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {initialTasks.slice(0, 5).map((a: any) => {
                const theTask = a.task || a;
                return (
                  <tr
                    onClick={() => open(a)}
                    key={a.id}
                    className="group cursor-pointer transition hover:bg-orange-50/50"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600 transition group-hover:bg-orange-600 group-hover:text-white">
                          <Target className="h-3.5 w-3.5" />
                        </span>
                        <b className="block text-xs sm:text-sm font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors">
                          {theTask?.title || "Untitled Task"}
                        </b>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">
                        ✨ +{theTask?.baseAura || 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3">
                      <Pill>{a.status || "ASSIGNED"}</Pill>
                    </td>
                    <td className="whitespace-nowrap py-3 text-right">
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                        Open <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Feed() {
  return (
    <Card className="p-5">
      <b>Recent Aura Wall activity</b>
      {members.slice(1, 4).map((m, i) => (
        <div className="mt-4 flex gap-3" key={m}>
          <Avatar name={m} />
          <p className="text-sm text-zinc-600">
            <b className="text-zinc-900">{m}</b>{" "}
            {i === 0
              ? "completed Product story mapping"
              : i === 1
              ? "unlocked the Cosmic Rookie badge"
              : "reacted with 🔥 Crushing It to Kabir"}
            <small className="block text-zinc-400">2 hours ago</small>
          </p>
        </div>
      ))}
    </Card>
  );
}

function TagCard({ topTeam }: { topTeam?: any }) {
  const name = topTeam?.name || "Momentum Makers";
  const aura = topTeam?.combinedAura !== undefined ? `${topTeam.combinedAura} Aura` : "510 Aura";

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-amber-100 to-white p-5">
        <Users className="h-5 w-5 text-amber-600" />
        <Pill>Active</Pill>
        <p className="mt-4 text-xs font-bold text-amber-700">TAG TEAM · WEEKLY COMPETITION</p>
        <b className="text-lg">{name}</b>
        <p className="mt-3 text-sm text-zinc-600">
          <b>{aura}</b> combined this week
        </p>
      </div>
    </Card>
  );
}

function Tasks({
  open,
  admin,
  openCreateTask,
  initialTasks,
}: {
  open: (t: any) => void;
  admin: boolean;
  openCreateTask: () => void;
  initialTasks?: any[];
}) {
  const STATUS_FILTER_MAP: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    ASSIGNED: "Not Started",
    ACTIVE: "Not Started",
    NEEDS_CHANGES: "Needs Changes",
    SUBMITTED: "Submitted",
    COMPLETED: "Completed",
  };

  const [filter, setFilter] = useState("All tasks");
  const [taskSearch, setTaskSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const filters = [
    "All tasks",
    "In Progress",
    "Not Started",
    "Needs Changes",
    "Submitted",
    "Completed",
  ];

  const displayItems: { task: any; assignmentStatus: string; assignmentId?: string }[] = admin
    ? (initialTasks || []).flatMap((t: any) =>
        t.assignments && t.assignments.length > 0
          ? t.assignments.map((a: any) => ({
              task: t,
              assignmentStatus: a.status,
              assignmentId: a.id,
            }))
          : [{ task: t, assignmentStatus: "ACTIVE", assignmentId: undefined }]
      )
    : (initialTasks || []).map((a: any) => ({
        task: a.task || a,
        assignmentStatus: a.status || "ASSIGNED",
        assignmentId: a.id,
      }));

  const filtered = displayItems.filter((item) => {
    const matchesFilter =
      filter === "All tasks" ||
      (STATUS_FILTER_MAP[item.assignmentStatus] || item.assignmentStatus) === filter;
    const matchesSearch =
      taskSearch.trim() === "" ||
      item.task?.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      item.task?.description?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      item.task?.createdBy?.name?.toLowerCase().includes(taskSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <Head
        title={admin ? "Task workspace" : "Tasks that move things forward"}
        copy="Structured assignments, reviews, and high-impact momentum."
        action={
          <div className="flex items-center gap-2">
            {admin && (
              <Button onClick={openCreateTask}>
                <Plus className="mr-2 h-4 w-4" />
                New task
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Chips & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {filters.map((x) => {
            const count =
              x === "All tasks"
                ? displayItems.length
                : displayItems.filter(
                    (item) => (STATUS_FILTER_MAP[item.assignmentStatus] || item.assignmentStatus) === x
                  ).length;
            const active = filter === x;
            return (
              <button
                key={x}
                onClick={() => setFilter(x)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition",
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                )}
              >
                <span>{x}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search in Table */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-full border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-800 placeholder-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          {taskSearch && (
            <button
              onClick={() => setTaskSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ATTRACTIVE TABULAR TASKS DISPLAY */}
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_8px_30px_rgba(234,88,12,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-orange-100/80 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600">
                <th className="px-5 py-4">Task & Details</th>
                <th className="px-5 py-4">Aura Reward</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Assigned By</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Target className="mx-auto mb-3 h-10 w-10 text-orange-200" />
                    <p className="font-bold text-zinc-800">No tasks found</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {taskSearch
                        ? `No tasks matching "${taskSearch}".`
                        : "No tasks found under this filter."}
                    </p>
                    {(filter !== "All tasks" || taskSearch) && (
                      <button
                        onClick={() => {
                          setFilter("All tasks");
                          setTaskSearch("");
                        }}
                        className="mt-3 text-xs font-bold text-orange-600 hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const statusLabel = STATUS_FILTER_MAP[item.assignmentStatus] || item.assignmentStatus;
                  const isCompleted = item.assignmentStatus === "COMPLETED";
                  const isInProgress = item.assignmentStatus === "IN_PROGRESS";
                  const isSubmitted = item.assignmentStatus === "SUBMITTED";
                  const isNeedsChanges = item.assignmentStatus === "NEEDS_CHANGES";

                  return (
                    <tr
                      key={(item.assignmentId || item.task.id) + idx}
                      onClick={() =>
                        open(
                          admin
                            ? item.task
                            : (initialTasks || []).find((a: any) => a.id === item.assignmentId) || item.task
                        )
                      }
                      className="group cursor-pointer transition hover:bg-orange-50/50"
                    >
                      {/* Column 1: Task Title & Description */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3.5">
                          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100/70 text-orange-600 shadow-sm transition group-hover:scale-105 group-hover:bg-orange-600 group-hover:text-white">
                            <Target className="h-5 w-5" />
                          </span>
                          <div className="max-w-md">
                            <b className="block text-sm font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                              {item.task.title}
                            </b>
                            {item.task.description && (
                              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                                {item.task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Aura Reward */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-gradient-to-r from-orange-50 to-amber-50 px-3.5 py-1 text-xs font-black text-orange-700 shadow-xs">
                          <span>✨</span>
                          <span>+{item.task.baseAura} Aura</span>
                        </span>
                      </td>

                      {/* Column 3: Status with distinctive pill */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                            isCompleted && "bg-emerald-100 text-emerald-800",
                            isInProgress && "bg-amber-100 text-amber-800",
                            isSubmitted && "bg-purple-100 text-purple-800",
                            isNeedsChanges && "bg-rose-100 text-rose-800",
                            !isCompleted && !isInProgress && !isSubmitted && !isNeedsChanges && "bg-zinc-100 text-zinc-700"
                          )}
                        >
                          {isInProgress && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          {isSubmitted && <Clock3 className="h-3.5 w-3.5 text-purple-600" />}
                          {isNeedsChanges && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
                          {statusLabel}
                        </span>
                      </td>

                      {/* Column 4: Creator / Assignor */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-zinc-500">
                        {item.task.createdBy?.name ? (
                          <div className="flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700">
                              {item.task.createdBy.name[0].toUpperCase()}
                            </span>
                            <span className="font-medium text-zinc-700">{item.task.createdBy.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Team Admin</span>
                        )}
                      </td>

                      {/* Column 5: Action */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            open(
                              admin
                                ? item.task
                                : (initialTasks || []).find((a: any) => a.id === item.assignmentId) || item.task
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-700 transition group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-sm"
                        >
                          View Task <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TaskModal({
  task,
  close,
  notify,
  onSuccess,
  role,
}: {
  task: any;
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
  role: string;
}) {
  const [loading, setLoading] = useState(false);
  const isAdmin = role === "Admin" || role === "Superadmin";
  const theTask = task.task || task;
  const assignmentId = task.task ? task.id : task.assignments?.[0]?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignmentId) {
      notify("No active assignment found for this task.");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("assignmentId", assignmentId);
    const res = await submitTaskAction(fd);
    if (res.success) {
      notify("Task submitted successfully!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to submit task");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("taskId", theTask.id);
    const res = await deleteTaskAction(fd);
    if (res.success) {
      notify("Task deleted.");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to delete task");
      setLoading(false);
    }
  }

  async function handleStatusUpdate(status: string) {
    if (!assignmentId) {
      notify("No active assignment found for this task.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("assignmentId", assignmentId);
    fd.append("status", status);
    const res = await updateAssignmentStatusAction(fd);
    if (res.success) {
      notify("Assignment status updated.");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to update status");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-zinc-900/30 sm:place-items-center">
      <Card className="w-full max-w-xl rounded-b-none p-6 sm:rounded-3xl">
        <div className="flex justify-between">
          <Pill>{task.status || "ACTIVE"}</Pill>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{theTask?.title || "Task"}</h2>
        <p className="mt-3 leading-7 text-zinc-500">
          {theTask?.description || "No description provided."}
        </p>
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-zinc-50 p-4 text-center text-sm">
          <span>
            {theTask?.baseAura || 0}
            <small className="block text-zinc-500">Aura</small>
          </span>
          <span>
            Creator
            <small className="block text-zinc-500">
              {theTask?.createdBy?.name || "Admin"}
            </small>
          </span>
        </div>
        {isAdmin && assignmentId && (
          <div className="mt-5 rounded-xl border border-zinc-200 p-4">
            <h4 className="mb-3 text-sm font-bold">Admin Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("COMPLETED")}
                disabled={loading}
              >
                Mark Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("NEEDS_CHANGES")}
                disabled={loading}
              >
                Mark Incomplete
              </Button>
            </div>
          </div>
        )}
        
        {isAdmin && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Delete Task
            </Button>
          </div>
        )}

        {!isAdmin && (task.status === "ASSIGNED" || task.status === "IN_PROGRESS" || task.status === "NEEDS_CHANGES") && (
          <form onSubmit={handleSubmit} className="mt-5">
            <textarea
              required
              name="content"
              className="w-full rounded-xl border p-4 text-sm"
              placeholder="Submission notes, link to PR, design URL..."
              rows={3}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function ChampionConfetti() {
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    color: string;
    width: number;
    height: number;
    x: number;
    y: number;
    rot: number;
    delay: number;
    duration: number;
    isStreamer: boolean;
  }>>([]);

  useEffect(() => {
    // Only trigger once when Leaderboard mounts/enters
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Palette: Gold, warm orange, amber, pastel mint, coral peach, pastel yellow
    const colors = [
      "#f59e0b", // Amber gold
      "#ea580c", // Brand orange
      "#fbbf24", // Warm yellow
      "#fb923c", // Soft peach orange
      "#34d399", // Pastel emerald/mint
      "#f472b6", // Pastel rose
      "#60a5fa", // Pastel sky
      "#fef08a", // Light gold
    ];

    const generated = Array.from({ length: 42 }, (_, i) => {
      // Angle spanning -160deg to -20deg (bursting upwards and outwards)
      const angle = -Math.PI * (0.15 + 0.7 * Math.random());
      // Distance burst radius 80px to 190px
      const dist = 75 + Math.random() * 110;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      const rot = (Math.random() - 0.5) * 720;
      const isStreamer = i % 6 === 0;

      return {
        id: i,
        color: colors[i % colors.length],
        width: isStreamer ? 4 : Math.floor(6 + Math.random() * 5),
        height: isStreamer ? Math.floor(12 + Math.random() * 8) : Math.floor(7 + Math.random() * 6),
        x: Math.round(x),
        y: Math.round(y),
        rot: Math.round(rot),
        delay: Math.round(Math.random() * 180),
        duration: Math.round(1400 + Math.random() * 600),
        isStreamer,
      };
    });

    setParticles(generated);
    setActive(true);

    const timer = setTimeout(() => {
      setActive(false);
      setParticles([]);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  if (!active || particles.length === 0) return null;

  return (
    <div
      className="absolute -top-12 left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none select-none z-30"
      aria-hidden="true"
    >
      <style>{`
        @keyframes champion-confetti-burst {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translate3d(var(--cx), calc(var(--cy) * 0.9), 0) rotate(calc(var(--crot) * 0.3)) scale(1.1);
          }
          65% {
            opacity: 0.95;
            transform: translate3d(var(--cx), calc(var(--cy) + 24px), 0) rotate(calc(var(--crot) * 0.7)) scale(0.95);
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--cx), calc(var(--cy) + 70px), 0) rotate(var(--crot)) scale(0.6);
          }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${p.width}px`,
            height: `${p.height}px`,
            backgroundColor: p.color,
            borderRadius: p.isStreamer ? "3px" : "1.5px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            animationName: "champion-confetti-burst",
            animationDuration: `${p.duration}ms`,
            animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            animationFillMode: "forwards",
            animationDelay: `${p.delay}ms`,
            transformOrigin: "center center",
            willChange: "transform, opacity",
            // @ts-ignore
            "--cx": `${p.x}px`,
            "--cy": `${p.y}px`,
            "--crot": `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

function Leaderboard() {
  const top = members.slice(0, 3);
  // top[0] is 1st Place, top[1] is 2nd Place, top[2] is 3rd Place

  // Dynamically derive current calendar month
  const currentMonth = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());

  return (
    <>
      {/* 3-STEP PODIUM SECTION - Elevated to the top */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-b from-amber-50/70 via-white to-orange-50/40 p-5 sm:p-8 shadow-[0_12px_40px_rgba(234,88,12,0.08)]">
        {/* Dynamic Podium Heading */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-2xl font-black text-zinc-900 sm:text-3xl tracking-tight">
            Top {currentMonth} Champions
          </h2>
        </div>

        {/* The 3 Podium Stairs (Left: 2nd, Center: 1st, Right: 3rd) */}
        <div className="mx-auto flex max-w-xl items-end justify-center gap-2 sm:gap-4 pt-4 sm:pt-6">
          {/* STEP 2: 2ND PLACE (SILVER) - Left Stair */}
          <div className="flex w-1/3 flex-col items-center">
            {/* Perched on top of step 2 */}
            <div className="mb-3 flex flex-col items-center text-center">
              <span className="text-2xl sm:text-3xl mb-1 drop-shadow-sm">🥈</span>
              <div className="relative">
                <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-base font-bold text-slate-800 shadow-md ring-4 ring-slate-300">
                  {top[1]?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "S2"}
                </span>
                <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-slate-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                  #2
                </span>
              </div>
              <b className="mt-2 block max-w-[110px] truncate text-xs sm:text-sm font-bold text-zinc-900">
                {top[1] || "Silver Star"}
              </b>
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                <img src="/badges/level-2-lunar-explorer.png" alt="Lunar Explorer" className="h-3 w-3 object-contain inline-block" />
                Lunar Explorer
              </span>
              <p className="mt-1 text-xs sm:text-sm font-black text-slate-700">10,000 Aura</p>
            </div>

            {/* Physical Stair Step 2 Block */}
            <div className="relative flex h-44 sm:h-52 w-full flex-col items-center justify-between rounded-t-2xl border-t-4 border-slate-200 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 p-3 shadow-lg transition-transform hover:-translate-y-1">
              <span className="rounded-full bg-white/40 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-800 uppercase shadow-xs">
                2nd Place
              </span>
              <span className="my-auto text-6xl sm:text-7xl font-black text-white/50 tracking-tighter drop-shadow-sm select-none">
                2
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-900/80 tracking-wider">SILVER STEP</span>
            </div>
          </div>

          {/* STEP 1: 1ST PLACE (GOLD CHAMPION) - Center Stair (Elevated Highest with Celebratory Confetti) */}
          <div className="flex w-1/3 flex-col items-center">
            {/* Perched on top of step 1 with Real Celebratory Confetti Burst */}
            <div className="mb-3 flex flex-col items-center text-center relative">
              {/* Confetti celebration attached to first-place champion */}
              <ChampionConfetti />

              <div className="relative -mb-1 animate-bounce motion-reduce:animate-none text-3xl sm:text-4xl">👑</div>
              <div className="relative">
                <span className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-lg sm:text-xl font-black text-amber-950 shadow-xl ring-4 ring-amber-400 ring-offset-2 ring-offset-amber-50">
                  {top[0]?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "G1"}
                </span>
                <span className="absolute -bottom-2 -right-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow">
                  #1
                </span>
              </div>
              <b className="mt-2 block max-w-[120px] truncate text-sm sm:text-base font-extrabold text-zinc-900">
                {top[0] || "Gold Champion"}
              </b>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <img src="/badges/level-2-lunar-explorer.png" alt="Lunar Explorer" className="h-3.5 w-3.5 object-contain inline-block" />
                Lunar Explorer
              </span>
              <p className="mt-1 text-sm sm:text-base font-black text-orange-600">12,000 Aura</p>
            </div>

            {/* Physical Stair Step 1 Block (Tallest Podium Riser) */}
            <div className="relative flex h-56 sm:h-68 w-full flex-col items-center justify-between rounded-t-2xl border-t-4 border-amber-200 bg-gradient-to-b from-amber-400 via-amber-500 to-orange-600 p-3 shadow-xl ring-2 ring-amber-300/60 transition-transform hover:-translate-y-1">
              <span className="rounded-full bg-amber-950/25 px-3 py-0.5 text-[9px] sm:text-[10px] font-black tracking-widest text-white uppercase shadow-xs">
                🥇 Champion
              </span>
              <span className="my-auto text-7xl sm:text-8xl font-black text-white/60 tracking-tighter drop-shadow-md select-none">
                1
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-100 tracking-wider">GOLD STEP</span>
            </div>
          </div>

          {/* STEP 3: 3RD PLACE (BRONZE) - Right Stair (Lowest Step) */}
          <div className="flex w-1/3 flex-col items-center">
            {/* Perched on top of step 3 */}
            <div className="mb-3 flex flex-col items-center text-center">
              <span className="text-2xl sm:text-3xl mb-1 drop-shadow-sm">🥉</span>
              <div className="relative">
                <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-base font-bold text-amber-100 shadow-md ring-4 ring-amber-700/60">
                  {top[2]?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "B3"}
                </span>
                <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-amber-800 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                  #3
                </span>
              </div>
              <b className="mt-2 block max-w-[110px] truncate text-xs sm:text-sm font-bold text-zinc-900">
                {top[2] || "Bronze Victor"}
              </b>
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                <img src="/badges/level-2-lunar-explorer.png" alt="Lunar Explorer" className="h-3 w-3 object-contain inline-block" />
                Lunar Explorer
              </span>
              <p className="mt-1 text-xs sm:text-sm font-black text-amber-800">8,000 Aura</p>
            </div>

            {/* Physical Stair Step 3 Block */}
            <div className="relative flex h-36 sm:h-44 w-full flex-col items-center justify-between rounded-t-2xl border-t-4 border-amber-500 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 p-3 shadow-lg transition-transform hover:-translate-y-1">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black tracking-widest text-amber-100 uppercase shadow-xs">
                3rd Place
              </span>
              <span className="my-auto text-5xl sm:text-6xl font-black text-white/40 tracking-tighter drop-shadow-sm select-none">
                3
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-200/80 tracking-wider">BRONZE STEP</span>
            </div>
          </div>
        </div>

        {/* Unified Podium Foundation Ground Bar */}
        <div className="mx-auto max-w-xl h-5 rounded-b-xl border-t-2 border-zinc-700 bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 shadow-xl" />
      </div>

      {/* Ranks 4 to 15 */}
      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
          All Participants & Standings
        </div>
        {members.slice(3, 15).map((m, i) => {
          const rank = i + 4;
          const own = m === "Aarav Sharma";
          const points = (10 - i) * 1000;
          const tier = getTierForAura(points);
          return (
            <div
              className={cn("flex items-center gap-3 border-b p-4 last:border-0 transition hover:bg-orange-50/40", own && "bg-orange-50/70")}
              key={m}
            >
              <b className="w-6 text-center text-sm font-bold text-zinc-400">{rank}</b>
              <Avatar name={m} />
              <span className="flex-1">
                <b className="text-sm font-semibold text-zinc-900">
                  {m}
                  {own && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">You</span>}
                </b>
                <small className="flex items-center gap-1 text-xs text-zinc-500">
                  <img src={tier.badgeUrl} alt={tier.name} className="h-3.5 w-3.5 object-contain inline-block" />
                  {tier.name}
                </small>
              </span>
              <b className="text-sm font-bold text-orange-600">{points.toLocaleString()} Aura</b>
            </div>
          );
        })}
      </Card>
    </>
  );
}

// Database-backed Aura Wall Component
function Wall({
  notify,
  kudos,
}: {
  notify: (s: string) => void;
  kudos?: any[];
  openSendKudos?: () => void;
}) {
  const items = kudos && kudos.length > 0 ? kudos : [];
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userSelectedReactions, setUserSelectedReactions] = useState<Record<string, Record<string, boolean>>>({});

  const handleWallReact = (id: string, emoji: string) => {
    const isCurrentlySelected = !!(userSelectedReactions[id] && userSelectedReactions[id][emoji]);

    setUserSelectedReactions((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [emoji]: !isCurrentlySelected,
      },
    }));

    setReactions((prev) => {
      const cur = prev[id] || {};
      const curCount = cur[emoji] || 0;
      return {
        ...prev,
        [id]: {
          ...cur,
          [emoji]: isCurrentlySelected ? Math.max(0, curCount - 1) : curCount + 1,
        },
      };
    });

    notify(isCurrentlySelected ? `Removed ${emoji} reaction` : `Reacted with ${emoji}!`);
  };

  return (
    <div className="space-y-6">
      <Head
        title="Aura Wall"
        copy="Peer recognition and energetic reactions pinned for the entire team."
      />
      <div
        className="min-h-[640px] rounded-3xl border border-orange-200/60 bg-[#fffdfa] p-4 shadow-xs sm:p-6 lg:p-8"
        style={{
          backgroundImage: "radial-gradient(#ecdcd2 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-100/70 text-orange-600 mb-4 shadow-2xs">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No Kudos pinned yet</h3>
            <p className="mt-1 text-sm text-zinc-600 max-w-sm">
              Be the first to recognize and celebrate a teammate on the team Aura Wall!
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((k, i) => {
              const senderName = k.sender?.name || "Teammate";
              const receiverName = k.receiver?.name || "Colleague";
              const noteText = (k.message || "").trim();

              // Parse optional leading emoji prefix (e.g. "🔥 Crushing It" or standard text)
              const emojiMatch = noteText.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\S+)\s*(.*)$/u);
              const hasReactionFormat = emojiMatch && emojiMatch[1] && emojiMatch[2] && emojiMatch[1].length <= 4;
              const reactionEmoji = hasReactionFormat ? emojiMatch[1] : (i % 3 === 0 ? "🔥" : i % 3 === 1 ? "🚀" : "🙌");
              const messageBody = hasReactionFormat ? emojiMatch[2] : noteText;

              const cardId = k.id || `kudo-${i}`;
              const curReactions = reactions[cardId] || {};
              const curUserSelections = userSelectedReactions[cardId] || {};

              // Pastel palette styling with refined borders & restrained shadows
              const pastelVariants = [
                "bg-[#fff9df] border-amber-200/70 shadow-[0_2px_12px_rgba(180,120,40,0.06)]",
                "bg-[#fff0e6] border-orange-200/70 shadow-[0_2px_12px_rgba(200,90,30,0.06)]",
                "bg-[#edf7ea] border-emerald-200/70 shadow-[0_2px_12px_rgba(40,140,60,0.06)]",
                "bg-[#faecf5] border-pink-200/70 shadow-[0_2px_12px_rgba(180,60,130,0.06)]",
                "bg-[#eaf4f8] border-sky-200/70 shadow-[0_2px_12px_rgba(40,110,160,0.06)]",
              ];
              const variantClass = pastelVariants[i % pastelVariants.length];

              return (
                <article
                  key={cardId}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
                    variantClass
                  )}
                >
                  <div className="space-y-3.5">
                    {/* Header: Sender Avatar & KUDOS Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={senderName} />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                            From
                          </span>
                          <span className="block truncate text-xs font-semibold text-zinc-900" title={senderName}>
                            {senderName}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-md border border-black/5 bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 shadow-2xs">
                        Kudos
                      </span>
                    </div>

                    {/* Sender → Recipient Directional Flow */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs text-zinc-600">
                      <span className="shrink-0 text-[11px] font-medium text-zinc-500">To:</span>
                      <span className="truncate font-semibold text-zinc-900" title={receiverName}>
                        {receiverName}
                      </span>
                    </div>

                    {/* Spotlight Message Container */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-white/70 bg-white/75 p-4 text-center shadow-2xs backdrop-blur-xs transition-colors group-hover:bg-white/90">
                      <span className="text-3xl leading-none select-none transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
                        {reactionEmoji}
                      </span>
                      <p className="mt-2.5 w-full break-words text-sm font-semibold leading-snug text-zinc-800 line-clamp-4">
                        {messageBody || "Outstanding contribution and team support!"}
                      </p>
                      <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                        Peer Recognition
                      </span>
                    </div>
                  </div>

                  {/* Footer section: Interactive Reactions + Aura Meta */}
                  <div className="mt-4 pt-3 border-t border-black/[0.06] space-y-3">
                    {/* Reaction Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { emoji: "🔥", base: 2, label: "Fire" },
                        { emoji: "🚀", base: 1, label: "Rocket" },
                        { emoji: "❤️", base: 4, label: "Heart" },
                        { emoji: "👏", base: 3, label: "Clap" },
                      ].map((r) => {
                        const isSelected = !!curUserSelections[r.emoji];
                        const count = r.base + (curReactions[r.emoji] || 0);

                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => handleWallReact(cardId, r.emoji)}
                            aria-label={`React with ${r.label}`}
                            aria-pressed={isSelected}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150 select-none",
                              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1",
                              isSelected
                                ? "bg-orange-500 text-white shadow-2xs hover:bg-orange-600 active:scale-95"
                                : "bg-white/80 text-zinc-700 hover:bg-white hover:text-zinc-900 border border-black/5 active:scale-95 shadow-2xs"
                            )}
                          >
                            <span className="text-xs leading-none">{r.emoji}</span>
                            <span
                              className={cn(
                                "text-[11px] font-bold tabular-nums",
                                isSelected ? "text-white" : "text-zinc-500"
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Meta Bar: Timestamp & +10 Aura Badge */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                      <time
                        dateTime={k.createdAt ? new Date(k.createdAt).toISOString() : undefined}
                        className="text-[11px] font-medium text-zinc-500"
                      >
                        {new Date(k.createdAt || Date.now()).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/90 px-2 py-0.5 text-[11px] font-bold text-orange-800 shadow-2xs">
                        <Sparkles className="h-3 w-3 text-orange-600" />
                        +10 Aura
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Database-backed Store Page with Admin Redemptions Queue
function StoreProductImage({ url, name, gradientClass, category }: { url: string | null; name: string; gradientClass: string, category: string }) {
  const [error, setError] = useState(false);
  
  if (!url || error) {
    return (
      <div className={cn("relative h-44 overflow-hidden grid place-items-center bg-gradient-to-br", gradientClass)}>
        <Package className="h-16 w-16 text-white" />
        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 shadow-sm">
          {category}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-44 overflow-hidden bg-zinc-50">
      <img 
        src={url} 
        alt={name} 
        className="h-full w-full object-contain p-3" 
        onError={() => setError(true)}
      />
      <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 shadow-sm">
        {category}
      </span>
    </div>
  );
}

function StorePage({
  admin,
  notify,
  storeItems,
  onRedeemItem,
  openAddProduct,
  redemptions,
  availableAura,
  isBalanceLoading,
  balanceError,
  onRefreshBalance,
}: {
  admin: boolean;
  notify: (s: string) => void;
  storeItems: any[];
  onRedeemItem: (item: any) => void;
  openAddProduct: () => void;
  redemptions?: any[];
  availableAura?: number;
  isBalanceLoading?: boolean;
  balanceError?: string | null;
  onRefreshBalance?: () => void;
}) {
  const [storeTab, setStoreTab] = useState<"catalog" | "redemptions">("catalog");
  const items = storeItems && storeItems.length > 0 ? storeItems : [];
  const redemptionList = redemptions && redemptions.length > 0 ? redemptions : [];
  const pendingCount = redemptionList.filter((r) => r.status === "PENDING").length;

  async function handleFulfill(redemptionId: string) {
    notify("Fulfilling reward redemption...");
    const fd = new FormData();
    fd.append("redemptionId", redemptionId);
    const res = await fulfillRedemptionAction(fd);
    if (res.success) {
      notify("Reward marked as fulfilled!");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      notify((res as any).error || "Failed to fulfill");
    }
  }

  return (
    <>
      <Head
        title={admin ? "Aura Store management" : "Rewards worth working toward"}
        copy={
          admin
            ? "Manage live database inventory, stock, pricing, and member redemptions."
            : "Use your available Aura on thoughtful team rewards."
        }
        action={
          admin ? (
            <Button onClick={openAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStoreTab("catalog")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold transition",
            storeTab === "catalog"
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200"
          )}
        >
          {admin ? `Catalog Inventory (${items.length})` : "Browse Rewards"}
        </button>
        <button
          onClick={() => setStoreTab("redemptions")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold transition flex items-center gap-2",
            storeTab === "redemptions"
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200"
          )}
        >
          {admin ? "Redemption Requests" : `My Redemptions (${redemptionList.length})`}
          {admin && pendingCount > 0 && (
            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs text-white">
              {pendingCount}
            </span>
          )}
        </button>
        </div>

        {/* Available Aura Balance Display */}
        <div
          data-testid="store-available-aura-balance"
          className="flex items-center gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 px-3.5 py-2 text-xs shadow-sm self-start sm:self-auto"
        >
          <span className="font-bold text-zinc-700">Available Balance to Spend</span>
          <span className="text-zinc-300">|</span>
          {isBalanceLoading ? (
            <span className="flex items-center gap-1.5 text-amber-800 font-medium">
              <span className="h-2 w-2 animate-ping rounded-full bg-orange-400" />
              <span>Loading...</span>
            </span>
          ) : balanceError ? (
            <span className="text-rose-600 font-semibold" title={balanceError}>
              Unavailable
            </span>
          ) : (
            <span className="flex items-center gap-1 font-extrabold text-orange-950">
              <span className="text-orange-600">⚡</span>
              <span>{(availableAura ?? 0).toLocaleString()}</span>
              <span className="font-bold text-orange-800">Aura to Spend</span>
            </span>
          )}
          {onRefreshBalance && (
            <button
              onClick={onRefreshBalance}
              disabled={isBalanceLoading}
              title="Refresh available balance"
              aria-label="Refresh available balance"
              className="ml-1 text-zinc-400 hover:text-zinc-600 transition disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", isBalanceLoading && "animate-spin")} />
            </button>
          )}
        </div>
      </div>

      {storeTab === "catalog" ? (
        items.length === 0 ? (
          <Card className="p-8 text-center text-zinc-500">
            No store products available at this time.
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item: any, idx: number) => {
              const grad = STORE_GRADIENTS[idx % STORE_GRADIENTS.length];
              return (
                <Card className="overflow-hidden" key={item.id}>
                  {/* Product Image */}
                  <StoreProductImage url={item.imageUrl} name={item.name} gradientClass={grad} category={item.category || "General"} />
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <b className="block text-sm font-semibold text-zinc-900 leading-snug">{item.name}</b>
                      <b className="text-orange-600 text-sm font-bold whitespace-nowrap shrink-0">
                        {item.basePrice.toLocaleString()} ⚡
                      </b>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed line-clamp-2">
                      {item.description || "A thoughtful Aura reward for focused team momentum."}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 border-t pt-3">
                      <span>
                        {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
                      </span>
                      {admin ? (
                        <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                          Active
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={item.stock <= 0}
                          onClick={() => onRedeemItem(item)}
                        >
                          {item.stock > 0 ? "Redeem" : "Sold Out"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="overflow-auto">
          {admin ? (
            <div className="hidden min-w-[720px] grid-cols-[1.2fr_1.5fr_1fr_.9fr_1fr_.8fr] gap-4 border-b bg-orange-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid">
              <span>Member</span>
              <span>Reward</span>
              <span>Requested</span>
              <span>Cost</span>
              <span>Status</span>
              <span>Action</span>
            </div>
          ) : (
            <div className="hidden min-w-[720px] grid-cols-[1.8fr_1fr_.9fr_1.2fr_1.5fr] gap-4 border-b bg-orange-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid">
              <span>Reward</span>
              <span>Requested</span>
              <span>Cost</span>
              <span>Status</span>
              <span>Fulfillment Status</span>
            </div>
          )}

          {redemptionList.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              {admin ? "No redemption requests yet." : "You have not redeemed any rewards yet."}
            </div>
          ) : (
            redemptionList.map((r: any) =>
              admin ? (
                <div
                  className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.2fr_1.5fr_1fr_.9fr_1fr_.8fr] md:items-center md:px-5"
                  key={r.id}
                >
                  <span className="flex items-center gap-2">
                    <Avatar name={r.user?.name || "?"} />
                    <b className="text-sm">{r.user?.name || "Unknown"}</b>
                  </span>
                  <span>
                    <b className="block text-sm">{r.storeItem?.name || "Product"}</b>
                    <small className="text-zinc-500 block">{r.storeItem?.category || "Reward"}</small>
                  </span>
                  <small>{new Date(r.redeemedAt || Date.now()).toLocaleDateString()}</small>
                  <b className="text-orange-600">{r.auraCost.toLocaleString()} Aura</b>
                  <div>
                    <Pill>{r.status}</Pill>
                  </div>
                  <div>
                    {r.status === "PENDING" ? (
                      <Button size="sm" onClick={() => handleFulfill(r.id)}>
                        Fulfill
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold">Fulfilled</span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.8fr_1fr_.9fr_1.2fr_1.5fr] md:items-center md:px-5"
                  key={r.id}
                >
                  <span>
                    <b className="block text-sm">{r.storeItem?.name || "Product"}</b>
                    <small className="text-zinc-500 block">{r.storeItem?.category || "Reward"}</small>
                  </span>
                  <small>{new Date(r.redeemedAt || Date.now()).toLocaleDateString()}</small>
                  <b className="text-orange-600">{r.auraCost.toLocaleString()} Aura</b>
                  <div>
                    {r.status === "PENDING" ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Awaiting Fulfillment ⏳
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Accepted & Delivered 🎉
                      </span>
                    )}
                  </div>
                  <small className="text-zinc-500">
                    {r.status === "FULFILLED"
                      ? r.fulfilledAt
                        ? `Delivered on ${new Date(r.fulfilledAt).toLocaleDateString()}`
                        : "Ready for use / pickup"
                      : "Pending collection"}
                  </small>
                </div>
              )
            )
          )}
        </Card>
      )}
    </>
  );
}

function Reviews({
  notify,
  initialTasks,
}: {
  notify: (s: string) => void;
  initialTasks?: any[];
}) {
  async function handleApprove(submissionId: string) {
    notify("Approving...");
    const fd = new FormData();
    fd.append("submissionId", submissionId);
    fd.append("status", "APPROVED");
    const res = await reviewTaskAction(fd);
    if (res.success) {
      notify("Task approved and Aura awarded!");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      notify((res as any).error || "Failed to approve");
    }
  }

  const pendingAssignments = (initialTasks || []).flatMap((t: any) =>
    (t.assignments || [])
      .filter((a: any) => a.status === "SUBMITTED" && a.submissions?.length > 0)
      .map((a: any) => ({ ...a, taskTitle: t.title, taskAura: t.baseAura }))
  );

  return (
    <>
      <Head
        title="Review portal"
        copy="A focused queue for reviewing the team's submitted work."
      />
      <Card className="overflow-auto">
        <div className="hidden min-w-[720px] grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] gap-4 border-b bg-orange-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid">
          <span>Member</span>
          <span>Task</span>
          <span>Submitted</span>
          <span>Aura</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {pendingAssignments.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No submissions awaiting review.</div>
        ) : (
          pendingAssignments.map((a: any) => (
            <div
              className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] md:items-center md:px-5"
              key={a.id}
            >
              <span className="flex items-center gap-2">
                <Avatar name={a.user?.name || "?"} />
                <b className="text-sm">{a.user?.name || "Unknown"}</b>
              </span>
              <span>
                <b className="block text-sm">{a.taskTitle}</b>
                <small className="text-zinc-500">Submitted for review</small>
              </span>
              <small>
                {new Date(a.submissions[0].submittedAt || Date.now()).toLocaleDateString()}
              </small>
              <b className="text-orange-600">{a.taskAura} Aura</b>
              <Pill>Pending Review</Pill>
              <Button size="sm" onClick={() => handleApprove(a.submissions[0].id)}>
                Approve
              </Button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function Members({
  notify,
  openAddUser,
}: {
  notify: (s: string) => void;
  openAddUser: () => void;
}) {
  return (
    <>
      <Head
        title="Members"
        copy="25 people building momentum together."
        action={
          <Button onClick={openAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
        }
      />
      <div className="grid gap-3 md:hidden">
        {members.slice(0, 8).map((m, i) => (
          <Card className="p-4" key={m}>
            <div className="flex gap-3">
              <Avatar name={m} />
              <span className="flex-1">
                <b>{m}</b>
                <small className="block text-zinc-500">
                  {i === 0 ? "Superadmin" : i < 3 ? "Admin" : "Member"} · Active
                </small>
              </span>
              <Pill>{980 - i * 50} Aura</Pill>
            </div>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              {[
                "Member",
                "Role",
                "Status",
                "Last login",
                "Last task",
                "Lifetime Aura",
                "Monthly Aura",
                "Available",
              ].map((x) => (
                <th className="p-4" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.slice(0, 10).map((m, i) => (
              <tr className="border-t" key={m}>
                <td className="p-4">
                  <span className="flex items-center gap-3">
                    <Avatar name={m} />
                    <b>{m}</b>
                  </span>
                </td>
                <td className="p-4">{i === 0 ? "Superadmin" : i < 3 ? "Admin" : "Member"}</td>
                <td className="p-4">
                  <Pill>Active</Pill>
                </td>
                <td className="p-4">Today</td>
                <td className="p-4">Sep {13 - i}</td>
                <td className="p-4">{980 - i * 50}</td>
                <td className="p-4 text-orange-600">{420 - i * 16}</td>
                <td className="p-4">{760 - i * 42}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function AddUserModal({
  close,
  notify,
  onSuccess,
  teams,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
  teams: any[];
}) {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createUserAction(fd);
    if (res.success) {
      notify("User added successfully!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to add user");
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-xl font-bold">Add Member</h3>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <input required name="name" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input required type="email" name="email" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Employee ID</label>
            <input required name="employeeId" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Role</label>
            <select name="roleName" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm">
              <option value="USER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Team</label>
            <select name="teamId" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" defaultValue="">
              <option value="" disabled>Select a team</option>
              {teams?.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AwardAuraModal({
  close,
  notify,
  onSuccess,
  users,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
  users: any[];
}) {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await awardAuraAction(fd);
    if (res.success) {
      notify("Aura awarded successfully!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to award Aura");
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-xl font-bold">Award Aura</h3>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Recipient</label>
            <select name="userId" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm">
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <input required type="number" min="1" name="amount" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <input required name="description" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" placeholder="e.g. Being a great teammate" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Awarding..." : "Award Aura"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function CreateTaskModal({
  close,
  notify,
  onSuccess,
  users,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
  users: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseAura, setBaseAura] = useState<number | string>(100);
  const [subtasks, setSubtasks] = useState<string[]>([]);

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 3) {
      notify("Please describe the objective (e.g. 'Build user settings page')");
      return;
    }
    setAiGenerating(true);
    notify("AI is drafting task breakdown...");
    const res = await breakdownTaskAction(aiPrompt);
    setAiGenerating(false);

    if (res.success && res.data) {
      const draft = res.data;
      setTitle(draft.title);
      let fullDesc = draft.description;
      if (draft.subtasks && draft.subtasks.length > 0) {
        fullDesc += "\n\nKey Deliverables:\n" + draft.subtasks.map((s: string) => `• ${s}`).join("\n");
        setSubtasks(draft.subtasks);
      }
      setDescription(fullDesc);
      setBaseAura(draft.suggestedAura);
      notify("AI draft applied! Review and adjust values before saving.");
    } else {
      notify((res as any).error || "Failed to generate AI breakdown");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createTaskAction(fd);
    if (res.success) {
      notify("Task created!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to create task");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4">
      <Card className="w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">Create Task</h3>
            <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Assisted
            </span>
          </div>
          <button onClick={close}>
            <X className="h-5 w-5 text-zinc-400 hover:text-zinc-600" />
          </button>
        </div>

        {/* AI Task Breakdown Assistant Prompt */}
        <div className="mb-5 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/70 to-amber-50/50 p-4">
          <label className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Bot className="h-4 w-4 text-orange-600" />
            AI Breakdown Assistant
          </label>
          <p className="text-xs text-orange-800/80 mb-2.5">
            Enter a raw goal or user story, and AI will structure the title, deliverables, and recommended Aura reward.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Design responsive dark mode theme for store..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAiGenerate();
                }
              }}
              className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <Button
              type="button"
              size="sm"
              disabled={aiGenerating}
              onClick={handleAiGenerate}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
            >
              {aiGenerating ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Auto-Draft
                </>
              )}
            </Button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              required
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description & Deliverables</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria..."
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm outline-none focus:border-orange-500 font-mono text-xs leading-relaxed"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Aura Reward</label>
              <input
                required
                type="number"
                min="1"
                name="baseAura"
                value={baseAura}
                onChange={(e) => setBaseAura(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Ledger reward
              </span>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Deadline (Optional)</label>
              <input
                type="datetime-local"
                name="deadline"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assign To (Optional)</label>
              <select name="assigneeId" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm outline-none focus:border-orange-500">
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Admin Add Product Modal
function AddProductModal({
  close,
  notify,
  onSuccess,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createStoreItemAction(fd);
    if (res.success) {
      notify("Product created successfully!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to create product");
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-xl font-bold">Add Store Product</h3>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Product Name</label>
            <input required name="name" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" placeholder="e.g. Ergonomic Keyboard" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea name="description" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" rows={2} placeholder="Short product details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Aura Price</label>
              <input required type="number" min="1" name="basePrice" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" placeholder="3000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Initial Stock</label>
              <input required type="number" min="1" defaultValue="10" name="stock" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select name="category" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm">
                <option value="Hardware">Hardware</option>
                <option value="Merch">Merch</option>
                <option value="Perks">Perks</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Per User</label>
              <input type="number" min="1" defaultValue="1" name="maxPerUser" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Image URL (Optional)</label>
            <input type="url" name="imageUrl" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" placeholder="https://example.com/image.jpg" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Add Product"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const KUDOS_REACTION_OPTIONS = [
  { id: "fire", emoji: "🔥", label: "Crushing It", desc: "Unstoppable momentum & energy" },
  { id: "rocket", emoji: "🚀", label: "Game Changer", desc: "Shipped big-impact results" },
  { id: "brain", emoji: "💡", label: "Big Brain", desc: "Brilliant solution & insight" },
  { id: "mvp", emoji: "🙌", label: "Team MVP", desc: "Incredible teamwork & support" },
  { id: "gem", emoji: "💎", label: "Pure Quality", desc: "Flawless craft & attention to detail" },
  { id: "lightning", emoji: "⚡", label: "Lightning Speed", desc: "Fast velocity & quick turnaround" },
  { id: "target", emoji: "🎯", label: "Bullseye", desc: "Hit the team objective dead-on" },
  { id: "star", emoji: "🌟", label: "Superstar", desc: "Radiant positive vibes & leadership" },
  { id: "heart", emoji: "❤️", label: "Heart & Soul", desc: "Uplifting and kind teammate" },
  { id: "clap", emoji: "👏", label: "Standing Ovation", desc: "Major milestone celebration" },
];

// Send Kudos Reaction Modal (Reactions only, no text message)
function SendKudosModal({
  close,
  notify,
  onSuccess,
  users,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
  users: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(KUDOS_REACTION_OPTIONS[0]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    // Explicitly set the chosen reaction as message for backend compatibility
    fd.set("message", `${selectedReaction.emoji} ${selectedReaction.label}`);
    const res = await sendKudosAction(fd);
    if (res.success) {
      notify(`Kudos reaction sent! +10 Aura awarded to teammate.`);
      onSuccess();
    } else {
      notify((res as any).error || "Failed to send Kudos reaction");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/40 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between mb-4 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">React with Kudos</h3>
              <p className="text-xs text-zinc-500">Pick a teammate and select a reaction option</p>
            </div>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5 block">
              Recipient Teammate
            </label>
            <select
              name="receiverId"
              required
              className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">-- Choose a teammate --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Select Reaction Option
              </label>
              <span className="text-[11px] font-semibold text-orange-600">Tap to choose</span>
            </div>
            {/* Grid of Reaction Options */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {KUDOS_REACTION_OPTIONS.map((r) => {
                const isSelected = selectedReaction.id === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReaction(r)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition",
                      isSelected
                        ? "border-orange-500 bg-orange-50/90 ring-2 ring-orange-400/50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                    )}
                  >
                    <span className="text-2xl shrink-0">{r.emoji}</span>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-zinc-900 truncate">{r.label}</div>
                      <div className="text-[10px] text-zinc-500 leading-tight line-clamp-1">{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Reaction Spotlight Banner */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">{selectedReaction.emoji}</span>
              <div>
                <p className="text-xs font-bold text-zinc-900">
                  Reaction: <span className="text-orange-700">{selectedReaction.label}</span>
                </p>
                <p className="text-[11px] text-zinc-500">{selectedReaction.desc}</p>
              </div>
            </div>
            <span className="rounded-full bg-orange-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
              +10 Aura
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
              {loading ? "Reacting..." : `Send Reaction (+10 Aura)`}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Create Tag Team Modal
function CreateTeamModal({
  close,
  notify,
  onSuccess,
}: {
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createTeamAction(fd);
    if (res.success) {
      notify("Team created successfully!");
      onSuccess();
    } else {
      notify((res as any).error || "Failed to create team");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Create Tag Team
          </h3>
          <button onClick={close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Team Name</label>
            <input
              required
              name="name"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm"
              placeholder="e.g. Velocity Vanguards"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              name="description"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm"
              rows={2}
              placeholder="What is this team focusing on this sprint?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Database-backed Tag Teams Page with AI Team Insights
function TagTeams({
  teams,
  openCreateTeam,
}: {
  teams?: any[];
  openCreateTeam: () => void;
}) {
  const items = teams && teams.length > 0 ? teams : [];
  const sortedTeams = [...items].sort((a, b) => (b.combinedAura || 0) - (a.combinedAura || 0));

  const [aiInsight, setAiInsight] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    async function loadInsights() {
      setLoadingAi(true);
      const res = await getTeamInsightsAction();
      if (res.success && res.data) {
        setAiInsight(res.data);
      }
      setLoadingAi(false);
    }
    loadInsights();
  }, [teams]);

  return (
    <>
      <Head
        title="Tag Teams"
        copy="A friendly weekly boost of shared momentum and team collaboration."
        action={
          <Button onClick={openCreateTeam}>
            <Plus className="mr-2 h-4 w-4" />
            Create team
          </Button>
        }
      />

      {/* AI Team Momentum Insights Banner */}
      <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-800">
            <Sparkles className="h-4 w-4 text-orange-600" />
            AI Team Momentum Insights
          </div>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
            {aiInsight?.mood || "STEADY"}
          </span>
        </div>

        {loadingAi ? (
          <div className="mt-3 text-xs text-zinc-500 animate-pulse">
            Analyzing squad velocities and wall activity...
          </div>
        ) : aiInsight ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <h4 className="text-sm font-bold text-zinc-900">{aiInsight.headline}</h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">{aiInsight.summary}</p>
            </div>
            <div className="rounded-xl border border-orange-200/60 bg-white/70 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Recommendation</div>
              <p className="mt-1 text-xs text-zinc-700">{aiInsight.recommendation}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-zinc-500">
            Keep collaborating to unlock deeper AI squad analytics!
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Active Teams */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Active Tag Teams</h3>
          {items.length === 0 ? (
            <Card className="p-8 text-center text-zinc-500">No teams created yet.</Card>
          ) : (
            items.map((team: any) => (
              <Card className="p-5 overflow-hidden" key={team.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      <b className="text-lg">{team.name}</b>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {team.description || "Active collaboration squad."}
                    </p>
                  </div>
                  <b className="text-orange-600 text-lg">{team.combinedAura || 0} Aura</b>
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {team.memberCount || team.members?.length || 1} members · Created by{" "}
                    {team.createdBy?.name || "Admin"}
                  </span>
                  <Pill>Active Squad</Pill>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dynamic Leaderboard */}
        <Card className="p-5 h-fit">
          <b>Weekly team leaderboard</b>
          <p className="text-xs text-zinc-400 mt-1 mb-4">Ranked by combined team member Aura points</p>
          {sortedTeams.length === 0 ? (
            <div className="py-6 text-center text-zinc-500 text-sm">No teams to rank yet.</div>
          ) : (
            sortedTeams.map((team: any, i: number) => (
              <div
                className="mt-3 flex items-center gap-3 rounded-xl bg-zinc-50 p-3 transition hover:bg-orange-50/50"
                key={team.id}
              >
                <b className="w-5 text-zinc-400 text-center">{i + 1}</b>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-100 text-orange-700 font-bold text-xs">
                  {team.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1">
                  <b className="text-sm block">{team.name}</b>
                  <small className="text-zinc-500">
                    {team.memberCount || team.members?.length || 1} members
                  </small>
                </span>
                <b className="text-orange-600">{team.combinedAura || 0} Aura</b>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}

function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [dashMetrics, memberStats] = await Promise.all([
          getDashboardMetricsAction(),
          getMemberAnalyticsAction()
        ]);
        setMetrics(dashMetrics);
        setMembers(memberStats);
      } catch (err) {
        console.error("Failed to load analytics", err);
      }
    }
    load();
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-zinc-500">Loading analytics...</div>;
  }

  return (
    <>
      <Head
        title="Analytics"
        copy="A clear view of participation and team momentum."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active members" value={metrics.activeMembers} icon={Users} />
        <Metric label="Completion rate" value={metrics.completionRate} icon={CheckCircle2} />
        <Metric label="Average Aura" value={metrics.averageAura.toString()} icon={Sparkles} />
        <Metric label="Most active" value={metrics.mostActiveUser} icon={Trophy} />
      </div>
      <Card className="mt-6 p-5">
        <b>Aura earned this month</b>
        <div className="mt-8 flex h-48 items-end gap-2">
          {metrics.monthlyChartData.map((h: number, i: number) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-orange-600 to-amber-400"
            />
          ))}
        </div>
      </Card>
      <h3 className="mt-10 mb-4 text-xl font-bold text-zinc-900">Member Insights</h3>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="p-4 font-medium text-zinc-500">Member / Last Login</th>
              <th className="p-4 font-medium text-zinc-500">Tasks Completed</th>
              <th className="p-4 font-medium text-zinc-500">Last Task</th>
              <th className="p-4 font-medium text-zinc-500">Current Month Aura</th>
              <th className="p-4 font-medium text-zinc-500">Available Aura</th>
              <th className="p-4 font-medium text-zinc-500">Aura Spent</th>
              <th className="p-4 font-medium text-zinc-500">Lifetime Aura</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map(m => (
              <tr key={m.id} className="hover:bg-zinc-50">
                <td className="p-4">
                  <div className="font-medium text-zinc-900">{m.name}</div>
                  <div className="text-xs text-zinc-500">
                    {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="p-4">{m.tasksCompleted}</td>
                <td className="p-4">
                  <div className="text-zinc-900 truncate max-w-[150px]">{m.lastTaskTitle}</div>
                  {m.lastTaskDate && <div className="text-xs text-zinc-500">{new Date(m.lastTaskDate).toLocaleDateString()}</div>}
                </td>
                <td className="p-4 text-orange-600 font-medium">{m.currentMonthAura}</td>
                <td className="p-4 font-medium">{m.availableAura}</td>
                <td className="p-4 text-zinc-500">{m.auraSpent}</td>
                <td className="p-4 font-medium">{m.lifetimeAura}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAuditLogsAction();
        setLogs(data);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading audit logs...</div>;
  }

  return (
    <>
      <Head title="Audit log" copy="Important administrative activity, shown for review." />
      <Card>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No audit logs found.</div>
        ) : (
          logs.map((log) => (
            <div className="flex items-center gap-3 border-b p-5 last:border-0" key={log.id}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100">
                <ReceiptText className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <b className="block text-sm">{log.action}</b>
                <small className="text-zinc-500">
                  {log.entityType} ({log.entityId}) {log.actor ? `· Actor: ${log.actor.name}` : ''}
                </small>
              </span>
              <small className="text-zinc-400">{new Date(log.createdAt).toLocaleString()}</small>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function EmailDeliveriesDashboard({
  initialSummary = null,
  initialData = null,
  notify,
}: {
  initialSummary?: any;
  initialData?: any;
  notify?: (s: string) => void;
}) {
  const [summary, setSummary] = useState<any | null>(initialSummary);
  const [deliveries, setDeliveries] = useState<any[]>(initialData?.deliveries || []);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(initialData?.page || 1);
  const [pageSize, setPageSize] = useState(initialData?.pageSize || 20);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);

  useEffect(() => {
    if (initialSummary) setSummary(initialSummary);
    if (initialData?.deliveries) {
      setDeliveries(initialData.deliveries);
      setTotal(initialData.total);
      setPage(initialData.page);
      setTotalPages(initialData.totalPages);
    }
  }, [initialSummary, initialData]);

  async function loadData(pageNumber = page, currentStatus = statusFilter, currentType = typeFilter, currentSearch = search) {
    try {
      setRefreshing(true);
      const [sumRes, delRes] = await Promise.all([
        getDeliverySummaryAction(),
        getDeliveriesAction({
          page: pageNumber,
          pageSize,
          status: currentStatus,
          type: currentType,
          search: currentSearch,
        }),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (delRes.success && delRes.data) {
        setDeliveries(delRes.data.deliveries);
        setTotal(delRes.data.total);
        setPage(delRes.data.page);
        setTotalPages(delRes.data.totalPages);
      }
    } catch (err: any) {
      console.error("Failed to load delivery observability data:", err);
      if (notify) notify("Failed to load delivery data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData(1, statusFilter, typeFilter, search);
  }, [statusFilter, typeFilter, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1, statusFilter, typeFilter, search);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <Check className="h-3 w-3" /> Sent
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock3 className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const formatEventType = (type: string) => {
    const map: Record<string, string> = {
      TASK_ASSIGNED: "Task Assigned",
      TASK_APPROVED: "Task Approved",
      TASK_NEEDS_CHANGES: "Task Needs Changes",
      STORE_FULFILLMENT: "Store Fulfillment",
      REDEMPTION_REQUESTED: "Redemption Request",
      KUDOS_RECEIVED: "Kudos Received",
      STREAK_REMINDER: "Streak Reminder",
      ADMIN_REVIEW_DIGEST: "Review Digest",
    };
    return map[type] || type;
  };

  if (loading && !summary) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-600 mb-2" />
        Loading delivery observability dashboard...
      </div>
    );
  }

  return (
    <>
      <Head
        title="Email & Notification Deliveries"
        copy="Real-time delivery status, queue health, failure diagnostics, and audit trail."
      />

      {/* Summary Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500">
            <small className="text-xs font-semibold uppercase tracking-wider">Total Deliveries</small>
            <Mail className="h-4 w-4 text-zinc-400" />
          </div>
          <b className="mt-2 block text-2xl font-bold text-zinc-900">{summary?.total ?? 0}</b>
          <span className="text-[11px] text-zinc-400">Lifetime queue records</span>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <small className="text-xs font-semibold uppercase tracking-wider">Sent</small>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <b className="mt-2 block text-2xl font-bold text-emerald-950">{summary?.sent ?? 0}</b>
          <span className="text-[11px] text-emerald-700">Successfully dispatched</span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <small className="text-xs font-semibold uppercase tracking-wider">Pending</small>
            <Clock3 className="h-4 w-4 text-amber-600" />
          </div>
          <b className="mt-2 block text-2xl font-bold text-amber-950">{summary?.pending ?? 0}</b>
          <span className="text-[11px] text-amber-700">Awaiting worker claim</span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700">
            <small className="text-xs font-semibold uppercase tracking-wider">In-Flight</small>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </div>
          <b className="mt-2 block text-2xl font-bold text-blue-950">{summary?.processing ?? 0}</b>
          <span className="text-[11px] text-blue-700">Currently processing</span>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700">
            <small className="text-xs font-semibold uppercase tracking-wider">Failed</small>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <b className="mt-2 block text-2xl font-bold text-rose-950">{summary?.failed ?? 0}</b>
          <span className="text-[11px] text-rose-700">Permanent delivery failures</span>
        </div>
      </div>

      {/* Queue & Worker Health Notice */}
      <div className="mb-6 rounded-xl border border-orange-200/70 bg-gradient-to-r from-orange-50/50 via-zinc-50 to-white p-3.5 shadow-sm text-xs text-zinc-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                summary?.queue?.redisStatus === "CONNECTED"
                  ? "bg-emerald-500 animate-pulse"
                  : summary?.queue?.redisStatus === "DISABLED"
                  ? "bg-zinc-400"
                  : "bg-amber-500"
              )}
            />
            <b className="text-zinc-900">Queue Engine:</b>
            <span className="font-semibold text-zinc-700">
              {summary?.queue?.redisStatus === "CONNECTED"
                ? "BullMQ / Redis (Live)"
                : summary?.queue?.redisStatus === "DISABLED"
                ? "Database Polling (Queue Disabled)"
                : "Database Polling (Redis Disconnected)"}
            </span>
            {summary?.queue?.counts && (
              <span className="flex items-center gap-1.5 ml-2 font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                <span>Waiting: <b>{summary.queue.counts.waiting}</b></span>
                <span>·</span>
                <span>Active: <b>{summary.queue.counts.active}</b></span>
                <span>·</span>
                <span>Delayed: <b>{summary.queue.counts.delayed}</b></span>
              </span>
            )}
            {summary?.activity?.staleProcessingCount > 0 && (
              <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 font-semibold text-[10px]">
                {summary.activity.staleProcessingCount} stale deliveries detected
              </span>
            )}
          </div>
          <span className="text-zinc-400 text-[11px]">
            {summary?.activity?.workerTelemetryNote}
          </span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "SENT", "FAILED", "PENDING", "PROCESSING"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  statusFilter === st
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                {summary && st !== "ALL" && (
                  <span className="ml-1.5 opacity-75 font-normal">
                    ({(summary as any)[st.toLowerCase()] ?? 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Type Select */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="TASK_ASSIGNED">Task Assigned</option>
              <option value="TASK_APPROVED">Task Approved</option>
              <option value="TASK_NEEDS_CHANGES">Task Needs Changes</option>
              <option value="STORE_FULFILLMENT">Store Fulfillment</option>
              <option value="REDEMPTION_REQUESTED">Redemption Request</option>
              <option value="KUDOS_RECEIVED">Kudos Received</option>
              <option value="STREAK_REMINDER">Streak Reminder</option>
              <option value="ADMIN_REVIEW_DIGEST">Review Digest</option>
            </select>

            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search recipient / title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 sm:w-56 text-xs border border-zinc-200 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-2" />
            </form>

            <Button
              size="sm"
              variant="outline"
              disabled={refreshing}
              onClick={() => loadData(page, statusFilter, typeFilter, search)}
              className="h-8 px-2.5 text-xs flex items-center gap-1"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Deliveries Table Card */}
      <Card className="overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            <Mail className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
            No delivery records found matching the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Event</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Attempts</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-zinc-500">
                      {new Date(delivery.createdAt).toLocaleDateString()}{" "}
                      <span className="text-[11px] text-zinc-400">
                        {new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-zinc-900 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[11px]">
                        {formatEventType(delivery.notification?.type)}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <b className="block text-zinc-900 text-xs">
                        {delivery.notification?.user?.name || "User"}
                      </b>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {delivery.notification?.user?.email}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {delivery.channel}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono text-xs">
                      {delivery.attempts}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDelivery(delivery)}
                        className="h-7 px-2 text-xs flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-zinc-50/60 border-t border-zinc-100 gap-3 text-xs text-zinc-500">
          <div>
            Showing{" "}
            <b className="text-zinc-900">
              {total > 0 ? (page - 1) * pageSize + 1 : 0}
            </b>{" "}
            to{" "}
            <b className="text-zinc-900">{Math.min(page * pageSize, total)}</b> of{" "}
            <b className="text-zinc-900">{total}</b> deliveries
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-700 focus:outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || refreshing}
              onClick={() => loadData(page - 1, statusFilter, typeFilter, search)}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-semibold px-2">
              {page} / {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || refreshing}
              onClick={() => loadData(page + 1, statusFilter, typeFilter, search)}
              className="h-7 px-2 text-xs"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Delivery Detail Modal */}
      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          close={() => setSelectedDelivery(null)}
          formatEventType={formatEventType}
          getStatusBadge={getStatusBadge}
          notify={notify}
          onRefresh={() => loadData()}
        />
      )}
    </>
  );
}

function DeliveryDetailModal({
  delivery,
  close,
  formatEventType,
  getStatusBadge,
  notify,
  onRefresh,
}: {
  delivery: any;
  close: () => void;
  formatEventType: (t: string) => string;
  getStatusBadge: (s: string) => React.ReactNode;
  notify?: (s: string) => void;
  onRefresh?: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await retryDeliveryAction(delivery.id);
      if (res.success) {
        notify?.("Delivery queued for retry");
        close();
        onRefresh?.();
      } else {
        notify?.((res as any).error || "Failed to retry delivery");
      }
    } catch (err: any) {
      notify?.(err.message || "Failed to retry delivery");
    } finally {
      setRetrying(false);
    }
  }

  const canRetry = delivery.status === "FAILED" || delivery.status === "PROCESSING";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-600" />
            <h3 className="text-base font-bold text-zinc-900">Delivery Record Details</h3>
            <span className="font-mono text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
              {delivery.id}
            </span>
          </div>
          <button
            onClick={close}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Status & Event Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Status</span>
              <div className="mt-1">{getStatusBadge(delivery.status)}</div>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Event</span>
              <b className="mt-1 block text-zinc-900 text-xs">
                {formatEventType(delivery.notification?.type)}
              </b>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Channel</span>
              <span className="mt-1 inline-block font-mono font-bold text-zinc-700">
                {delivery.channel}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Attempts</span>
              <span className="mt-1 inline-block font-mono font-bold text-zinc-900">
                {delivery.attempts}
              </span>
            </div>
          </div>

          {/* Recipient Card */}
          <div className="p-3.5 rounded-xl border border-zinc-100 bg-white">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Recipient
            </span>
            <div className="flex items-center justify-between">
              <div>
                <b className="text-sm text-zinc-900 block">{delivery.notification?.user?.name || "Recipient"}</b>
                <span className="font-mono text-xs text-zinc-600">{delivery.notification?.user?.email}</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">User ID: {delivery.notification?.user?.id}</span>
            </div>
          </div>

          {/* Notification Content */}
          <div className="p-3.5 rounded-xl border border-zinc-100 bg-white">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Notification Payload
            </span>
            <b className="text-sm text-zinc-900 block">{delivery.notification?.title}</b>
            <p className="mt-1 text-zinc-600 leading-relaxed text-xs">{delivery.notification?.message}</p>
          </div>

          {/* Failure Reason Banner if failed */}
          {delivery.errorDetails && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800 mb-1">
                <AlertCircle className="h-4 w-4" />
                Sanitized Failure Reason
              </div>
              <p className="font-mono text-xs text-rose-700 whitespace-pre-wrap break-all bg-white/70 p-2.5 rounded border border-rose-100">
                {delivery.errorDetails}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-[11px]">
            <div>
              <span className="text-zinc-400 block font-semibold">Created At:</span>
              <span className="text-zinc-800 font-mono">{new Date(delivery.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-zinc-400 block font-semibold">Updated At:</span>
              <span className="text-zinc-800 font-mono">{new Date(delivery.updatedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-zinc-400 block font-semibold">Sent At:</span>
              <span className="text-zinc-800 font-mono">
                {delivery.sentAt ? new Date(delivery.sentAt).toLocaleString() : "Not sent"}
              </span>
            </div>
          </div>

          {/* Metadata */}
          {delivery.notification?.metadata && Object.keys(delivery.notification.metadata).length > 0 && (
            <div className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Notification Metadata (Sanitized)
              </span>
              <pre className="font-mono text-[11px] text-zinc-700 bg-white p-2.5 rounded border border-zinc-200 overflow-x-auto">
                {JSON.stringify(delivery.notification.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end items-center gap-2 border-t border-zinc-100 pt-3">
          {canRetry && (
            <Button
              size="sm"
              variant="default"
              disabled={retrying}
              onClick={handleRetry}
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              <RotateCcw className={cn("mr-1.5 h-3.5 w-3.5", retrying && "animate-spin")} />
              {retrying ? "Requeueing..." : "Retry Delivery"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={close} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function History({ history }: { history: any[] }) {
  return (
    <>
      <Head
        title="Transaction history"
        copy="A transparent dynamic record of earning and spending activity."
      />
      <Card>
        {!history || history.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No transactions yet. Complete tasks to earn Aura!
          </div>
        ) : (
          history.map((t) => (
            <div className="flex items-center gap-3 border-b p-5 last:border-0" key={t.id}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                {t.amount > 0 ? <Sparkles className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
              </span>
              <span className="flex-1">
                <b className="block text-sm">
                  {t.type} {t.user?.name ? `(${t.user.name})` : ""}
                </b>
                <small className="text-zinc-500">
                  {t.description || "System"} · {new Date(t.createdAt).toLocaleDateString()}
                </small>
              </span>
              <b className={t.amount > 0 ? "text-emerald-600" : "text-zinc-700"}>
                {t.amount > 0 ? "+" : ""}
                {t.amount} Aura
              </b>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function Profile({
  userName,
  balance,
  cumulativeAura,
}: {
  userName?: string;
  balance?: number;
  cumulativeAura?: number;
}) {
  const displayName = userName ? (userName.includes("@") ? userName.split("@")[0] : userName) : "Member";
  const cumulative = cumulativeAura ?? balance ?? 0;
  const currentTier = getTierForAura(cumulative);

  return (
    <div className="mx-auto max-w-3xl">
      <Head title="Profile" copy="Your progress, preferences, and recognition." />
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-orange-600 to-amber-600" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Avatar name={displayName} />
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 shadow-sm">
              <img
                src={currentTier.badgeUrl}
                alt={currentTier.name}
                className="h-9 w-9 object-contain drop-shadow"
              />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Level {currentTier.level}
                </p>
                <p className="text-xs font-black text-amber-950">{currentTier.name}</p>
              </div>
            </div>
          </div>
          <h3 className="mt-4 text-xl font-bold">{displayName}</h3>
          <p className="text-sm text-zinc-500">{userName || "Team Member"}</p>
          <div className="mt-6 grid grid-cols-3 rounded-xl bg-zinc-50 p-4 text-center">
            <span>
              <b className="block text-lg">{cumulative.toLocaleString()}</b>
              <small>Cumulative</small>
            </span>
            <span>
              <b className="block text-lg">{(balance || 0).toLocaleString()}</b>
              <small>Available</small>
            </span>
            <span>
              <b className="block text-lg">#2</b>
              <small>This month</small>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SettingsPage({
  notify,
  role,
  initialPreferences = [],
  onNavigate,
}: {
  notify?: (s: string) => void;
  role?: string;
  initialPreferences?: any[];
  onNavigate?: (p: Page) => void;
}) {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<any[]>(initialPreferences);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      setPreferences(initialPreferences);
    }
  }, [initialPreferences]);

  async function handleTriggerStreak() {
    if (!notify) return;
    setRunningJob("streak");
    notify("Dispatching background streak reminder job...");
    const res = await triggerStreakRemindersAction();
    setRunningJob(null);
    if (res.success && res.data) {
      notify(`Job completed! Sent ${res.data.processedCount} momentum reminders.`);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      notify((res as any).error || "Failed to run streak reminder job");
    }
  }

  async function handleTriggerReviewDigest() {
    if (!notify) return;
    setRunningJob("digest");
    notify("Dispatching background review digest job...");
    const res = await triggerReviewDigestAction();
    setRunningJob(null);
    if (res.success && res.data) {
      notify(`Job completed! Notified ${res.data.adminsNotified} admin(s) for ${res.data.pendingCount} pending task(s).`);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      notify((res as any).error || "Failed to run review digest job");
    }
  }

  async function handleTriggerEmailProcessor() {
    if (!notify) return;
    setRunningJob("email");
    notify("Dispatching background email delivery worker...");
    const res = await triggerEmailProcessorAction();
    setRunningJob(null);
    if (res.success && res.data) {
      notify(`Worker completed! Processed: ${res.data.processed}, Succeeded: ${res.data.succeeded}, Failed: ${res.data.failed}`);
    } else {
      notify((res as any).error || "Failed to run email delivery worker");
    }
  }

  async function handleResetPreferences() {
    if (!notify) return;
    setIsResetting(true);
    notify("Resetting preferences to default...");
    const res = await resetPreferencesAction();
    setIsResetting(false);
    if (res.success) {
      setPreferences([]);
      notify("Notification preferences reset to defaults.");
    } else {
      notify((res as any).error || "Failed to reset preferences");
    }
  }

  async function togglePreference(type: string, channel: 'emailEnabled' | 'inAppEnabled', currentValue: boolean) {
    if (!notify) return;
    const fieldKey = `${type}-${channel}`;
    setSavingPref(fieldKey);
    const newValue = !currentValue;
    
    // Optimistic UI update
    setPreferences(prev => {
      const exists = prev.some(p => p.notificationType === type);
      if (exists) {
        return prev.map(p => p.notificationType === type ? { ...p, [channel]: newValue } : p);
      } else {
        return [...prev, { notificationType: type, emailEnabled: true, inAppEnabled: true, [channel]: newValue }];
      }
    });
    
    const res = await updatePreferenceAction(type as any, { [channel]: newValue });
    setSavingPref(null);
    
    if (res.success) {
      setLastSaved(fieldKey);
      setTimeout(() => setLastSaved(null), 2500);
      notify("Preference saved.");
    } else {
      notify((res as any).error || "Failed to save preference.");
      // Revert on failure
      setPreferences(prev => prev.map(p => p.notificationType === type ? { ...p, [channel]: currentValue } : p));
    }
  }

  const notificationTypes = [
    { id: "TASK_ASSIGNED", label: "Task Assigned", desc: "When a new task is assigned to you" },
    { id: "TASK_APPROVED", label: "Task Approved", desc: "When your submission is approved" },
    { id: "TASK_NEEDS_CHANGES", label: "Task Needs Changes", desc: "When your submission requires updates" },
    { id: "AURA_AWARDED", label: "Aura Points Awarded", desc: "When leadership awards you discretionary Aura points" },
    { id: "STORE_FULFILLMENT", label: "Store Fulfillment", desc: "Updates about your store redemptions" },
    { id: "KUDOS_RECEIVED", label: "Kudos Received", desc: "When someone sends you Kudos" },
    { id: "STREAK_REMINDER", label: "Streak Reminders", desc: "Reminders to maintain your weekly streak" },
  ];

  if (role === "Admin" || role === "Superadmin") {
    notificationTypes.push(
      { id: "ADMIN_REVIEW_DIGEST", label: "Review Digest", desc: "Daily digest of pending tasks requiring review" },
      { id: "REDEMPTION_REQUESTED", label: "Store Redemption Requests", desc: "Alerts when members request reward redemptions from the store" }
    );
  }

  return (
    <>
      <Head
        title="Settings & Preferences"
        copy="Manage your personal preferences and system settings."
      />

      <div className="mb-6 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-orange-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-900">
            <Bell className="h-4 w-4 text-orange-600" />
            Notification Preferences
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isResetting}
            onClick={handleResetPreferences}
            className="text-xs h-7 px-2 text-zinc-500 hover:text-orange-600 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            {isResetting ? "Resetting..." : "Reset to Defaults"}
          </Button>
        </div>
        
        <div className="space-y-4">
          {notificationTypes.map(nt => {
            const pref = preferences.find(p => p.notificationType === nt.id) || { emailEnabled: true, inAppEnabled: true };
            const isSavingThis = savingPref?.startsWith(nt.id);
            const isSavedThis = lastSaved?.startsWith(nt.id) && !isSavingThis;
            
            return (
              <div key={nt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                <div>
                  <b className="text-sm text-zinc-900">{nt.label}</b>
                  <p className="text-xs text-zinc-500 mt-0.5">{nt.desc}</p>
                </div>
                <div className="flex items-center gap-6 mt-3 sm:mt-0">
                  {isSavingThis && (
                    <span className="text-[11px] font-medium text-orange-600 animate-pulse">Saving...</span>
                  )}
                  {isSavedThis && (
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Saved
                    </span>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                      checked={pref.inAppEnabled}
                      disabled={savingPref === `${nt.id}-inAppEnabled`}
                      onChange={() => togglePreference(nt.id, 'inAppEnabled', pref.inAppEnabled)}
                    />
                    <span className="text-xs font-medium text-zinc-700">In-App</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                      checked={pref.emailEnabled}
                      disabled={savingPref === `${nt.id}-emailEnabled`}
                      onChange={() => togglePreference(nt.id, 'emailEnabled', pref.emailEnabled)}
                    />
                    <span className="text-xs font-medium text-zinc-700">Email</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {role === "Superadmin" && (
        <>
          {/* Background Processing & Event Dispatchers */}
          <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-900">
                <Zap className="h-4 w-4 text-orange-600" />
                Background Workers & Asynchronous Dispatchers
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                Workers Active
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed max-w-2xl">
              Automated background routines process member streak checks, review queues, and event notifications. You can also trigger workers on-demand:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-orange-200/60 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-zinc-900 flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-orange-600" />
                    Streak Reminders
                  </b>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={runningJob === "streak"}
                    onClick={handleTriggerStreak}
                    className="text-xs h-7 px-2.5"
                  >
                    {runningJob === "streak" ? "Running..." : "Trigger"}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Scans active members inactive for 3+ days and queues momentum reminders.
                </p>
              </div>

              <div className="rounded-xl border border-orange-200/60 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-zinc-900 flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5 text-orange-600" />
                    Review Digest
                  </b>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={runningJob === "digest"}
                    onClick={handleTriggerReviewDigest}
                    className="text-xs h-7 px-2.5"
                  >
                    {runningJob === "digest" ? "Running..." : "Trigger"}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Aggregates submissions in SUBMITTED state and alerts administrators.
                </p>
              </div>

              <div className="rounded-xl border border-orange-200/60 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-zinc-900 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-orange-600" />
                    Email Worker
                  </b>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={runningJob === "email"}
                    onClick={handleTriggerEmailProcessor}
                    className="text-xs h-7 px-2.5"
                  >
                    {runningJob === "email" ? "Running..." : "Trigger"}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Claims pending notification deliveries and sends them via SMTP transport.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Shield,
                title: "Roles & permissions",
                desc: "Manage RBAC assignments, employee roles, and user access across the organization.",
                buttonText: "Manage Members & RBAC",
                page: "members" as Page,
              },
              {
                icon: Award,
                title: "Badges & Gamification",
                desc: "View Aura rankings, peer milestones, and team momentum on the Leaderboard.",
                buttonText: "Open Leaderboard",
                page: "leaderboard" as Page,
              },
              {
                icon: Target,
                title: "Task categories",
                desc: "Manage active tasks, categories, deliverables, and base point allocations.",
                buttonText: "Manage Tasks",
                page: "tasks" as Page,
              },
              {
                icon: Bell,
                title: "Notification Channels",
                desc: "Monitor real-time delivery logs, queue worker activity, and failure diagnostics.",
                buttonText: "Open Email & Deliveries",
                page: "deliveries" as Page,
              },
            ].map(({ icon: Icon, title, desc, buttonText, page: targetPage }) => (
              <Card className="p-5 flex flex-col justify-between hover:border-orange-300 transition-colors" key={title}>
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-orange-600" />
                    <span className="text-[11px] text-zinc-400 font-mono">Quick Access</span>
                  </div>
                  <b className="mt-3 block text-zinc-900">{title}</b>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(targetPage);
                    }
                  }}
                  className="mt-4 text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 group self-start"
                >
                  {buttonText} <ChevronRight className="inline h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}