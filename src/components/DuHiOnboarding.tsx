import React, { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  PiggyBank, 
  ArrowRight, 
  Sparkles, 
  Coins, 
  CreditCard,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Expense, Member } from "../types";

interface DuHiOnboardingProps {
  members: Member[];
  expenses: Expense[];
  isGroupFundConfigured: boolean;
  isAdmin: boolean;
  onBatchAddExpenses: (newExpenses: Expense[]) => Promise<void>;
  onNavigateToAdd: () => void;
  showToast: (title: string, desc: string, type: "success" | "error") => void;
}

export default function DuHiOnboarding({
  members,
  expenses,
  isGroupFundConfigured,
  isAdmin,
  onBatchAddExpenses,
  onNavigateToAdd,
  showToast
}: DuHiOnboardingProps) {
  const [depositAmountStr, setDepositAmountStr] = useState("500.000");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  const hasFundDeposit = expenses.some((e) => e.description.includes("[Nộp Quỹ]"));
  const hasStandardExpense = expenses.some(
    (e) => !e.description.includes("[Nộp Quỹ]") && !e.description.includes("[Nhận Quỹ]")
  );

  // Determine active step (1 to 4)
  let currentStep = 1;
  if (members.length <= 1) {
    currentStep = 1;
  } else if (!isGroupFundConfigured) {
    currentStep = 2;
  } else if (!hasFundDeposit) {
    currentStep = 3;
  } else if (!hasStandardExpense) {
    currentStep = 4;
  } else {
    currentStep = 5; // Completed!
  }

  const handleCreateFundDeposit = async () => {
    if (!isAdmin) {
      showToast("Lỗi quyền hạn", "Chỉ Thủ quỹ / Trưởng nhóm mới có quyền tạo yêu cầu nộp quỹ.", "error");
      return;
    }

    const cleanAmountStr = depositAmountStr.replace(/\./g, "").replace(/,/g, "").trim();
    const amountVal = parseFloat(cleanAmountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Số tiền không hợp lệ", "Vui lòng nhập số tiền lớn hơn 0đ.", "error");
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      const timestamp = new Date().toISOString();
      const totalAmount = amountVal * members.length;
      
      const fundExpense: Expense = {
        id: `fund_req_${Date.now()}`,
        description: `📥 [Nộp Quỹ] Đóng quỹ chung (Mỗi người ${new Intl.NumberFormat("vi-VN").format(amountVal)}đ)`,
        amount: totalAmount,
        payerId: "group",
        date: timestamp,
        participantIds: members.map(m => m.id),
        isFundDeposit: true,
      };

      await onBatchAddExpenses([fundExpense]);
      showToast(
        "Tạo hóa đơn nộp quỹ thành công", 
        `Đã tạo hóa đơn nộp quỹ ${new Intl.NumberFormat("vi-VN").format(totalAmount)}đ chia đều cho ${members.length} thành viên.`, 
        "success"
      );
    } catch (err) {
      console.error("Lỗi khi tạo nộp quỹ đồng loạt:", err);
      showToast("Lỗi hệ thống", "Không thể tạo giao dịch nộp quỹ.", "error");
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleAmountChange = (val: string) => {
    // Only allow numbers and format as dot separated
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      setDepositAmountStr("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(clean));
    setDepositAmountStr(formatted);
  };

  if (currentStep === 5) {
    // Return empty if completed, keeping UI extremely clean
    return null;
  }

  return (
    <div className="bg-emerald-50/70 border border-emerald-100 rounded-[28px] p-5 mb-4 text-slate-800 shadow-3xs animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[13px] tracking-wide uppercase">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>HƯỚNG DẪN GÓI DU HÍ 🚗</span>
        </div>
        <span className="text-[10px] bg-emerald-200/50 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
          Bước {currentStep}/4
        </span>
      </div>

      <div className="mt-3.5 space-y-4">
        {/* Step 1: Add members */}
        <div className={`flex items-start gap-3 transition-opacity ${currentStep > 1 ? "opacity-50" : "opacity-100"}`}>
          <div className="mt-0.5 shrink-0">
            {members.length > 1 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5px]" />
            ) : (
              <Circle className="w-5 h-5 text-emerald-400 stroke-[2px] animate-pulse" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-[12px] font-black text-slate-900 leading-tight">
              Bước 1: Thêm bạn đồng hành ({members.length}/2+)
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Nhóm du lịch cần tối thiểu 2 thành viên để bắt đầu sòng phẳng quỹ nhóm.
            </p>
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-member-management"));
                }}
                className="mt-2.5 inline-flex items-center gap-1 bg-[#03B875] hover:bg-[#02965f] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-3xs hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Mở Thêm thành viên</span>
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Configure Bank */}
        <div className={`flex items-start gap-3 transition-opacity ${currentStep < 2 ? "opacity-35" : currentStep > 2 ? "opacity-50" : "opacity-100"}`}>
          <div className="mt-0.5 shrink-0">
            {isGroupFundConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5px]" />
            ) : (
              <Circle className={`w-5 h-5 text-emerald-400 stroke-[2px] ${currentStep === 2 ? "animate-pulse" : ""}`} />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-[12px] font-black text-slate-900 leading-tight">
              Bước 2: Thiết lập ngân hàng quỹ nhóm 💳
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Cấu hình tài khoản ngân hàng hoặc SĐT ví MoMo của nhóm để thành viên nộp tiền tự động quét mã QR.
            </p>
            {currentStep === 2 && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-group-settings"));
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 bg-[#03B875] hover:bg-[#02965f] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-3xs hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cấu hình quỹ chung</span>
              </button>
            )}
            {currentStep === 2 && !isAdmin && (
              <span className="mt-2 inline-block text-[10px] text-amber-600 font-extrabold italic">
                ⏳ Chờ Trưởng nhóm/Thủ quỹ thiết lập ngân hàng quỹ...
              </span>
            )}
          </div>
        </div>

        {/* Step 3: Fund Request */}
        <div className={`flex items-start gap-3 transition-opacity ${currentStep < 3 ? "opacity-35" : currentStep > 3 ? "opacity-50" : "opacity-100"}`}>
          <div className="mt-0.5 shrink-0">
            {hasFundDeposit ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5px]" />
            ) : (
              <Circle className={`w-5 h-5 text-emerald-400 stroke-[2px] ${currentStep === 3 ? "animate-pulse" : ""}`} />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-[12px] font-black text-slate-900 leading-tight">
              Bước 3: Tạo yêu cầu nộp Quỹ đồng loạt 💰
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Tạo giao dịch đóng quỹ đồng loạt cho cả nhóm (mỗi người nộp một khoản bằng nhau) để lấy ngân sách du lịch.
            </p>
            {currentStep === 3 && isAdmin && (
              <div className="mt-3.5 p-3.5 bg-white border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    Mỗi người nộp:
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={depositAmountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="500.000"
                      className="w-full text-right font-black text-slate-800 text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                      đ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmittingDeposit}
                  onClick={handleCreateFundDeposit}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#03B875] hover:bg-[#02965f] disabled:bg-slate-300 text-white text-[10px] font-black py-2 px-3 rounded-xl transition-all shadow-3xs cursor-pointer uppercase tracking-wider"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>{isSubmittingDeposit ? "Đang xử lý..." : `Nộp đồng loạt (${depositAmountStr}đ/người)`}</span>
                </button>
              </div>
            )}
            {currentStep === 3 && !isAdmin && (
              <span className="mt-2 inline-block text-[10px] text-amber-600 font-extrabold italic">
                ⏳ Hãy nhắc Thủ quỹ tạo giao dịch Nộp Quỹ chung...
              </span>
            )}
          </div>
        </div>

        {/* Step 4: Add Bill */}
        <div className={`flex items-start gap-3 transition-opacity ${currentStep < 4 ? "opacity-35" : "opacity-100"}`}>
          <div className="mt-0.5 shrink-0">
            {hasStandardExpense ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5px]" />
            ) : (
              <Circle className={`w-5 h-5 text-emerald-400 stroke-[2px] ${currentStep === 4 ? "animate-pulse" : ""}`} />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-[12px] font-black text-slate-900 leading-tight">
              Bước 4: Thêm hóa đơn chi tiêu (Chi từ Quỹ) 📝
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Bắt đầu ghi chép các hóa đơn đi lại, ăn uống phát sinh. Người chi trả sẽ tự động mặc định là <b>Quỹ Nhóm</b>.
            </p>
            {currentStep === 4 && (
              <button
                type="button"
                onClick={onNavigateToAdd}
                className="mt-2.5 inline-flex items-center gap-1.5 bg-[#03B875] hover:bg-[#02965f] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-3xs hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ghi chi tiêu từ Quỹ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
