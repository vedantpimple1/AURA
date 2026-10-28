"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Clock,
  UserCheck,
  Link as LinkIcon,
  Ban,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getRecoveryRequestsAction,
  verifyRecoveryRequestAction,
  issueResetLinkAction,
  cancelRecoveryRequestAction,
} from "@/actions/auth.actions";

interface RecoveryRequest {
  id: string;
  status: "PENDING" | "VERIFIED" | "LINK_ISSUED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  verifiedAt: string | null;
  issuedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  verificationNotes: string | null;
  tokenExpiresAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
  };
  verifiedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  issuedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function RecoveryQueuePage() {
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // One-Time Link Handoff state
  const [handoffData, setHandoffData] = useState<{
    resetUrl: string;
    expiresAt: string;
    targetUser: { name: string; email: string; employeeId: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRequests = async (p = page, status = statusFilter, q = search) => {
    setLoading(true);
    try {
      const res = await getRecoveryRequestsAction({
        page: p,
        pageSize: 15,
        status: status !== "ALL" ? status : undefined,
        search: q.trim() || undefined,
      });

      if (res.success && res.data) {
        setRequests(res.data.requests);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to load recovery requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(1, statusFilter, search);
  }, [statusFilter]);

  const handleVerify = async () => {
    if (!verifyingId) return;
    setActionLoading(true);
    try {
      const res = await verifyRecoveryRequestAction(verifyingId, verificationNotes);
      if (res.success) {
        setVerifyingId(null);
        setVerificationNotes("");
        await loadRequests();
      } else {
        alert((res as any)?.error || "Verification failed");
      }
    } catch (err: any) {
      alert(err.message || "Failed to verify identity");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueLink = async (requestId: string) => {
    if (!confirm("Are you sure you want to generate a one-time password reset link for this verified member?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await issueResetLinkAction(requestId);
      if (res.success && res.data) {
        setHandoffData({
          resetUrl: res.data.resetUrl,
          expiresAt: res.data.expiresAt,
          targetUser: res.data.targetUser,
        });
        await loadRequests();
      } else {
        alert((res as any)?.error || "Failed to issue reset link");
      }
    } catch (err: any) {
      alert(err.message || "Failed to issue reset link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    setActionLoading(true);
    try {
      const res = await cancelRecoveryRequestAction(cancellingId, cancellationReason);
      if (res.success) {
        setCancellingId(null);
        setCancellationReason("");
        await loadRequests();
      } else {
        alert((res as any)?.error || "Cancellation failed");
      }
    } catch (err: any) {
      alert(err.message || "Failed to cancel request");
    } finally {
      setActionLoading(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (!handoffData) return;
    try {
      await navigator.clipboard.writeText(handoffData.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">Pending Verification</span>;
      case "VERIFIED":
        return <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">Verified</span>;
      case "LINK_ISSUED":
        return <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200">Link Issued</span>;
      case "COMPLETED":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Reset Completed</span>;
      case "EXPIRED":
        return <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">Expired</span>;
      case "CANCELLED":
        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">Cancelled</span>;
      default:
        return <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold">Admin-Assisted Password Recovery Queue</h2>
              <p className="text-xs text-zinc-400">
                Authorized recovery operators must verify member identity before generating one-time reset links.
              </p>
            </div>
          </div>
          <Button
            onClick={() => loadRequests()}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "PENDING", "VERIFIED", "LINK_ISSUED", "COMPLETED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                statusFilter === st
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              )}
            >
              {st === "ALL" ? "All Requests" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadRequests(1, statusFilter, search);
          }}
          className="relative w-full sm:w-72"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </form>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Requested Date</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Link Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Loading recovery queue...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No password recovery requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900">{req.user.name}</div>
                      <div className="text-[11px] text-zinc-500">{req.user.email} • {req.user.employeeId}</div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {new Date(req.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {req.verifiedBy ? (
                        <div>
                          <div className="font-medium text-zinc-800">By {req.verifiedBy.name}</div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">{req.verificationNotes || "Identity verified"}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Unverified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {req.tokenExpiresAt ? (
                        new Date(req.tokenExpiresAt) < new Date() ? (
                          <span className="text-rose-600 font-medium">Expired</span>
                        ) : (
                          <span className="text-purple-700 font-medium">
                            {new Date(req.tokenExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {req.status === "PENDING" && (
                        <button
                          onClick={() => {
                            setVerifyingId(req.id);
                            setVerificationNotes("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700 transition"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Verify
                        </button>
                      )}

                      {req.status === "VERIFIED" && (
                        <button
                          onClick={() => handleIssueLink(req.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-700 transition"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          Issue Link
                        </button>
                      )}

                      {(req.status === "PENDING" || req.status === "VERIFIED" || req.status === "LINK_ISSUED") && (
                        <button
                          onClick={() => {
                            setCancellingId(req.id);
                            setCancellationReason("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
                        >
                          <Ban className="h-3.5 w-3.5 text-zinc-400" />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Dialog */}
      {verifyingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-sky-600" />
                Verify Member Identity
              </h3>
              <button
                onClick={() => setVerifyingId(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Confirm that you have positively verified the member&apos;s identity through an established internal corporate process before approving link issuance.
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Verification Notes (e.g. Employee ID, Video Call confirmation)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Enter verification method and notes..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVerifyingId(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={actionLoading}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {actionLoading ? "Verifying..." : "Confirm Identity"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600" />
                Cancel Recovery Request
              </h3>
              <button
                onClick={() => setCancellingId(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Provide a reason for rejecting or cancelling this recovery request.
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Identity verification failed or member withdrew request"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingId(null)}
                disabled={actionLoading}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleCancel}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restricted One-Time Link Handoff Modal */}
      {handoffData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-600">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Restricted Link Handoff</h3>
                  <p className="text-[11px] text-zinc-500">Single-use reset link generated</p>
                </div>
              </div>
              <button
                onClick={() => setHandoffData(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>One-Time Reveal • Valid for 15 Minutes</span>
              </div>
              <p className="text-zinc-700 leading-relaxed">
                This reset link is shown <b>only once</b> and will not be displayed again. Share it directly with{" "}
                <b className="text-zinc-900">{handoffData.targetUser.name}</b> ({handoffData.targetUser.employeeId}) via an authorized, secure internal channel.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700">One-Time Password Reset Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={handoffData.resetUrl}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-800 select-all focus:outline-none"
                />
                <Button
                  onClick={copyLinkToClipboard}
                  className={cn(
                    "shrink-0 font-semibold text-xs px-4 rounded-xl transition shadow-sm",
                    copied ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy Reset Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setHandoffData(null)}
                className="text-xs font-semibold text-zinc-700 rounded-xl"
              >
                Close Handoff View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
