import { formatDisplayDateTime } from '../utils/dateUtils';
import { getLocale } from '../i18n/core';
import { ui, t } from '../i18n/core';
import React, { useState, useMemo } from "react";
import { useI18n } from '../i18n/I18nProvider';
import { motion, AnimatePresence } from "motion/react";
import { Member, Expense, Group } from "../types";
import { formatDateTime, patchOldTimestamp, parsePatchedTime } from "../utils/dateUtils";
import { getMemberAvatar } from "../utils/avatar";
import { 
  X, 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Clock, 
  User, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Pencil,
  Sparkles,
  ChevronDown,
  CreditCard,
  Receipt,
  Users,
  ArrowUpRight
} from "lucide-react";

interface PersonalStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  expenses: Expense[];
  activeGroup: Group | undefined;
  viewingMemberId: string | undefined;
  isAdmin: boolean;
  children?: React.ReactNode;
}

export default function PersonalStatementModal({
  isOpen,
  onClose,
  members,
  expenses,
  activeGroup,
  viewingMemberId,
  isAdmin,
  children
}: PersonalStatementModalProps) {
  const { language } = useI18n();
  // Determine which user's statement we are viewing
  const defaultMemberId = useMemo(() => {
    if (viewingMemberId) return viewingMemberId;
    if (members.length > 0) return members[0].id;
    return "";
  }, [viewingMemberId, members]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(defaultMemberId);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"statement" | "paid">("statement");

  // Sync state if defaultMemberId changes
  React.useEffect(() => {
    if (defaultMemberId) {
      setSelectedMemberId(defaultMemberId);
    }
  }, [defaultMemberId]);

  // Reset showExplanation each time the modal opens
  React.useEffect(() => {
    if (isOpen) {
      setShowExplanation(true);
    }
  }, [isOpen]);

  const currentMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId);
  }, [members, selectedMemberId]);

  // Formatter helpers
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(getLocale()).format(Math.round(val)) + "đ";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Compile list of standard expenses paid out-of-pocket by selected member (strictly excluding fund deposits & fund transfers)
  const memberPaidExpenses = useMemo(() => {
    if (!selectedMemberId) return [];
    return expenses.filter(
      e => e.payerId === selectedMemberId &&
           !e.isFundDeposit &&
           !e.description.includes("[Nộp Quỹ]") &&
           !e.description.includes("[Nhận Quỹ]")
    ).sort((a, b) => new Date(b.date || b.created_at || "").getTime() - new Date(a.date || a.created_at || "").getTime());
  }, [selectedMemberId, expenses]);

  const totalPaidOut = useMemo(() => {
    return memberPaidExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [memberPaidExpenses]);

  // Compile full history statement for the selected member
  const statementItems = useMemo(() => {
    if (!selectedMemberId) return [];

    const items = [];

    // 1. Process regular Expenses
    for (const exp of expenses) {
      const isPayer = exp.payerId === selectedMemberId;
      const isParticipant = exp.participantIds?.includes(selectedMemberId);

      // Only care about expenses where selected user is involved
      if (!isPayer && !isParticipant) continue;

      const isFundIn = exp.description.includes("[Nộp Quỹ]");
      const isFundOut = exp.description.includes("[Nhận Quỹ]");

      let netImpact = 0;
      let share = 0;

      if (isParticipant) {
        if (exp.customSplit) {
          share = exp.customSplit[selectedMemberId] || 0;
        } else {
          share = exp.amount / (exp.participantIds?.length || 1);
        }
      }

      if (isFundIn) {
        // Nộp quỹ: user nạp tiền vào quỹ
        netImpact = exp.amount; // Tích cực cho cán cân nợ (làm giảm nợ)
      } else if (isFundOut) {
        // Nhận hoàn quỹ: user nhận tiền mặt về
        netImpact = -exp.amount; // Tiêu cực cho cán cân nợ
      } else {
        // Chi tiêu thường
        netImpact = (isPayer ? exp.amount : 0) - (isParticipant ? share : 0);
      }

      // Skip 0 impact items if they aren't useful
      if (netImpact === 0 && !isPayer && !isParticipant) continue;

      items.push({
        id: exp.id,
        description: exp.description,
        date: exp.date,
        created_at: exp.created_at || exp.date,
        updated_at: exp.updated_at || exp.created_at || exp.date,
        amount: exp.amount,
        payerId: exp.payerId,
        isPayer,
        isParticipant,
        share,
        netImpact,
        isPayment: isFundIn || isFundOut,
        isFundIn,
        isFundOut,
        isOffset: false,
        addedBy: exp.addedBy,
        editedBy: exp.editedBy,
        rawExpense: exp
      });
    }

    // 2. Process Debt Offsets (Manual settlements/transfers)
    if (activeGroup?.debtOffsets) {
      for (const offset of activeGroup.debtOffsets) {
        const isApproved = offset.status === "approved" || (!offset.status && !!offset.approvedAt);
        if (!isApproved) continue;

        const isFrom = offset.fromId === selectedMemberId;
        const isTo = offset.toId === selectedMemberId;

        if (!isFrom && !isTo) continue;

        let netImpact = 0;
        let description = "";

        if (isFrom) {
          // Member is the one whose debt was reduced/cleared
          netImpact = offset.amount;
          description = t('offsetTo', { name: members.find(m => m.id === offset.toId)?.name || '' });
        } else if (isTo) {
          // Member is the one who received/took on debt/cleared surplus
          netImpact = -offset.amount;
          description = t('offsetFrom', { name: members.find(m => m.id === offset.fromId)?.name || '' });
        }

        items.push({
          id: offset.id,
          description,
          date: offset.approvedAt || offset.createdAt,
          created_at: offset.createdAt,
          updated_at: offset.approvedAt || offset.createdAt,
          amount: offset.amount,
          payerId: offset.fromId,
          isPayer: isFrom,
          isParticipant: isTo,
          share: isTo ? offset.amount : 0,
          netImpact,
          isPayment: true,
          isFundIn: false,
          isFundOut: false,
          isOffset: true,
          addedBy: "system",
          editedBy: undefined,
          rawOffset: offset
        });
      }
    }

    // Sort by patched time descending (Crucial: ORDER BY patched_time DESC)
    return items.sort((a, b) => {
      const getSortTime = (item: any) => {
        const rawTime = item.updated_at;
        const displayTime = formatDateTime(rawTime);
        const patchedTime = patchOldTimestamp(item.description, displayTime, item.amount);
        return parsePatchedTime(patchedTime, rawTime || "");
      };
      return getSortTime(b) - getSortTime(a);
    });
  }, [expenses, selectedMemberId, activeGroup?.debtOffsets, members, language]);

  // Find the most recent payment transaction to act as the Watermark limit
  const watermarkInfo = useMemo(() => {
    // A payment that cleared/adjusted debt (e.g. fund in / out)
    const latestPayment = statementItems.find(item => item.isPayment || item.description.toLowerCase().includes("thanh toán") || item.description.toLowerCase().includes("quyết toán"));
    if (!latestPayment) return null;
    return {
      id: latestPayment.id,
      time: new Date(latestPayment.updated_at).getTime(),
      amount: latestPayment.amount,
      description: latestPayment.description,
      formattedTime: formatDisplayDateTime(latestPayment.updated_at)
    };
  }, [statementItems]);

  // Calculate current outstanding net balance of this member
  const currentNetBalance = useMemo(() => {
    return statementItems.reduce((sum, item) => sum + item.netImpact, 0);
  }, [statementItems]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-slate-50 border border-slate-200 rounded-[2.5rem] max-w-lg w-full relative shadow-2xl z-10 text-left flex flex-col max-h-[88vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-5 pb-6 rounded-b-[2rem] shadow-md shrink-0 relative space-y-3.5">
              <div className="absolute right-4 top-4">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white cursor-pointer"
                  aria-label={ui('md2b73ab2ad')}
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-2xl border border-white/10">
                  <FileText className="h-5 w-5 text-teal-100" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">{ui('md4c815851b')}</h3>
                  <p className="text-[10px] text-teal-100/80 font-medium">{ui('m52b440e18d')}</p>
                </div>
              </div>

              {/* Member selector for Admin / Treasurer */}
              {isAdmin ? (
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-wider block ml-1 text-teal-100 mb-1">
                    {ui('mf5dbbc987e')}</label>
                  <div className="relative">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-white/15 border border-white/10 hover:bg-white/20 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none cursor-pointer appearance-none pr-8 transition-colors"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id} className="text-slate-800 font-bold">
                          {m.emoji} {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-100 pointer-events-none" />
                  </div>
                </div>
              ) : (
                currentMember && (
                  <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-2xl border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg shrink-0 overflow-hidden border border-white/10">
                      <img 
                        src={getMemberAvatar(currentMember)} 
                        alt={currentMember.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white">{currentMember.name}</h4>
                      <p className="text-[9px] text-teal-100 font-semibold uppercase tracking-wider">
                        {ui('mfbe09d869c')}<span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1 font-bold">{currentMember.accessCode || "Email"}</span>
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Balance Summary Box */}
              <div className="bg-white rounded-2xl p-3.5 text-slate-800 shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{ui('m19f363c0e2')}</span>
                  <span className={`text-lg font-black font-mono tracking-tight block mt-0.5 ${
                    currentNetBalance > 0.1 ? "text-emerald-650" : currentNetBalance < -0.1 ? "text-rose-600" : "text-slate-600"
                  }`}>
                    {currentNetBalance > 0.1 ? "+" : ""}{formatMoney(currentNetBalance)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{ui('me03c1401e3')}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase mt-0.5 border ${
                    currentNetBalance > 0.1 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                      : currentNetBalance < -0.1 
                        ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse" 
                        : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}>
                    {currentNetBalance > 0.1 ? ui('m2bb40bb365') : currentNetBalance < -0.1 ? ui('m5fbd8b5cab') : ui('m774a531bf7')}
                  </span>
                </div>
              </div>

              {/* Segmented Control - 2 Tabs */}
              <div className="flex bg-black/15 p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("statement")}
                  className={`flex-1 py-2 px-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "statement"
                      ? "bg-white text-teal-900 shadow-sm"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {ui('m042b5b1a97')}{statementItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("paid")}
                  className={`flex-1 py-2 px-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "paid"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {ui('m76790c76cd')}{memberPaidExpenses.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === "statement" ? (
              /* TAB 1: STATEMENT ENTRIES LIST */
              <div className={`flex-1 overflow-y-auto px-5 pt-5 ${showExplanation ? "pb-28" : "pb-8"} space-y-4`} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {statementItems.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-xs">{ui('mfeec049bf0')}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        {ui('mee39e37163')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 relative">
                    {statementItems.map((item) => {
                      const isOlderThanPayment = watermarkInfo && new Date(item.updated_at).getTime() < watermarkInfo.time;
                      const isTheWatermarkItem = watermarkInfo && watermarkInfo.id === item.id;
                      const isPositive = item.netImpact >= 0;

                      // Calculate opacity for Gray-out effect
                      const opacityClass = isOlderThanPayment ? "opacity-50 grayscale-20 hover:opacity-80 transition-opacity" : "opacity-100";

                      return (
                        <React.Fragment key={item.id}>
                          {/* Watermark barrier */}
                          {isTheWatermarkItem && (
                            <div className="relative my-4 flex items-center justify-center">
                              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-dashed border-teal-500/60" />
                              </div>
                              <div className="relative flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 text-[10px] text-teal-800 font-extrabold uppercase tracking-wide shadow-xs shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>{ui('m41f8a557b4')}{formatMoney(item.amount)} {ui('mc2ace851a7')}{watermarkInfo.formattedTime})</span>
                              </div>
                            </div>
                          )}

                          {/* Regular Statement card */}
                          <div className={`bg-white rounded-2xl p-4 border border-slate-150 shadow-3xs hover:border-teal-500 hover:shadow-xs transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${opacityClass}`}>
                            {!isOlderThanPayment && item.editedBy && (
                              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-md uppercase tracking-wider">
                                {ui('m722bd92956')}</div>
                            )}

                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-3xs ${
                                item.isPayment 
                                  ? "bg-teal-50 border-teal-100 text-teal-600" 
                                  : isPositive 
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-650" 
                                    : "bg-rose-50 border-rose-100 text-rose-600"
                              }`}>
                                {item.isPayment ? (
                                  <ArrowLeftRight className="h-4.5 w-4.5 stroke-[2.5]" />
                                ) : isPositive ? (
                                  <TrendingUp className="h-4.5 w-4.5 stroke-[2.5]" />
                                ) : (
                                  <TrendingDown className="h-4.5 w-4.5 stroke-[2.5]" />
                                )}
                              </div>

                              <div className="space-y-1 text-left min-w-0 flex-1">
                                <h4 className="font-extrabold text-[13px] text-slate-850 leading-tight truncate">
                                  {item.description}
                                </h4>
                                
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 font-medium">
                                  <span className="flex items-center gap-1 font-semibold text-slate-500">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formatDate(item.date)}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {ui('m1f2d4d35a3')}{formatDisplayDateTime(item.updated_at)}
                                  </span>
                                </div>

                                <div className="bg-slate-50/60 p-2 rounded-xl border border-slate-100 text-[10px] space-y-1 mt-1.5">
                                  <div className="flex justify-between items-center text-slate-500">
                                    <span>{ui('m248519a6f1')}</span>
                                    <span className="font-mono font-bold text-slate-700">{formatMoney(item.amount)}</span>
                                  </div>
                                  
                                  {!item.isPayment && (
                                    <>
                                      <div className="flex justify-between items-center text-slate-500">
                                        <span>{ui('mc0289112fd')}</span>
                                        <span className="font-mono font-bold text-slate-700">{item.isPayer ? `+${formatMoney(item.amount)}` : ui('m4ccb02fc39')}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-slate-500">
                                        <span>{ui('m839c55a495')}</span>
                                        <span className="font-mono font-bold text-rose-600">{-item.share !== 0 ? `-${formatMoney(item.share)}` : ui('m4ccb02fc39')}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-left sm:text-right shrink-0 border-t border-dashed border-slate-100 pt-2 sm:pt-0 sm:border-0">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{ui('m4f2ac2fed8')}</span>
                              <span className={`text-sm font-black font-mono mt-0.5 block ${
                                isPositive ? "text-emerald-650" : "text-rose-600"
                              }`}>
                                {isPositive ? "+" : ""}{formatMoney(item.netImpact)}
                              </span>
                              
                              {isOlderThanPayment ? (
                                <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md mt-1 select-none">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-slate-450 shrink-0" />
                                  {ui('m549ebfbb94')}</span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 bg-teal-50 border border-teal-100 text-teal-700 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md mt-1 select-none">
                                  <Sparkles className="w-2.5 h-2.5 text-teal-600 shrink-0 animate-pulse" />
                                  {ui('m980db3d84b')}</span>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
                {children}
              </div>
            ) : (
              /* TAB 2: EXPENSES PAID OUT-OF-POCKET BY THIS MEMBER */
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8 space-y-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {/* Summary banner */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {ui('m051fcdd63c')}</span>
                      <span className="text-base font-black text-emerald-700">
                        {formatMoney(totalPaidOut)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                    {memberPaidExpenses.length} {ui('m6e058c8c15')}</span>
                </div>

                {memberPaidExpenses.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-xs">{ui('m2d7b072923')}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        {ui('m81823b8737')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {memberPaidExpenses.map((exp) => {
                      const participantCount = exp.participantIds ? exp.participantIds.length : members.length;

                      return (
                        <div
                          key={exp.id}
                          className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-3xs hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#03B875] border border-emerald-100 flex items-center justify-center shrink-0">
                              <ArrowUpRight className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-xs text-slate-850 truncate">
                                {exp.description}
                              </h5>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                                <span className="flex items-center gap-1 text-slate-500 font-semibold">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatDate(exp.date)}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {participantCount} {ui('m941015276b')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="font-mono font-black text-sm text-slate-900 block">
                              {formatMoney(exp.amount)}
                            </span>
                            <span className="text-[9px] text-[#03B875] font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-0.5">
                              {ui('mce64d2035a')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Floating Explanation Banner Popup */}
            <AnimatePresence>
              {activeTab === "statement" && showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 45, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 45, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="absolute bottom-4 left-4 right-4 z-50 bg-white border border-slate-200/90 rounded-[24px] p-4.5 shadow-2xl flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-1.5 bg-teal-50 rounded-full border border-teal-100 text-teal-600 shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed font-bold">
                      <strong className="text-teal-700">{ui('m8c915e39c0')}</strong> {ui('m4114de9993')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowExplanation(false)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm select-none shrink-0"
                  >
                    {ui('mf46981ba81')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
