import { formatDisplayDateTime } from '../utils/dateUtils';
import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';

import React, { useState, useEffect } from "react";
import { Member, Expense, Group, SimplifiedTransaction, MemberBalance, DebtOffset, PendingReceipt } from "../types";
import { ArrowLeftRight, ArrowRight, CheckCircle2, FileText, QrCode, AlertCircle, X, Handshake, ChevronRight, Check, Loader2, Landmark, Copy, Upload, AlertTriangle, Settings, Sparkles, Trash2, RefreshCw } from "lucide-react";

import { calculateBalances, simplifyDebts } from "../utils/debtSimplifier";
import { motion, AnimatePresence } from "framer-motion";
import { compressImage } from "../utils/imageCompressor";
import { getMemberAvatar } from "../utils/avatar";
import { formatDateTime } from "../utils/dateUtils";
import { generateVietQRQuickUrl, getBankBin } from "../utils/vietqr";

const BANK_NAMES: Record<string, string> = {
  "970436": "Vietcombank", "VCB": "Vietcombank",
  "970415": "VietinBank", "ICB": "VietinBank",
  "970418": "BIDV", "BIDV": "BIDV",
  "970405": "Agribank", "VBA": "Agribank",
  "970448": "OCB", "OCB": "OCB",
  "970422": "MBBank", "MB": "MBBank",
  "970407": "Techcombank", "TCB": "Techcombank",
  "970416": "ACB", "ACB": "ACB",
  "970432": "VPBank", "VPB": "VPBank",
  "970423": "TPBank", "TPB": "TPBank",
  "970403": "Sacombank", "STB": "Sacombank",
  "970437": "HDBank", "HDB": "HDBank",
  "970454": "VietCapitalBank", "VCCB": "VietCapitalBank",
  "970429": "SCB", "SCB": "SCB",
  "970441": "VIB", "VIB": "VIB",
  "970443": "SHB", "SHB": "SHB",
  "970431": "Eximbank", "EIB": "Eximbank",
  "970426": "MSB", "MSB": "MSB",
  "970400": "SaigonBank", "SGB": "SaigonBank"
};

import { VIETNAM_BANKS } from "../utils/banks";

const getDisplayBankName = (bankCode: string): string => {
  if (!bankCode) return "";
  const codeLower = bankCode.toLowerCase().trim();
  const found = VIETNAM_BANKS.find(b => 
    b.code.toLowerCase() === codeLower || 
    (b.bin && b.bin.toLowerCase() === codeLower) ||
    (b.shortCode && b.shortCode.toLowerCase() === codeLower)
  );
  if (found) {
    return found.shortCode || found.name;
  }
  if (BANK_NAMES[bankCode]) {
    return BANK_NAMES[bankCode];
  }
  return bankCode;
};

import PersonalStatementModal from "./PersonalStatementModal";


interface SettleUpSectionProps {
  members: Member[];
  expenses: Expense[];
  activeGroup: Group | null;
  onUpdateGroupConfig: (updates: Partial<Group>) => Promise<void>;
  onUpdateGroup: (group: Group) => Promise<void>;
  onAddExpense: (expense: Expense) => void;
  onExportPDF: () => void;
  onShowUpgradeModal: () => void;
  tryOfflineMode?: boolean;
  isAdmin?: boolean;
  viewingMemberId?: string | null;
  onBatchSettleAndReceipt?: (expense: Expense | null, receiptUpdates: PendingReceipt[]) => Promise<void>;
  onUpdatePendingReceipts?: (receiptUpdates: PendingReceipt[]) => Promise<void>;
}

export default function SettleUpSection({
  members,
  expenses,
  activeGroup,
  onUpdateGroupConfig,
  onUpdateGroup,
  onAddExpense,
  onExportPDF,
  onShowUpgradeModal,
  tryOfflineMode = false,
  isAdmin = true,
  viewingMemberId,
  onBatchSettleAndReceipt,
  onUpdatePendingReceipts
}: SettleUpSectionProps) {
  const [showPersonalStatement, setShowPersonalStatement] = useState<boolean>(false);
  const [isOffsetBottomSheetOpen, setIsOffsetBottomSheetOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type: 'success' | 'error' } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [highlightedReceiptId, setHighlightedReceiptId] = useState<string | null>(null);

  // Focus target listener when notification card is clicked
  useEffect(() => {
    const handleFocusTarget = (e: CustomEvent<{ targetId?: string; linkTab?: string }>) => {
      if (e.detail?.targetId && e.detail.targetId.startsWith("receipt-")) {
        const recId = e.detail.targetId.replace("receipt-", "");
        setHighlightedReceiptId(recId);
        setTimeout(() => setHighlightedReceiptId(null), 4000);
      }
    };

    window.addEventListener("focus-target-item" as any, handleFocusTarget);
    return () => {
      window.removeEventListener("focus-target-item" as any, handleFocusTarget);
    };
  }, []);

  const actualFundBalance = expenses.reduce((sum, e) => {
    if (e.isFundDeposit) return sum;
    if (e.description.includes("[Nộp Quỹ]")) return sum + e.amount;
    if (e.description.includes("[Nhận Quỹ]")) return sum - e.amount;
    if (e.payerId === "group") return sum - e.amount;
    return sum;
  }, 0);

  // Active payment transaction
  const [customPayAmountStr, setCustomPayAmountStr] = useState("");
  const [confirmedQrAmountStr, setConfirmedQrAmountStr] = useState("");
  const [activePayTx, setActivePayTx] = useState<{ fromId: string; toId: string; amount: number; qrTab: 'bank' | 'momo', originalAmount?: number, isAdminConfirm?: boolean } | null>(null);

  // Offset form
  const [offsetFromId, setOffsetFromId] = useState("");
  const [offsetToId, setOffsetToId] = useState("");
  const [offsetAmountStr, setOffsetAmountStr] = useState("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    if (activePayTx) {
      let maxAllowed = activePayTx.amount;
      if (activePayTx.toId !== 'group') {
        maxAllowed = Math.min(activePayTx.amount, actualFundBalance);
      }
      const initialAmount = Math.round(maxAllowed);
      setCustomPayAmountStr(new Intl.NumberFormat(getLocale()).format(initialAmount));
      setConfirmedQrAmountStr(new Intl.NumberFormat(getLocale()).format(initialAmount));
    }
  }, [activePayTx, actualFundBalance]);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const getMember = (id: string) => members.find(m => m.id === id);

  
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "VND",
    }).format(Math.round(val)).replace("₫", "đ");
  };

  const pendingReceipts = activeGroup?.pendingReceipts || [];
  const memberBalances = calculateBalances(members, expenses, activeGroup?.debtOffsets);

  const debtors = memberBalances
    .filter(b => Math.round(Math.abs(b.netBalance)) >= 1 && b.netBalance < 0)
    .map(b => ({ id: b.memberId, amount: Math.abs(b.netBalance) }))
    .sort((a,b) => b.amount - a.amount);
  const creditors = memberBalances
    .filter(b => Math.round(b.netBalance) >= 1)
    .map(b => ({ id: b.memberId, amount: b.netBalance }))
    .sort((a,b) => b.amount - a.amount);

  type FundTx = { type: 'in', memberId: string, amount: number } | { type: 'out', memberId: string, amount: number };
  const allFundTransactions: FundTx[] = [
    ...debtors.map(d => ({ type: 'in' as const, memberId: d.id, amount: d.amount })),
    ...creditors.map(c => ({ type: 'out' as const, memberId: c.id, amount: c.amount }))
  ].filter(tx => Math.round(tx.amount) >= 1);
  const fundTransactions = (!isAdmin && viewingMemberId)
    ? allFundTransactions.filter(tx => tx.memberId === viewingMemberId)
    : allFundTransactions;

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activePayTx) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setToastMsg({ get title() { return ui('md290780737'); }, desc: "Chỉ hỗ trợ upload hình ảnh.", type: "error" });
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const compressed = await compressImage(file);
      const timestamp = Date.now();
      const fileName = `receipt_tx_${timestamp}.jpg`;
      
      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          image: compressed,
          groupId: activeGroup?.id
        })
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const uploadedUrl = data.url;

      const parsedAmount = parseInt(confirmedQrAmountStr.replace(/[^0-9]/g, "")) || 0;

      const rec: PendingReceipt = {
        id: "rec_" + Date.now(),
        fromId: activePayTx.fromId,
        toId: activePayTx.toId,
        amount: parsedAmount,
        status: "pending",
        uploadedAt: new Date().toISOString(),
        receiptImage: uploadedUrl
      };
      
      if (onUpdatePendingReceipts) {
        await onUpdatePendingReceipts([...pendingReceipts, rec]);
      }
      setActivePayTx(null);
      setToastMsg({
        get title() { return ui('m4b1546bcf5'); },
        desc: "Biên lai đã được lưu vào danh sách chờ duyệt để đối soát và khấu trừ công nợ.",
        type: "success"
      });
    } catch (err) {
      console.error(err);
      setToastMsg({ get title() { return ui('md290780737'); }, desc: "Không thể upload biên lai.", type: "error" });
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleDebtorSettle = (debtorId: string, customAmount?: number, skipAdd = false, customTimestamp?: string): Expense | null => {
    const debtor = getMember(debtorId);
    if (!debtor) return null;
    
    const debtorBalanceInfo = memberBalances.find(b => b.memberId === debtorId);
    if (!debtorBalanceInfo) return null;
        
    const totalDebtAmount = customAmount || Math.abs(debtorBalanceInfo.netBalance);
    if (totalDebtAmount <= 0) return null;

    const timestamp = customTimestamp || new Date().toISOString();

    const settlementExpense: Expense = {
      id: `settle_fund_in_${debtorId}_${Date.now()}`,
      description: `📥 [Nộp Quỹ] ${debtor.name} đóng quỹ nhóm hoàn tất nợ`,
      amount: totalDebtAmount,
      payerId: debtorId,
      date: timestamp,
      participantIds: [],
    };

    if (!skipAdd) {
      if (onBatchSettleAndReceipt) {
        onBatchSettleAndReceipt(settlementExpense, pendingReceipts);
      } else {
        onAddExpense(settlementExpense);
      }
      setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: ui('ma05f1a6e34', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(totalDebtAmount)) }), type: "success" });
    }
    return settlementExpense;
  };

  const handleCreditorSettle = (creditorId: string, customAmount?: number, skipAdd = false, customTimestamp?: string): Expense | null => {
    const creditor = getMember(creditorId);
    if (!creditor) return null;

    const creditorBalanceInfo = memberBalances.find(b => b.memberId === creditorId);
    if (!creditorBalanceInfo) return null;

    const totalCreditAmount = customAmount || creditorBalanceInfo.netBalance;
    if (totalCreditAmount <= 0) return null;
    
    if (!skipAdd && actualFundBalance < totalCreditAmount) {
      setToastMsg({ get title() { return ui('m18035fb02d'); }, desc: ui('m97c3c76e8d', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(actualFundBalance)) }), type: "error" });
      return null;
    }

    const timestamp = customTimestamp || new Date().toISOString();

    const settlementExpense: Expense = {
      id: `settle_fund_out_${creditorId}_${Date.now()}`,
      description: `📤 [Nhận Quỹ] Hoàn tiền dư cho ${creditor.name}`,
      amount: totalCreditAmount,
      payerId: "group", // special payer ID for fund
      date: timestamp,
      participantIds: [creditorId],
      customSplit: { [creditorId]: totalCreditAmount },
    };

    if (!skipAdd) {
      if (onBatchSettleAndReceipt) {
        onBatchSettleAndReceipt(settlementExpense, pendingReceipts);
      } else {
        onAddExpense(settlementExpense);
      }
      setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: ui('mba287ff9d3', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(totalCreditAmount)) }), type: "success" });
    }
    return settlementExpense;
  };


  const handleCreateDebtOffset = async () => {
    if (!isAdmin) {
      setToastMsg({ get title() { return ui('m6d89fdd2e6'); }, desc: "Tính năng tạo cấn trừ công nợ chỉ dành riêng cho Trưởng nhóm.", type: "error" });
      return;
    }
    const parsedAmount = parseInt(offsetAmountStr.replace(/[^0-9]/g, "")) || 0;
    if (!offsetFromId || !offsetToId || parsedAmount <= 0) {
      setToastMsg({ get title() { return ui('mdab253fd9f'); }, desc: "Vui lòng kiểm tra lại thông tin.", type: "error" });
      return;
    }
    if (offsetFromId === offsetToId) {
      setToastMsg({ get title() { return ui('m6ec1888c38'); }, desc: "Không thể cấn trừ công nợ cho chính mình.", type: "error" });
      return;
    }
    
    const toM = getMember(offsetToId);
    const newOffset: DebtOffset = {
      id: "offset_" + Date.now(),
      fromId: offsetFromId,
      toId: offsetToId,
      amount: parsedAmount,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    
    if (activeGroup) {
      const updatedGroup = {
        ...activeGroup,
        debtOffsets: [...(activeGroup.debtOffsets || []), newOffset]
      };
      await onUpdateGroup(updatedGroup);
      setToastMsg({ 
        get title() { return ui('m8572b96dff'); },
        desc: ui('m01958f7e38', { v0: toM?.name || ui('m1c9742eddd') }),
        type: "success" 
      });
      setIsOffsetBottomSheetOpen(false);
      setOffsetAmountStr("");
      setOffsetFromId("");
      setOffsetToId("");
    }
  };

  const handleApproveDebtOffset = async (offsetId: string) => {
    if (!activeGroup) return;
    const updatedOffsets = (activeGroup.debtOffsets || []).map(o => {
      if (o.id === offsetId) {
        return {
          ...o,
          status: "approved" as const,
          approvedAt: new Date().toISOString()
        };
      }
      return o;
    });
    await onUpdateGroup({
      ...activeGroup,
      debtOffsets: updatedOffsets
    });
    setToastMsg({ get title() { return ui('m2456763d7d'); }, desc: "Số dư công nợ của 2 bên đã được cập nhật tự động.", type: "success" });
  };

  const handleRejectDebtOffset = async (offsetId: string) => {
    if (!activeGroup) return;
    const updatedOffsets = (activeGroup.debtOffsets || []).map(o => {
      if (o.id === offsetId) {
        return {
          ...o,
          status: "rejected" as const,
          rejectedAt: new Date().toISOString()
        };
      }
      return o;
    });
    await onUpdateGroup({
      ...activeGroup,
      debtOffsets: updatedOffsets
    });
    setToastMsg({ get title() { return ui('mb148008cb7'); }, desc: "Đã từ chối yêu cầu cấn trừ nợ.", type: "success" });
  };

  const handleDeleteDebtOffset = async (offsetId: string) => {
    if (!activeGroup) return;
    const updatedOffsets = (activeGroup.debtOffsets || []).filter(o => o.id !== offsetId);
    await onUpdateGroup({
      ...activeGroup,
      debtOffsets: updatedOffsets
    });
    setToastMsg({ get title() { return ui('m3947afd7c0'); }, desc: "Đã xóa khoản cấn trừ công nợ khỏi lịch sử.", type: "success" });
  };

  const handleApproveReceipt = async (rec: PendingReceipt) => {
    let createdExpense: Expense | null = null;
    if (rec.amount > 0) {
      const receiptTimestamp = rec.createdAt || new Date().toISOString();
      if (rec.toId === "group" || !rec.toId) {
        createdExpense = handleDebtorSettle(rec.fromId, rec.amount, true, receiptTimestamp);
      } else {
        createdExpense = handleCreditorSettle(rec.toId, rec.amount, true, receiptTimestamp);
      }
    }
    
    const updatedReceipts = pendingReceipts.map(r => r.id === rec.id ? { ...r, status: "approved" as const } : r);
    if (onBatchSettleAndReceipt) {
      await onBatchSettleAndReceipt(createdExpense, updatedReceipts);
    }
    setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: "Đã duyệt biên lai.", type: "success" });
  };

  const handleRejectReceipt = async (rec: PendingReceipt) => {
    const updatedReceipts = pendingReceipts.map(r => r.id === rec.id ? { ...r, status: "rejected" as const, get adminNote() { return ui('mc5051bf796'); } } : r);
    if (onUpdatePendingReceipts) {
      await onUpdatePendingReceipts(updatedReceipts);
    }
    setToastMsg({ get title() { return ui('mb148008cb7'); }, desc: "Đã từ chối biên lai này.", type: "success" });
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    const updatedReceipts = pendingReceipts.filter(r => r.id !== receiptId);
    if (onUpdatePendingReceipts) {
      await onUpdatePendingReceipts(updatedReceipts);
    }
    setToastMsg({ get title() { return ui('m3947afd7c0'); }, desc: "Đã xóa biên lai thành công.", type: "success" });
  };

  const handleResetReceiptToPending = async (receiptId: string) => {
    const updatedReceipts = pendingReceipts.map(r => r.id === receiptId ? { ...r, status: "pending" as const, adminNote: undefined } : r);
    if (onUpdatePendingReceipts) {
      await onUpdatePendingReceipts(updatedReceipts);
    }
    setToastMsg({ get title() { return ui('m893a534e32'); }, desc: "Đã chuyển biên lai về trạng thái Chờ duyệt. Bạn có thể bấm Duyệt biên lai để khấu trừ công nợ.", type: "success" });
  };

  // Helper for QR
  const getQrUrl = (qrAmount: number) => {
    if (!activePayTx) return "";
    let bankNo, bankCode, accountName;

    if (activePayTx.toId === "group") {
      bankNo = activeGroup?.bankAccount || activeGroup?.fundPhone;
      bankCode = activeGroup?.bankCode || activeGroup?.fundBankName;
      accountName = activeGroup?.bankAccountName || activeGroup?.fundName || activeGroup?.name;
    } else {
      const receiver = getMember(activePayTx.toId);
      bankNo = receiver?.bankAccount;
      bankCode = receiver?.bankCode;
      accountName = receiver?.bankAccountName || receiver?.name;
    }

    if (bankNo && bankCode) {
      const desc = activePayTx.toId === "group" ? `NOP QUY NHOM` : `THANH TOAN NO`;
      return generateVietQRQuickUrl({
        bankCode,
        accountNumber: bankNo,
        accountName,
        amount: qrAmount,
        memo: desc
      });
    }
    return "";
  };

  const isGroupFundConfigured = !!(activeGroup?.bankAccount || activeGroup?.fundPhone || activeGroup?.momoQrImage);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative">
      {/* High-Visibility Prominent Personal Statement Banner (Hidden in 1-time offline trial mode) */}
      {!tryOfflineMode && (
        <div className="bg-gradient-to-br from-teal-800 via-emerald-800 to-teal-900 text-white p-5 rounded-3xl shadow-lg border border-emerald-600/30 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Decorative blur glows */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-36 h-36 bg-teal-300/15 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <FileText className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 text-left">
              <h4 className="font-black text-base text-white tracking-tight">
                {ui('mf67df1b6fb')}</h4>
              <p className="text-xs text-teal-100/90 font-medium mt-0.5">
                {ui('m4dcb72ca7e')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPersonalStatement(true)}
            className="relative z-10 w-full sm:w-auto bg-white hover:bg-emerald-50 text-teal-950 font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-4 h-4 text-[#03B875]" />
            <span>{ui('me5dedeb6ea')}</span>
            <ChevronRight className="w-4 h-4 text-teal-700" />
          </button>
        </div>
      )}

      {/* Manual Debt Offset Tool Banner (Hidden in 1-time offline trial mode) */}
      {!tryOfflineMode && (
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-slate-800">
                {ui('m3ab606d48e')}</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {ui('m1363c73d39')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                setToastMsg({ get title() { return ui('m6d89fdd2e6'); }, desc: "Tính năng tạo cấn trừ công nợ chỉ dành riêng cho Trưởng nhóm.", type: "error" });
                return;
              }
              setIsOffsetBottomSheetOpen(true);
            }}
            className={`w-full sm:w-auto font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              isAdmin ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-600"
            }`}
          >
            <Handshake className={`w-4 h-4 ${isAdmin ? "text-amber-400" : "text-slate-500"}`} />
            <span>{isAdmin ? ui('mad58349368') : ui('m5894615027')}</span>
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-[#03B875]" />
            {ui('m73a0438b9c')}</h4>
        </div>

        {!isGroupFundConfigured && isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-xs text-amber-900 leading-snug">{ui('m799063c602')}</h5>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  {ui('m82bb428209')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-group-settings"))}
              className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-all shadow-3xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer uppercase tracking-wider animate-pulse"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{ui('mf860901fca')}</span>
            </button>
          </div>
        )}

        
        {fundTransactions.length === 0 ? (
          <div className="text-center py-10 space-y-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
            <div className="inline-flex items-center justify-center bg-[#03B875]/10 text-[#03B875] rounded-full w-12 h-12">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">{ui('m3fa3dc7c5b')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{ui('me41e95ddd0')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fundTransactions.map((tx, idx) => {
              const isFundIn = tx.type === 'in';
              const member = getMember(tx.memberId);
              if (!member) return null;

              const isMyTx = viewingMemberId === tx.memberId;
              
              const fundTarget = { name: "Quỹ Nhóm", emoji: "🏦" };
              const sender = isFundIn ? { ...member } : fundTarget;
              const receiver = isFundIn ? fundTarget : { ...member };

              // Check if Fund is configured or Member is configured
              const receiverHasBank = isFundIn
                 ? !!(activeGroup?.bankAccount || activeGroup?.fundPhone || activeGroup?.momoQrImage)
                 : !!(member.bankAccount || member.fundPhone || member.momoQrImage);

              return (
                <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-[24px] shadow-sm hover:border-slate-200 transition-all gap-4">
                  <div className="flex flex-1 items-center gap-3 w-full">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="w-12 h-12 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center bg-slate-50 shadow-xs">
                        <img 
                          src={getMemberAvatar(sender as any)} 
                          alt={sender.name}
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 truncate w-14 text-center">{sender.name}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative mx-1">
                      <div className="w-full h-px border-t-2 border-dashed border-slate-200 absolute top-1/2 -translate-y-1/2 z-0"></div>
                      <span className="bg-white px-3 py-1 z-10 font-mono font-black text-slate-800 text-xs sm:text-sm tracking-tight border border-slate-100 rounded-full shadow-3xs">
                        {new Intl.NumberFormat(getLocale()).format(Math.round(tx.amount))}{ui('mc5f95801df')}</span>
                      <ArrowRight className="h-4 w-4 text-slate-300 absolute top-1/2 -translate-y-1/2 right-0 bg-white" />
                    </div>

                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="w-12 h-12 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center bg-slate-50 shadow-xs">
                        <img 
                          src={getMemberAvatar(receiver as any)} 
                          alt={receiver.name}
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#0F172A] truncate w-14 text-center">{receiver.name}</span>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto flex justify-center mt-2 sm:mt-0">
                    {isAdmin ? (
                       isFundIn ? (
                        <button 
                          onClick={() => {
                            if (!receiverHasBank) {
                              setToastMsg({ get title() { return ui('m980a38aa27'); }, desc: "Quỹ nhóm chưa thiết lập STK/Ví nhận tiền. Đang mở cài đặt...", type: "error" });
                              window.dispatchEvent(new CustomEvent("open-group-settings"));
                              return;
                            }
                            setActivePayTx({ fromId: member.id, toId: 'group', amount: tx.amount, qrTab: 'bank', isAdminConfirm: true });
                          }}
                          className="w-full sm:w-auto bg-[#03B875] hover:bg-[#02965f] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          {ui('md94c8e1503')}</button>
                      ) : (
                        <button 
                          onClick={() => {
                            if (!receiverHasBank) {
                              setToastMsg({ get title() { return ui('m7a62ab00d8'); }, desc: "Thành viên chưa thiết lập STK/MoMo.", type: "error" });
                            }
                            setActivePayTx({ fromId: 'group', toId: member.id, amount: tx.amount, qrTab: 'bank', isAdminConfirm: true });
                          }}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          {ui('mc8f03b2bab')}</button>
                      )
                    ) : (
                      isMyTx && isFundIn && (
                        <button 
                          onClick={() => {
                            if (!receiverHasBank) {
                              setToastMsg({ get title() { return ui('m8003140e25'); }, desc: "Quỹ nhóm chưa thiết lập STK/Ví nhận tiền. Vui lòng nhắc Trưởng nhóm cấu hình.", type: "error" });
                              return;
                            }
                            setActivePayTx({ fromId: member.id, toId: 'group', amount: tx.amount, qrTab: 'bank', isAdminConfirm: false });
                          }}
                          className="w-full sm:w-auto bg-[#03B875] hover:bg-[#02965f] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          {ui('m4818fea2be')}</button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activePayTx && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActivePayTx(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" 
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none p-3 sm:p-4">
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }} 
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[82vh] overflow-y-auto pointer-events-auto my-auto border border-slate-100/80"
              >
                <div className="sticky top-0 bg-[#0B7A54] z-10 px-5 py-3.5 flex items-center justify-between shadow-sm rounded-t-3xl">
                <h3 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                  {ui('m78eed99521')}{activePayTx.toId === 'group' ? ui('m75030b283c') : ui('mb45096e7b0')}
                </h3>
                <button onClick={() => setActivePayTx(null)} className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/30 cursor-pointer transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="p-4 space-y-3.5 bg-slate-50">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs">
                  <div className="text-center space-y-0.5 pb-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {activePayTx.toId === 'group' ? ui('m3df815a984') : ui('m3222f445b9')}
                    </p>
                    <p className="text-base font-black text-slate-800">
                      {activePayTx.toId === 'group' ? getMember(activePayTx.fromId)?.name : getMember(activePayTx.toId)?.name}
                    </p>
                  </div>
                  
                  <div className="h-px bg-slate-100 w-full mb-3" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-500">{ui('mcd91620520')}</p>
                    <span className="bg-rose-50 text-rose-500 font-bold px-2.5 py-1 rounded-lg text-xs border border-rose-100">
                      {new Intl.NumberFormat(getLocale()).format(Math.round(activePayTx.amount))} {ui('mc5f95801df')}</span>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-500">{ui('mbed8fd621a')}</p>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={customPayAmountStr}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          let numericVal = val ? parseInt(val) : 0;
                          
                          let maxAllowed = activePayTx.amount;
                          if (activePayTx.toId !== 'group') {
                            maxAllowed = Math.min(activePayTx.amount, actualFundBalance);
                          }
                          if (numericVal > maxAllowed) {
                            numericVal = Math.round(maxAllowed);
                            setToastMsg({ get title() { return ui('m7a62ab00d8'); }, desc: ui('m886b3b2e67', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(maxAllowed)) }), type: "error" });
                          }

                          setCustomPayAmountStr(numericVal ? new Intl.NumberFormat(getLocale()).format(numericVal) : "");
                        }}
                        className="w-full text-center font-mono font-black text-lg py-2.5 px-4 rounded-xl border-2 border-[#0B7A54] focus:ring-4 focus:ring-[#0B7A54]/10 outline-none text-slate-800 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{ui('mc5f95801df')}</span>
                    </div>

                    <button 
                      onClick={() => {
                        const parsed = parseInt(customPayAmountStr.replace(/[^0-9]/g, "")) || 0;
                        setConfirmedQrAmountStr(new Intl.NumberFormat(getLocale()).format(parsed));
                        setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: ui('mdf25db24e1', { v0: new Intl.NumberFormat(getLocale()).format(parsed) }), type: "success" });
                      }}
                      className="w-full bg-[#0B7A54] hover:bg-[#096645] text-white py-2.5 rounded-xl text-xs font-black flex justify-center items-center gap-1.5 transition-all shadow-3xs active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {ui('mf56b6a52e8')}</button>
                    
                    <div className="flex items-center gap-2 pt-0.5">
                      <button 
                        onClick={() => {
                          let maxAllowed = activePayTx.amount;
                          if (activePayTx.toId !== 'group') {
                            maxAllowed = Math.min(activePayTx.amount, actualFundBalance);
                          }
                          const val = Math.round(maxAllowed);
                          setCustomPayAmountStr(new Intl.NumberFormat(getLocale()).format(val));
                          setToastMsg({ get title() { return ui('m5d6af377c2'); }, desc: "Bấm nút 'Xác nhận & Cập nhật QR' bên trên để tạo lại mã QR.", type: "success" });
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-bold text-xs cursor-pointer"
                      >
                        {ui('ma521348356')}</button>
                      <button 
                        onClick={() => {
                          let maxAllowed = activePayTx.amount;
                          if (activePayTx.toId !== 'group') {
                            maxAllowed = Math.min(activePayTx.amount, actualFundBalance);
                          }
                          const val = Math.round(maxAllowed / 2);
                          setCustomPayAmountStr(new Intl.NumberFormat(getLocale()).format(val));
                          setToastMsg({ get title() { return ui('m5d6af377c2'); }, desc: "Bấm nút 'Xác nhận & Cập nhật QR' bên trên để tạo lại mã QR.", type: "success" });
                        }}
                        className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-xs cursor-pointer"
                      >
                        {ui('m5dce6ab78d')}</button>
                    </div>
                  </div>
                </div>

                {/* QR Code Card */}
                <div className="bg-white rounded-2xl border border-emerald-100 p-3.5 relative overflow-hidden text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                  <p className="text-[11px] font-extrabold text-emerald-800 text-center mb-2 flex items-center justify-center gap-1.5 uppercase tracking-wide">
                    <QrCode className="w-3.5 h-3.5" />
                    {ui('mae5a97299c')}</p>
                  
                  <div className="flex justify-center mb-1.5">
                    {(() => {
                      const parsedAmount = parseInt(confirmedQrAmountStr.replace(/[^0-9]/g, "")) || 0;
                      const qrUrl = getQrUrl(parsedAmount);
                      if (qrUrl) {
                        return <img src={qrUrl} alt="VietQR" className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl border border-slate-100 p-1.5 shadow-3xs bg-white" />;
                      } else {
                        return (
                          <div className="w-44 h-44 flex items-center justify-center bg-slate-50 text-slate-400 text-xs text-center p-3 rounded-xl border border-slate-100">
                            {ui('m71633a3b10')}</div>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-center text-[10px] text-slate-500 font-medium">
                    {ui('m4067d0a5ed')}<span className="text-rose-500 font-bold">{confirmedQrAmountStr || "0"} {ui('mc5f95801df')}</span>
                  </p>
                </div>

                {/* Bank Details */}
                <div className="space-y-1.5">
                  {(() => {
                    const parsedAmount = parseInt(confirmedQrAmountStr.replace(/[^0-9]/g, "")) || 0;
                    let bankNo = "", bankCode = "", receiverName = "";
                    if (activePayTx.toId === "group") {
                      bankNo = activeGroup?.bankAccount || "";
                      bankCode = activeGroup?.bankCode || "";
                      receiverName = activeGroup?.bankAccountName || ui('m3f56f2dd08');
                    } else {
                      const receiver = getMember(activePayTx.toId);
                      bankNo = receiver?.bankAccount || "";
                      bankCode = receiver?.bankCode || "";
                      receiverName = receiver?.bankAccountName || receiver?.name || "";
                    }
                    const memo = activePayTx.toId === "group" ? `Nop quy nhom ${getMember(activePayTx.fromId)?.name || ""}` : `Hoan du ${getMember(activePayTx.toId)?.name || ""}`;

                    const handleCopy = (text: string) => {
                      navigator.clipboard.writeText(text);
                      setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: "Đã sao chép", type: "success" });
                    };

                    return (
                      <>
                        <div className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-2.5 px-3">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{ui('m69ba2e4467')}</p>
                            <p className="text-xs font-black text-slate-800">
                              {getDisplayBankName(bankCode)}
                            </p>
                          </div>
                          <button onClick={() => handleCopy(getDisplayBankName(bankCode))} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                            <Copy className="w-3 h-3" />
                            {ui('m09a1db3ed4')}</button>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-2.5 px-3">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{ui('mdc0ca7a8d2')}</p>
                            <p className="text-xs font-black text-slate-800">{bankNo}</p>
                          </div>
                          <button onClick={() => handleCopy(bankNo)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                            <Copy className="w-3 h-3" />
                            {ui('m09a1db3ed4')}</button>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-2.5 px-3">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{ui('ma0a5b91d06')}</p>
                            <p className="text-xs font-black text-slate-800 uppercase">{receiverName}</p>
                          </div>
                          <button onClick={() => handleCopy(receiverName.toUpperCase())} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                            <Copy className="w-3 h-3" />
                            {ui('m09a1db3ed4')}</button>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-2.5 px-3">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{ui('md5261b2d21')}</p>
                            <p className="text-xs font-black text-rose-500">{new Intl.NumberFormat(getLocale()).format(parsedAmount)} {ui('mc5f95801df')}</p>
                          </div>
                          <button onClick={() => handleCopy(parsedAmount.toString())} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                            <Copy className="w-3 h-3" />
                            {ui('m07a0730e21')}</button>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-2.5 px-3">
                          <div className="min-w-0 pr-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{ui('mabdf05335d')}</p>
                            <p className="text-xs font-black text-slate-800 truncate">{memo}</p>
                          </div>
                          <button onClick={() => handleCopy(memo)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shrink-0">
                            <Copy className="w-3 h-3" />
                            {ui('m09a1db3ed4')}</button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Upload Receipt */}
                <label className={`block bg-white border border-emerald-200/80 rounded-2xl p-3.5 border-dashed text-center space-y-1 cursor-pointer hover:bg-emerald-50/50 transition-colors ${isUploadingReceipt ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={isUploadingReceipt} />
                  <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    {isUploadingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-xs font-bold text-slate-800">{isUploadingReceipt ? ui('m10640433b8') : ui('md5cf031e3f')}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{ui('m084efffed5')}</p>
                </label>
              </div>

              {/* Footer */}
              <div className="p-3.5 bg-white border-t border-slate-100 flex gap-2.5 shrink-0 rounded-b-3xl">
                <button 
                  onClick={() => setActivePayTx(null)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {ui('m247d4b1efe')}</button>
                {activePayTx.isAdminConfirm ? (
                  <button 
                    onClick={() => {
                      const parsedAmount = parseInt(confirmedQrAmountStr.replace(/[^0-9]/g, "")) || 0;
                      if (activePayTx.toId === "group") {
                        handleDebtorSettle(activePayTx.fromId, parsedAmount);
                      } else {
                        handleCreditorSettle(activePayTx.toId, parsedAmount);
                      }
                      setActivePayTx(null);
                    }}
                    className="flex-1 py-3 bg-[#EBF4FF] text-[#1E40AF] font-bold rounded-xl text-sm hover:bg-[#DBEAFE] transition-colors"
                  >
                    {ui('ma46bab1adb')}</button>
                ) : (
                  <button 
                    onClick={() => {
                      const parsedAmount = parseInt(confirmedQrAmountStr.replace(/[^0-9]/g, "")) || 0;
                      const rec: PendingReceipt = {
                        id: "rec_" + Date.now(),
                        fromId: activePayTx.fromId,
                        toId: activePayTx.toId,
                        amount: parsedAmount,
                        status: "pending",
                        uploadedAt: new Date().toISOString(),
                        receiptImage: ""
                      };
                      if (onUpdatePendingReceipts) {
                        onUpdatePendingReceipts([...pendingReceipts, rec]);
                      }
                      setActivePayTx(null);
                      setToastMsg({ get title() { return ui('m9a7d703709'); }, desc: "Đã gửi yêu cầu xác nhận", type: "success" });
                    }}
                    className="flex-1 py-3 bg-[#EBF4FF] text-[#1E40AF] font-bold rounded-xl text-sm hover:bg-[#DBEAFE] transition-colors"
                  >
                    {ui('m02ca83534d')}</button>
                )}
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOffsetBottomSheetOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsOffsetBottomSheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" 
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none p-3 sm:p-4">
              <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }} 
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto pointer-events-auto my-auto border border-slate-100/80"
              >
                <div className="sticky top-0 bg-slate-900 z-10 px-5 py-3.5 flex items-center justify-between shadow-sm rounded-t-3xl text-white">
                  <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-amber-400" />
                    {ui('m0cce4e9e60')}</h3>
                  <button onClick={() => setIsOffsetBottomSheetOpen(false)} className="p-1.5 bg-white/10 text-white rounded-full hover:bg-white/20 cursor-pointer transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50 space-y-4">
                  {/* Visual Direction Flow Header */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-3">
                    <p className="text-[11px] text-slate-500 text-center font-medium">
                      {ui('mc411c7cca4')}</p>

                    {/* From -> To Flow Display Card */}
                    <div className="grid grid-cols-7 items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
                      {/* From Member */}
                      <div className="col-span-3 flex flex-col items-center text-center p-2 rounded-xl bg-white border border-rose-100 shadow-2xs min-h-[90px] justify-center">
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider mb-1">{ui('m264dc9b1cd')}</p>
                        {offsetFromId ? (
                          (() => {
                            const m = getMember(offsetFromId);
                            const bal = memberBalances.find(b => b.memberId === offsetFromId)?.netBalance || 0;
                            return (
                              <div className="space-y-1">
                                <img 
                                  src={getMemberAvatar(m || { name: 'm' })} 
                                  alt={m?.name} 
                                  className="w-8 h-8 rounded-full bg-slate-100 mx-auto border border-rose-200 object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <p className="text-xs font-black text-slate-800 truncate max-w-[100px]">{m?.name}</p>
                                <span className="inline-block text-[10px] font-mono font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                  {formatMoney(bal)}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-slate-400 space-y-1 py-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 text-xs font-bold">?</div>
                            <p className="text-[10px] font-bold">{ui('m59b61425b5')}</p>
                          </div>
                        )}
                      </div>

                      {/* Direction Arrow */}
                      <div className="col-span-1 flex flex-col items-center justify-center text-amber-500">
                        <div className="w-7 h-7 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-700 font-bold shadow-2xs">
                          ➔
                        </div>
                      </div>

                      {/* To Member */}
                      <div className="col-span-3 flex flex-col items-center text-center p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs min-h-[90px] justify-center">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">{ui('m8f371c93b7')}</p>
                        {offsetToId ? (
                          (() => {
                            const m = getMember(offsetToId);
                            const bal = memberBalances.find(b => b.memberId === offsetToId)?.netBalance || 0;
                            return (
                              <div className="space-y-1">
                                <img 
                                  src={getMemberAvatar(m || { name: 'm' })} 
                                  alt={m?.name} 
                                  className="w-8 h-8 rounded-full bg-slate-100 mx-auto border border-emerald-200 object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                <p className="text-xs font-black text-slate-800 truncate max-w-[100px]">{m?.name}</p>
                                <span className={`inline-block text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${bal >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                  {formatMoney(bal)}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-slate-400 space-y-1 py-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 text-xs font-bold">?</div>
                            <p className="text-[10px] font-bold">{ui('meff219d93a')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Member owing selector */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      {ui('m5862c21e74')}</label>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-0.5">
                      {members.map((m) => {
                        const bal = memberBalances.find(b => b.memberId === m.id)?.netBalance || 0;
                        const isSelected = offsetFromId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setOffsetFromId(m.id);
                              if (offsetToId === m.id) setOffsetToId("");
                            }}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#03B875] bg-emerald-50/70 ring-2 ring-[#03B875]/30'
                                : 'border-slate-200/80 bg-white hover:border-slate-300'
                            }`}
                          >
                            <img 
                              src={getMemberAvatar(m)} 
                              alt={m.name} 
                              className="w-7 h-7 rounded-full bg-slate-100 shrink-0 border border-slate-200 object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                              <p className={`text-[10px] font-mono font-bold ${bal < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                {formatMoney(bal)}
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#03B875] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Member receiving selector */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      {ui('me133a5661d')}</label>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-0.5">
                      {members.filter(m => m.id !== offsetFromId).map((m) => {
                        const bal = memberBalances.find(b => b.memberId === m.id)?.netBalance || 0;
                        const isSelected = offsetToId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setOffsetToId(m.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30'
                                : 'border-slate-200/80 bg-white hover:border-slate-300'
                            }`}
                          >
                            <img 
                              src={getMemberAvatar(m)} 
                              alt={m.name} 
                              className="w-7 h-7 rounded-full bg-slate-100 shrink-0 border border-slate-200 object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                              <p className={`text-[10px] font-mono font-bold ${bal > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {formatMoney(bal)}
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Amount Input & Shortcuts */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs space-y-2.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      {ui('m208326859b')}</label>

                    {/* Auto Max Offset Suggestion */}
                    {(() => {
                      if (!offsetFromId || !offsetToId) return null;
                      const fromBal = memberBalances.find(b => b.memberId === offsetFromId)?.netBalance || 0;
                      const toBal = memberBalances.find(b => b.memberId === offsetToId)?.netBalance || 0;
                      const maxOffset = Math.min(Math.abs(fromBal), Math.abs(toBal));
                      if (maxOffset <= 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setOffsetAmountStr(new Intl.NumberFormat(getLocale()).format(Math.round(maxOffset)))}
                          className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 p-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>{ui('m643a1387ba')}{formatMoney(maxOffset)}</span>
                        </button>
                      );
                    })()}

                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={offsetAmountStr}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setOffsetAmountStr(val ? parseInt(val).toLocaleString(getLocale()) : "");
                        }}
                        placeholder={ui('m9ce3ee90e6')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-mono font-black text-slate-800 outline-none focus:border-[#03B875] transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{ui('mc5f95801df')}</span>
                    </div>

                    {/* Quick Amount Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[50000, 100000, 200000, 500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setOffsetAmountStr(new Intl.NumberFormat(getLocale()).format(amt))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          +{amt / 1000}k
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={handleCreateDebtOffset}
                        disabled={!offsetFromId || !offsetToId || !offsetAmountStr || (parseInt(offsetAmountStr.replace(/[^0-9]/g, "")) || 0) <= 0}
                        className="w-full bg-[#03B875] hover:bg-[#02965f] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black py-3 rounded-xl transition-all shadow-3xs cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <Handshake className="w-4 h-4" />
                        <span>{ui('me2e5231bde')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* List of Active & Pending Debt Offsets (Hidden in 1-time offline trial mode) */}
      {!tryOfflineMode && (activeGroup?.debtOffsets || []).length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-3">
            <Handshake className="h-5 w-5 text-amber-600" />
            {ui('ma3c8bcfcb9')}</h4>
          <div className="space-y-3">
            {(activeGroup?.debtOffsets || []).map((offset) => {
              const fromM = getMember(offset.fromId);
              const toM = getMember(offset.toId);

              const isPending = offset.status === "pending" || (!offset.status && !offset.approvedAt);
              const isApproved = offset.status === "approved" || (!offset.status && !!offset.approvedAt);
              const isRejected = offset.status === "rejected";

              const isReceiver = viewingMemberId === offset.toId || (!viewingMemberId && isAdmin);
              const isRequester = viewingMemberId === offset.fromId;
              const canApproveOrReject = (isReceiver || isAdmin) && isPending;
              const canCancel = (isRequester || isAdmin) && isPending;

              return (
                <div 
                  key={offset.id} 
                  className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all ${
                    isPending 
                      ? 'bg-amber-50/70 border-amber-200 shadow-3xs' 
                      : isApproved 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                      isPending ? 'bg-amber-100 text-amber-800' : isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      🤝
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-slate-800 truncate">
                          {fromM?.name || ui('mcd264c4a8f')} → {toM?.name || ui('mcd264c4a8f')}
                        </p>

                        {/* Status Badge */}
                        {isPending && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            {ui('m23ab11db48')}{toM?.name || ui('m9b6c61bd6e')} {ui('m50779afd71')}</span>
                        )}
                        {isApproved && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            {ui('m1832e5a400')}</span>
                        )}
                        {isRejected && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {ui('mff2db58bd8')}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-xs font-mono font-black text-slate-900">
                          {formatMoney(offset.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {offset.createdAt ? new Date(offset.createdAt).toLocaleDateString(getLocale()) : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/50 w-full sm:w-auto justify-end">
                    {isPending && canApproveOrReject && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveDebtOffset(offset.id)}
                          className="px-3 py-2 bg-[#03B875] hover:bg-[#02965f] text-white font-black text-xs rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{ui('ma3c15be715')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDebtOffset(offset.id)}
                          className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                        >
                          {ui('m63bbfd75f6')}</button>
                      </>
                    )}

                    {isPending && !canApproveOrReject && canCancel && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDebtOffset(offset.id)}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        {ui('mbc949b8ff6')}</button>
                    )}

                    {isApproved && isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDebtOffset(offset.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        {ui('m5fb4211296')}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-white border shadow-2xl rounded-2xl p-4 w-[90vw] max-w-sm pointer-events-none"
            style={{
              borderColor: toastMsg.type === 'error' ? '#fecdd3' : '#a7f3d0'
            }}
          >
            <div className="flex gap-3 items-start">
              <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${toastMsg.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-[#03B875]/10 text-[#03B875]'}`}>
                {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-extrabold ${toastMsg.type === 'error' ? 'text-rose-700' : 'text-[#03B875]'}`}>
                  {toastMsg.title}
                </h4>
                {toastMsg.desc && (
                  <p className="text-[0.6875rem] font-medium text-slate-600 mt-1 leading-relaxed">
                    {toastMsg.desc}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PersonalStatementModal
        isOpen={showPersonalStatement}
        onClose={() => setShowPersonalStatement(false)}
        members={members}
        expenses={expenses}
        activeGroup={activeGroup}
        viewingMemberId={viewingMemberId}
        isAdmin={isAdmin}
      />

      {!tryOfflineMode && (
        <div className="mt-8 pt-8">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {ui('mc0ce74338c')}</h4>
          {pendingReceipts.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-500 text-xs font-medium">{ui('mb632f8dc6c')}</div>
          ) : (
            <div className="space-y-3">
              {pendingReceipts.map(rec => (
                <div 
                  key={rec.id} 
                  id={`receipt-${rec.id}`} 
                  className={`p-4 border border-slate-100 rounded-[20px] shadow-3xs flex flex-col gap-3 transition-all duration-500 ease-in-out hover:bg-slate-50 ${highlightedReceiptId === rec.id ? "ring-2 ring-emerald-500 ring-offset-1 bg-emerald-50 scale-[1.02] shadow-lg z-10" : "bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 leading-tight text-left">
                        {getMember(rec.fromId)?.name || ui('mcd264c4a8f')} → {rec.toId === "group" || !rec.toId ? ui('m3f56f2dd08') : (getMember(rec.toId)?.name || ui('mcd264c4a8f'))}
                      </p>
                      <p className="text-sm font-mono font-black text-emerald-600 text-left">{formatMoney(rec.amount)}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          rec.status === "pending"
                            ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                            : (rec.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700")
                        }`}>
                          {rec.status === "pending" ? ui('m3352b356a4') : (rec.status === "approved" ? ui('m1165d88205') : ui('mc5051bf796'))}
                        </span>
                        {(rec.uploadedAt || rec.createdAt) && (
                          <span className="text-[10px] text-slate-400 font-medium ml-1">
                            {formatDisplayDateTime(rec.uploadedAt || rec.createdAt)}
                          </span>
                        )}
                      </div>
                      
                      {rec.memberNote && (
                        <p className="text-[10px] text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100/50 mt-1.5 inline-block text-left">
                          "{rec.memberNote}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rec.receiptImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(rec.receiptImage)}
                          className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 group relative hover:border-emerald-500 transition-colors cursor-pointer"
                          title={ui('m1b3e72b8cd')}
                        >
                          <img src={rec.receiptImage} alt="Receipt proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] text-white font-black uppercase">{ui('mc088a919fc')}</span>
                          </div>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReceipt(rec.id)}
                          className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                          title={ui('mc10567ce08')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {rec.status === "pending" && isAdmin && (
                    <div className="flex gap-2 border-t border-slate-50 pt-2.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleRejectReceipt(rec)}
                        className="flex-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        {ui('m63bbfd75f6')}</button>
                      <button
                        type="button"
                        onClick={() => handleApproveReceipt(rec)}
                        className="flex-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        {ui('m80112ab29c')}</button>
                    </div>
                  )}

                  {rec.status === "approved" && isAdmin && (
                    <div className="flex gap-2 border-t border-slate-50 pt-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleResetReceiptToPending(rec.id)}
                        className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title={ui('m6bd34bfe38')}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {ui('m1042c95653')}</button>
                      <button
                        type="button"
                        onClick={() => handleApproveReceipt(rec)}
                        className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title={ui('m90c986b78d')}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {ui('mba99e78759')}</button>
                    </div>
                  )}

                  {rec.status === "rejected" && isAdmin && (
                    <div className="flex gap-2 border-t border-slate-50 pt-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleResetReceiptToPending(rec.id)}
                        className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {ui('m22c5fbaea3')}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receipt Image Lightbox Overlay */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl z-10 max-w-sm w-full relative flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute right-3 top-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                aria-label={ui('md2b73ab2ad')}
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-xs text-slate-800 text-center uppercase tracking-wider mb-4 mt-2">{ui('m1d24259873')}</h4>
              <div className="w-full max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-100">
                <img src={previewImage} alt="Receipt Proof Expanded" referrerPolicy="no-referrer" className="w-full object-contain rounded-2xl" />
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer"
              >
                {ui('m6f781f696e')}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
