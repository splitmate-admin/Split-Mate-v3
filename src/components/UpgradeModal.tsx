import { formatDisplayDateTime, formatDisplayDate } from '../utils/dateUtils';
import { errorMessage as localizeError } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Crown, 
  Zap, 
  Check, 
  ArrowRight, 
  QrCode, 
  CreditCard, 
  Gift,
  ShieldCheck,
  Users,
  Scan,
  FileText,
  AlertCircle,
  Loader2,
  Image
} from "lucide-react";
import { Group, PlanType } from "../types";
import { formatDateTime, parseFormattedDate } from "../utils/dateUtils";

export const normalizePlan = (plan?: string): PlanType => {
  if (plan === "VIP") return "BE_BAN";
  if (plan === "PREMIUM") return "HOI_LANG";
  return (plan || "FREE") as PlanType;
};

export const isPlanHigherOrEqual = (current?: string, target?: string): boolean => {
  const c = normalizePlan(current);
  const t = normalizePlan(target);
  if (c === t) return true;
  if (c === "HOI_LANG") return true;
  if (c === "BE_BAN") {
    if (t === "HOI_LANG") return false;
    return true;
  }
  if (c === "DU_HI_30") {
    if (t === "FREE" || t === "DU_HI_30") return true;
    return false;
  }
  return false;
};

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  currentUser: any;
  onUpgradeSuccess: (newPlan: PlanType, activatedAt?: string, expiredAt?: string) => void;
  showAlert: (title: string, message: string) => void;
  onRequestCreateGroup?: () => void;
  tryOfflineMode?: boolean;
  onRequireLogin?: () => void;
}

const PLANS = [
  {
    type: "DU_HI_30" as PlanType,
    get name() { return ui('mee0fbc0fe2'); },
    get price() { return ui('mfdd3fd3f52'); },
    priceRaw: 29000,
    color: "emerald",
    features: [
      { get text() { return ui('m8c090baace'); }, icon: Users },
      { get text() { return ui('m632a2b6555'); }, icon: FileText },
      { get text() { return ui('m32c0f92a28'); }, icon: Scan },
      { get text() { return ui('mc43acb8ae9'); }, icon: Image },
      { get text() { return ui('m289edf6dd0'); }, icon: QrCode },
      { get text() { return ui('m3d207f9d6f'); }, icon: Check },
      { get text() { return ui('m55ac0f05a1'); }, icon: Zap, isSpecial: true },
    ]
  },
  {
    type: "BE_BAN" as PlanType,
    get name() { return ui('m8633ebc74f'); },
    get price() { return ui('mad3a1e1075'); },
    priceRaw: 49000,
    color: "amber",
    features: [
      { get text() { return ui('mfc8500afa1'); }, icon: Users },
      { get text() { return ui('m632a2b6555'); }, icon: FileText },
      { get text() { return ui('m95199f376a'); }, icon: Scan },
      { get text() { return ui('m1a85170195'); }, icon: Image },
      { get text() { return ui('m289edf6dd0'); }, icon: QrCode, isSpecial: true },
      { get text() { return ui('m3d207f9d6f'); }, icon: Check },
      { get text() { return ui('m0e6e88f92b'); }, icon: ShieldCheck },
    ]
  },
  {
    type: "HOI_LANG" as PlanType,
    get name() { return ui('m4ace909a8f'); },
    get price() { return ui('m801ea753d6'); },
    priceRaw: 99000,
    color: "indigo",
    features: [
      { get text() { return ui('m810ed1a0a8'); }, icon: Users },
      { get text() { return ui('m632a2b6555'); }, icon: FileText },
      { get text() { return ui('mdff64c92c5'); }, icon: Scan, isSpecial: true },
      { get text() { return ui('mac1a663b82'); }, icon: Image },
      { get text() { return ui('m289edf6dd0'); }, icon: QrCode },
      { get text() { return ui('m3d207f9d6f'); }, icon: Check },
      { get text() { return ui('m605a78c9df'); }, icon: ShieldCheck },
    ]
  }
];

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  group, 
  currentUser,
  onUpgradeSuccess,
  showAlert,
  onRequestCreateGroup,
  tryOfflineMode,
  onRequireLogin
}: UpgradeModalProps) {
  const [step, setStep] = useState<"pricing" | "checkout">("pricing");
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [isVoucherChecking, setIsVoucherChecking] = useState(false);
  const [autoShare, setAutoShare] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const [activeTab, setActiveTab] = useState<"trip" | "year">("trip");
  const [selectedYearPlanType, setSelectedYearPlanType] = useState<"BE_BAN" | "HOI_LANG">("BE_BAN");

  // Đồng bộ tab phù hợp dựa trên gói hiện tại của nhóm khi mở modal
  useEffect(() => {
    if (isOpen && group) {
      const currentPlan = normalizePlan(group.plan);
      if (currentPlan === "BE_BAN" || currentPlan === "HOI_LANG") {
        setActiveTab("year");
        setSelectedYearPlanType(currentPlan === "HOI_LANG" ? "HOI_LANG" : "BE_BAN");
      } else if (currentPlan === "DU_HI_30") {
        setActiveTab("trip");
      } else {
        setActiveTab("trip");
        setSelectedYearPlanType("BE_BAN");
      }
    }
  }, [isOpen, group]);

  // Polling for upgrade status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isOpen && step === "checkout" && group && selectedPlan) {
      console.log("[POLLING] Bắt đầu kiểm tra trạng thái thanh toán...");
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/groups/${group.id}`);
          if (res.ok) {
            const updatedGroup = await res.json();
            // Kiểm tra xem nhóm đã được nâng cấp lên gói mong muốn hoặc cao hơn chưa
            if (isPlanHigherOrEqual(updatedGroup.plan, selectedPlan.type)) {
              console.log("[POLLING] Phát hiện thanh toán thành công!");
              setIsUpgrading(true);
              clearInterval(interval!);
              
              // Chờ 1 chút để tạo hiệu ứng mượt
              setTimeout(() => {
                onUpgradeSuccess(normalizePlan(updatedGroup.plan), updatedGroup.planActivatedAt, updatedGroup.planExpiredAt);
                onClose();
                setIsUpgrading(false);
              }, 2000);
            }
          }
        } catch (err) {
          console.error("[POLLING ERROR] Lỗi khi kiểm tra trạng thái:", err);
        }
      }, 5000); // Kiểm tra mỗi 5 giây
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, step, group, selectedPlan, onUpgradeSuccess, onClose]);

  if (!isOpen || !group) return null;

  if (tryOfflineMode) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[28px] max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative border border-slate-150"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <Zap className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-850">{ui('m4583c27c69')}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                {ui('m35db920172')}<strong>{ui('mac12bc537b')}</strong>{ui('mbc34a462ae')}</p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onRequireLogin) onRequireLogin();
                }}
                className="w-full bg-[#03B875] hover:bg-[#029a62] text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{ui('md40c277023')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                {ui('md2b73ab2ad')}</button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const handleSelectPlan = (plan: any) => {
    if (isPlanHigherOrEqual(group?.plan, plan.type)) {
      showAlert(ui('m5d6af377c2'), ui('me36cb82be7'));
      return;
    }
    setSelectedPlan(plan);
    setStep("checkout");
  };

  const handleVoucherApply = async () => {
    if (!voucherCode.trim() || !group) return;
    setIsVoucherChecking(true);
    try {
      const adminEmail = currentUser?.email || group?.adminEmail || group?.admin_email || "";
      const res = await fetch("/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherCode.trim().toUpperCase(),
          groupId: group.id,
          adminEmail: adminEmail
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(localizeError(data.error, ui('mbf340b0d28')));
      
      onUpgradeSuccess(data.planType, data.planActivatedAt, data.planExpiredAt);
      onClose();
    } catch (err: any) {
      showAlert(ui('m57980e9b5e'), err.message);
    } finally {
      setIsVoucherChecking(false);
    }
  };

  // Lấy bank info từ env hoặc mặc định
  const adminBank = import.meta.env.VITE_ADMIN_BANK || "VIETCOMBANK";
  const adminAccNo = import.meta.env.VITE_ADMIN_ACC_NO || "1234567890";
  const inviteCode = group.id.slice(-6).toUpperCase(); // Giả sử invite code là 6 ký tự cuối ID
  const qrUrl = selectedPlan 
    ? `https://img.vietqr.io/image/${adminBank}-${adminAccNo}-compact.png?amount=${selectedPlan.priceRaw}&addInfo=SPLIT${inviteCode}`
    : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
      >
        {/* Success Overlay */}
        <AnimatePresence>
          {isUpgrading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">{ui('me343294760')}</h2>
              <p className="text-gray-500 mb-8 max-w-sm">
                {ui('m5d61db567a')}<b>{group.name}</b> {ui('mf493c6f368')}<b>{selectedPlan?.name}</b> {ui('m723630b040')}</p>
              <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                {ui('m6869f4b06a')}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Crown className="w-6 h-6 text-[#03B875]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">
                {step === "pricing" ? ui('mcb36bc5378') : ui('m40cda9fba3', { v0: selectedPlan?.name })}
              </h2>
              <p className="text-sm text-gray-500">{ui('mabf7a9cc68')}{group.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === "pricing" ? (
              <motion.div 
                key="pricing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                 {/* Current Active Plan Card */}
                 {normalizePlan(group.plan) !== "FREE" && (() => {
                   const fallbackActivatedAt = group.planActivatedAt || group.createdAt || new Date("2026-07-14T00:00:00.000Z").toISOString();
                   const fallbackExpiredAt = group.planExpiredAt || (group.createdAt ? new Date(parseFormattedDate(group.createdAt).getTime() + 365*24*60*60*1000).toISOString() : new Date("2027-07-14T00:00:00.000Z").toISOString());
                   const currentPlanType = normalizePlan(group.plan);
                   return (
                     <div className="bg-emerald-500/5 border border-[#03B875]/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <div className="flex items-start gap-3.5">
                         <div className="p-3 bg-[#03B875] text-white rounded-xl shadow-md shrink-0">
                           <Crown className="w-5 h-5 fill-white/20" />
                         </div>
                         <div className="space-y-1">
                           <h4 className="font-extrabold text-[#0F172A] flex items-center gap-2">
                             {ui('mbc519121a9')}{currentPlanType === "HOI_LANG" ? ui('m14724ffbc4') : currentPlanType === "DU_HI_30" ? ui('m47f66d8cab') : ui('m5d35bc723c')}
                           </h4>
                           <p className="text-xs text-slate-600 leading-relaxed">
                             {ui('m090d8e25b1')}<span className="font-semibold text-slate-800">
                               {formatDisplayDateTime(fallbackActivatedAt)}
                             </span>
                             <br />
                             {ui('mf33357ee55')}<span className="font-semibold text-slate-800">
                               {formatDisplayDateTime(fallbackExpiredAt)}
                             </span>
                           </p>
                         </div>
                       </div>
                       <div className="bg-[#03B875]/10 border border-[#03B875]/20 text-[#03B875] px-4 py-2 rounded-xl text-center shrink-0">
                         <span className="text-[10px] uppercase font-black tracking-wider block">{ui('m4c822cb718')}</span>
                         <span className="text-lg font-black">
                           {Math.max(0, Math.ceil((parseFormattedDate(fallbackExpiredAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} {ui('m8ccdd04078')}</span>
                       </div>
                     </div>
                   );
                 })()}

                 {/* Segment Control - Gạt phân loại nhu cầu */}
                 <div className="flex bg-slate-100 p-1 rounded-full max-w-sm mx-auto mb-6 border border-slate-200/50 shadow-sm">
                   <button
                     onClick={() => setActiveTab("trip")}
                     className={`flex-1 py-2 px-4 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                       activeTab === "trip"
                         ? "bg-[#03B875] text-white shadow-sm"
                         : "text-slate-600 hover:text-slate-900"
                     }`}
                   >
                     <span>{ui('m25975f7bdc')}</span>
                   </button>
                   <button
                     onClick={() => setActiveTab("year")}
                     className={`flex-1 py-2 px-4 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                       activeTab === "year"
                         ? "bg-[#03B875] text-white shadow-sm"
                         : "text-[#0F172A] hover:text-slate-900"
                     }`}
                   >
                     <span>{ui('m0461c07d92')}</span>
                   </button>
                 </div>

                 {/* Tab Content */}
                 <AnimatePresence mode="wait">
                   {activeTab === "trip" ? (
                     <motion.div
                       key="trip-tab"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       {/* Thẻ Card màu trắng bo góc mềm mại cho Gói Du Hí */}
                       <div className="border-2 border-[#03B875]/30 bg-white rounded-3xl p-6 shadow-sm max-w-md mx-auto space-y-6">
                         <div className="flex justify-between items-start">
                           <div>
                             <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                               <span>{ui('m6f67711ccd')}</span>
                               <span className="bg-[#E6F7F0] text-[#03B875] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-black">🚗</span>
                             </h3>
                             <p className="text-xs text-slate-500 mt-1">{ui('m6046450a1d')}</p>
                           </div>
                           <div className="text-right">
                             <div className="text-2xl font-black text-[#0F172A]">{ui('mfdd3fd3f52')}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{ui('m75aa06ba2d')}</div>
                           </div>
                         </div>
                         
                         <div className="h-px bg-slate-150" />
                         
                         <div className="space-y-3.5">
                           {PLANS.find(p => p.type === "DU_HI_30")?.features.map((feat, i) => (
                             <div key={i} className="flex items-start gap-3">
                               <div className="mt-0.5 p-0.5 bg-emerald-50 text-[#03B875] rounded-lg shrink-0">
                                 <Check className="w-3.5 h-3.5 stroke-[3px]" />
                               </div>
                               <span className={`text-xs font-bold leading-relaxed ${feat.isSpecial ? "text-[#03B875] bg-[#E6F7F0] px-2 py-0.5 rounded-lg" : "text-slate-700"}`}>
                                 {feat.text}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </motion.div>
                   ) : (
                     <motion.div
                       key="year-tab"
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="space-y-6"
                     >
                       {/* Flat List gồm 2 thẻ Card mỏng */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                         {PLANS.filter(p => p.type === "BE_BAN" || p.type === "HOI_LANG").map((plan) => {
                           const isSelected = selectedYearPlanType === plan.type;
                           const isCurrent = normalizePlan(group.plan) === plan.type;
                           
                           // Thời hạn nếu đang sử dụng
                           const fallbackExpiredAt = group.planExpiredAt || (group.createdAt ? new Date(parseFormattedDate(group.createdAt).getTime() + 365*24*60*60*1000).toISOString() : new Date("2027-07-14T00:00:00.000Z").toISOString());
                           const expireDateFormatted = formatDisplayDate(fallbackExpiredAt);
                           
                           return (
                             <div
                               key={plan.type}
                               onClick={() => {
                                 setSelectedYearPlanType(plan.type as "BE_BAN" | "HOI_LANG");
                               }}
                               className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 ${
                                 isSelected
                                   ? "border-[#03B875] bg-emerald-50/5"
                                   : "border-slate-100 hover:border-slate-200 bg-white"
                               }`}
                             >
                               <div className="space-y-2">
                                 <div className="flex justify-between items-start">
                                   <div>
                                     <h3 className="text-base font-extrabold text-[#0F172A]">{plan.name}</h3>
                                     <p className="text-[10px] text-slate-500 mt-0.5">{ui('m899bc0d47c')}</p>
                                   </div>
                                   <div className="text-right">
                                     <span className="text-lg font-black text-[#0F172A]">{plan.price}</span>
                                     <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">{ui('ma0b2bfc115')}</span>
                                   </div>
                                 </div>
                               </div>

                               {isCurrent ? (
                                 <span className="inline-block self-start bg-[#E6F7F0] text-[#03B875] rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                   {ui('meb11299ffd')}{expireDateFormatted})
                                 </span>
                               ) : isPlanHigherOrEqual(group.plan, plan.type) ? (
                                 <span className="inline-block self-start bg-slate-100 text-slate-400 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                   {ui('mb399d27417')}</span>
                               ) : (
                                 <span className={`inline-block self-start rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                   isSelected ? "bg-[#03B875] text-white" : "bg-slate-100 text-slate-600"
                                 }`}>
                                   {isSelected ? ui('m1ebb48f4eb') : ui('m15d53e14a9')}
                                 </span>
                               )}
                             </div>
                           );
                         })}
                       </div>

                       {/* Danh sách tính năng tương ứng của gói được chọn hiển thị mượt mà */}
                       {(() => {
                         const activePlanInfo = PLANS.find(p => p.type === selectedYearPlanType);
                         if (!activePlanInfo) return null;
                         return (
                           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 max-w-2xl mx-auto">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                               {ui('m84c0eceaf0')}{activePlanInfo.name}
                             </h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                               {activePlanInfo.features.map((feat, i) => (
                                 <div key={i} className="flex items-start gap-2.5">
                                   <div className="mt-0.5 p-0.5 bg-emerald-50 text-[#03B875] rounded-lg shrink-0">
                                     <Check className="w-3 h-3 stroke-[3px]" />
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                     <feat.icon className="w-4 h-4 text-slate-400 shrink-0" />
                                     <span className={`text-xs font-bold ${feat.isSpecial ? "text-[#03B875] bg-[#E6F7F0] px-1.5 py-0.5 rounded-md" : "text-slate-700"}`}>
                                       {feat.text}
                                     </span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                       })()}
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Voucher Input Box - Nâng cấp trực tiếp bằng mã quà tặng */}
                 <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-4 sm:p-5 max-w-2xl mx-auto space-y-3 shadow-xs">
                   <div className="flex items-center gap-2.5">
                     <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                       <Gift className="w-4 h-4 stroke-[2.5px]" />
                     </div>
                     <div>
                       <h4 className="text-xs font-black text-[#0F172A]">
                         {ui('m2c445d0c41')}</h4>
                     </div>
                   </div>

                   <div className="flex flex-col sm:flex-row gap-2">
                     <input 
                       type="text" 
                       value={voucherCode}
                       onChange={(e) => setVoucherCode(e.target.value)}
                       placeholder={ui('m72aa144fee')}
                       className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#03B875] placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                     />
                     <button 
                       onClick={handleVoucherApply}
                       disabled={!voucherCode.trim() || isVoucherChecking}
                       className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
                     >
                       {isVoucherChecking ? (
                         <>
                           <Loader2 className="w-3.5 h-3.5 animate-spin" />
                           <span>{ui('m1e58b883d6')}</span>
                         </>
                       ) : (
                         <span>{ui('m4b6e2f2525')}</span>
                       )}
                     </button>
                   </div>
                   <p className="text-[10px] text-slate-400 font-medium italic">
                     {ui('mcc59027a06')}</p>
                 </div>
              </motion.div>
            ) : (
              <motion.div 
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col md:flex-row gap-8 items-start w-full"
              >
                {/* QR Section */}
                <div className="w-full md:w-1/2 bg-gray-50 rounded-3xl p-8 flex flex-col items-center">
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-gray-100">
                    <img 
                      src={qrUrl} 
                      alt="VietQR" 
                      className="w-full aspect-square object-contain max-w-[240px]"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      <Zap className="w-3 h-3 fill-current" />
                      {ui('m7d8f1ab630')}</div>
                    <p className="text-sm text-gray-500">
                      {ui('mbe6e0fa2e0')}</p>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl font-mono text-amber-700 font-bold select-all">
                      SPLIT{inviteCode}
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="w-full md:w-1/2 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      {ui('m5b6352212d')}</h3>
                    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{ui('m625c40424d')}</span>
                        <span className="font-bold text-gray-900">{selectedPlan?.name} {selectedPlan?.type === "DU_HI_30" ? ui('mfabad32e1a') : ui('m849fd8f6f8')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{ui('mc4fac678be')}</span>
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-bold">{ui('m38924fa7a1')}</span>
                        <span className="text-2xl font-black text-amber-600">{selectedPlan?.price} <span className="text-xs font-normal text-gray-500">{selectedPlan?.type === "DU_HI_30" ? ui('m8222ae9598') : ui('ma0b2bfc115')}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={autoShare}
                        onChange={(e) => setAutoShare(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">{ui('m51ba3717c9')}</div>
                        <div className="text-xs text-gray-500 italic">{ui('m67359f0178')}</div>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-gray-400" />
                      {ui('m0fab721ccc')}</h4>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        placeholder={ui('m9419aaf86e')}
                        className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500 uppercase font-mono"
                      />
                      <button 
                        onClick={handleVoucherApply}
                        disabled={!voucherCode.trim() || isVoucherChecking}
                        className="px-6 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isVoucherChecking ? ui('m1e58b883d6') : ui('m1e948c5913')}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {ui('m29961a5f4a')}{selectedPlan?.type === "DU_HI_30" ? ui('mc67759da28') : ui('m395483d76d')} {ui('m9e972dc17e')}</p>
                  </div>

                  <button 
                    onClick={() => setStep("pricing")}
                    className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-900"
                  >
                    {ui('m75e8314a34')}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Unified CTA Footer */}
        {step === "pricing" && (
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col items-center justify-center shrink-0">
            {(() => {
              // Xác định gói đang hướng tới dựa trên tab và lựa chọn
              let targetPlan: any = null;
              if (activeTab === "trip") {
                targetPlan = PLANS.find(p => p.type === "DU_HI_30");
              } else {
                targetPlan = PLANS.find(p => p.type === selectedYearPlanType);
              }

              if (!targetPlan) return null;

              const isCurrent = normalizePlan(group.plan) === targetPlan.type;
              const isLower = isPlanHigherOrEqual(group.plan, targetPlan.type) && !isCurrent;

              // Xác định nhãn nút
              let buttonText = "";
              if (targetPlan.type === "DU_HI_30") {
                buttonText = `⚡ Kích hoạt Gói Du Hí (29k)`;
              } else if (targetPlan.type === "BE_BAN") {
                buttonText = `🤝 Kích hoạt gói Bè Bạn (49k)`;
              } else {
                buttonText = `👑 Nâng cấp lên Hội Làng (99k) ➔`;
              }

              if (isCurrent) {
                return (
                  <button
                    disabled
                    className="w-full max-w-md py-4 bg-emerald-50 text-[#03B875] rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-1.5 cursor-default border border-[#03B875]/20"
                  >
                    <Check className="w-5 h-5 stroke-[3px]" />
                    {ui('m6192720d98')}</button>
                );
              }

              if (isLower) {
                if (targetPlan.type === "DU_HI_30") {
                  return (
                    <div className="w-full max-w-md flex flex-col items-center gap-3">
                      <div className="w-full text-center p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-xs text-amber-800 font-bold leading-relaxed flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>{ui('m8cdab00aa9')}{group.plan === "HOI_LANG" ? ui('m14724ffbc4') : ui('m5d35bc723c')}{ui('mb41981efe6')}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          if (onRequestCreateGroup) {
                            onRequestCreateGroup();
                          }
                        }}
                        className="w-full py-4 bg-[#03B875] hover:bg-[#029E64] text-white rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {ui('m2cb138ec85')}</button>
                    </div>
                  );
                }

                return (
                  <button
                    disabled
                    className="w-full max-w-md py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-1.5 cursor-default border border-slate-200"
                  >
                    {ui('m13ea4dcdf7')}</button>
                );
              }

              return (
                <button
                  onClick={() => handleSelectPlan(targetPlan)}
                  className="w-full max-w-md py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-slate-950/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {buttonText}
                </button>
              );
            })()}
          </div>
        )}
      </motion.div>
    </div>
  );
}
