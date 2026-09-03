import React, { useState, useEffect } from "react";
import { Member, Expense, PendingReceipt } from "../types";
import { compressImage } from "../utils/imageCompressor";
import { getMemberAvatar } from "../utils/avatar";
import { Receipt, Calendar, User, Users, AlertCircle, Sparkles, UploadCloud, X, ArrowLeft, Check, ChevronLeft, ChevronRight, Image as ImageIcon, Camera, Loader2, Zap, QrCode, Pencil } from "lucide-react";
import { SUPPORTED_BANKS, generateBankDeepLink, VietQRData, parseVietQR, scanQrFromImage, getBankBin, generateVietQRQuickUrl } from "../utils/vietqr";
import { BankAppSelectorModal } from "./BankAppSelectorModal";
import { BankOption } from "../utils/banks";
import { getMonthlyReceiptImageCount } from "../utils/receiptLimit";

interface ExpenseFormProps {
  members: Member[];
  onAddExpense: (expense: Expense) => void;
  editingExpense?: Expense | null;
  onCancelEdit?: () => void;
  onUpdateExpense?: (expense: Expense) => void;
  currentMemberId?: string;
  initialPendingScanFile?: File | null;
  onScanComplete?: () => void;
  groupId?: string;
  groupName?: string;
  qrAutofill?: VietQRData | null;
  onClearQr?: () => void;
  onNavigateHome?: () => void;
  tryOfflineMode?: boolean;
  groupPlan?: string;
  ocrUsage?: number;
  onUpdateOcrUsage?: () => void;
  expenses?: Expense[];
  pendingReceipts?: PendingReceipt[];
}

const CATEGORIES = [
  { key: "food", name: "Ăn uống", emoji: "🍔" },
  { key: "transport", name: "Xe cộ", emoji: "🚗" },
  { key: "shopping", name: "Mua sắm", emoji: "🛍️" },
  { key: "accommodation", name: "Chỗ ở", emoji: "🏨" },
  { key: "entertainment", name: "Vui chơi", emoji: "🎉" },
  { key: "other", name: "Khác", emoji: "💸" }
];

function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function ExpenseForm({
  members,
  onAddExpense,
  editingExpense,
  onCancelEdit,
  onUpdateExpense,
  currentMemberId,
  initialPendingScanFile,
  onScanComplete,
  groupId,
  groupName,
  qrAutofill,
  onClearQr,
  onNavigateHome,
  tryOfflineMode = false,
  groupPlan = 'FREE',
  ocrUsage = 0,
  onUpdateOcrUsage,
  expenses = [],
  pendingReceipts = [],
}: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState("");
  const [categoryKey, setCategoryKey] = useState<string>("");

  const fundBalance = (expenses || []).reduce((sum, e) => {
    if (e.isFundDeposit) return sum;
    if (e.description.includes("[Nộp Quỹ]")) return sum + e.amount;
    if (e.description.includes("[Nhận Quỹ]")) return sum - e.amount;
    if (e.payerId === "group") return sum - e.amount;
    return sum;
  }, 0);

  const [lastGroupId, setLastGroupId] = useState<string | undefined>(groupId);

  useEffect(() => {
    if (groupId !== lastGroupId) {
      setLastGroupId(groupId);
      setPayerId("");
    }
  }, [groupId, lastGroupId]);
  
  const [activeQr, setActiveQr] = useState<VietQRData | null>(null);
  const [showBankSheet, setShowBankSheet] = useState(false);
  const [setDefaultBank, setSetDefaultBank] = useState(true);

  
  const toDMY = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const [dateInput, setDateInput] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  });

  // Custom Vietnamese Calendar Dropdown states
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!showCalendar) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".calendar-popover-container") && !target.closest("#expense-date-wrapper")) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCalendar]);

  const parseInputToCalendar = (val: string) => {
    const parts = val.split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1990 && y <= 2100 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
        setCurrentMonth(m);
        setCurrentYear(y);
      }
    }
  };

  // Keep list of selected participants
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customSplit, setCustomSplit] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState("");

  const planLimit = groupPlan === 'HOI_LANG' || groupPlan === 'PREMIUM' ? Infinity : (groupPlan === 'DU_HI_30' ? 100 : (groupPlan === 'BE_BAN' || groupPlan === 'VIP' ? 50 : 10));

  // Receipt image upload
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [manualDragActive, setManualDragActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<boolean | null>(null);
  const [isExpenseAdded, setIsExpenseAdded] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [addedExpenseSuccess, setAddedExpenseSuccess] = useState<{
    id: string;
    description: string;
    amount: number;
    payerId: string;
    payerName: string;
    payerBankCode?: string;
    payerBankAccount?: string;
    payerMomoPhone?: string;
    qrData?: VietQRData | null;
  } | null>(null);

  const [lastEditingId, setLastEditingId] = useState<string | null>(null);

  // Sync participants and payer with members prop on change / prefill for Editing
  useEffect(() => {
    if (editingExpense) {
      if (editingExpense.id !== lastEditingId) {
        setDescription(editingExpense.description);
        setAmountStr(Math.round(editingExpense.amount || 0).toLocaleString("vi-VN"));
        setPayerId(editingExpense.payerId);
        setDateInput(toDMY(editingExpense.date));
        setSelectedParticipants(editingExpense.participantIds);
        setCategoryKey(editingExpense.categoryKey || "");
        if (editingExpense.customSplit && Object.keys(editingExpense.customSplit).length > 0) {
          setSplitMode("custom");
          setCustomSplit(editingExpense.customSplit);
        } else {
          setSplitMode("equal");
          setCustomSplit({});
        }
        setReceiptImage(editingExpense.receiptImage || null);
        setLastEditingId(editingExpense.id);
        setScanSuccess(null);
        setAiErrorMsg("");
      }
    } else {
      if (lastEditingId !== null) {
        setLastEditingId(null);
        setCategoryKey("");
      }
      if (members.length > 0) {
        if (groupPlan === "DU_HI_30") {
          if (!payerId) setPayerId("group");
        } else {
          // Các gói khác (Hội Làng, Bè Bạn, Free) không có tính năng chọn Quỹ Nhóm làm người trả
          if (!payerId || payerId === "group") {
            setPayerId(currentMemberId && members.some(m => m.id === currentMemberId) ? currentMemberId : members[0].id);
          }
        }
        // Default to select active participants who are set of upcoming active
        if (selectedParticipants.length === 0) {
          const activeParticipants = members.filter((m) => m.isUpcomingActive !== false);
          setSelectedParticipants(activeParticipants.length > 0 ? activeParticipants.map((m) => m.id) : members.map((m) => m.id));
        } else {
          // Keeps only valid remaining member IDs
          const validIds = members.map((m) => m.id);
          setSelectedParticipants((prev) => prev.filter((id) => validIds.includes(id)));
        }
      }
    }
  }, [editingExpense, members, lastEditingId, currentMemberId, expenses, groupPlan]);

  // Sync QR Autofill prop on change
  useEffect(() => {
    if (qrAutofill) {
      setActiveQr(qrAutofill);
      let autoDesc = "";
      if (qrAutofill.memo && qrAutofill.memo.trim()) {
        autoDesc = qrAutofill.memo.trim();
      } else {
        const rawName = qrAutofill.accountName || qrAutofill.storeName || "";
        const cleanName = rawName ? rawName.replace(/^(MOMO_|ZALOPAY_|VIETQR_|BVBANK_|VCB_|TCB_|MB_|MBB_)/i, "").replace(/^(MOMO|ZALOPAY|VIETQR|VNPAY)$/i, "").replace(/_/g, " ").trim() : "";
        const namePart = cleanName || (qrAutofill.accountNumber ? `STK ${qrAutofill.accountNumber}` : "");
        if (namePart) {
          autoDesc = namePart.toLowerCase().startsWith("thanh toán")
            ? namePart
            : `Thanh toán ${namePart}`;
        } else {
          autoDesc = "Thanh toán chi phí";
        }
      }
      setDescription(autoDesc);
      setAmountStr(qrAutofill.amount ? Math.round(qrAutofill.amount).toLocaleString("vi-VN") : "");
      
      const defaultPayerId = groupPlan === "DU_HI_30"
        ? "group"
        : (currentMemberId && members.some(m => m.id === currentMemberId) 
          ? currentMemberId 
          : (members.length > 0 ? members[0].id : ""));
      setPayerId(defaultPayerId);
      
      const activeParticipants = members.filter((m) => m.isUpcomingActive !== false);
      setSelectedParticipants(activeParticipants.length > 0 ? activeParticipants.map((m) => m.id) : members.map((m) => m.id));
      
      setSplitMode("equal");
      setCustomSplit({});
      setReceiptImage(null);
      setScanSuccess(null);
      setAiErrorMsg("");
      setIsExpenseAdded(false);
      
      // Auto-focus amount field if amount is empty/static QR
      if (!qrAutofill.amount) {
        setTimeout(() => {
          const amountInput = document.getElementById("expense-amount");
          if (amountInput) {
            amountInput.focus();
          }
        }, 300);
      }
    }
  }, [qrAutofill, members, currentMemberId]);

  // Cleanup/unmount logic to delete uploaded receipt image if the expense is never added
  useEffect(() => {
    const currentReceiptRef = { current: receiptImage };
    const isAddedRef = { current: isExpenseAdded };
    
    currentReceiptRef.current = receiptImage;
    isAddedRef.current = isExpenseAdded;
    
    return () => {
      // If there is an active receiptImage, but it was never successfully added to an expense
      if (currentReceiptRef.current && !isAddedRef.current) {
        const fileToDelete = currentReceiptRef.current;
        console.log("[CLEANUP] Component unmounted without adding expense, deleting file:", fileToDelete);
        fetch('/api/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: fileToDelete })
        }).catch(err => console.error("Lỗi xóa file mồ côi khi unmount:", err));
      }
    };
  }, [receiptImage, isExpenseAdded]);

  const scanReceiptWithAI = async (base64Image: string) => {
    setIsScanning(true);
    setScanSuccess(null);
    setAiErrorMsg("");
    try {
      const response = await fetch("/api/receipt/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      let resData: any = null;
      try {
        resData = await response.json();
      } catch (_jsonErr) {
        throw new Error(`Máy chủ trả về phản hồi không hợp lệ (mã lỗi ${response.status}).`);
      }

      if (!response.ok || !resData || !resData.success) {
        throw new Error(resData?.error || "Không thể phân tích hóa đơn.");
      }

      const { items, date } = resData.data;
      
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const firstTitle = (items[0]?.title || "")
        .replace(/^(ĐẾN\s*)?(MOMO_|ZALOPAY_|VIETQR_|BVBANK_|VCB_|TCB_|MB_|MBB_)/i, "")
        .replace(/_/g, " ")
        .trim();
      const rawTitle = items.length > 1 ? `${firstTitle} và ${items.length - 1} mục khác` : firstTitle;
      const combinedTitle = rawTitle
        ? (rawTitle.toLowerCase().startsWith("thanh toán") ? rawTitle : `Thanh toán ${rawTitle}`)
        : "";

      if (combinedTitle) setDescription(combinedTitle);
      if (totalAmount) {
        setAmountStr(Math.round(totalAmount).toLocaleString("vi-VN"));
      }
      if (date) {
        let cleanedDate = date.replace(/-/g, "/").trim();
        const dateParts = cleanedDate.split("/");
        if (dateParts.length === 3) {
          if (dateParts[0].length === 4) {
            cleanedDate = `${dateParts[2].padStart(2, "0")}/${dateParts[1].padStart(2, "0")}/${dateParts[0]}`;
          } else {
            cleanedDate = `${dateParts[0].padStart(2, "0")}/${dateParts[1].padStart(2, "0")}/${dateParts[2]}`;
          }
        }
        setDateInput(cleanedDate);
      }
      setScanSuccess(true);
      if (onUpdateOcrUsage) onUpdateOcrUsage();
    } catch (err: any) {
      console.error("Lỗi AI scanning: ", err);
      setAiErrorMsg(err.message || "Không thể phân tích dữ liệu hóa đơn.");
      setScanSuccess(false);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAiImageFile = async (file: File) => {
    if (planLimit !== Infinity && ocrUsage >= planLimit) {
      setAiErrorMsg(`Bạn đã hết lượt quét AI trong tháng này (${ocrUsage}/${planLimit} lượt). Vui lòng nâng cấp gói cao hơn.`);
      return;
    }

    const isFreeOrOffline = !groupPlan || groupPlan === 'FREE' || groupPlan === 'TRY_OFFLINE';
    const isBeBan = groupPlan === 'BE_BAN' || groupPlan === 'VIP';
    const isDuHi = groupPlan === 'DU_HI_30';
    const isHoiLang = groupPlan === 'HOI_LANG' || groupPlan === 'PREMIUM';
    const currentImageCount = getMonthlyReceiptImageCount(expenses, pendingReceipts);
    
    if (isFreeOrOffline && currentImageCount >= 10) {
      setAiErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 10 ảnh hóa đơn / tháng dành cho Gói Free / Xài 1 lần. Vui lòng nâng cấp nhóm lên gói Bè Bạn hoặc Hội Làng để tăng thêm.");
      return;
    }
    
    if (isBeBan && currentImageCount >= 50) {
      setAiErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 50 ảnh hóa đơn / tháng dành cho Gói Bè Bạn. Vui lòng nâng cấp nhóm lên gói Hội Làng để tăng lên 200 ảnh / không giới hạn.");
      return;
    }

    if (isDuHi && currentImageCount >= 100) {
      setAiErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 100 ảnh hóa đơn / 30 ngày dành cho Gói Du Hí. Vui lòng nâng cấp nhóm lên gói Hội Làng để tăng lên 200 ảnh.");
      return;
    }

    if (isHoiLang && currentImageCount >= 200) {
      setAiErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 200 ảnh hóa đơn / tháng dành cho Gói Hội Làng.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Chỉ hỗ trợ upload hình ảnh (PNG, JPG, JPEG).");
      return;
    }
    setErrorMsg("");

    try {
      const compressed = await compressImage(file);
      
      // Tự động kiểm tra xem ảnh tải lên/chụp từ camera có chứa mã QR hay không
      const qrRawText = await scanQrFromImage(compressed);
      if (qrRawText) {
        const parsed = parseVietQR(qrRawText);
        if (parsed) {
          // Upload ảnh QR lên storage để lưu làm hóa đơn chứng từ
          const timestamp = Date.now();
          const fileName = `receipt_qr_${timestamp}.jpg`;
          let uploadedUrl = null;
          try {
            const response = await fetch("/api/receipt/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: compressed,
                fileName: fileName,
                groupId: groupId
              })
            });
            const data = await response.json();
            if (data.success && data.url) {
              uploadedUrl = data.url;
            }
          } catch (uploadErr) {
            console.error("Lỗi upload ảnh QR lên storage:", uploadErr);
          }

          // Là mã VietQR hợp lệ! Tự động chuyển đổi thành VietQR 1-Chạm
          setActiveQr(parsed);
          let qrFormattedDesc = "";
          if (parsed.memo && parsed.memo.trim()) {
            qrFormattedDesc = parsed.memo.trim();
          } else {
            let storeOrMemo = parsed.accountName || parsed.storeName || "";
            if (storeOrMemo) {
              storeOrMemo = storeOrMemo.replace(/^(MOMO_|ZALOPAY_|VIETQR_|BVBANK_|VCB_|TCB_|MB_|MBB_)/i, "").replace(/^(MOMO|ZALOPAY|VIETQR|VNPAY)$/i, "").replace(/_/g, " ").trim();
            }

            // Nếu QR không chứa tên cửa hàng/chủ tài khoản rõ ràng, chạy AI OCR để tự bóc tách tên quán từ ảnh
            if (!storeOrMemo || storeOrMemo.toLowerCase().includes("tài khoản") || storeOrMemo.toLowerCase().startsWith("stk")) {
              try {
                const aiRes = await fetch("/api/receipt/scan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: compressed }),
                });
                if (aiRes.ok) {
                  const aiData = await aiRes.json();
                  if (aiData.success && aiData.data?.items?.[0]?.title) {
                    const extracted = aiData.data.items[0].title
                      .replace(/^(ĐẾN\s*)?(MOMO_|ZALOPAY_|VIETQR_|BVBANK_)/i, "")
                      .replace(/_/g, " ")
                      .trim();
                    if (extracted && !extracted.toLowerCase().includes("tài khoản")) {
                      storeOrMemo = extracted;
                    }
                  }
                }
              } catch (err) {
                console.error("Lỗi AI scan tên quán cho QR:", err);
              }
            }

            if (!storeOrMemo && parsed.accountNumber) {
              storeOrMemo = `STK ${parsed.accountNumber}`;
            }
            if (!storeOrMemo) {
              storeOrMemo = "chi phí";
            }
            qrFormattedDesc = storeOrMemo.toLowerCase().startsWith("thanh toán")
              ? storeOrMemo
              : `Thanh toán ${storeOrMemo}`;
          }

          setDescription(qrFormattedDesc);
          setAmountStr(parsed.amount ? Math.round(parsed.amount).toLocaleString("vi-VN") : "");
          
          const defaultPayerId = groupPlan === "DU_HI_30"
            ? "group"
            : (currentMemberId && members.some(m => m.id === currentMemberId) 
              ? currentMemberId 
              : (members.length > 0 ? members[0].id : ""));
          setPayerId(defaultPayerId);
          
          const activeParticipants = members.filter((m) => m.isUpcomingActive !== false);
          setSelectedParticipants(activeParticipants.length > 0 ? activeParticipants.map((m) => m.id) : members.map((m) => m.id));
          
          setSplitMode("equal");
          setCustomSplit({});
          
          // Xóa ảnh cũ nếu có trước khi set ảnh QR mới
          if (receiptImage && receiptImage !== uploadedUrl) {
            try {
              await fetch('/api/storage/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: receiptImage })
              });
            } catch (e) {
              console.error("Lỗi xóa ảnh cũ khi upload ảnh mới:", e);
            }
          }

          setReceiptImage(uploadedUrl);
          setScanSuccess(true);
          setAiErrorMsg("");
          
          if (!parsed.amount) {
            setTimeout(() => {
              const amountInput = document.getElementById("expense-amount");
              if (amountInput) {
                amountInput.focus();
              }
            }, 300);
          }
          return; // Dừng luồng quét hóa đơn AI để ưu tiên nhập nhanh QR
        }
      }
      
      const timestamp = Date.now();
      const fileName = `receipt_ai_${timestamp}.jpg`;

      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressed,
          fileName: fileName,
          groupId: groupId
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        if (receiptImage) {
          try {
            await fetch('/api/storage/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: receiptImage })
            });
          } catch (e) {
            console.error("Lỗi xóa ảnh cũ khi upload ảnh mới:", e);
          }
        }
        setReceiptImage(data.url);
        // We still use the compressed base64 for AI scanning to avoid re-fetching
        await scanReceiptWithAI(compressed);
      } else {
        throw new Error(data.error || "Lỗi upload");
      }
    } catch (err: any) {
      console.error("Lỗi xử lý ảnh hóa đơn AI: ", err);
      setErrorMsg("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    if (initialPendingScanFile) {
      handleAiImageFile(initialPendingScanFile);
      if (onScanComplete) {
        onScanComplete();
      }
    }
  }, [initialPendingScanFile]);

  const handleManualImageFile = async (file: File) => {
    const isFreeOrOffline = !groupPlan || groupPlan === 'FREE' || groupPlan === 'TRY_OFFLINE';
    const isBeBan = groupPlan === 'BE_BAN' || groupPlan === 'VIP';
    const isDuHi = groupPlan === 'DU_HI_30';
    const isHoiLang = groupPlan === 'HOI_LANG' || groupPlan === 'PREMIUM';
    const currentImageCount = getMonthlyReceiptImageCount(expenses, pendingReceipts);
    
    if (isFreeOrOffline && currentImageCount >= 10) {
      setErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 10 ảnh hóa đơn / tháng dành cho Gói Free / Xài 1 lần. Vui lòng nâng cấp nhóm lên gói Bè Bạn hoặc Hội Làng để tăng thêm.");
      return;
    }
    
    if (isBeBan && currentImageCount >= 50) {
      setErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 50 ảnh hóa đơn / tháng dành cho Gói Bè Bạn. Vui lòng nâng cấp nhóm lên gói Hội Làng để tăng lên 200 ảnh / không giới hạn.");
      return;
    }

    if (isDuHi && currentImageCount >= 100) {
      setErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 100 ảnh hóa đơn / 30 ngày dành cho Gói Du Hí. Vui lòng nâng cấp nhóm lên gói Hội Làng để tăng lên 200 ảnh.");
      return;
    }

    if (isHoiLang && currentImageCount >= 200) {
      setErrorMsg("Bạn đã đạt giới hạn lưu trữ tối đa 200 ảnh hóa đơn / tháng dành cho Gói Hội Làng.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Chỉ hỗ trợ upload hình ảnh (PNG, JPG, JPEG).");
      return;
    }
    setErrorMsg("");
    // Clear previous scan messages if any, since it's now manual
    setScanSuccess(null);
    setAiErrorMsg("");

    try {
      const compressed = await compressImage(file);
      
      const timestamp = Date.now();
      const fileName = `receipt_m_${timestamp}.jpg`;

      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressed,
          fileName: fileName,
          groupId: groupId
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        if (receiptImage) {
          try {
            await fetch('/api/storage/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: receiptImage })
            });
          } catch (e) {
            console.error("Lỗi xóa ảnh cũ khi upload ảnh mới:", e);
          }
        }
        setReceiptImage(data.url);
      } else {
        throw new Error(data.error || "Lỗi upload");
      }
    } catch (err: any) {
      console.error("Lỗi xử lý ảnh hóa đơn thủ công: ", err);
      setErrorMsg("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    }
  };

  const handleAiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleAiImageFile(e.target.files[0]);
    }
  };

  const handleManualImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleManualImageFile(e.target.files[0]);
    }
  };

  const handleAiDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleAiDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAiImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setManualDragActive(true);
    } else if (e.type === "dragleave") {
      setManualDragActive(false);
    }
  };

  const handleManualDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setManualDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleManualImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectAll = () => {
    setSelectedParticipants(members.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedParticipants([]);
  };

  const handleToggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Safe numerical parser
  const getAmountNumber = () => {
    return parseInt(amountStr.replace(/[^0-9]/g, "")) || 0;
  };

  // Visual formatting as user types: "100000" -> "100.000"
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (rawVal === "") {
      setAmountStr("");
      return;
    }
    const num = parseInt(rawVal);
    setAmountStr(num.toLocaleString("vi-VN"));
  };

  // Mask and format date: "1206" -> "12/06", "1206202" -> "12/06/202"
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Keep only numbers
    const digits = rawVal.replace(/\D/g, "");
    let formatted = "";
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += "/" + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += "/" + digits.substring(4, 8);
    }
    setDateInput(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const amount = getAmountNumber();
    const trimmedDesc = description.trim();

    if (!trimmedDesc) {
      setErrorMsg("Vui lòng nhập nội dung chi phí.");
      return;
    }

    if (amount <= 0) {
      setErrorMsg("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    if (!payerId) {
      setErrorMsg("Vui lòng chọn người thanh toán.");
      return;
    }

    if (selectedParticipants.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 thành viên tham gia chia tiền.");
      return;
    }

    // Validate and parse dateInput (dd/mm/yyyy)
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const dateMatch = dateInput.trim().match(datePattern);
    if (!dateMatch) {
      setErrorMsg("Ngày phát sinh chưa đúng định dạng dd/mm/yyyy (Ví dụ: 12/06/2026).");
      return;
    }

    const dayInt = parseInt(dateMatch[1], 10);
    const monthInt = parseInt(dateMatch[2], 10);
    const yearInt = parseInt(dateMatch[3], 10);

    if (monthInt < 1 || monthInt > 12) {
      setErrorMsg("Tháng không hợp lệ (phải từ 01 đến 12).");
      return;
    }
    if (dayInt < 1 || dayInt > 31) {
      setErrorMsg("Ngày không hợp lệ (phải từ 01 đến 31).");
      return;
    }

    // Checking if valid calendar day
    const parsedDate = new Date(yearInt, monthInt - 1, dayInt);
    if (parsedDate.getFullYear() !== yearInt || parsedDate.getMonth() !== monthInt - 1 || parsedDate.getDate() !== dayInt) {
      setErrorMsg("Ngày phát sinh không tồn tại trong lịch.");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const formattedIsoDate = `${yearInt}-${pad(monthInt)}-${pad(dayInt)}`;
    
    let finalCustomSplit: Record<string, number> | undefined = undefined;
    
    if (splitMode === "custom") {
      let allocatedAmount = 0;
      let specifiedCount = 0;
      const validCustomSplit: Record<string, number> = {};
      
      selectedParticipants.forEach(id => {
        if (customSplit[id] !== undefined) {
          validCustomSplit[id] = customSplit[id];
          allocatedAmount += customSplit[id];
          specifiedCount++;
        }
      });
      
      if (allocatedAmount > amount) {
        setErrorMsg("Tổng số tiền nhập tùy chỉnh lớn hơn tổng số tiền của khoản chi.");
        return;
      }
      
      const remainingAmount = amount - allocatedAmount;
      const remainingCount = selectedParticipants.length - specifiedCount;
      
      if (remainingCount === 0 && allocatedAmount !== amount) {
        setErrorMsg("Tổng số tiền chia không bằng tổng số tiền của khoản chi.");
        return;
      }
      
      if (remainingCount > 0) {
        const splitRemaining = remainingAmount / remainingCount;
        selectedParticipants.forEach(id => {
          if (validCustomSplit[id] === undefined) {
            validCustomSplit[id] = splitRemaining;
          }
        });
      }
      
      finalCustomSplit = validCustomSplit;
    }

    if (editingExpense) {
      const updatedExpense: Expense = {
        id: editingExpense.id,
        description: trimmedDesc,
        amount,
        payerId,
        date: formattedIsoDate,
        participantIds: selectedParticipants,
        customSplit: finalCustomSplit,
        receiptImage: receiptImage || undefined,
        addedBy: editingExpense.addedBy,
        editedBy: editingExpense.editedBy,
        categoryKey: categoryKey || undefined,
      };

      if (onUpdateExpense) {
        onUpdateExpense(updatedExpense);
      }

      const targetPayerId = updatedExpense.payerId;
      const payerObj = members.find((m) => m.id === targetPayerId);
      setAddedExpenseSuccess({
        id: updatedExpense.id,
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        payerId: targetPayerId,
        payerName: targetPayerId === "group" ? "Quỹ Nhóm 🏦" : (payerObj ? payerObj.name : "Thành viên"),
        payerBankCode: payerObj?.bankCode,
        payerBankAccount: payerObj?.bankAccount,
        payerMomoPhone: payerObj?.momoPhone,
        qrData: activeQr,
      });
    } else {
      const newExpense: Expense = {
        id: "exp_" + Date.now(),
        description: trimmedDesc,
        amount,
        payerId,
        date: formattedIsoDate,
        participantIds: selectedParticipants,
        customSplit: finalCustomSplit,
        receiptImage: receiptImage || undefined,
        categoryKey: categoryKey || undefined,
      };

      onAddExpense(newExpense);
      setIsExpenseAdded(true);

      const payerObj = members.find((m) => m.id === newExpense.payerId);
      setAddedExpenseSuccess({
        id: newExpense.id,
        description: newExpense.description,
        amount: newExpense.amount,
        payerId: newExpense.payerId,
        payerName: newExpense.payerId === "group" ? "Quỹ Nhóm 🏦" : (payerObj ? payerObj.name : "Thành viên"),
        payerBankCode: payerObj?.bankCode,
        payerBankAccount: payerObj?.bankAccount,
        payerMomoPhone: payerObj?.momoPhone,
        qrData: activeQr,
      });
    }

    // Reset fields
    setDescription("");
    setAmountStr("");
    setCategoryKey("");
    setReceiptImage(null);
    onClearQr?.();

    // Tự động cuộn lên đầu trang để người dùng thấy ngay banner thành công & nút mở App Ngân hàng
    setTimeout(() => {
      const formEl = document.getElementById("expense-form-root");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);

    // Reset dateInput to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setDateInput(`${day}/${month}/${year}`);
  };

  const VIETNAMESE_MONTHS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const buildCalendarGrid = () => {
    const list: { day: number; isCurrent: boolean; dateObj: Date; isSelected: boolean; isToday: boolean }[] = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // Leading padding days (from previous month)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dObj = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
      list.push({
        day: prevMonthDays - i,
        isCurrent: false,
        dateObj: dObj,
        isSelected: false,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(currentYear, currentMonth, d);
      let isSel = false;
      const parts = dateInput.split("/");
      if (parts.length === 3) {
        const dayI = parseInt(parts[0], 10);
        const monthI = parseInt(parts[1], 10) - 1;
        const yearI = parseInt(parts[2], 10);
        if (d === dayI && currentMonth === monthI && currentYear === yearI) {
          isSel = true;
        }
      }
      list.push({
        day: d,
        isCurrent: true,
        dateObj: dObj,
        isSelected: isSel,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    // Trailing padding days (from next month)
    const totalCells = 42; // standard 6 rows grid
    const remaining = totalCells - list.length;
    for (let i = 1; i <= remaining; i++) {
      const dObj = new Date(currentYear, currentMonth + 1, i);
      list.push({
        day: i,
        isCurrent: false,
        dateObj: dObj,
        isSelected: false,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    return list;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const selectDay = (dateObj: Date) => {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    setDateInput(`${d}/${m}/${y}`);
    setShowCalendar(false);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const amount = getAmountNumber();
  const costPerPerson = selectedParticipants.length > 0 ? Math.round(amount / selectedParticipants.length) : 0;

  // Custom split calculations
  let allocatedAmount = 0;
  let customSpecifiedCount = 0;
  if (splitMode === "custom") {
    selectedParticipants.forEach(id => {
      if (customSplit[id] !== undefined) {
        allocatedAmount += customSplit[id];
        customSpecifiedCount++;
      }
    });
  }
  const customRemainingAmount = amount - allocatedAmount;
  const customRemainingCount = selectedParticipants.length - customSpecifiedCount;
  const isCustomSplitValid = splitMode === "equal" || (allocatedAmount === amount && customRemainingCount === 0) || (customRemainingCount > 0 && allocatedAmount <= amount);

  const openBankingAppUrl = (url: string) => {
    if (!url) return;
    window.location.href = url;
  };

  const handleOpenBankingApp = () => {
    if (!activeQr) return;
    
    const parsedAmount = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Vui lòng nhập số tiền hợp lệ trước khi thanh toán.");
      const amountInput = document.getElementById("expense-amount");
      if (amountInput) amountInput.focus();
      return;
    }
    
    const defaultBank = localStorage.getItem('splitmate_default_bank');
    
    if (defaultBank) {
      const deepLinkUrl = generateBankDeepLink({
        bankCode: defaultBank,
        bankBin: activeQr.bankBin,
        accountNumber: activeQr.accountNumber,
        amount: parsedAmount,
        memo: activeQr.memo || `SplitMate ${description || "Thanh toan"}`
      });
      openBankingAppUrl(deepLinkUrl);
    } else {
      setShowBankSheet(true);
    }
  };

  const handleSelectBank = (bankCode: string) => {
    if (setDefaultBank) {
      localStorage.setItem('splitmate_default_bank', bankCode);
    }
    setShowBankSheet(false);

    if (addedExpenseSuccess) {
      handleOpenBankingAppAfterAdd(bankCode);
    } else if (activeQr) {
      const parsedAmount = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, "")) || activeQr.amount || 0;
      const groupTitle = groupName || "SplitMate";
      const recipientName = activeQr.accountName || activeQr.storeName || description || "Chi phi";
      const rawMemo = `${groupTitle} Thanh toan ${recipientName}`;
      const memo = activeQr.memo || removeVietnameseTones(rawMemo).replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);

      const deepLinkUrl = generateBankDeepLink({
        bankCode,
        bankBin: activeQr.bankBin,
        accountNumber: activeQr.accountNumber,
        amount: parsedAmount,
        memo
      });
      openBankingAppUrl(deepLinkUrl);
    }
  };

  const handleResetDefaultBank = () => {
    localStorage.removeItem('splitmate_default_bank');
    setShowBankSheet(true);
  };

  const handleOpenBankingAppAfterAdd = (targetBankCode?: string) => {
    const chosenBank = targetBankCode || localStorage.getItem('splitmate_default_bank');
    
    let bankBin = "";
    let accountNumber = "";
    let amount = 0;
    let memo = "";
    const groupTitle = groupName || "SplitMate";

    if (addedExpenseSuccess) {
      amount = addedExpenseSuccess.amount;
      const recipientName = addedExpenseSuccess.qrData?.accountName || addedExpenseSuccess.payerName || addedExpenseSuccess.description;
      const rawMemo = `${groupTitle} ${addedExpenseSuccess.description || recipientName}`;
      memo = addedExpenseSuccess.qrData?.memo || removeVietnameseTones(rawMemo).replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);

      if (addedExpenseSuccess.qrData) {
        bankBin = addedExpenseSuccess.qrData.bankBin;
        accountNumber = addedExpenseSuccess.qrData.accountNumber;
      } else if (addedExpenseSuccess.payerBankCode && addedExpenseSuccess.payerBankAccount) {
        bankBin = getBankBin(addedExpenseSuccess.payerBankCode);
        accountNumber = addedExpenseSuccess.payerBankAccount;
      } else if (addedExpenseSuccess.payerMomoPhone) {
        accountNumber = addedExpenseSuccess.payerMomoPhone;
      } else {
        const targetPayer = members.find(m => m.id === addedExpenseSuccess.payerId);
        if (targetPayer && !targetPayer.bankAccount && !targetPayer.momoPhone) {
          alert(`Thành viên ${targetPayer.name} chưa cập nhật tài khoản ngân hàng nhận tiền. Vui lòng nhắc thành viên cập nhật STK trong mục Thành viên hoặc chọn ngân hàng/ví bên dưới.`);
        }
      }
    } else if (activeQr) {
      bankBin = activeQr.bankBin;
      accountNumber = activeQr.accountNumber;
      const parsedAmount = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, "")) || activeQr.amount || 0;
      amount = parsedAmount;
      const recipientName = activeQr.accountName || activeQr.storeName || description || "Chi phi";
      const rawMemo = `${groupTitle} Thanh toan ${recipientName}`;
      memo = activeQr.memo || removeVietnameseTones(rawMemo).replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
    } else {
      setShowBankSheet(true);
      return;
    }

    if (!chosenBank) {
      setShowBankSheet(true);
      return;
    }

    const deepLinkUrl = generateBankDeepLink({
      bankCode: chosenBank,
      bankBin,
      accountNumber,
      amount,
      memo,
    });

    openBankingAppUrl(deepLinkUrl);
  };

  const isAmountLocked = Boolean(activeQr && activeQr.amount && activeQr.amount > 0);

  return (
    <div id="expense-form-root" className={`bg-white p-4 sm:p-6 rounded-3xl border shadow-xs space-y-4 sm:space-y-5 transition-all duration-300 ${editingExpense ? "border-emerald-300 ring-2 ring-emerald-500/20" : "border-slate-200"}`}>
      {/* PROMINENT SUCCESS BANNER & INSTANT BANKING APP LAUNCHER */}
      {addedExpenseSuccess && (
        <div id="expense-success-banner" className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border-2 border-emerald-500 rounded-3xl shadow-lg space-y-3 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20 shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Đã ghi nhận chi phí vào quỹ!</h4>
                <p className="text-xs font-extrabold text-emerald-800 line-clamp-1">{addedExpenseSuccess.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddedExpenseSuccess(null);
                setActiveQr(null);
              }}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-emerald-200/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Người trả trước:</p>
              <p className="font-black text-slate-800">{addedExpenseSuccess.payerName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng số tiền:</p>
              <p className="font-black font-mono text-emerald-700 text-base">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(addedExpenseSuccess.amount)}
              </p>
            </div>
          </div>

          {/* PAYMENT BUTTON TO BANKING APP / E-WALLET REMOVED AS REQUESTED */}
        </div>
      )}

      {/* ACTIVE QR BADGE IF SCANNED */}
      {activeQr && !addedExpenseSuccess && (
        <div className="p-3 bg-indigo-50/90 border border-indigo-200/90 rounded-2xl flex items-center justify-between text-xs text-indigo-950 font-medium shadow-2xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 px-1.5 bg-indigo-600 text-white rounded-lg font-black text-[10px] shrink-0 mt-0.5">VietQR</span>
            <div className="space-y-0.5">
              <p className="font-bold text-indigo-900">
                Đã quét mã QR {activeQr.accountName ? `(${activeQr.accountName})` : ''}
              </p>
              <p className="text-[11px] text-slate-600">
                {!activeQr.amount 
                  ? "Vui lòng nhập số tiền bên dưới và bấm " 
                  : "Kiểm tra thông tin và bấm "}
                <b className="text-indigo-700">Thêm khoản chi</b> để lưu vào nhóm trước khi chuyển sang App ngân hàng thanh toán.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveQr(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
            title="Hủy VietQR"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          {activeQr ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-indigo-700 font-extrabold">VietQR 1-Chạm ⚡</span>
            </>
          ) : editingExpense ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-emerald-700 font-extrabold">Đang sửa chi phí</span>
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>Thêm khoản chi chung</span>
            </>
          )}
        </h4>

        {((editingExpense && onCancelEdit) || activeQr) && (
          <button
            type="button"
            onClick={async () => {
              if (receiptImage) {
                try {
                  await fetch('/api/storage/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrl: receiptImage })
                  });
                } catch (e) {
                  console.error("Lỗi khi xóa hóa đơn rác:", e);
                }
              }
              setDescription("");
              setAmountStr("");
              setReceiptImage(null);
              setErrorMsg("");
              
              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, "0");
              const day = String(today.getDate()).padStart(2, "0");
              setDateInput(`${day}/${month}/${year}`);
              
              setActiveQr(null);
              onClearQr?.();
              
              if (editingExpense && onCancelEdit) {
                onCancelEdit();
              }
            }}
            className="text-[0.6875rem] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Hủy và đặt lại
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-center text-xs text-amber-700 font-medium">
          Vui lòng thêm thành viên vào nhóm trước khi tạo chi phí!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider" htmlFor="expense-desc">
                Nội dung chi phí
              </label>
              <div className="relative">
                <input
                  id="expense-desc"
                  type="text"
                  placeholder="Nhập nội dung..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                  className="w-full bg-transparent border-0 border-b border-slate-200 rounded-none py-2 px-0 focus:outline-none focus:border-emerald-600 font-bold text-slate-850 text-base transition-all placeholder:text-slate-300 focus:bg-transparent focus:ring-0"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Phân loại / Biểu tượng (Hệ thống sẽ tự chọn nếu để trống)
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryKey === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategoryKey(categoryKey === cat.key ? "" : cat.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer select-none ${
                        isSelected 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs scale-102"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span>{cat.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider" htmlFor="expense-amount">
                  Số tiền (VND)
                </label>
                {isAmountLocked && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    🔒 Số tiền cố định từ mã QR
                  </span>
                )}
              </div>
              <div className="relative flex items-center justify-between border-b border-slate-200/70 py-1">
                <span className="text-emerald-600 text-2xl font-black font-mono select-none pr-2">
                  ₫
                </span>
                <input
                  id="expense-amount"
                  type="text"
                  placeholder="0"
                  value={amountStr}
                  onChange={handleAmountChange}
                  readOnly={isAmountLocked}
                  disabled={isAmountLocked}
                  className={`w-full bg-transparent border-0 rounded-none py-1.5 px-0 font-mono font-black text-emerald-650 text-3xl text-right transition-all outline-none focus:ring-0 ${
                    isAmountLocked
                      ? "text-slate-400 cursor-not-allowed select-none"
                      : "placeholder:text-emerald-250 focus:border-emerald-600"
                  }`}
                />
              </div>
              {isAmountLocked && (
                <p className="text-[10px] text-slate-500 font-medium pl-1">
                  Số tiền được đặt cố định từ mã QR quét được ({Math.round(activeQr?.amount || 0).toLocaleString("vi-VN")} ₫).
                </p>
              )}
            </div>
          </div>

          {/* Merged Payer and Date row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Payer Select */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider" htmlFor="expense-payer">
                  Người trả
                </label>
                {payerId === "group" && groupPlan === "DU_HI_30" && (
                  <span className="text-[8px] sm:text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md animate-pulse">
                    🚗 Đã tự động chọn Quỹ nhóm theo Gói Du Hí
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="expense-payer"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 pr-8 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-800 text-xs transition-all appearance-none cursor-pointer"
                >
                  {groupPlan === "DU_HI_30" && (
                    <option value="group">🏦 Quỹ Nhóm</option>
                  )}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Date Pick */}
            <div className="space-y-1" id="expense-date-wrapper">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider" htmlFor="expense-date">
                Ngày phát sinh
              </label>
              <div className="relative">
                <input
                  id="expense-date"
                  type="text"
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  value={dateInput}
                  onChange={handleDateInputChange}
                  onFocus={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar(true);
                  }}
                  onClick={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 pr-8 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-mono font-bold text-slate-800 text-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar((prev) => !prev);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>

                {/* Custom Vietnamese Calendar Popover */}
                {showCalendar && (
                  <div className="calendar-popover-container absolute right-0 top-full mt-2 w-[300px] sm:w-[330px] max-w-[calc(100vw-36px)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-3">
                    {/* Header Month / Year & Navigation */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
                        title="Tháng trước"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                        {VIETNAMESE_MONTHS[currentMonth]} năm {currentYear}
                      </span>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
                        title="Tháng sau"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Phím tắt chọn nhanh */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          selectDay(today);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#03B875] font-bold text-[11px] transition-colors text-center cursor-pointer"
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yest = new Date();
                          yest.setDate(yest.getDate() - 1);
                          selectDay(yest);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition-colors text-center cursor-pointer"
                      >
                        Hôm qua
                      </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 text-center text-[11px] font-black text-slate-400">
                      {WEEKDAYS.map((w) => (
                        <div key={w} className="py-0.5">{w}</div>
                      ))}
                    </div>

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                      {buildCalendarGrid().map((cell, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectDay(cell.dateObj)}
                          className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                            cell.isSelected
                              ? "bg-[#03B875] text-white shadow-md shadow-emerald-500/30 scale-105 font-black"
                              : cell.isCurrent
                              ? cell.isToday
                                ? "bg-emerald-50 text-[#03B875] border border-emerald-300 font-black"
                                : "text-slate-800 hover:bg-emerald-50 hover:text-[#03B875]"
                              : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                          }`}
                        >
                          {cell.day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ảnh hóa đơn / Biên lai (Quét AI hoặc Tải thủ công) */}
          <div className="space-y-2 text-left">
            {!receiptImage ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Scan Section */}
                <div className="space-y-1.5">
                  <div className="flex flex-col items-end w-full space-y-1.5">
                    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                      {planLimit === Infinity ? `${ocrUsage}/∞` : `${ocrUsage}/${planLimit} lượt`}
                    </span>
                    <div className="w-full">
                      <span className="text-[0.6875rem] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                        Quét hóa đơn bằng AI ✨
                      </span>
                    </div>
                  </div>
                  
                  <div
                    onDragEnter={handleAiDrag}
                    onDragOver={handleAiDrag}
                    onDragLeave={handleAiDrag}
                    onDrop={handleAiDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[5.9375rem] ${
                      dragActive
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/20 hover:border-emerald-300"
                    }`}
                  >
                    <input
                      type="file"
                      id="receipt-upload-ai"
                      accept="image/*"
                      onChange={handleAiImageChange}
                      className="hidden"
                      disabled={isScanning}
                    />
                    <label htmlFor="receipt-upload-ai" className="cursor-pointer w-full h-full py-1.5 block">
                      <div className="flex flex-col items-center justify-center">
                        <UploadCloud className={`h-7 w-7 mb-1 text-emerald-500 ${dragActive ? "animate-bounce" : ""}`} />
                        <p className="text-xs font-extrabold text-slate-700">Kéo thả hoặc click quét AI</p>
                        <p className="text-[0.625rem] text-emerald-600 font-semibold mt-0.5">Tự động phân tích & điền nhanh</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Manual Upload Section */}
                <div className="space-y-1.5">
                  <div className="flex flex-col items-end w-full space-y-1.5">
                    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                      {groupPlan === 'HOI_LANG' || groupPlan === 'PREMIUM' ? `${getMonthlyReceiptImageCount(expenses, pendingReceipts)}/200 ảnh` : (groupPlan === 'DU_HI_30' ? `${getMonthlyReceiptImageCount(expenses, pendingReceipts)}/100 ảnh` : (groupPlan === 'BE_BAN' || groupPlan === 'VIP' ? `${getMonthlyReceiptImageCount(expenses, pendingReceipts)}/50 ảnh` : `${getMonthlyReceiptImageCount(expenses, pendingReceipts)}/10 ảnh`))}
                    </span>
                    <div className="w-full">
                      <span className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                        Ảnh hóa đơn thủ công 📁
                      </span>
                    </div>
                  </div>
                  
                  <div
                    onDragEnter={handleManualDrag}
                    onDragOver={handleManualDrag}
                    onDragLeave={handleManualDrag}
                    onDrop={handleManualDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[5.9375rem] ${
                      manualDragActive
                        ? "border-slate-500 bg-slate-50/50"
                        : "border-slate-200 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="file"
                      id="receipt-upload-manual"
                      accept="image/*"
                      onChange={handleManualImageChange}
                      className="hidden"
                      disabled={isScanning}
                    />
                    <label htmlFor="receipt-upload-manual" className="cursor-pointer w-full h-full py-1.5 block">
                      <div className="flex flex-col items-center justify-center">
                        <UploadCloud className={`h-7 w-7 mb-1 text-slate-400 ${manualDragActive ? "animate-bounce" : ""}`} />
                        <p className="text-xs font-extrabold text-slate-700">Tải ảnh thủ công lên</p>
                        <p className="text-[0.625rem] text-slate-400 mt-0.5">Chỉ lưu trữ làm minh chứng</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                  Ảnh hóa đơn đã tải lên
                </span>
                
                <div className="border border-slate-200 rounded-2xl p-4 text-center relative flex flex-col items-center justify-center min-h-[5.625rem] bg-slate-50/45">
                  {/* Scanning overlay loader */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center space-y-1.5 z-10 animate-in fade-in duration-200">
                      <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
                      <p className="text-xs font-bold text-emerald-800 animate-pulse">🤖 đang đọc hóa đơn...</p>
                    </div>
                  )}

                  <div className="w-full flex flex-col sm:flex-row items-center gap-3 justify-between">
                    <div className="flex items-center gap-2.5 max-w-[80%] min-w-0">
                      <img
                        src={receiptImage}
                        alt="Receipt Preview"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate">Ảnh hóa đơn lưu thành công</p>
                        <p className="text-[0.625rem] text-slate-400">Có thể xem lại trong lịch sử chi phí</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptImage(null);
                        setScanSuccess(null);
                        setAiErrorMsg("");
                      }}
                      className="p-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100/85 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer"
                      disabled={isScanning}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {scanSuccess === true && (
              <div className="mt-2.5 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-extrabold text-emerald-900">AI đã tự động điền thông tin! ✨</p>
                  <p className="text-[0.6875rem] text-emerald-700/90 mt-0.5">Tên chi phí, Số tiền và Ngày đã được tự động phân tích từ hóa đơn.</p>
                </div>
              </div>
            )}

            {scanSuccess === false && aiErrorMsg && (
              <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-amber-950">Không thể nhận diện tự động</p>
                  <p className="text-[0.6875rem] text-amber-800/90 mt-0.5">{aiErrorMsg}</p>
                  <p className="text-[0.625rem] text-slate-500 mt-1">Lưu ý: Chụp ảnh hóa đơn rõ nét, đầy đủ ánh sáng và không che khuất các thông tin quan trọng.</p>
                </div>
              </div>
            )}
          </div>

          {/* Selective split toggles */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
            <div className="flex flex-col gap-3 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-550" />
                <span className="text-xs font-bold text-slate-700">Chia sẻ cùng ai ({selectedParticipants.length} người)</span>
              </div>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSplitMode("equal")}
                    className={`whitespace-nowrap text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      splitMode === "equal" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Chia đều
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode("custom")}
                    className={`whitespace-nowrap text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      splitMode === "custom" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Tùy chỉnh
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[0.6875rem] font-bold text-emerald-600 hover:text-emerald-800 px-1.5 py-0.5 rounded hover:bg-emerald-50 transition-all cursor-pointer"
                  >
                    Tất cả
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[0.6875rem] font-bold text-rose-500 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic sharing preview box */}
            <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center py-1">
              {members.map((m) => {
                const isSelected = selectedParticipants.includes(m.id);
                
                // Calculate remaining amount for custom split display
                let displayAmount = isSelected ? costPerPerson : 0;
                if (splitMode === "custom" && isSelected) {
                  let allocated = 0;
                  let specified = 0;
                  selectedParticipants.forEach(id => {
                    if (customSplit[id] !== undefined) {
                      allocated += customSplit[id];
                      specified++;
                    }
                  });
                  if (customSplit[m.id] !== undefined) {
                    displayAmount = customSplit[m.id];
                  } else {
                    const remainingAmount = amount - allocated;
                    const remainingCount = selectedParticipants.length - specified;
                    displayAmount = remainingCount > 0 ? remainingAmount / remainingCount : 0;
                  }
                }
                
                return (
                  <div
                    key={m.id}
                    className="flex flex-col items-center justify-start group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleParticipant(m.id);
                        if (splitMode === "custom" && customSplit[m.id] !== undefined) {
                          const newSplit = { ...customSplit };
                          delete newSplit[m.id];
                          setCustomSplit(newSplit);
                        }
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center relative cursor-pointer select-none transition-all duration-200 active:scale-90 ${
                        isSelected
                          ? "ring-4 ring-emerald-500 ring-offset-2 bg-emerald-50 border border-emerald-300"
                          : "border border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <div className="overflow-hidden rounded-full w-full h-full flex items-center justify-center">
                        <img
                          src={getMemberAvatar(m)}
                          alt={m.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover shrink-0"
                        />
                      </div>
                      
                      {isSelected && (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 rounded-full border border-white flex items-center justify-center shadow-xs">
                          <Check className="w-2 h-2 text-white stroke-[4px]" />
                        </div>
                      )}
                    </button>
                    
                    <span className={`text-[10px] font-bold mt-1.5 truncate w-20 text-center leading-tight transition-colors ${
                      isSelected ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {m.name}
                    </span>
                    
                    {splitMode === "custom" && isSelected && (
                      <div className="relative mt-1 w-20">
                        <input
                          type="text"
                          placeholder="Chia"
                          value={customSplit[m.id] !== undefined ? customSplit[m.id].toLocaleString("vi-VN") : ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            const newSplit = { ...customSplit };
                            if (raw === "") {
                              delete newSplit[m.id];
                            } else {
                              newSplit[m.id] = parseInt(raw, 10);
                            }
                            setCustomSplit(newSplit);
                          }}
                          className={`w-full bg-slate-50 border rounded-lg py-1 px-1 text-center font-mono text-[9px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                            customSplit[m.id] !== undefined ? "border-emerald-300 text-emerald-700 bg-emerald-50/25" : "border-slate-200 text-slate-400"
                          }`}
                        />
                      </div>
                    )}
                    
                    {splitMode === "custom" && isSelected && customSplit[m.id] === undefined && (
                       <div className="text-[8px] text-emerald-600/70 text-center font-mono mt-0.5 truncate w-20">
                         ~{Math.round(displayAmount).toLocaleString("vi-VN")}
                       </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Price forecast preview feedback */}
            {amount > 0 && selectedParticipants.length > 0 && (
              <div className={`p-3.5 border rounded-xl flex items-center justify-between text-xs animate-fade-in ${
                splitMode === "custom" && !isCustomSplitValid 
                  ? customRemainingAmount < 0 ? "bg-rose-50/80 border-rose-100/50 text-rose-800" : "bg-amber-50/80 border-amber-100/50 text-amber-800"
                  : "bg-emerald-50/80 border-emerald-100/30 text-emerald-800"
              }`}>
                {splitMode === "equal" ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <span>Dự báo mỗi người đóng:</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-700">
                      {new Intl.NumberFormat("vi-VN").format(Math.round(costPerPerson))} ₫
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className={`h-4 w-4 ${
                        !isCustomSplitValid 
                          ? customRemainingAmount < 0 ? "text-rose-500" : "text-amber-500"
                          : "text-emerald-500"
                      }`} />
                      <span>Số tiền còn lại:</span>
                    </div>
                    <span className={`font-bold font-mono ${customRemainingAmount === 0 && customRemainingCount === 0 && allocatedAmount === amount ? "text-emerald-700" : customRemainingAmount < 0 ? "text-rose-600" : "text-amber-600"}`}>
                      {new Intl.NumberFormat("vi-VN").format(Math.round(customRemainingAmount))} ₫
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}



          <button
            type="submit"
            disabled={!isCustomSplitValid}
            className={`w-full text-white rounded-2xl py-3.5 px-4 font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              !isCustomSplitValid
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15 active:scale-98 cursor-pointer"
            }`}
          >
            {editingExpense ? (
              <>
                <Check className="h-4 w-4" />
                Lưu thay đổi khoản chi
              </>
            ) : (
              "Thêm chi phí này vào quỹ chung"
            )}
          </button>
        </form>
      )}

      {/* Bank Selection Bottom Sheet */}
      <BankAppSelectorModal
        isOpen={showBankSheet}
        onClose={() => setShowBankSheet(false)}
        onSelectBank={(bank: BankOption) => handleSelectBank(bank.code)}
        showRememberOption={true}
        setDefaultBank={setDefaultBank}
        onToggleSetDefaultBank={(val) => setSetDefaultBank(val)}
      />
    </div>
  );
}
