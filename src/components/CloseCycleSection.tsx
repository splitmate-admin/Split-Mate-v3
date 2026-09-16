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
import { formatCurrencyAmount, useTranslation } from "../utils/i18n";

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
  const { lang, t } = useTranslation();
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [selectedArchivedCycle, setSelectedArchivedCycle] = useState<BillingCycle | null>(null);
  const [showArchivedDetails, setShowArchivedDetails] = useState(false);
  
  if (!activeGroup) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Info className="w-8 h-8 text-slate-350 mx-auto mb-2 animate-bounce" />
        <p className="font-semibold text-xs">{lang === 'vi' ? 'Vui lòng chọn hoặc tạo nhóm hoạt động để tiếp tục.' : 'Please select or create an active group to continue.'}</p>
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
      showAlert(
        lang === 'vi' ? "Quyền Thủ Quỹ" : "Treasurer Permission",
        lang === 'vi' ? "Chỉ Trưởng nhóm / Thủ quỹ mới có quyền chốt sổ kỳ chi tiêu." : "Only the group leader / treasurer has permission to close the billing cycle."
      );
      return;
    }

    if (tryOfflineMode || plan === "TRY_OFFLINE") {
      showAlert(
        lang === 'vi' ? "Tính năng Nâng Cấp" : "Upgrade Feature",
        lang === 'vi' ? "Chế độ xài 1 lần không hỗ trợ chốt sổ và lưu trữ kỳ lịch sử. Vui lòng Đăng ký tài khoản và Nâng cấp nhóm để sử dụng!" : "One-time mode does not support cycle closing and history archiving. Please sign up and upgrade the group to use this feature!"
      );
      onShowUpgradeModal();
      return;
    }

    if (isFree) {
      onShowUpgradeModal();
      return;
    }

    if (expenses.length === 0) {
      showAlert(
        lang === 'vi' ? "Không có hóa đơn" : "No Invoices",
        lang === 'vi' ? "Kỳ hiện tại chưa có hóa đơn nào được ghi nhận để chốt sổ." : "There are no recorded expenses in the current cycle to close."
      );
      return;
    }

    // Set default name for the cycle: "Kỳ Tháng M/YYYY" or "Cycle M/YYYY"
    const now = new Date();
    setNewCycleName(lang === 'vi' ? `Kỳ Tháng ${now.getMonth() + 1}/${now.getFullYear()}` : `Cycle ${now.getMonth() + 1}/${now.getFullYear()}`);
    setIsClosingModalOpen(true);
  };

  const handleConfirmCloseCycle = async () => {
    if (!newCycleName.trim()) {
      showAlert(
        lang === 'vi' ? "Lỗi nhập liệu" : "Input Error",
        lang === 'vi' ? "Vui lòng nhập tên cho kỳ chi tiêu này." : "Please enter a name for this billing cycle."
      );
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
      showAlert(
        lang === 'vi' ? "🎉 Chốt Sổ Thành Công" : "🎉 Cycle Closed Successfully",
        lang === 'vi' ? `Đã lưu trữ thành công "${newCycleName.trim()}" và đặt lại kỳ chi tiêu mới!` : `Successfully archived "${newCycleName.trim()}" and started a new cycle!`
      );
    } catch (err) {
      console.error("Error closing cycle:", err);
      showAlert(
        lang === 'vi' ? "Lỗi hệ thống" : "System Error",
        lang === 'vi' ? "Không thể chốt sổ kỳ hiện tại. Vui lòng thử lại sau." : "Failed to close the current cycle. Please try again later."
      );
    }
  };

  // Format currency
  const formatMoney = (amount: number) => {
    return formatCurrencyAmount(amount, activeGroup?.currency || "VND");
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
            {lang === 'vi' ? 'Chốt Sổ & Lưu Trữ' : 'Archive & Cycles'}
          </h2>
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
              {activeGroup.currentCycleName || (lang === 'vi' ? "Kỳ Hiện Tại" : "Current Cycle")}
            </h3>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg border border-emerald-100">
            {lang === 'vi' ? 'Đang hoạt động' : 'Active'}
          </span>
        </div>

        {/* Statistical block */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/70">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'vi' ? 'Hóa đơn chưa chốt' : 'Unarchived Invoices'}</p>
            <p className="text-base font-black text-slate-800 mt-0.5">
              {currentUnclosedCount} <span className="text-xs font-bold text-slate-500">{lang === 'vi' ? 'tờ' : 'items'}</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'vi' ? 'Tổng chi tiêu kỳ này' : 'Total Spending This Cycle'}</p>
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
                {lang === 'vi' ? 'Tất toán sòng phẳng 100% - Sẵn sàng chốt sổ' : '100% Settled Up - Ready to Archive'}
              </span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-rose-600">
                {lang === 'vi' ? `Còn ${unpaidCount} thành viên chưa đóng hết nợ` : `${unpaidCount} member(s) haven't settled up yet`}
              </span>
            </>
          )}
        </div>

        {/* Main action call for Close Cycle */}
        {tryOfflineMode || plan === "TRY_OFFLINE" ? (
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{lang === 'vi' ? 'Khóa Tính Năng Chốt Sổ (Chế độ xài 1 lần)' : 'Cycle Closing Locked (One-time Mode)'}</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
              {lang === 'vi' 
                ? 'Chế độ xài 1 lần dùng cho các chuyến đi nhanh ngắn hạn và không hỗ trợ chốt sổ hay đóng kỳ lịch sử. Vui lòng Đăng ký tài khoản và Nâng cấp nhóm để mở khóa tính năng Chốt Sổ vĩnh viễn!'
                : 'One-time mode is for quick short-term trips and does not support archiving. Please sign up and upgrade the group to permanently unlock Cycle Archiving!'}
            </p>
            <button
              type="button"
              onClick={onShowUpgradeModal}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Nâng cấp nhóm để Mở Khóa Chốt Sổ 🚀' : 'Upgrade Group to Unlock Archiving 🚀'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpenCloseCycle}
            className="w-full bg-[#03B875] hover:bg-[#029a62] text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-500/10 active:scale-98 cursor-pointer"
          >
            <FolderLock className="w-4 h-4 shrink-0" />
            {lang === 'vi' ? 'Chốt sổ kỳ này & Lưu trữ' : 'Close Cycle & Archive'}
          </button>
        )}
      </div>

      {/* 2. ARCHIVED CYCLES AREA */}
      <div className="text-left space-y-3">
        <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest pl-1">
          {lang === 'vi' ? 'Lịch sử các Kỳ đã lưu trữ' : 'Archived Billing Cycles'}
        </h3>

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
                  <h4 className="font-extrabold text-xs text-slate-800">{lang === 'vi' ? '📁 Kỳ Tháng 5/2026 (Đã chốt sổ 🔒)' : '📁 May 2026 Cycle (Archived 🔒)'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {lang === 'vi' ? '01/05 - 31/05/2026 • 18 hóa đơn' : '01/05 - 31/05/2026 • 18 invoices'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-black text-emerald-600">14.520.000 đ</span>
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold text-slate-400 px-2 py-1 bg-slate-100/50 rounded-md border border-slate-200/30">
                    {lang === 'vi' ? '📄 PDF Kế Toán' : '📄 PDF Report'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 px-2 py-1 bg-slate-100/50 rounded-md border border-slate-200/30">
                    {lang === 'vi' ? '📊 Chi tiết' : '📊 Details'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informative block for conversion */}
            <div className="bg-gradient-to-br from-indigo-55/40 to-emerald-55/10 border border-indigo-100/60 rounded-[22px] p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-xs text-slate-800">{lang === 'vi' ? 'Lưu Trữ Chu Kỳ Vĩnh Viễn' : 'Permanent Cycle Archiving'}</h4>
                <p className="text-[10px] font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {lang === 'vi' ? 'Bảo toàn hóa đơn chứng từ & xuất báo cáo PDF chuẩn xác cho nhóm.' : 'Keep records preserved & export accurate accounting PDF reports.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onShowUpgradeModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-2 px-4 rounded-lg transition-all shadow-xs inline-flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                {lang === 'vi' ? 'Nâng cấp Bè Bạn / Hội Làng' : 'Upgrade Group'}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (!activeGroup.billingCycles || activeGroup.billingCycles.length === 0) ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-[22px] p-5 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-xs text-slate-800">{lang === 'vi' ? 'Sẵn sàng Lưu trữ Vĩnh viễn' : 'Ready for Archiving'}</h4>
              <p className="text-[10px] font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                {lang === 'vi' 
                  ? <>Nhóm đang sử dụng gói cao cấp <span className="text-emerald-600 font-extrabold">{plan === "BE_BAN" ? "Bè Bạn 👥" : "Hội Làng 🏡"}</span>. Chưa có kỳ chi tiêu nào được lưu trữ. Hãy nhấn nút <strong className="text-slate-800">"Chốt sổ kỳ này & Lưu trữ"</strong> phía trên để chốt sổ kì đầu tiên!</>
                  : <>This group is on premium plan <span className="text-emerald-600 font-extrabold">{plan === "BE_BAN" ? "Friends 👥" : "Community 🏡"}</span>. No billing cycles have been archived yet. Click <strong className="text-slate-800">"Close Cycle & Archive"</strong> above to archive your first cycle!</>}
              </p>
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
                    🔒 Đã chốt
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'vi' ? 'Tổng chi tiêu' : 'Total Spending'}</span>
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
                      {lang === 'vi' ? 'PDF Báo Cáo' : 'PDF Report'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArchivedCycle(cycle);
                        setShowArchivedDetails(true);
                      }}
                      className="text-[10px] font-black text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      {lang === 'vi' ? 'Chi tiết' : 'Details'}
                      <ChevronRight className="w-3.5 h-3.5" />
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
                <h4 className="font-extrabold text-sm text-slate-850">{lang === 'vi' ? 'Chốt Sổ Kỳ Chi Tiêu' : 'Close Billing Cycle'}</h4>
                <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed">
                  {lang === 'vi' 
                    ? 'Thao tác này sẽ đóng và lưu mảng hóa đơn hiện tại làm lịch sử kỳ đã qua, đồng thời đặt lại trang "Tổng quan" & "Chi tiêu" về ban đầu để mở kỳ hoạt động kế tiếp.'
                    : 'This action will archive current expenses to history and reset Overview & Expenses to start a fresh cycle.'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest pl-0.5">{lang === 'vi' ? 'Đặt tên kỳ chi tiêu' : 'Billing Cycle Name'}</label>
              <input
                type="text"
                required
                value={newCycleName}
                onChange={(e) => setNewCycleName(e.target.value)}
                placeholder={lang === 'vi' ? "Ví dụ: Kỳ Tháng 7/2026, Du lịch Nha Trang..." : "e.g. July 2026, Nha Trang Trip..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 font-semibold text-slate-800 text-xs transition-all"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                {lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseCycle}
                className="flex-1 bg-[#03B875] hover:bg-[#029a62] text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {lang === 'vi' ? 'Xác nhận Chốt sổ' : 'Confirm Close'}
              </button>
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
                <span className="text-[10px] text-slate-400 block">{lang === 'vi' ? 'Tổng Spending' : 'Total Spending'}</span>
                <span className="font-extrabold text-emerald-600 text-sm mt-0.5 block">
                  {formatMoney(selectedArchivedCycle.totalSpending ?? selectedArchivedCycle.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0)}
                </span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex-1 text-center">
                <span className="text-[10px] text-slate-400 block">{lang === 'vi' ? 'Số hóa đơn' : 'Invoices'}</span>
                <span className="font-extrabold text-slate-850 text-sm mt-0.5 block">
                  {selectedArchivedCycle.expensesCount ?? selectedArchivedCycle.expenses?.length ?? 0} {lang === 'vi' ? 'tờ' : 'items'}
                </span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex-1 text-center">
                <span className="text-[10px] text-slate-400 block">{lang === 'vi' ? 'Ngày chốt' : 'Closed Date'}</span>
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
                        <span>{lang === 'vi' ? 'Trả bởi' : 'Paid by'}: {members.find(m => m.id === exp.payerId)?.name || (lang === 'vi' ? "Không rõ" : "Unknown")}</span>
                      </div>
                    </div>
                    <span className="font-black text-xs text-slate-800">{formatMoney(exp.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs text-center py-6">{lang === 'vi' ? 'Kỳ này không có hóa đơn chi tiết.' : 'No detailed expenses in this cycle.'}</p>
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
              {lang === 'vi' ? 'Xuất PDF Kế Toán Kỳ Này' : 'Export Accounting PDF Report'}
            </button>
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
              {lang === 'vi' ? '🧪 Nạp Dữ liệu Mẫu (Vũng Tàu)' : '🧪 Load Sample Data'}
            </button>
          )}
          {handleClearActiveGroupData && (
            <button
              type="button"
              onClick={handleClearActiveGroupData}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-extrabold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
            >
              {lang === 'vi' ? 'Xóa dữ liệu chi tiêu' : 'Clear Expense Data'}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
