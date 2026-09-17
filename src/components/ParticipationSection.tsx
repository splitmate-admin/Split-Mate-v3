import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState } from "react";
import { Member, Expense, Group } from "../types";
import { getMemberAvatar } from "../utils/avatar";
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserCheck,
  Award,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  QrCode,
  ExternalLink,
  Calendar,
  List,
  ChevronLeft,
  Pencil,
  User,
  UploadCloud,
  RefreshCw,
  Landmark,
  Mail
} from "lucide-react";
import { MEMBER_COLORS, MEMBER_EMOJIS } from "../utils/mockData";
import { VIETNAM_BANKS } from "../utils/banks";
import { SearchableBankSelect } from "./SearchableBankSelect";
import { calculateBalances } from "../utils/debtSimplifier";

interface ParticipationSectionProps {
  members: Member[];
  expenses: Expense[];
  isAdmin: boolean;
  viewingMemberId?: string;
  activeGroup?: Group;
  onSetEditingMemberId?: (id: string | null) => void;
  onEditMember?: (member: Member) => void;
  showPart?: "left" | "right";
  selectedMemberId?: string;
  onSelectedMemberIdChange?: (id: string) => void;
  hideListOnMobile?: boolean;
  tryOfflineMode?: boolean;
  user?: any;
  memberAccessCodeUser?: any;
}

export default function ParticipationSection({
  members,
  expenses,
  isAdmin,
  viewingMemberId,
  activeGroup,
  onSetEditingMemberId,
  onEditMember,
  showPart,
  selectedMemberId: propSelectedMemberId,
  onSelectedMemberIdChange,
  hideListOnMobile = false,
  tryOfflineMode = false,
  user,
  memberAccessCodeUser,
}: ParticipationSectionProps) {
  const [localSelectedMemberId, setLocalSelectedMemberId] = useState<string>(() => {
    if (!isAdmin && viewingMemberId) return viewingMemberId;
    return members.length > 0 ? members[0].id : "";
  });

  const effectiveSelectedMemberId = (propSelectedMemberId || "") !== "" 
    ? propSelectedMemberId 
    : (!isAdmin && viewingMemberId ? viewingMemberId : (localSelectedMemberId || (members.length > 0 ? members[0].id : "")));

  const selectedMemberId = effectiveSelectedMemberId;
  const setSelectedMemberId = (id: string) => {
    if (onSelectedMemberIdChange) {
      onSelectedMemberIdChange(id);
    } else {
      setLocalSelectedMemberId(id);
    }
  };

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Self member editing states (for logged-in member editing directly in this tab)
  const [isEditingSelf, setIsEditingSelf] = useState(false);
  const [editingSelfId, setEditingSelfId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [loadingEditAvatar, setLoadingEditAvatar] = useState(false);
  const [editError, setEditError] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<{type: 'success'|'error'|'info'|'not_found', text: string} | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");

  const [editMomoPhone, setEditMomoPhone] = useState("");
  const [editMomoQrImage, setEditMomoQrImage] = useState("");
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editBankCode, setEditBankCode] = useState("VCB");
  const [editBankAccountName, setEditBankAccountName] = useState("");
  const [editBankQrImage, setEditBankQrImage] = useState("");

  const handleAvatarSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setEditError(ui('m0fbb61b38b'));
      return;
    }

    setEditError("");
    setLoadingEditAvatar(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setEditAvatar(optimizedDataUrl);
        } else {
          const rawBase64 = event.target?.result as string;
          setEditAvatar(rawBase64);
        }
        setLoadingEditAvatar(false);
      };
      img.onerror = () => {
        setEditError(ui('m42f69810d3'));
        setLoadingEditAvatar(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setEditError(ui('md55732f555'));
      setLoadingEditAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditSelf = (m: Member) => {
    setEditingSelfId(m.id);
    setEditName(m.name);
    const isSelfUser = (user && (viewingMemberId === m.id || user.uid === m.userId)) || (memberAccessCodeUser && viewingMemberId === m.id);
    const effectiveEmail = m.email || (isSelfUser ? user?.email || memberAccessCodeUser?.email : "");
    setEditEmail(effectiveEmail || "");
    setEditColor(m.color);
    setEditEmoji(m.emoji);
    setEditAvatar(m.avatar || null);
    
    setEditMomoPhone(m.momoPhone || (m.fundType === "momo" ? m.fundPhone || "" : ""));
    setEditMomoQrImage(m.momoQrImage || (m.fundType === "momo" ? m.fundQrImage || "" : ""));
    
    setEditBankAccount(m.bankAccount || (m.fundType === "bank" ? m.fundPhone || "" : ""));
    setEditBankAccountName(m.bankAccountName || m.fundName || "");
    setEditBankCode(m.bankCode || m.fundBankName || "VCB");
    setEditBankQrImage(m.bankQrImage || (m.fundType === "bank" ? m.fundQrImage || "" : ""));
    
    setEditError("");
    setEmailCheckStatus(null);
    setEditPassword("");
    setEditConfirmPassword("");
    setIsEditingSelf(true);
  };

  const handleSaveEditSelf = () => {
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(ui('m5c888109ce'));
      return;
    }

    const targetMember = members.find(m => m.id === editingSelfId);
    const isSelfUser = targetMember && ((user && (viewingMemberId === targetMember.id || user.uid === targetMember.userId)) || (memberAccessCodeUser && viewingMemberId === targetMember.id));
    const lockedEmail = targetMember?.email || (isSelfUser ? user?.email || memberAccessCodeUser?.email : undefined);

    if (editPassword.trim()) {
      if (editPassword.trim().length < 4) {
        setEditError(ui('mcc0d4f8e13'));
        return;
      }
      if (editPassword.trim() !== editConfirmPassword.trim()) {
        setEditError(ui('m848a9c8c68'));
        return;
      }
    }

    const isMomo = editBankCode === "momo";
    const draftFundType: "momo" | "bank" = isMomo ? "momo" : "bank";

    if (targetMember && onEditMember) {
      const updatedMember: Member = {
        ...targetMember,
        name: trimmed,
        email: lockedEmail || (editEmail.trim().toLowerCase() || undefined),
        color: editColor,
        emoji: editEmoji,
        avatar: editAvatar || undefined,
        
        momoPhone: editMomoPhone.trim(),
        momoQrImage: editMomoQrImage,
        bankAccount: editBankAccount.trim(),
        bankAccountName: editBankAccountName.trim().toUpperCase(),
        bankCode: editBankCode,
        bankQrImage: editBankQrImage,

        // Fallbacks
        fundType: draftFundType,
        fundPhone: isMomo ? editMomoPhone.trim() || editBankAccount.trim() : editBankAccount.trim(),
        fundName: isMomo ? "" : editBankAccountName.trim().toUpperCase(),
        fundBankName: editBankCode,
      };

      if (editPassword.trim()) {
        (updatedMember as any).password = editPassword.trim();
      }

      onEditMember(updatedMember);
    }
    setIsEditingSelf(false);
    setIsEditingEmail(false);
    setEditPassword("");
    setEditConfirmPassword("");
    setEditingSelfId(null);
  };

  // Convert/Normalize date string to YYYY-MM-DD
  const getNormalizedDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
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

  const prevMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const getMonthName = (date: Date) => {
    return ui('mcdc56b27b5', { v0: date.getMonth() + 1, v1: date.getFullYear() });
  };

  const getGridCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay() - 1; // Mon = 0, Tue = 1 ... Sun = 6
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // 3. Next month loading days
    const totalCells = 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
      });
    }

    return cells;
  };

  // Filter members for display on the left side
  const displayMembers = isAdmin ? members : (viewingMemberId ? members.filter((m) => m.id === viewingMemberId) : members);
  const selectedMember = members.find((m) => m.id === selectedMemberId) || (members.length > 0 ? members[0] : null);

  // Safe VND currency formatter for the Vietnamese market
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "VND",
    }).format(Math.round(num));
  };

  // Group participation expenses by Date for tidy calendar and lists
  const groupParticipationExpensesByDate = (expensesList: Expense[], memberId: string) => {
    const groups: { [key: string]: Expense[] } = {};
    expensesList.forEach((e) => {
      const dateKey = getNormalizedDateStr(e.date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(e);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateStr) => {
        const dayExpenses = groups[dateStr];
        const memberTotalDayPart = dayExpenses.reduce(
          (sum, item) => sum + ((item.participantIds || []).length > 0 ? Math.round(item.amount / (item.participantIds || []).length) : 0),
          0
        );
        return {
          dateStr,
          expenses: dayExpenses,
          totalDayAmount: memberTotalDayPart,
        };
      });
  };

  const containerClass = showPart 
    ? "w-full" 
    : "grid grid-cols-12 gap-5 items-start";

  const leftColClass = showPart === "right"
    ? "hidden"
    : showPart === "left"
      ? "w-full space-y-5"
      : "col-span-12 xl:col-span-5 space-y-5";

  const rightColClass = showPart === "left"
    ? "hidden"
    : showPart === "right"
      ? "w-full space-y-3.5 max-sm:space-y-2.5 max-sm:max-h-full max-sm:overflow-hidden"
      : "col-span-12 xl:col-span-7 space-y-5";

  return (
    <div className={containerClass}>
      {/* LEFT COLUMN: Overview & Future Attendance Toggles (5/12) */}
      <div className={leftColClass}>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{ui('m5de3e5eb02')}</h4>
            </div>
          </div>

          {displayMembers.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              {ui('m55ef8d678d')}</div>
          ) : isEditingSelf ? (
            /* Member self edit form (looks like image 1) */
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4 text-left">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {editingSelfId === viewingMemberId ? ui('md6e6afb7c2') : ui('m9464c25af8')}
                  </span>
                  <span className="text-[0.625rem] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-extrabold">{ui('mb8a7951b65')}</span>
                </div>

                {/* Tên & Emoji */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{ui('m1e9d85d892')}</label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center justify-center bg-white hover:bg-slate-100 cursor-pointer rounded-2xl border border-slate-200 w-11 h-11 text-xl transition-all relative group shadow-xs shrink-0">
                      <select
                        aria-label={ui('m63854b5678')}
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      >
                        {MEMBER_EMOJIS.map((em) => (
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                      </select>
                      {editEmoji}
                    </span>

                    <input
                      type="text"
                      placeholder={ui('m1106df21c1')}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={40}
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all shadow-xs"
                    />
                  </div>
                </div>

                {!tryOfflineMode && (() => {
                  const editingMember = members.find(m => m.id === editingSelfId);
                  const isEditingSelfUser = editingMember && (
                    (user && (viewingMemberId === editingMember.id || user.uid === editingMember.userId)) ||
                    (memberAccessCodeUser && viewingMemberId === editingMember.id)
                  );
                  const effectiveLockedEmail = editingMember?.email || (isEditingSelfUser ? user?.email || memberAccessCodeUser?.email : "");
                  const isEmailLocked = !!effectiveLockedEmail;

                  return (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isEmailLocked ? ui('me2b2c915fb') : ui('m9f16ecd2a1')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder={ui('mf6549f3566')}
                          value={isEmailLocked ? effectiveLockedEmail : editEmail}
                          disabled={isEmailLocked}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-sm transition-all shadow-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                        {!isEmailLocked && (
                           <button
                             type="button"
                             onClick={async () => {
                                if (!editEmail.trim()) return;

                                const isEmailExist = members.some(m => m.id !== editingSelfId && m.email && m.email.toLowerCase() === editEmail.trim().toLowerCase());
                                if (isEmailExist) {
                                   setEmailCheckStatus({ type: 'error', get text() { return ui('m5dff98a817'); } });
                                   return;
                                }

                                try {
                                   const res = await fetch("/api/user/check-email", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ email: editEmail })
                                   });
                                   const data = await res.json();
                                   if (data.found) {
                                      if (window.confirm(ui('m7ba5d7d7f1', { v0: data.name }))) {
                                         setEditName(data.name || editName);
                                         if (data.avatar) setEditAvatar(data.avatar);
                                         setEmailCheckStatus({ type: 'success', get text() { return ui('m2a838dfea6'); } });
                                      } else {
                                         setEmailCheckStatus({ type: 'info', get text() { return ui('mf967d30c7c'); } });
                                      }
                                   } else {
                                      setEmailCheckStatus({ type: 'not_found', get text() { return ui('md7cf0a09ef'); } });
                                   }
                                } catch (err) {
                                   setEmailCheckStatus({ type: 'error', get text() { return ui('m94c738a5d4'); } });
                                }
                             }}
                             className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-200 transition-colors shrink-0"
                           >
                             {ui('m6449afb133')}</button>
                        )}
                      </div>

                      {!isEmailLocked && emailCheckStatus && emailCheckStatus.type === 'not_found' && (
                         <div className="flex flex-col gap-2 mt-2">
                           <p className="text-xs text-rose-500 font-medium">{emailCheckStatus.text}</p>
                           <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const inviteRes = await fetch("/api/user/invite-email", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email: editEmail, groupId: activeGroup?.id })
                                  });
                                  const inviteData = await inviteRes.json();
                                  if (inviteData.success) {
                                    setEmailCheckStatus({ type: 'success', get text() { return ui('m1d5a708525'); } });
                                  } else {
                                    setEmailCheckStatus({ type: 'error', text: 'Lỗi gửi email: ' + inviteData.error });
                                  }
                                } catch (err) {
                                  setEmailCheckStatus({ type: 'error', get text() { return ui('m2fdb087309'); } });
                                }
                              }}
                              className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-bold self-start"
                           >
                             {ui('m7ab8bbea27')}</button>
                         </div>
                      )}
                      {!isEmailLocked && emailCheckStatus && emailCheckStatus.type !== 'not_found' && (
                         <p className={`text-xs font-medium mt-1 ${emailCheckStatus.type === 'success' ? 'text-emerald-600' : emailCheckStatus.type === 'info' ? 'text-slate-500' : 'text-rose-500'}`}>
                           {emailCheckStatus.text}
                         </p>
                      )}

                      {isEmailLocked ? (
                        <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                          {ui('mfbb974141d')}</p>
                      ) : (
                        !emailCheckStatus && (
                          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                            {ui('m826cacd175')}</p>
                        )
                      )}

                      {/* Thiết lập mật khẩu nếu nhập email mới */}
                      {!isEmailLocked && editEmail.trim() !== "" && (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2 mt-2">
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            {ui('m66d0b39691')}</p>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m4267a600ce')}</label>
                            <input
                              type="password"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                              placeholder={ui('m9d360bfd14')}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m7386c6b173')}</label>
                            <input
                              type="password"
                              value={editConfirmPassword}
                              onChange={(e) => setEditConfirmPassword(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                              placeholder={ui('me818181bbc')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Màu đại diện */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{ui('m0370c62d1e')}</span>
                  <div className="flex flex-wrap gap-2">
                    {MEMBER_COLORS.map((col) => {
                      const isActive = editColor === col.class;
                      return (
                        <button
                          key={col.class}
                          type="button"
                          onClick={() => setEditColor(col.class)}
                          title={col.label}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            isActive ? "scale-110 ring-2 ring-emerald-500/30" : "scale-100 opacity-80"
                          } ${col.class.split(" ")[0]} border-white shadow-xs flex items-center justify-center`}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ảnh đại diện */}
                {!tryOfflineMode && (
                  <div className="space-y-1.5 text-left">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {ui('md603adc79a')}</span>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="self-avatar-upload"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAvatarSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        disabled={loadingEditAvatar}
                      />

                      {editAvatar ? (
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 w-full justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={editAvatar}
                              alt="Avatar Preview"
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 object-cover rounded-full border border-emerald-205 shadow-xs"
                            />
                            <p className="text-xs font-extrabold text-emerald-650">{ui('m585bdd1b67')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditAvatar(null)}
                            className="p-1 px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[0.625rem] font-extrabold transition-all cursor-pointer border border-rose-100"
                          >
                            {ui('ma501ea7f86')}</button>
                        </div>
                      ) : (
                        <label
                          htmlFor="self-avatar-upload"
                          className={`w-full border border-dashed rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[4.375rem] ${
                            loadingEditAvatar
                              ? "border-emerald-400 bg-emerald-50/20 cursor-wait"
                              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          {loadingEditAvatar ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" />
                              <p className="text-[0.625rem] text-emerald-650 font-bold">{ui('m3d8a48b7d8')}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <UploadCloud className="h-5 w-5 text-slate-400 mb-1" />
                              <p className="text-[0.6875rem] font-extrabold text-slate-700">{ui('mbcfb7cb376')}</p>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Tài khoản nhận tiền */}
                {!tryOfflineMode && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 text-left">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      {ui('m6e80fc5753')}</span>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-wider">{ui('m70f73ee14e')}</label>
                        <SearchableBankSelect
                          value={editBankCode || "VCB"}
                          onChange={(val) => setEditBankCode(val)}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-wider">{ui('mce26784fc6')}</label>
                          <input
                            type="text"
                            placeholder={ui('m0736cb62b5')}
                            value={editBankAccount || ""}
                            onChange={(e) => setEditBankAccount(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-wider">{ui('m3fcb378ba6')}</label>
                          <input
                            type="text"
                            placeholder={ui('m878603786a')}
                            value={editBankAccountName || ""}
                            onChange={(e) => setEditBankAccountName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-850 focus:outline-none focus:border-emerald-500 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold">
                    {editError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/65">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSelf(false);
                      setIsEditingEmail(false);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-150 text-xs font-extrabold cursor-pointer transition-all"
                  >
                    {ui('m861dafdead')}</button>
                  <button
                    type="button"
                    onClick={handleSaveEditSelf}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-extrabold cursor-pointer transition-all shadow-xs"
                  >
                    {ui('mc05f72bd8c')}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-1">
              {displayMembers.map((m) => {
                const isUpcomingActive = m.isUpcomingActive !== false;
                
                // Calculate actual statistics for this member
                const totalParticipated = expenses.filter((e) => e.participantIds.includes(m.id)).length;
                const totalPaidCount = expenses.filter((e) => e.payerId === m.id).length;
                const rate = expenses.length > 0 ? Math.round((totalParticipated / expenses.length) * 100) : 0;

                const isSelected = m.id === selectedMemberId;
                const hasBankInfo = !!(
                  m.momoPhone?.trim() || 
                  m.bankAccount?.trim() || 
                  m.fundPhone?.trim()
                );

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl flex items-center justify-between transition-all ${
                      isSelected ? "bg-emerald-50/45 border border-emerald-100/50" : "hover:bg-slate-50/55"
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setSelectedMemberId(m.id)}
                    >
                      <div className="relative shrink-0">
                        <span className="w-9.5 h-9.5 rounded-full bg-slate-100 text-base flex items-center justify-center border border-slate-200 overflow-hidden">
                          <img src={getMemberAvatar(m)} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </span>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          isUpcomingActive ? "bg-emerald-500" : "bg-slate-350"
                        }`} />
                      </div>

                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-bold text-xs ${isSelected ? "text-emerald-900" : "text-slate-800"} truncate`} title={m.name}>
                            {m.name}
                          </p>
                          {(isAdmin || viewingMemberId === m.id) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent selection change
                                handleStartEditSelf(m);
                              }}
                              className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 transition-colors cursor-pointer text-[0.5625rem] font-extrabold shrink-0"
                              title={ui('mf761d4884c')}
                            >
                              <Pencil className="h-2.5 w-2.5 text-emerald-600" />
                              <span>{ui('mf761d4884c')}</span>
                            </button>
                          )}
                        </div>
                        {m.email && (
                          <p className="text-[10px] text-sky-600/90 font-medium truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{m.email}</span>
                          </p>
                        )}
                        <p className="hidden md:flex text-[0.625rem] text-slate-400 mt-0.5 font-medium items-center gap-1.5 label-wrap">
                          <span>{ui('m1def818cad')}<strong className="text-slate-600">{totalParticipated}/{expenses.length}</strong> ({rate}%)</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{ui('m1caeca2106')}<strong className="text-slate-600">{totalPaidCount} {ui('ma5b7c3920e')}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {!tryOfflineMode && (
                        <div 
                          className={`flex items-center justify-center w-7 h-7 rounded-xl border transition-all ${
                            m.email 
                              ? "bg-sky-50 border-sky-200 text-sky-600 shadow-3xs" 
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                          title={
                            m.email 
                              ? ui('mb9e6f2d2c7')
                              : ui('m00fe871c5d')
                          }
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div 
                        className={`flex items-center justify-center w-7 h-7 rounded-xl border transition-all ${
                          hasBankInfo 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-3xs" 
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                        title={
                          hasBankInfo 
                            ? `Đã cập nhật ngân hàng/MoMo: ${(() => {
                                const code = m.bankCode || m.fundBankName;
                                if (!code) return "MoMo";
                                const found = VIETNAM_BANKS.find(b => b.code.toLowerCase() === code.toLowerCase() || b.bin === code);
                                return found ? (found.shortCode || found.name) : code;
                              })()}` 
                            : ui('m215d9303cf')
                        }
                      >
                        <Landmark className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Past Experience Participation Editor (7/12) */}
      <div className={rightColClass}>
        <div className="bg-white p-6 max-sm:p-3.5 max-sm:pb-4 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-sm:space-y-2.5 text-left max-sm:h-full max-sm:flex max-sm:flex-col max-sm:overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 max-sm:pb-2 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{ui('ma7fe2611a0')}</h4>
                <p className="hidden text-[0.625rem] text-slate-400 font-medium">{ui('md489e889fc')}</p>
              </div>
            </div>
            {selectedMember && (
              <span className="text-[0.6875rem] max-sm:text-[10px] bg-emerald-600 text-white font-extrabold px-3 py-1 max-sm:px-2.5 max-sm:py-0.5 rounded-full shrink-0 flex items-center gap-1 md:ml-auto">
                {selectedMember.emoji} {selectedMember.name}
              </span>
            )}
          </div>

          {!selectedMember ? (
            <div className="text-center py-12 text-slate-400 text-xs shrink-0">
              {ui('m57b7a247da')}</div>
          ) : (
            <div className="space-y-4 max-sm:space-y-1.5 flex-1 max-sm:pr-0.5 overflow-hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <div className="bg-transparent md:bg-slate-50 border-0 md:border md:border-slate-200/60 p-0 md:p-4 rounded-2xl">
                {(() => {
                  const memberBalances = calculateBalances(members, expenses, activeGroup?.debtOffsets);
                  const balInfo = memberBalances.find(b => b.memberId === selectedMember.id);
                  const balance = balInfo ? balInfo.netBalance : 0;
                  const isOwed = balance > 0;

                  return (
                    <>
                      <p className="text-[0.6875rem] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{ui('mdb83fa472e')}{selectedMember.name}</p>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="bg-slate-50 md:bg-white p-3.5 rounded-2xl md:rounded-xl border-0 md:border md:border-slate-100 text-left shadow-3xs md:shadow-none">
                          <p className="text-[0.5625rem] font-bold text-slate-400 uppercase">{ui('mff26ad5ec4')}</p>
                          <p className="text-base font-extrabold text-emerald-600 mt-1">
                            {expenses.filter(e => e.participantIds.includes(selectedMember.id)).length} / {expenses.length} {ui('ma5b7c3920e')}</p>
                        </div>
                        <div className="bg-slate-50 md:bg-white p-3.5 rounded-2xl md:rounded-xl border-0 md:border md:border-slate-100 text-left shadow-3xs md:shadow-none">
                          <p className="text-[0.5625rem] font-bold text-slate-400 uppercase font-sans">{ui('m0810742c02')}</p>
                          <p className="text-base font-extrabold text-emerald-600 mt-1">
                            {formatVnd(balInfo?.paid || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Net balance banner */}
                      <div className="space-y-4">
                      <div className={`p-4 md:p-3.5 rounded-2xl border flex items-center justify-between shadow-3xs md:shadow-xs pl-4 ml-0 mt-3 md:mt-2.5 ${
                        Math.abs(balance) < 100 
                          ? "bg-slate-50 border-slate-200" 
                          : isOwed 
                            ? "bg-emerald-50 border-emerald-100/70 text-emerald-900" 
                            : "bg-rose-50 border-rose-100/70 text-rose-900"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            Math.abs(balance) < 100 ? "bg-slate-200 text-slate-500" : isOwed ? "bg-emerald-200 text-emerald-600" : "bg-rose-200 text-rose-600"
                          }`}>
                            <TrendingDown className={`w-5 h-5 ${isOwed ? "rotate-180" : ""}`} />
                          </div>
                          <div className="text-left font-sans">
                            <p className="text-[0.625rem] font-bold uppercase tracking-tight opacity-70">
                              {Math.abs(balance) < 100 ? ui('md04df9ae67') : isOwed ? ui('mfb66545e97') : ui('m6cbe2558ff')}
                            </p>
                            <p className={`text-lg font-black tracking-tighter ${
                              Math.abs(balance) < 100 ? "text-slate-600" : isOwed ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {formatVnd(Math.abs(balance))}
                            </p>
                          </div>
                        </div>
                        
                        <div className="hidden sm:block">
                          {isOwed && balance > 100 && (
                            <div className="text-right">
                              <span className="text-[0.625rem] font-black bg-emerald-200/50 px-2 py-0.5 rounded-lg text-emerald-700 uppercase">{ui('m7944127317')}</span>
                            </div>
                          )}
                          {!isOwed && Math.abs(balance) > 100 && (
                            <div className="text-right">
                              <span className="text-[0.625rem] font-black bg-rose-200/50 px-2 py-0.5 rounded-lg text-rose-700 uppercase">{ui('m6009a0fddf')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* QR Payment Section for Owed Balance to Group Fund */}
                      {!isOwed && Math.abs(balance) > 1000 && activeGroup?.fundQrImage && (
                        <div className="bg-pink-50/50 border border-pink-200 rounded-2xl p-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-pink-100 rounded-lg">
                              <QrCode className="w-3.5 h-3.5 text-pink-600" />
                            </div>
                            <h5 className="text-[0.6875rem] font-black text-pink-700 uppercase tracking-tight">{ui('m8d5979630a')}</h5>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="bg-white p-2 rounded-xl border border-pink-100 shadow-sm shrink-0">
                              <img 
                                src={activeGroup.fundQrImage || activeGroup.momoQrImage} 
                                alt="Group Fund QR" 
                                className="w-32 h-32 object-contain"
                              />
                            </div>
                            <div className="flex-1 text-left space-y-2">
                              <p className="text-[0.625rem] text-slate-500 font-medium leading-relaxed">
                                {ui('m190ffe4a94')}<strong className="text-rose-600">{formatVnd(Math.abs(balance))}</strong> {ui('m0f3d91c948')}<br />{ui('m37356d6e7b')}</p>
                              <div className="flex gap-2">
                                <a 
                                  href={activeGroup.fundQrImage || activeGroup.momoQrImage} 
                                  download="group-momo-qr.png"
                                  className="text-[0.625rem] font-bold text-pink-600 bg-white border border-pink-200 px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors inline-flex items-center gap-1"
                                >
                                  {ui('m5c76bab8bc')}</a>
                                {activeGroup.momoPhone && (
                                  <div className="text-[0.625rem] font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    {ui('m3014d9fa48')}{activeGroup.momoPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    </>
                  );
                })()}
              </div>


            </div>
          )}
        </div>
      </div>
    </div>
  );
}
