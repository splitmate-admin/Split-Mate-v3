import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState, useEffect, useMemo } from "react";
import { useI18n } from '../i18n/I18nProvider';
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, X, CheckCheck, Receipt, CreditCard, PiggyBank, Sparkles, 
  AlertCircle, ChevronRight, Trash2, Clock, Check, Crown, User
} from "lucide-react";
import { Group, Member, Expense, PendingReceipt, getPlanLabel } from "../types";
import { formatDateTime } from "../utils/dateUtils";

export interface NotificationItem {
  id: string;
  type: "expense" | "settlement" | "fund" | "system" | "reminder";
  title: string;
  message: string;
  timestamp: string; // ISO string or formatted string
  rawTime: number; // unix timestamp for sorting
  isRead: boolean;
  linkTab?: "home" | "bills" | "settle" | "participation";
  targetId?: string;
  amount?: number;
  actorName?: string;
  actorAvatar?: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group | null;
  members: Member[];
  expenses: Expense[];
  pendingReceipts?: PendingReceipt[];
  activeTab?: string;
  setActiveTab?: (tab: "home" | "bills" | "add" | "settle" | "participation") => void;
  showUpgradeModal?: () => void;
  isAdmin?: boolean;
  viewingMemberId?: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  members,
  expenses,
  pendingReceipts = [],
  setActiveTab,
  showUpgradeModal,
  isAdmin = true,
  viewingMemberId
}) => {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const currentMember = useMemo(() => {
    if (isAdmin || !viewingMemberId) return null;
    return members.find((m) => m.id === viewingMemberId) || null;
  }, [members, viewingMemberId, isAdmin]);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`splitmate_read_notifs_${activeGroup?.id || "global"}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save read state to local storage when changed
  useEffect(() => {
    if (activeGroup?.id) {
      try {
        localStorage.setItem(
          `splitmate_read_notifs_${activeGroup.id}`,
          JSON.stringify(Array.from(readIds))
        );
      } catch (e) {
        console.error("Failed to save read notifications", e);
      }
    }
  }, [readIds, activeGroup?.id]);

  // Generate dynamic notifications filtered smartly by Leader vs Member roles
  const { language } = useI18n();
  const notifications = useMemo<NotificationItem[]>(() => {
    if (!activeGroup) return [];

    const items: NotificationItem[] = [];

    // Helper to format currency safely without decimals
    const formatMoney = (val: number) => Math.round(val || 0).toLocaleString(getLocale());

    // -------------------------------------------------------------
    // 1. Pending Receipts / Proofs
    // -------------------------------------------------------------
    pendingReceipts.forEach((receipt) => {
      const uploader = members.find((m) => m.id === receipt.fromId);
      const uploaderName = uploader ? uploader.name : ui('mcd264c4a8f');
      const isApproved = receipt.status === "approved";
      const isRejected = receipt.status === "rejected";

      // If Member role: Only show receipts uploaded by OR addressed to this member
      if (!isAdmin && viewingMemberId) {
        const isMyReceipt = receipt.fromId === viewingMemberId;
        const isForMe = receipt.toId === viewingMemberId;

        if (!isMyReceipt && !isForMe) return; // Skip receipts irrelevant to this member

        let title = ui('m32904ae3b5');
        let msg = ui('m3a115a77e5', { v0: formatMoney(receipt.amount) });

        if (isMyReceipt) {
          if (isApproved) {
            title = "Biên lai đã được duyệt ✨";
            msg = `Biên lai ${formatMoney(receipt.amount)}đ của bạn đã được Trưởng nhóm xác nhận thanh toán thành công!`;
          } else if (isRejected) {
            title = "Biên lai bị từ chối ⚠️";
            msg = `Biên lai ${formatMoney(receipt.amount)}đ của bạn bị từ chối${receipt.rejectionReason ? `: ${receipt.rejectionReason}` : ""}`;
          } else {
            title = "Biên lai đang chờ duyệt ⏳";
            msg = `Biên lai ${formatMoney(receipt.amount)}đ của bạn đã gửi và đang chờ Trưởng nhóm duyệt.`;
          }
        } else if (isForMe) {
          title = "Nhận thanh toán mới";
          msg = `${uploaderName} đã gửi biên lai chuyển khoản ${formatMoney(receipt.amount)}đ cho bạn`;
        }

        items.push({
          id: `receipt_${receipt.id}`,
          type: "settlement",
          title,
          message: msg,
          timestamp: receipt.createdAt || receipt.uploadedAt || new Date().toISOString(),
          rawTime: new Date(receipt.createdAt || receipt.uploadedAt || Date.now()).getTime(),
          isRead: readIds.has(`receipt_${receipt.id}`),
          linkTab: "settle",
          targetId: `receipt-${receipt.id}`,
          amount: receipt.amount,
          actorName: uploaderName
        });
      } else {
        // Leader role: Show all group receipts requiring management/approval
        let title = ui('m760527b1a1');
        let msg = ui('m537dd852ae', { v0: uploaderName, v1: formatMoney(receipt.amount) });
        
        if (isApproved) {
          title = "Biên lai đã được duyệt";
          msg = `Giao dịch ${formatMoney(receipt.amount)}đ của ${uploaderName} đã được xác nhận thanh toán`;
        } else if (isRejected) {
          title = "Biên lai bị từ chối";
          msg = `Biên lai ${formatMoney(receipt.amount)}đ của ${uploaderName} đã bị từ chối${receipt.rejectionReason ? `: ${receipt.rejectionReason}` : ""}`;
        }

        items.push({
          id: `receipt_${receipt.id}`,
          type: "settlement",
          title,
          message: msg,
          timestamp: receipt.createdAt || receipt.uploadedAt || new Date().toISOString(),
          rawTime: new Date(receipt.createdAt || receipt.uploadedAt || Date.now()).getTime(),
          isRead: readIds.has(`receipt_${receipt.id}`),
          linkTab: "settle",
          targetId: `receipt-${receipt.id}`,
          amount: receipt.amount,
          actorName: uploaderName
        });
      }
    });

    // -------------------------------------------------------------
    // 2. Recent Expenses & Fund Deposits
    // -------------------------------------------------------------
    expenses.slice(0, 20).forEach((exp) => {
      const payer = members.find((m) => m.id === exp.payerId);
      const payerName = exp.payerId === "group" ? ui('m3f56f2dd08') : payer ? payer.name : ui('mcd264c4a8f');
      const isFund = exp.isFundDeposit;
      const isMyPayer = viewingMemberId && exp.payerId === viewingMemberId;
      const isMyParticipant = viewingMemberId && (exp.participantIds || []).includes(viewingMemberId);

      // If Member role: Only show expenses where they are payer OR participant
      if (!isAdmin && viewingMemberId) {
        if (!isMyPayer && !isMyParticipant) return; // Skip non-related expenses

        let title = isFund ? ui('mb0212cbe46') : ui('mb538d5a3a9');
        let msg = "";

        if (isFund) {
          title = "Yêu cầu nộp quỹ mới 🐷";
          msg = `Bạn có yêu cầu nộp quỹ: "${exp.description}" - ${formatMoney(exp.amount)}đ`;
        } else if (isMyPayer) {
          title = "Ghi nhận chi tiêu thành công";
          msg = `Bạn đã ghi nhận chi khoản "${exp.description}" - ${formatMoney(exp.amount)}đ`;
        } else if (isMyParticipant) {
          title = "Chi tiêu mới có bạn tham gia";
          msg = `${payerName} đã chi "${exp.description}" (${formatMoney(exp.amount)}đ). Phần của bạn đã được tính toán tự động.`;
        }

        items.push({
          id: `expense_${exp.id}`,
          type: isFund ? "fund" : "expense",
          title,
          message: msg,
          timestamp: exp.created_at || exp.date,
          rawTime: new Date(exp.created_at || exp.date).getTime(),
          isRead: readIds.has(`expense_${exp.id}`),
          linkTab: isFund ? "settle" : "bills",
          targetId: `expense-${exp.id}`,
          amount: exp.amount,
          actorName: payerName
        });
      } else {
        // Leader role: Show all group expenses
        items.push({
          id: `expense_${exp.id}`,
          type: isFund ? "fund" : "expense",
          title: isFund ? ui('mb0212cbe46') : ui('m3ff1d107a0'),
          message: isFund
            ? ui('m53ce8c23f3', { v0: payerName, v1: exp.description, v2: formatMoney(exp.amount) })
            : ui('m5ecb83914c', { v0: payerName, v1: exp.description, v2: formatMoney(exp.amount) }),
          timestamp: exp.created_at || exp.date,
          rawTime: new Date(exp.created_at || exp.date).getTime(),
          isRead: readIds.has(`expense_${exp.id}`),
          linkTab: isFund ? "settle" : "bills",
          targetId: `expense-${exp.id}`,
          amount: exp.amount,
          actorName: payerName
        });
      }
    });

    // -------------------------------------------------------------
    // 3. System Plan / Group Status Notification
    // -------------------------------------------------------------
    if (activeGroup.plan) {
      const planName = getPlanLabel(activeGroup.plan);
      items.push({
        id: `system_plan_${activeGroup.id}`,
        type: "system",
        title: ui('m1f5339a77e', { v0: planName }),
        message: activeGroup.plan === "FREE"
          ? (isAdmin 
              ? ui('m9f04c274fb')
              : ui('mdccbae9fc0'))
          : ui('m2ef3554958', { v0: activeGroup.name, v1: planName }),
        timestamp: activeGroup.createdAt || new Date().toISOString(),
        rawTime: new Date(activeGroup.createdAt || Date.now()).getTime(),
        isRead: readIds.has(`system_plan_${activeGroup.id}`),
        linkTab: "home"
      });
    }

    // Sort newest first
    return items.sort((a, b) => b.rawTime - a.rawTime);
  }, [activeGroup, expenses, pendingReceipts, members, readIds, isAdmin, viewingMemberId, language]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach((n) => allIds.add(n.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark single as read
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    // Link tab if available
    if (item.linkTab && setActiveTab) {
      setActiveTab(item.linkTab);
      onClose();

      // Dispatch custom event to reset target view/filters and expand item if needed
      if (item.targetId) {
        const targetId = item.targetId;
        
        const scrollToTarget = () => {
          // Dispatch event inside polling loop to ensure it fires after tab switches and component mounts
          window.dispatchEvent(
            new CustomEvent("focus-target-item", {
              detail: { targetId: item.targetId, linkTab: item.linkTab }
            })
          );
          
          const el = document.getElementById(targetId);
          if (el) {
            // 1. Scroll inner scrollable containers first
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

            // 2. Scroll outer window to center the element on screen
            const rect = el.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - (window.innerHeight / 2) + (rect.height / 2);
            
            window.scrollTo({
              top: Math.max(0, targetY),
              behavior: "smooth"
            });

            return true;
          }
          return false;
        };

        // Poll multiple times across 1.5s to ensure layout stabilization after Framer Motion tab transition
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const found = scrollToTarget();
          if (found && attempts > 3) {
            clearInterval(interval);
          }
          if (attempts >= 20) {
            clearInterval(interval);
          }
        }, 120);
      }
    } else if (item.type === "system" && showUpgradeModal && activeGroup?.plan === "FREE" && isAdmin) {
      showUpgradeModal();
      onClose();
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "expense":
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      case "settlement":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "fund":
        return <PiggyBank className="w-4 h-4 text-amber-600" />;
      case "system":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "reminder":
      default:
        return <Bell className="w-4 h-4 text-rose-500" />;
    }
  };

  const getIconBg = (type: NotificationItem["type"]) => {
    switch (type) {
      case "expense":
        return "bg-emerald-50 border-emerald-100";
      case "settlement":
        return "bg-blue-50 border-blue-100";
      case "fund":
        return "bg-amber-50 border-amber-100";
      case "system":
        return "bg-purple-50 border-purple-100";
      case "reminder":
      default:
        return "bg-rose-50 border-rose-100";
    }
  };

  const formatRelativeTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return ui('m332d45e4eb');
      if (diffMins < 60) return ui('m435bf38a36', { v0: diffMins });
      if (diffHours < 24) return ui('m9c2cc88587', { v0: diffHours });
      if (diffDays === 1) return ui('m47bd3511b2');
      if (diffDays < 7) return ui('mdb7c887149', { v0: diffDays });
      
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Pull Bar (Mobile) */}
            <div className="sm:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">{ui('m5d6af377c2')}</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full animate-pulse">
                        {unreadCount} {ui('m425c7c6b59')}</span>
                    )}
                  </div>
                  
                  {/* Role Badge */}
                  <div className="mt-1 flex items-center gap-1.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md text-[10px] font-extrabold">
                        <Crown className="w-3 h-3 text-amber-500" />
                        {ui('m9c931ee8d2')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-[10px] font-extrabold">
                        <User className="w-3 h-3 text-blue-500" />
                        {ui('mcd264c4a8f')}{currentMember ? `(${currentMember.name})` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Actions */}
            <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {ui('m5587303546')}{notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === "unread"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {ui('mba24015ab0')}{unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{ui('m181296b63d')}</span>
                </button>
              )}
            </div>

            {/* Notification List Body */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-50">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Bell className="w-6 h-6 opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{ui('m169c13bc3c')}</p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                      {filter === "unread"
                        ? ui('m9e0e149b12')
                        : isAdmin 
                          ? ui('m61bcbe6898')
                          : ui('m8c1bd91f6f')}
                    </p>
                  </div>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer border flex items-start gap-3.5 relative group ${
                      !item.isRead
                        ? "bg-emerald-50/40 border-emerald-100/80 hover:bg-emerald-50/70"
                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!item.isRead && (
                      <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                    )}

                    {/* Icon */}
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${getIconBg(
                        item.type
                      )}`}
                    >
                      {getIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-bold truncate ${
                            !item.isRead ? "text-slate-900 font-extrabold" : "text-slate-700"
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[10px] font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.timestamp)}
                        </span>

                        {item.linkTab && (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5 hover:underline">
                            {ui('me30c937169')}<ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {ui('md2b73ab2ad')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

