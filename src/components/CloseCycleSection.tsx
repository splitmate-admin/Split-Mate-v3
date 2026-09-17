import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState } from "react";
import { 
  FolderLock, 
  Lock, 
  Folder, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  Sparkles,
  ArrowRight,
  ChevronDown,
  Info,
  CalendarDays,
  User,
  Users
} from "lucide-react";
import { Group, Member, Expense, BillingCycle, getPlanLabel } from "../types";
import { calculateBalances } from "../utils/debtSimplifier";

interface CloseCycleSectionProps {
  activeGroup: Group | null;
  members: Member[];
  expenses: Expense[];
  isAdmin: boolean;
  viewingMemberId?: string;
  onUpdateGroup: (updatedGroup: Group) => Promise<void>;
  onShowUpgradeModal: () => void;
  tryOfflineMode?: boolean;
  showAlert: (title: string, desc: string) => void;
  askConfirm: (title: string, desc: string, onConfirm: () => void) => void;
  onGeneratePDFReport: (archiveExpenses?: Expense[], archiveCycleName?: string) => void;
  user?: any;
  memberAccessCodeUser?: any;
  setIsAdmin: (isAdmin: boolean) => void;
  setViewingMemberId: (id?: string) => void;
  setMemberAccessCodeUser: (val: any) => void;
  handleLoadVungTauTestData?: () => void;
  handleClearActiveGroupData?: () => void;
  handleLogout: () => void;
}

export default function CloseCycleSection({
  activeGroup,
  members,
  expenses,
  isAdmin,
  viewingMemberId,
  onUpdateGroup,
  onShowUpgradeModal,
  tryOfflineMode,
  showAlert,
  askConfirm,
  onGeneratePDFReport,
  user,
  memberAccessCodeUser,
  setIsAdmin,
  setViewingMemberId,
  setMemberAccessCodeUser,
  handleLoadVungTauTestData,
  handleClearActiveGroupData,
  handleLogout
}: CloseCycleSectionProps) {
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [selectedArchivedCycle, setSelectedArchivedCycle] = useState<BillingCycle | null>(null);
  const [showArchivedDetails, setShowArchivedDetails] = useState(false);
  
  if (!activeGroup) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Info className="w-8 h-8 text-slate-350 mx-auto mb-2 animate-bounce" />
        <p className="font-semibold text-xs">{ui('m50dd003d4a')}</p>
      </div>
    );
  }

  const plan = activeGroup.plan || "FREE";
  const isFree = plan === "FREE";

  // Calculate stats for current active cycle
  const currentUnclosedCount = expenses.length;
  const currentTotalSpending = expenses.reduce((sum, e) => (e.isFundDeposit || e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? sum : sum + e.amount, 0);

  // Compute balance and check settle health status
  const balances = calculateBalances(members, expenses);
  
  // Members who still owe money (netBalance < -10 to tolerate tiny floating precision issues)
  const unpaidMembers = balances.filter(b => b.netBalance < -10);
  const unpaidCount = unpaidMembers.length;
  const isFullySettled = unpaidCount === 0;

  // Handle Close Cycle trigger
  const handleOpenCloseCycle = () => {
    if (!isAdmin) {
      showAlert(ui('me1e884a883'), ui('ma1722c034d'));
      return;
    }

    if (tryOfflineMode || plan === "TRY_OFFLINE") {
      showAlert(ui('m82fbe136f3'), ui('mca46c6d74f'));
      onShowUpgradeModal();
      return;
    }

    if (isFree) {
      onShowUpgradeModal();
      return;
    }

    if (expenses.length === 0) {
      showAlert(ui('mdce796379d'), ui('mb5af56a707'));
      return;
    }

    // Set default name for the cycle: "Kỳ Tháng M/YYYY"
    const now = new Date();
    setNewCycleName(ui('m473ab92f66', { v0: now.getMonth() + 1, v1: now.getFullYear() }));
    setIsClosingModalOpen(true);
  };

  const handleConfirmCloseCycle = async () => {
    if (!newCycleName.trim()) {
      showAlert(ui('m9d9aafc118'), ui('m03f69e934f'));
      return;
    }

    setIsClosingModalOpen(false);

    // Find date range
    let startDate = new Date().toISOString();
    let endDate = new Date().toISOString();
    if (expenses.length > 0) {
      const dates = expenses.map(e => new Date(e.date || e.created_at || new Date()).getTime());
      startDate = new Date(Math.min(...dates)).toISOString();
      endDate = new Date(Math.max(...dates)).toISOString();
    }

    const newCycle: BillingCycle = {
      id: "cycle_" + Math.random().toString(36).substring(2, 9),
      name: newCycleName.trim(),
      startDate,
      endDate,
      expenses: [...expenses],
      archivedAt: new Date().toISOString(),
      totalSpending: currentTotalSpending,
      expensesCount: currentUnclosedCount,
      archivedExpenses: [...expenses],
      archivedDebtOffsets: [...(activeGroup.debtOffsets || [])],
      archivedPendingReceipts: [...(activeGroup.pendingReceipts || [])],
      closedAt: new Date().toISOString()
    };

    // Update group: add to billingCycles and empty active expenses, debtOffsets & pendingReceipts
    const updatedGroup: Group = {
      ...activeGroup,
      billingCycles: [newCycle, ...(activeGroup.billingCycles || [])],
      expenses: [], // Reset active expenses for next cycle
      debtOffsets: [], // Reset active debt offsets for next cycle
      pendingReceipts: [] // Reset active pending receipts for next cycle
    };

    try {
      await onUpdateGroup(updatedGroup);
      showAlert(ui('m41c292a9c3'), ui('m0b7790d048', { v0: newCycleName.trim() }));
    } catch (err) {
      console.error("Error closing cycle:", err);
      showAlert(ui('mb3af2fa4d2'), ui('m82cfb5c48b'));
    }
  };

  // Format currency
  const formatMoney = (amount: number) => {
    return Math.round(amount).toLocaleString(getLocale()) + " đ";
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <div className="flex-1 flex flex-col space-y-5 px-4 pt-3 pb-8 text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-left">
          <h2 className="text-xl font-black text-slate-850 tracking-tight flex items-center gap-2">
            {ui('m4348d30932')}</h2>
        </div>
        
        {/* Tier badge displaying group level with proud royalty look */}
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full border shadow-3xs transition-all ${
          tryOfflineMode || plan === "TRY_OFFLINE"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : plan === "HOI_LANG" 
            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
            : plan === "BE_BAN"
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : plan === "DU_HI_30"
            ? "bg-blue-50 text-blue-600 border-blue-200"
            : "bg-slate-50 text-slate-500 border-slate-200"
        }`}>
          {tryOfflineMode || plan === "TRY_OFFLINE" ? "⚡" : plan === "HOI_LANG" ? "👑" : plan === "BE_BAN" ? "⭐️" : plan === "DU_HI_30" ? "🚗" : "🌱"} {getPlanLabel(plan, tryOfflineMode)}
        </span>
      </div>

      {/* 1. ACTIVE CYCLE CARD */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-5 shadow-sm text-left space-y-4 relative overflow-hidden">
        {/* Decorative dynamic background glow pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              {activeGroup.currentCycleName || ui('m8f99d17c4b')}
            </h3>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-100">
            {ui('m9a616fcdad')}</span>
        </div>

        {/* Statistical block */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/70">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{ui('mce52649596')}</p>
            <p className="text-base font-black text-slate-800 mt-0.5">
              {currentUnclosedCount} <span className="text-xs font-bold text-slate-500">{ui('mc8ebb3d2ff')}</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{ui('m4f000072db')}</p>
            <p className="text-base font-black text-emerald-600 mt-0.5">
              {formatMoney(currentTotalSpending)}
            </p>
          </div>
        </div>

        {/* Financial health report status indicator */}
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-150/70 rounded-xl">
          {isFullySettled ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-emerald-700">
                {ui('m0fbe2490e9')}</span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-rose-600">
                {ui('m75f5cf26ec')}{unpaidCount} {ui('md91c3f7975')}</span>
            </>
          )}
        </div>

        {/* Main action call for Close Cycle */}
        {tryOfflineMode || plan === "TRY_OFFLINE" ? (
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{ui('mb2ee380f02')}</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
              {ui('m900455daad')}</p>
            <button
              type="button"
              onClick={onShowUpgradeModal}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {ui('m21b479e5e0')}</button>
          </div>
        ) : (
          <button
            onClick={handleOpenCloseCycle}
            className="w-full bg-[#03B875] hover:bg-[#029a62] text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-500/10 active:scale-98 cursor-pointer"
          >
            <FolderLock className="w-4 h-4 shrink-0" />
            {ui('mdb311f823e')}</button>
        )}
      </div>

      {/* 2. ARCHIVED CYCLES AREA */}
      <div className="text-left space-y-3">
        <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest pl-1">
          {ui('mde4ce2d0de')}</h3>

        {/* Condition 1: Free Tier or No Cycles Saved yet -> Display Stunning Demo/Sample Cards (The Demo Card Hack) */}
        {isFree ? (
          <div className="space-y-3">
            {/* Elegant fading Sample Card */}
            <div className="bg-slate-50/70 border border-dashed border-slate-200/90 rounded-[22px] p-4 opacity-45 relative overflow-hidden select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800">{ui('m040c81af49')}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {ui('m04ec1bdd66')}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-black text-emerald-600">{ui('m57a445e473')}</span>
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold text-slate-400 px-2 py-1 bg-slate-100/50 rounded-md border border-slate-200/30">
                    {ui('m363bb45c90')}</span>
                  <span className="text-[9px] font-bold text-slate-400 px-2 py-1 bg-slate-100/50 rounded-md border border-slate-200/30">
                    {ui('m609dd1f900')}</span>
                </div>
              </div>
            </div>

            {/* Informative block for conversion */}
            <div className="bg-gradient-to-br from-indigo-55/40 to-emerald-55/10 border border-indigo-100/60 rounded-[22px] p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-xs text-slate-800">{ui('m34c5004c2a')}</h4>
                <p className="text-[10px] font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {ui('mf7df3b1d8d')}</p>
              </div>
              <button
                type="button"
                onClick={onShowUpgradeModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-2 px-4 rounded-lg transition-all shadow-xs inline-flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                {ui('ma2adc2b1d0')}<ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (!activeGroup.billingCycles || activeGroup.billingCycles.length === 0) ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-[22px] p-5 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-xs text-slate-800">{ui('m8f36a32049')}</h4>
              <p className="text-[10px] font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                {ui('m468d777320')}<span className="text-emerald-600 font-extrabold">{plan === "BE_BAN" ? ui('m790b0bd827') : ui('maed4f4a7a8')}</span>{ui('m2099adeebb')}<strong className="text-slate-800">{ui('m7a64064064')}</strong> {ui('mb61bbbaf6a')}</p>
            </div>
          </div>
        ) : (
          /* Condition 2: Active Premium List of Billing Cycles */
          <div className="space-y-3">
            {activeGroup.billingCycles.map((cycle) => (
              <div 
                key={cycle.id}
                className="bg-white border border-slate-150 rounded-[22px] p-4 hover:shadow-md transition-all text-slate-800 space-y-3.5 relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Folder className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{cycle.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                      </p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-slate-200">
                    {ui('m4a5d1bbaf4')}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{ui('m7817b94196')}</span>
                    <span className="text-sm font-black text-emerald-600">
                      {formatMoney(cycle.totalSpending ?? cycle.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onGeneratePDFReport(cycle.archivedExpenses ?? cycle.expenses, cycle.name)}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/85 border border-indigo-100 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {ui('mf90803bc00')}</button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArchivedCycle(cycle);
                        setShowArchivedDetails(true);
                      }}
                      className="text-[10px] font-black text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      {ui('md72a6317ec')}<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: CONFIRM CLOSE CYCLE FORM */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsClosingModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 max-w-sm w-full relative shadow-2xl z-10 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-850">{ui('m2f9f509021')}</h4>
                <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed">
                  {ui('m792810dd1a')}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest pl-0.5">{ui('m8c63b7d563')}</label>
              <input
                type="text"
                required
                value={newCycleName}
                onChange={(e) => setNewCycleName(e.target.value)}
                placeholder={ui('mac7675951c')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 font-semibold text-slate-800 text-xs transition-all"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {ui('m247d4b1efe')}</button>
              <button
                type="button"
                onClick={handleConfirmCloseCycle}
                className="flex-1 bg-[#03B875] hover:bg-[#029a62] text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {ui('mc61fdbdca4')}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ARCHIVED CYCLE DETAILS LIST (READ ONLY) */}
      {showArchivedDetails && selectedArchivedCycle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowArchivedDetails(false)} />
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[32px] w-full max-w-md p-5 text-slate-800 shadow-2xl relative pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] flex flex-col z-10 text-left">
            
            {/* Top Indicator bar for pull swipe on mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 block sm:hidden" />
            
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-500 shrink-0" />
                <h4 className="font-black text-sm text-slate-850 truncate">{selectedArchivedCycle.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowArchivedDetails(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick stats for this archived cycle */}
            <div className="flex gap-2 bg-slate-50 border border-slate-150 p-3 rounded-2xl mb-4 text-xs font-bold text-slate-600">
              <div className="flex-1 text-center">
                <span className="text-[10px] text-slate-400 block">{ui('m0290feafe5')}</span>
                <span className="font-extrabold text-emerald-600 text-sm mt-0.5 block">
                  {formatMoney(selectedArchivedCycle.totalSpending ?? selectedArchivedCycle.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0)}
                </span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex-1 text-center">
                <span className="text-[10px] text-slate-400 block">{ui('md4ced838e6')}</span>
                <span className="font-extrabold text-slate-850 text-sm mt-0.5 block">
                  {selectedArchivedCycle.expensesCount ?? selectedArchivedCycle.expenses?.length ?? 0} {ui('mc8ebb3d2ff')}</span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex-1 text-center">
                <span className="text-[10px] text-slate-400 block">{ui('mab978a35d3')}</span>
                <span className="font-extrabold text-slate-850 text-sm mt-0.5 block">
                  {formatDate(selectedArchivedCycle.closedAt ?? selectedArchivedCycle.archivedAt)}
                </span>
              </div>
            </div>

            {/* Scrollable List of Archived Expenses */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[45vh]">
              {(selectedArchivedCycle.archivedExpenses ?? selectedArchivedCycle.expenses) && (selectedArchivedCycle.archivedExpenses ?? selectedArchivedCycle.expenses).length > 0 ? (
                (selectedArchivedCycle.archivedExpenses ?? selectedArchivedCycle.expenses).map((exp) => (
                  <div key={exp.id} className="p-3 bg-white border border-slate-150 rounded-xl flex justify-between items-center">
                    <div className="text-left space-y-1">
                      <p className="font-extrabold text-xs text-slate-800">{exp.description}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                        <span>{formatDate(exp.date)}</span>
                        <span>•</span>
                        <span>{ui('m36bdbc9ede')}{members.find(m => m.id === exp.payerId)?.name || ui('m988a61b595')}</span>
                      </div>
                    </div>
                    <span className="font-black text-xs text-slate-800">{formatMoney(exp.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs text-center py-6">{ui('mc0ad03eeb8')}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowArchivedDetails(false);
                onGeneratePDFReport(selectedArchivedCycle.archivedExpenses ?? selectedArchivedCycle.expenses, selectedArchivedCycle.name);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl mt-4 cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <FileText className="w-4 h-4" />
              {ui('mcea7d650ef')}</button>
          </div>
        </div>
      )}

      {/* Dev tools hidden for ordinary users */}
      {user?.email === "splitmate.admin@gmail.com" && (
        <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-[22px] flex flex-wrap gap-2 mt-4 text-left">
          {handleLoadVungTauTestData && (
            <button
              type="button"
              onClick={handleLoadVungTauTestData}
              className="bg-amber-55 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-extrabold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
            >
              {ui('m7f453211b6')}</button>
          )}
          {handleClearActiveGroupData && (
            <button
              type="button"
              onClick={handleClearActiveGroupData}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-extrabold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
            >
              {ui('m31c2f4c386')}</button>
          )}
        </div>
      )}

    </div>
  );
}
