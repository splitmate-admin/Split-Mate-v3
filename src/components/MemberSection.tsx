import { errorMessage as localizeError } from '../i18n/core';
import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState, useEffect } from "react";
import { Member, Expense, DebtOffset } from "../types";
import { calculateBalances, simplifyDebts } from "../utils/debtSimplifier";
import { MEMBER_COLORS, MEMBER_EMOJIS } from "../utils/mockData";
import { VIETNAM_BANKS } from "../utils/banks";
import { getMemberAvatar } from "../utils/avatar";
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  Users, 
  AlertCircle, 
  Pencil, 
  Check, 
  X, 
  Crown, 
  UploadCloud, 
  RefreshCw, 
  User,
  QrCode,
  Phone,
  CreditCard,
  Upload,
  Lock,
  Copy,
  ChevronDown,
  Mail
} from "lucide-react";
import { compressImage } from "../utils/imageCompressor";

interface MemberSectionProps {
  members: Member[];
  expenses: Expense[];
  debtOffsets?: DebtOffset[];
  onAddMember: (member: Member) => void;
  onRemoveMember: (id: string) => void;
  onEditMember: (member: Member) => void;
  isAdmin?: boolean;
  viewingMemberId?: string;
  editingId?: string | null;
  onSetEditingId?: (id: string | null) => void;
  tryOfflineMode?: boolean;
  askConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  groupId?: string;
  user?: any;
  memberAccessCodeUser?: any;
}

export default function MemberSection({
  members,
  expenses,
  onAddMember,
  onRemoveMember,
  onEditMember,
  isAdmin = true,
  viewingMemberId,
  editingId: editingIdProp,
  onSetEditingId,
  tryOfflineMode = false,
  askConfirm,
  groupId,
  user,
  memberAccessCodeUser,
  debtOffsets,
}: MemberSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addEmailCheckStatus, setAddEmailCheckStatus] = useState<{type: 'success'|'error'|'info'|'not_found', text: string} | null>(null);
  const [checkingAddEmail, setCheckingAddEmail] = useState(false);
  const [selectedColor, setSelectedColor] = useState(MEMBER_COLORS[0].class);
  const [selectedEmoji, setSelectedEmoji] = useState(MEMBER_EMOJIS[0]);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // Dual payment details state for individual member
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(() => members.length <= 1);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);

  useEffect(() => {
    if (members.length <= 1) {
      setIsAddMemberOpen(true);
    }
  }, [members.length]);

  const [setupTab, setSetupTab] = useState<"momo" | "bank">("momo");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoQrImage, setMomoQrImage] = useState("");
  
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("VCB");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankQrImage, setBankQrImage] = useState("");

  // Editing state for Group Admin
  const [localEditingId, setLocalEditingId] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const editingId = editingIdProp !== undefined ? editingIdProp : localEditingId;
  useEffect(() => {
    setIsEditingEmail(false);
  }, [editingId]);

  const setEditingId = (id: string | null) => {
    if (onSetEditingId) {
      onSetEditingId(id);
    } else {
      setLocalEditingId(id);
    }
  };
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [loadingEditAvatar, setLoadingEditAvatar] = useState(false);
  const [editError, setEditError] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<{type: 'success'|'error'|'info'|'not_found', text: string} | null>(null);

  // Editing payment details state for individual member
  const [editSetupTab, setEditSetupTab] = useState<"momo" | "bank">("momo");
  const [editMomoPhone, setEditMomoPhone] = useState("");
  const [editMomoQrImage, setEditMomoQrImage] = useState("");
  
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editBankCode, setEditBankCode] = useState("VCB");
  const [editBankAccountName, setEditBankAccountName] = useState("");
  const [editBankQrImage, setEditBankQrImage] = useState("");

  const balances = calculateBalances(members, expenses, debtOffsets);
  const displayMembers = members;

  const handleAvatarSelect = async (file: File, isEdit: boolean) => {
    if (!file.type.startsWith("image/")) {
      if (isEdit) setEditError(ui('m0fbb61b38b'));
      else setErrorMsg(ui('m0fbb61b38b'));
      return;
    }

    if (isEdit) {
      setEditError("");
      setLoadingEditAvatar(true);
    } else {
      setErrorMsg("");
      setLoadingAvatar(true);
    }

    try {
      const compressed = await compressImage(file, 160, 160, 0.6);
      
      const timestamp = Date.now();
      const fileName = `avatar_${isEdit ? "edit" : "new"}_${timestamp}.jpg`;

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
        if (isEdit) setEditAvatar(data.url);
        else setAvatar(data.url);
      } else {
        throw new Error(localizeError(data.error, ui('mfbe7344aca')));
      }
    } catch (err: any) {
      console.error("Lỗi xử lý ảnh đại diện:", err);
      const errorText = ui('m3654763c68');
      if (isEdit) setEditError(errorText);
      else setErrorMsg(errorText);
    } finally {
      if (isEdit) setLoadingEditAvatar(false);
      else setLoadingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(ui('m068c374364'));
      return;
    }

    if (members.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg(ui('mbd5b3d5b38'));
      return;
    }

    const newMember: Member = {
      id: "m_" + Date.now(),
      name: trimmedName,
      email: tryOfflineMode ? undefined : (email.trim().toLowerCase() || undefined),
      color: selectedColor,
      emoji: selectedEmoji,
      avatar: avatar || undefined,
      momoPhone: momoPhone.trim() || undefined,
      momoQrImage: momoQrImage || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankAccountName: bankAccountName.trim().toUpperCase() || undefined,
      bankCode: bankCode,
      bankQrImage: bankQrImage || undefined,
      
      // Fallbacks
      fundType: "bank",
      fundPhone: bankAccount.trim(),
      fundName: bankAccountName.trim().toUpperCase() || undefined,
      fundBankName: bankCode,
      fundQrImage: undefined,
    };

    if (email.trim() && addEmailCheckStatus?.type === 'not_found' && groupId) {
      fetch("/api/user/invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), groupId })
      }).catch(err => console.error("Lỗi gửi mail mời:", err));
    }

    onAddMember(newMember);
    setName("");
    setEmail("");
    setAddEmailCheckStatus(null);
    setAvatar(null);
    setMomoPhone("");
    setMomoQrImage("");
    setBankAccount("");
    setBankAccountName("");
    setBankQrImage("");
    setSetupTab("momo");

    // Randomize the color and emoji selections for the next add
    const randomColor = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)].class;
    const randomEmoji = MEMBER_EMOJIS[Math.floor(Math.random() * MEMBER_EMOJIS.length)];
    setSelectedColor(randomColor);
    setSelectedEmoji(randomEmoji);
  };

  const isMemberInExpenses = (memberId: string) => {
    return expenses.some(
      (exp) => exp.payerId === memberId || exp.participantIds.includes(memberId)
    );
  };

  const handleRemove = (memberId: string) => {
    // Chỉ cho phép xóa thành viên khi nhóm đã quyết toán sòng phẳng (không còn công nợ)
    const txs = simplifyDebts(members, expenses);
    const isSettled = txs.length === 0;

    if (!isSettled) {
      if (askConfirm) {
        askConfirm(
          ui('mc4241b8c53'),
          ui('m963af27a7f'),
          () => {}
        );
      } else {
        alert(ui('m963af27a7f'));
      }
      return;
    }

    if (askConfirm) {
      askConfirm(
        ui('mf6ba7b1695'),
        ui('m0c6c2feb1c'),
        () => onRemoveMember(memberId)
      );
    } else {
      onRemoveMember(memberId);
    }
  };

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    const isMemberSelfUser = (user && (viewingMemberId === member.id || user.uid === member.userId)) || (memberAccessCodeUser && viewingMemberId === member.id);
    const effectiveEmail = member.email || (isMemberSelfUser ? user?.email || memberAccessCodeUser?.email : "");
    setEditEmail(effectiveEmail || "");
    setEditColor(member.color);
    setEditEmoji(member.emoji);
    setEditAvatar(member.avatar || null);
    
    setEditSetupTab(member.fundType || "momo");
    
    setEditMomoPhone(member.momoPhone || (member.fundType === "momo" ? member.fundPhone || "" : ""));
    setEditMomoQrImage(member.momoQrImage || (member.fundType === "momo" ? member.fundQrImage || "" : ""));
    
    setEditBankAccount(member.bankAccount || (member.fundType === "bank" ? member.fundPhone || "" : ""));
    setEditBankAccountName(member.bankAccountName || member.fundName || "");
    setEditBankCode(member.bankCode || member.fundBankName || "VCB");
    setEditBankQrImage(member.bankQrImage || (member.fundType === "bank" ? member.fundQrImage || "" : ""));

    setEditError("");
    setEmailCheckStatus(null);
  };

  useEffect(() => {
    if (editingIdProp) {
      const targetMember = members.find((m) => m.id === editingIdProp);
      if (targetMember) {
        setEditName(targetMember.name);
        const isMemberSelfUser = (user && (viewingMemberId === targetMember.id || user.uid === targetMember.userId)) || (memberAccessCodeUser && viewingMemberId === targetMember.id);
        const effectiveEmail = targetMember.email || (isMemberSelfUser ? user?.email || memberAccessCodeUser?.email : "");
        setEditEmail(effectiveEmail || "");
        setEditColor(targetMember.color);
        setEditEmoji(targetMember.emoji);
        setEditAvatar(targetMember.avatar || null);
        
        setEditSetupTab(targetMember.fundType || "momo");
        
        setEditMomoPhone(targetMember.momoPhone || (targetMember.fundType === "momo" ? targetMember.fundPhone || "" : ""));
        setEditMomoQrImage(targetMember.momoQrImage || (targetMember.fundType === "momo" ? targetMember.fundQrImage || "" : ""));
        
        setEditBankAccount(targetMember.bankAccount || (targetMember.fundType === "bank" ? targetMember.fundPhone || "" : ""));
        setEditBankAccountName(targetMember.bankAccountName || targetMember.fundName || "");
        setEditBankCode(targetMember.bankCode || targetMember.fundBankName || "VCB");
        setEditBankQrImage(targetMember.bankQrImage || (targetMember.fundType === "bank" ? targetMember.fundQrImage || "" : ""));

        setEditError("");
        setEmailCheckStatus(null);
      }
    }
  }, [editingIdProp, members, user, viewingMemberId, memberAccessCodeUser]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsEditingEmail(false);
  };

  const handleSaveEdit = (memberId: string) => {
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError(ui('m5c888109ce'));
      return;
    }

    if (members.some((m) => m.id !== memberId && m.name.toLowerCase() === trimmed.toLowerCase())) {
      setEditError(ui('m472a8b3401'));
      return;
    }

    const originalMember = members.find((m) => m.id === memberId);
    const isMemberSelfUser = originalMember && (
      (user && (viewingMemberId === originalMember.id || user.uid === originalMember.userId)) ||
      (memberAccessCodeUser && viewingMemberId === originalMember.id)
    );
    const lockedMemberEmail = originalMember?.email || (isMemberSelfUser ? user?.email || memberAccessCodeUser?.email : undefined);

    const isMomo = editBankCode === "momo";
    const draftFundType: "momo" | "bank" = isMomo ? "momo" : "bank";

    onEditMember({
      ...originalMember,
      id: memberId,
      name: trimmed,
      email: lockedMemberEmail || (editEmail.trim().toLowerCase() || undefined),
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
    });
    setEditingId(null);
  };

  // Safe VND formatting
  const formatBalance = (val: number) => {
    const absVal = Math.round(Math.abs(val));
    const formatted = new Intl.NumberFormat(getLocale()).format(absVal) + "đ";
    if (val > 0.5) return <span className="text-emerald-600 font-bold whitespace-nowrap">+{formatted}</span>;
    if (val < -0.5) return <span className="text-rose-500 font-bold whitespace-nowrap">-{formatted}</span>;
    return <span className="text-slate-400 whitespace-nowrap">{ui('m9003dae1fc')}</span>;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Add Member Card Bento Box */}
      {isAdmin && (
        <div className={`bg-white p-6 rounded-3xl border transition-all duration-300 space-y-4 ${
          members.length <= 1
            ? "border-amber-400 ring-2 ring-amber-400/20 shadow-md shadow-amber-500/5 animate-pulse-subtle"
            : "border-slate-200 shadow-xs"
        }`}>
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
            className="w-full text-left font-bold text-slate-900 text-sm flex items-center justify-between gap-2 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <UserPlus className={`h-4 w-4 text-emerald-600 ${members.length <= 1 ? "animate-bounce" : ""}`} />
              {ui('m45d630e2ad')}{members.length <= 1 && (
                <span className="bg-amber-100 text-amber-800 text-[0.5625rem] px-2 py-0.5 rounded-full font-black animate-pulse ml-1 shrink-0 uppercase tracking-wide">
                  {ui('m4921ae30a8')}</span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isAddMemberOpen ? "rotate-180" : ""}`} />
          </button>

          {isAddMemberOpen && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="member-name-input">
                {ui('mcde9a41c68')}</label>
              <div className="flex gap-2">
                <span className="inline-flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 w-11 h-11 text-xl transition-all relative group shadow-xs overflow-hidden shrink-0 p-0.5">
                  <img src={getMemberAvatar({ name: name || ui('me826b62a7b'), avatar })} className="w-full h-full object-cover rounded-[0.8rem]" referrerPolicy="no-referrer" />
                </span>

                <input
                  id="member-name-input"
                  type="text"
                  placeholder={ui('mf80f48f05d')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-800 text-sm transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Email search field for registered Gmail accounts */}
            {!tryOfflineMode && (
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between" htmlFor="member-email-input">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    {ui('med29948fa5')}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="member-email-input"
                    type="email"
                    placeholder={ui('md09de55d86')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (addEmailCheckStatus) setAddEmailCheckStatus(null);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold text-slate-800 text-xs transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={checkingAddEmail || !email.trim()}
                    onClick={async () => {
                      const cleanEmail = email.trim().toLowerCase();
                      if (!cleanEmail) return;

                      const isEmailExist = members.some(m => m.email && m.email.toLowerCase() === cleanEmail);
                      if (isEmailExist) {
                        setAddEmailCheckStatus({ type: 'error', get text() { return ui('m8e63ae2e80'); } });
                        return;
                      }

                      setCheckingAddEmail(true);
                      setAddEmailCheckStatus(null);

                      try {
                        const res = await fetch("/api/user/check-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: cleanEmail })
                        });
                        const data = await res.json();
                        if (data.found) {
                          setAddEmailCheckStatus({ type: 'success', text: ui('m57ce272c38', { v0: data.name || cleanEmail }) });
                          if (data.name && !name.trim()) {
                            setName(data.name);
                          } else if (data.name && name.trim() && name.trim() !== data.name) {
                            if (window.confirm(ui('m1aa412d390', { v0: data.name }))) {
                              setName(data.name);
                            }
                          }
                          if (data.avatar) setAvatar(data.avatar);
                        } else {
                          setAddEmailCheckStatus({ type: 'not_found', get text() { return ui('m42fcca40fc'); } });
                        }
                      } catch (err) {
                        setAddEmailCheckStatus({ type: 'error', get text() { return ui('m95dbdf0fa6'); } });
                      } finally {
                        setCheckingAddEmail(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-[0.6875rem] rounded-2xl transition-all cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingAddEmail ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      ui('me7f3745c2d')
                    )}
                  </button>
                </div>

                {addEmailCheckStatus && (
                  <p className={`text-[0.625rem] font-medium mt-1 leading-tight ${
                    addEmailCheckStatus.type === 'success' ? 'text-emerald-600 font-bold' :
                    addEmailCheckStatus.type === 'not_found' ? 'text-amber-600' : 'text-rose-500'
                  }`}>
                    {addEmailCheckStatus.text}
                  </p>
                )}
                {!addEmailCheckStatus && (
                  <p className="text-[0.5625rem] text-slate-400 leading-tight">{ui('m9d9b89c57d')}</p>
                )}
              </div>
            )}

            {/* Color choice */}
            {!tryOfflineMode && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{ui('m0370c62d1e')}</span>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((col) => {
                    const isActive = selectedColor === col.class;
                    return (
                      <button
                        key={col.class}
                        type="button"
                        onClick={() => setSelectedColor(col.class)}
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
            )}

            {/* Avatar Photo upload */}
            {!tryOfflineMode && (
              <div className="space-y-1.5 text-left">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  {ui('ma8e7adc1a6')}</span>
                
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="member-avatar-upload"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleAvatarSelect(e.target.files[0], false);
                      }
                    }}
                    className="hidden"
                    disabled={loadingAvatar}
                  />

                  {avatar ? (
                    <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200 w-full justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={avatar}
                          alt="Avatar Preview"
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 object-cover rounded-full border border-emerald-200 shadow-xs"
                        />
                        <div className="text-left">
                          <p className="text-xs font-extrabold text-emerald-650">
                            {ui('ma1c8354093')}</p>
                          <p className="text-[0.625rem] text-slate-400">{ui('m4ca6726cbf')}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvatar(null)}
                        className="p-1 px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[0.625rem] font-extrabold transition-all cursor-pointer border border-rose-100"
                      >
                        {ui('ma501ea7f86')}</button>
                    </div>
                  ) : (
                    <label
                      htmlFor="member-avatar-upload"
                      className={`w-full border border-dashed rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[4.375rem] ${
                        loadingAvatar
                          ? "border-emerald-400 bg-emerald-50/20 cursor-wait"
                          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {loadingAvatar ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" />
                          <p className="text-[0.625rem] text-emerald-650 font-bold">{ui('meb9233d7c4')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <UploadCloud className="h-5 w-5 text-slate-400 mb-1" />
                          <p className="text-[0.6875rem] font-extrabold text-slate-700">{ui('m13acc0194e')}</p>
                          <p className="text-[0.5625rem] text-slate-450 mt-0.5">{ui('m4255a6b231')}</p>
                        </div>
                      )}
                    </label>
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full text-white rounded-2xl py-3 px-4 font-extrabold text-xs uppercase tracking-wider active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                members.length <= 1
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 ring-2 ring-amber-400/30 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
              }`}
            >
              <Plus className="h-4 w-4" />
              {ui('m366d87ccbb')}</button>
          </form>
          )}
        </div>
      )}

      {/* Members List Card Bento Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <button
          type="button"
          onClick={() => setIsMembersListOpen(!isMembersListOpen)}
          className="w-full flex items-center justify-between cursor-pointer text-left focus:outline-none"
        >
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            {ui('m34a5f5a3ec')}{members.length})
          </h4>
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isMembersListOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {isMembersListOpen && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {isAdmin ? (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100/60 rounded-2xl flex items-center gap-2 text-[0.6875rem] text-emerald-850">
                <Crown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="leading-tight font-medium">
                  <strong>{ui('m389efb8a8e')}</strong> {tryOfflineMode ? ui('m9922c5b936') : ui('m951342d8a7')}
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-[0.6875rem] text-slate-600">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="leading-tight font-medium"><strong>{ui('m46fb7b1825')}</strong> {ui('m122669f9cf')}</span>
              </div>
            )}

            {displayMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                <p className="font-medium">{ui('m36a57aae14')}</p>
                <p className="text-slate-400">{ui('m29befffdc6')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[21.875rem] overflow-y-auto pr-1">
            {displayMembers.map((member) => {
              const bal = balances.find((b) => b.memberId === member.id);
              const isPayerOrDebtor = isMemberInExpenses(member.id);
              const isEditing = editingId === member.id;

              if (isEditing) {
                return (
                  <div
                    key={member.id}
                    className="p-3 bg-slate-50/80 border border-slate-205 rounded-2xl space-y-3 transition-all my-1.5 first:mt-0 last:mb-0 text-left"
                  >
                    <div className="flex gap-2 items-center">
                      {isAdmin ? (
                        <>
                          <span className="inline-flex items-center justify-center bg-white rounded-xl border border-slate-200 w-9 h-9 text-lg transition-all relative shrink-0 p-0.5 overflow-hidden">
                            <img src={getMemberAvatar({ name: editName || ui('me826b62a7b'), avatar: editAvatar })} className="w-full h-full object-cover rounded-[0.4rem]" referrerPolicy="no-referrer" />
                          </span>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={40}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 font-semibold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 w-9 h-9 text-lg shrink-0 p-0.5 overflow-hidden">
                            <img src={getMemberAvatar(member)} className="w-full h-full object-cover rounded-[0.4rem]" referrerPolicy="no-referrer" />
                          </span>
                          <span className="font-extrabold text-slate-800 text-sm">
                            {member.name}
                          </span>
                        </>
                      )}
                    </div>

                    {isAdmin && !tryOfflineMode && (() => {
                      const isMemberSelfUser = member && (
                        (user && (viewingMemberId === member.id || user.uid === member.userId)) ||
                        (memberAccessCodeUser && viewingMemberId === member.id)
                      );
                      const lockedMemberEmail = member.email || (isMemberSelfUser ? user?.email || memberAccessCodeUser?.email : "");
                      const isMemberEmailLocked = !!lockedMemberEmail;

                      return (
                        <div className="space-y-1.5 text-left bg-white/40 p-2 rounded-xl border border-slate-150">
                          <span className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-emerald-500" />
                            {isMemberEmailLocked ? ui('me2b2c915fb') : ui('m9f16ecd2a1')}
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder={ui('md09de55d86')}
                              value={isMemberEmailLocked ? lockedMemberEmail : editEmail}
                              disabled={isMemberEmailLocked}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            />
                            {!isMemberEmailLocked && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!editEmail.trim()) return;

                                const isEmailExist = members.some(m => m.id !== member.id && m.email && m.email.toLowerCase() === editEmail.trim().toLowerCase());
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
                              className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[0.625rem] rounded-xl hover:bg-slate-200 transition-colors shrink-0"
                            >
                              {ui('m6449afb133')}</button>
                          )}
                        </div>
                        
                        {emailCheckStatus && emailCheckStatus.type === 'not_found' && (
                           <div className="flex flex-col gap-1 mt-1">
                             <p className="text-[0.625rem] text-rose-500 font-medium">{emailCheckStatus.text}</p>
                             <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const inviteRes = await fetch("/api/user/invite-email", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ email: editEmail, groupId })
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
                                className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[0.625rem] font-bold self-start"
                             >
                               {ui('m7ab8bbea27')}</button>
                           </div>
                        )}
                        {emailCheckStatus && emailCheckStatus.type !== 'not_found' && (
                           <p className={`text-[0.625rem] font-medium mt-1 ${emailCheckStatus.type === 'success' ? 'text-emerald-600' : emailCheckStatus.type === 'info' ? 'text-slate-500' : 'text-rose-500'}`}>
                             {emailCheckStatus.text}
                           </p>
                        )}

                        {isMemberEmailLocked ? (
                          <p className="text-[0.5625rem] text-slate-500 font-medium leading-tight">{ui('md9a4e136af')}</p>
                        ) : (
                          !emailCheckStatus && <p className="text-[0.5625rem] text-slate-400 leading-tight">{ui('m1bcab3d909')}</p>
                        )}
                      </div>
                      );
                    })()}

                    {isAdmin && !tryOfflineMode && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {MEMBER_COLORS.map((col) => {
                          const isActive = editColor === col.class;
                          return (
                            <button
                              key={col.class}
                              type="button"
                              onClick={() => setEditColor(col.class)}
                              className={`w-5 h-5 rounded-full border border-white transition-transform ${
                                isActive ? "scale-110 ring-1 ring-emerald-500" : "opacity-80"
                              } ${col.class.split(" ")[0]} flex items-center justify-center`}
                            >
                              {isActive && <span className="w-1 h-1 bg-slate-800 rounded-full"></span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Edit Member Avatar */}
                    {isAdmin && !tryOfflineMode && (
                      <div className="space-y-1 text-left bg-white/40 p-2 rounded-xl border border-slate-150">
                        <span className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-3 w-3 text-emerald-500" />
                          {ui('md603adc79a')}</span>
                        <input
                          type="file"
                          id={`edit-avatar-upload-${member.id}`}
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleAvatarSelect(e.target.files[0], true);
                            }
                          }}
                          className="hidden"
                          disabled={loadingEditAvatar}
                        />

                        {editAvatar ? (
                          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-slate-200 justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={editAvatar}
                                alt="Edit Preview"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 object-cover rounded-full border border-emerald-100"
                              />
                              <p className="text-[0.5625rem] text-emerald-650 truncate font-extrabold">{ui('m585bdd1b67')}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditAvatar(null)}
                              className="p-1 px-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[0.5625rem] font-extrabold transition-all shrink-0 cursor-pointer"
                            >
                              {ui('maa1d94fc16')}</button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`edit-avatar-upload-${member.id}`}
                            className={`w-full border border-dashed rounded-xl p-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[3.125rem] ${
                              loadingEditAvatar
                                ? "border-emerald-400 bg-emerald-50/10 cursor-wait"
                                : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            {loadingEditAvatar ? (
                              <div className="flex items-center gap-1 justify-center">
                                <RefreshCw className="h-3 w-3 text-emerald-500 animate-spin" />
                                <span className="text-[0.5625rem] text-emerald-650 font-bold">{ui('m3d8a48b7d8')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-center">
                                <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[0.5625rem] font-extrabold text-slate-600">{ui('m6914f6a2f0')}</span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    )}

                    {editError && <p className="text-[0.625rem] text-rose-500 font-bold">{editError}</p>}

                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-[0.625rem] font-bold cursor-pointer transition-all"
                      >
                        {ui('m861dafdead')}</button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member.id)}
                        className="p-1 px-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[0.625rem] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        {ui('ma306970e8b')}</button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded-2xl transition-all gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg shadow-xs border ${member.color} shrink-0`}
                    >
                      <img
                          src={getMemberAvatar(member)}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-extrabold text-sm text-slate-800 truncate" title={member.name}>{member.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {isAdmin && member.accessCode && !member.email && !tryOfflineMode && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(member.accessCode || "");
                                  alert(ui('mfc005fdf72', { v0: member.name, v1: member.accessCode }));
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-mono text-[0.5625rem] font-extrabold border border-emerald-100 rounded-md px-1.5 py-0.5 cursor-pointer flex items-center gap-1 active:scale-95 transition-all shrink-0"
                                title={ui('m7b66d73a4d')}
                              >
                                <span>{ui('mcf7fc82f92')}{member.accessCode}</span>
                                <Copy className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const joinUrl = `${window.location.origin}/join/${member.accessCode}`;
                                  navigator.clipboard.writeText(joinUrl);
                                  alert(ui('m7fa2a77492', { v0: member.name }));
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-[0.5625rem] font-bold border border-indigo-500 rounded-md px-1.5 py-0.5 cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0"
                                title={ui('mfd4dd206ef')}
                              >
                                <Copy className="w-2.5 h-2.5 shrink-0" />
                                <span>{ui('mb1e3fee852')}</span>
                              </button>
                            </div>
                          )}
                          <p className="text-[0.625rem] text-slate-400 font-medium truncate">
                            {isPayerOrDebtor
                              ? ui('mbe180c3750', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(bal?.paid || 0)) })
                              : ui('mfb389685a9')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 justify-end ml-1">
                    <div className="text-right text-xs font-mono mr-1.5 whitespace-nowrap shrink-0">
                      {bal ? formatBalance(bal.netBalance) : <span className="text-slate-400 whitespace-nowrap">{ui('m4ccb02fc39')}</span>}
                    </div>
                    
                    {/* Action buttons (Delete only, edit moved beside name) */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member.id)}
                          title={ui('ma0a7bcf5bc', { v0: member.name })}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
}
