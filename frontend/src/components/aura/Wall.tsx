"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Trophy } from "lucide-react";

interface WallProps {
  notify: (msg: string) => void;
  kudos: any[];
  openSendKudos: () => void;
  initialTasks: any[];
}

/* ── tiny helpers (self-contained so Wall.tsx doesn't import internal aura-app fns) ── */

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

/* ── Latest Completed Tasks Banner ── */

function LatestCompletedTasks({ tasks }: { tasks: any[] }) {
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [formattedDates, setFormattedDates] = useState<Record<string, string>>({});

  useEffect(() => {
    // For members: tasks are assignment objects with .task and .status
    // Filter only completed ones and sort by most recent
    const completed = (tasks || [])
      .filter((a: any) => {
        const status = a.status || a.assignmentStatus || "";
        return status === "COMPLETED";
      })
      .map((a: any) => ({
        id: a.id || a.task?.id,
        title: (a.task?.title || a.title || "Untitled Task"),
        aura: a.task?.baseAura || a.baseAura || 10,
        completedAt: a.completedAt || a.updatedAt || a.task?.updatedAt || a.createdAt || a.task?.createdAt,
        assignee: a.user?.name || a.task?.createdBy?.name || "Team Member",
      }))
      .sort((a: any, b: any) => {
        const da = new Date(a.completedAt || 0).getTime();
        const db = new Date(b.completedAt || 0).getTime();
        return db - da;
      })
      .slice(0, 3); // Show top 3 most recent

    setCompletedTasks(completed);
  }, [tasks]);

  // Format dates on client to avoid SSR mismatch
  useEffect(() => {
    const dates: Record<string, string> = {};
    completedTasks.forEach((t) => {
      if (t.completedAt) {
        dates[t.id] = new Date(t.completedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    });
    setFormattedDates(dates);
  }, [completedTasks]);

  if (completedTasks.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
          <Trophy className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider">
          🎉 Latest Completed Tasks
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {completedTasks.map((task, i) => (
          <article
            key={task.id || i}
            className="flex items-start gap-3 rounded-xl border border-emerald-200/50 bg-white/80 p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">
                {task.title}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                by {task.assignee}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                  <Sparkles className="h-3 w-3 text-orange-500" />
                  +{task.aura} Aura
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {formattedDates[task.id] || ""}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Main Wall Component ── */

export function Wall({ notify, kudos, openSendKudos, initialTasks }: WallProps) {
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
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">Aura workspace</p>
          <h2 className="text-3xl font-bold tracking-tight">Aura Wall</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Peer recognition and energetic reactions pinned for the entire team.
          </p>
        </div>
        <Button onClick={openSendKudos} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Send Kudos
        </Button>
      </div>

      {/* Latest Completed Tasks Section */}
      <LatestCompletedTasks tasks={initialTasks} />

      {/* Kudos Grid */}
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

              // Parse optional leading emoji prefix
              const emojiMatch = noteText.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\S+)\s*(.*)$/u);
              const hasReactionFormat = emojiMatch && emojiMatch[1] && emojiMatch[2] && emojiMatch[1].length <= 4;
              const reactionEmoji = hasReactionFormat ? emojiMatch[1] : (i % 3 === 0 ? "🔥" : i % 3 === 1 ? "🚀" : "🙌");
              const messageBody = hasReactionFormat ? emojiMatch[2] : noteText;

              const cardId = k.id || `kudo-${i}`;
              const curReactions = reactions[cardId] || {};
              const curUserSelections = userSelectedReactions[cardId] || {};

              // Pastel palette
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

                    {/* Sender → Recipient */}
                    <div className="flex items-center gap-1.5 rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs text-zinc-600">
                      <span className="shrink-0 text-[11px] font-medium text-zinc-500">To:</span>
                      <span className="truncate font-semibold text-zinc-900" title={receiverName}>
                        {receiverName}
                      </span>
                    </div>

                    {/* Spotlight Message */}
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

                  {/* Footer: Reactions + Meta */}
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
                      <ClientDate dateStr={k.createdAt} />
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

/* Client-only date to avoid hydration mismatch */
function ClientDate({ dateStr }: { dateStr?: string }) {
  const [formatted, setFormatted] = useState<string>("");
  useEffect(() => {
    setFormatted(
      new Date(dateStr || Date.now()).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [dateStr]);
  return (
    <time
      dateTime={dateStr ? new Date(dateStr).toISOString() : undefined}
      className="text-[11px] font-medium text-zinc-500"
    >
      {formatted}
    </time>
  );
}
