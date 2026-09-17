import { formatDisplayDateTime } from '../utils/dateUtils';
import { errorMessage as localizeError } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from './LanguageSwitcher';
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, Globe, ChevronRight, X, ChevronDown, User, Sparkles, Crown, Settings, 
  Plus, Check, ArrowLeftRight, Upload, Trash2, HelpCircle, Building2,
  AlertCircle, CreditCard, Users, Search, Edit2, Camera, Bell, Download, Lock
} from "lucide-react";
import { Group, Member, Expense, getPlanLabel } from "../types";
import { formatDateTime, parseFormattedDate } from "../utils/dateUtils";
import { VIETNAM_BANKS, BankOption } from "../utils/banks";
import { compressImage } from "../utils/imageCompressor";
import { getMemberAvatar, PRESET_AVATARS } from "../utils/avatar";
import MemberSection from "./MemberSection";
import { NotificationModal } from "./NotificationModal";
import { usePwaInstall } from "../hooks/usePwaInstall";

interface SmartHeaderProps {
  user: any;
  activeGroup: Group | null;
  groups: Group[];
  members: Member[];
  expenses: Expense[];
  isAdmin: boolean;
  onSelectGroup: (groupId: string) => void;
  onLogout: () => void;
  onUpdateGroup: (group: Group) => Promise<void>;
  onUpdateGroupConfig: (config: any) => Promise<void>;
  onDeleteGroup: (groupId: string) => void;
  activeIsSettled: boolean;
  onUpdateUser?: (updatedUser: any, updatedGroups?: Group[]) => void;
  
  // Member management forwarding
  onAddMember: (member: Member) => void;
  onRemoveMember: (id: string) => void;
  onEditMember: (member: Member) => void;
  viewingMemberId?: string;
  tryOfflineMode?: boolean;
  askConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showAlert: (title: string, message: string) => void;
  showUpgradeModal: () => void;
  showFaqPage: () => void;
  activeTab?: string;
  setActiveTab?: (tab: "home" | "bills" | "add" | "settle" | "participation") => void;
  currentStep?: number;
  onRequestCreateGroup?: () => void;
}

export default function SmartHeader({
  user,
  activeGroup,
  groups,
  members,
  expenses,
  isAdmin,
  onSelectGroup,
  onLogout,
  onUpdateGroup,
  onUpdateGroupConfig,
  onDeleteGroup,
  activeIsSettled,
  onAddMember,
  onRemoveMember,
  onEditMember,
  viewingMemberId,
  tryOfflineMode = false,
  askConfirm,
  showAlert,
  showUpgradeModal,
  showFaqPage,
  onUpdateUser,
  activeTab,
  setActiveTab,
  currentStep,
  onRequestCreateGroup,
}: SmartHeaderProps) {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  // Avatar and details of User/Logged-in Member
  const matchedMember = viewingMemberId ? members.find(m => m.id === viewingMemberId) : null;
  const leaderMember = members.find(m => m.id === activeGroup?.ownerId) || members[0];
  const effectiveMember = matchedMember || (tryOfflineMode ? leaderMember : null);

  // Modal toggles
  const [showPersonalDrawer, setShowPersonalDrawer] = useState(false);
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread notifications count (role-aware)
  useEffect(() => {
    if (!activeGroup) {
      setUnreadCount(0);
      return;
    }
    try {
      const saved = localStorage.getItem(`splitmate_read_notifs_${activeGroup.id}`);
      const readSet = saved ? new Set(JSON.parse(saved)) : new Set();
      
      let count = 0;
      
      // Receipts
      (activeGroup.pendingReceipts || []).forEach((r) => {
        if (!isAdmin && viewingMemberId) {
          const isMyReceipt = r.fromId === viewingMemberId;
          const isForMe = r.toId === viewingMemberId;
          if (!isMyReceipt && !isForMe) return;
        }
        if (!readSet.has(`receipt_${r.id}`)) count++;
      });

      // Expenses
      (expenses || []).slice(0, 20).forEach((e) => {
        if (!isAdmin && viewingMemberId) {
          const isMyPayer = e.payerId === viewingMemberId;
          const isMyParticipant = (e.participantIds || []).includes(viewingMemberId);
          if (!isMyPayer && !isMyParticipant) return;
        }
        if (!readSet.has(`expense_${e.id}`)) count++;
      });

      // System Plan
      if (activeGroup.plan && !readSet.has(`system_plan_${activeGroup.id}`)) {
        count++;
      }

      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [activeGroup, expenses, showNotificationModal, isAdmin, viewingMemberId]);

  // Group settings inputs
  const [tempGroupName, setTempGroupName] = useState("");
  const [tempGroupImage, setTempGroupImage] = useState("");
  const [configFundType, setConfigFundType] = useState<"momo" | "bank">("bank");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoQrImage, setMomoQrImage] = useState("");
  
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("VCB");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankQrImage, setBankQrImage] = useState("");
  const [allowMemberAddExpense, setAllowMemberAddExpense] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState("");

  // Personal Default Bank Config
  const [personalFundType, setPersonalFundType] = useState<"momo" | "bank">("bank");
  const [personalBankAccount, setPersonalBankAccount] = useState("");
  const [personalBankCode, setPersonalBankCode] = useState("VCB");
  const [personalBankAccountName, setPersonalBankAccountName] = useState("");
  const [isSavingPersonalBank, setIsSavingPersonalBank] = useState(false);
  const [isPersonalBankDropdownOpen, setIsPersonalBankDropdownOpen] = useState(false);
  const [personalBankSearchTerm, setPersonalBankSearchTerm] = useState("");

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editOtpCode, setEditOtpCode] = useState("");
  const [isSendingMemberOtp, setIsSendingMemberOtp] = useState(false);
  const [memberOtpCooldown, setMemberOtpCooldown] = useState(0);
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (memberOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setMemberOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [memberOtpCooldown]);

  const handleSendMemberOtp = async () => {
    const cleanEmail = editEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      showAlert(ui('me3d38be3c7'), ui('mf442a96a2e'));
      return;
    }

    if (memberOtpCooldown > 0) return;

    setIsSendingMemberOtp(true);
    try {
      const res = await fetch("/api/member/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          displayName: editDisplayName.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(ui('me1db07a8d8'), localizeError(data.error, ui('m93181c4c2b')));
      } else {
        setMemberOtpCooldown(60);
        showAlert(ui('m4310f9ad3b'), localizeError(data.message, `Mã OTP 6 chữ số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra hộp thư.`));
      }
    } catch (err: any) {
      showAlert(ui('md290780737'), localizeError(err.message, ui('mc23aa188c8')));
    } finally {
      setIsSendingMemberOtp(false);
    }
  };

  // Bank Info display/edit toggle
  const [isEditingBankInfo, setIsEditingBankInfo] = useState(true);
  const [isEditingGroupFund, setIsEditingGroupFund] = useState(true);

  // Sync profile form states on drawer open or user change
  useEffect(() => {
    const handleOpenSettings = () => {
      if (isAdmin) {
        setShowGroupSettings(true);
      } else {
        showAlert(ui('m1c6ba8de8b'), ui('ma62e773e3e'));
      }
    };
    const handleOpenMembers = () => {
      setShowMemberManagement(true);
    };
    window.addEventListener("open-group-settings", handleOpenSettings);
    window.addEventListener("open-member-management", handleOpenMembers);
    return () => {
      window.removeEventListener("open-group-settings", handleOpenSettings);
      window.removeEventListener("open-member-management", handleOpenMembers);
    };
  }, [isAdmin, showAlert]);

  // Sync profile form states on drawer open or user change
  useEffect(() => {
    if (showPersonalDrawer) {
      if (effectiveMember) {
        setEditDisplayName(effectiveMember.name);
        setEditEmail(effectiveMember.email || "");
        setEditPhotoURL(effectiveMember.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(effectiveMember.name)}`);
      } else {
        setEditDisplayName(user?.displayName || user?.email?.split("@")[0] || ui('mcd264c4a8f'));
        setEditEmail(user?.email || "");
        setEditPhotoURL(user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.email || "Guest")}`);
      }
      setEditPassword("");
      setEditConfirmPassword("");
      setIsEditingProfile(false);
    }
  }, [showPersonalDrawer, user?.displayName, user?.photoURL, user?.email, effectiveMember]);

  useEffect(() => {
    if (showPersonalDrawer) {
      if (effectiveMember) {
        setPersonalFundType(effectiveMember.fundType || "bank");
        setPersonalBankAccount(effectiveMember.bankAccount || "");
        setPersonalBankCode(effectiveMember.bankCode || "VCB");
        setPersonalBankAccountName(effectiveMember.bankAccountName || "");
        if (effectiveMember.bankAccount) {
          setIsEditingBankInfo(false);
        } else {
          setIsEditingBankInfo(true);
        }
      } else if (user?.email) {
        fetch(`/api/user/bank-info?email=${encodeURIComponent(user.email)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setPersonalFundType(data.fundType || "bank");
              setPersonalBankAccount(data.bankAccount || "");
              setPersonalBankCode(data.bankCode || "VCB");
              setPersonalBankAccountName(data.bankAccountName || "");
              if (data.bankAccount) {
                setIsEditingBankInfo(false);
              } else {
                setIsEditingBankInfo(true);
              }
            } else {
              setIsEditingBankInfo(true);
            }
          })
          .catch(err => {
            console.error("Error loading personal bank info:", err);
            setIsEditingBankInfo(true);
          });
      }
    }
  }, [showPersonalDrawer, user?.email, effectiveMember]);

  const handleSavePersonalBank = async () => {
    setIsSavingPersonalBank(true);
    try {
      if (effectiveMember) {
        const updated: Member = {
          ...effectiveMember,
          fundType: personalFundType,
          bankAccount: personalBankAccount.trim(),
          bankCode: personalBankCode,
          bankAccountName: personalBankAccountName.toUpperCase().trim()
        };
        if (onEditMember) {
          await onEditMember(updated);
        }
        setIsEditingBankInfo(false);
        return;
      }

      if (!user?.email) {
        showAlert(ui('md290780737'), ui('m0694b69912'));
        return;
      }

      const res = await fetch("/api/user/bank-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          fundType: personalFundType,
          bankAccount: personalBankAccount.trim(),
          bankCode: personalBankCode,
          bankAccountName: personalBankAccountName.toUpperCase().trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(ui('m9a7d703709'), ui('m8f882b447d'));
        setIsEditingBankInfo(false);
      } else {
        throw new Error(localizeError(data.error, ui('mde67baf00c')));
      }
    } catch (err: any) {
      console.error(err);
      showAlert(ui('md290780737'), localizeError(err.message, ui('mc556900477')));
    } finally {
      setIsSavingPersonalBank(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      showAlert(ui('md290780737'), ui('mdaaa2cfcc8'));
      return;
    }

    const newEmailClean = editEmail.trim().toLowerCase();
    const isNewEmailLink = newEmailClean && (!effectiveMember?.email || newEmailClean !== effectiveMember.email.toLowerCase());

    if (isNewEmailLink) {
      if (editPassword.trim()) {
        if (editPassword.trim().length < 4) {
          showAlert(ui('m26d5401c04'), ui('mcc0d4f8e13'));
          return;
        }
        if (editPassword.trim() !== editConfirmPassword.trim()) {
          showAlert(ui('m7c74adf800'), ui('mebcdddbac9'));
          return;
        }
      }

      if (!editOtpCode.trim() || editOtpCode.trim().length !== 6) {
        showAlert(ui('m976220bbd1'), ui('me3df365eb6'));
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      if (effectiveMember) {
        const updated: Member = {
          ...effectiveMember,
          name: editDisplayName.trim(),
          email: effectiveMember.email || (newEmailClean || undefined),
          avatar: editPhotoURL
        };
        if (editPassword.trim()) {
          (updated as any).password = editPassword.trim();
        }
        if (isNewEmailLink && editOtpCode.trim()) {
          (updated as any).otpCode = editOtpCode.trim();
        }
        if (onEditMember) {
          await onEditMember(updated);
        }
        if (isNewEmailLink) {
          showAlert(ui('m859d1987c7'), ui('m16304cf9a3', { v0: newEmailClean }));
        }
        setIsEditingProfile(false);
        setEditPassword("");
        setEditConfirmPassword("");
        setEditOtpCode("");
        return;
      }

      if (!user?.email) {
        showAlert(ui('md290780737'), ui('m0694b69912'));
        return;
      }

      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          displayName: editDisplayName.trim(),
          photoURL: editPhotoURL
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(ui('m9a7d703709'), ui('m4d6d34b514'));
        setIsEditingProfile(false);
        if (onUpdateUser) {
          onUpdateUser(data.user, data.updatedGroups);
        }
      } else {
        throw new Error(localizeError(data.error, ui('mdceaefb12b')));
      }
    } catch (err: any) {
      console.error(err);
      showAlert(ui('md290780737'), localizeError(err.message, ui('mb35ecf5802')));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    const targetEmail = user?.email || effectiveMember?.email;
    if (!targetEmail) {
      showAlert(ui('m5d6af377c2'), ui('mc606da13d8'));
      return;
    }
    setShowPersonalDrawer(false);
    askConfirm(
      ui('maebdc239a5'),
      ui('m2d6e1ffb89', { v0: targetEmail }),
      async () => {
        try {
          const res = await fetch("/api/user/delete-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail })
          });
          const data = await res.json();
          if (data.success) {
            showAlert(ui('m060a8cb22d'), ui('mc2b9486e66'));
            onLogout();
          } else {
            throw new Error(localizeError(data.error, ui('meae012865b')));
          }
        } catch (err: any) {
          console.error(err);
          showAlert(ui('md290780737'), localizeError(err.message, ui('m3374221acc')));
        }
      }
    );
  };

  const handlePersonalAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert(ui('m01719e3808'), ui('mbe2e8dea89'));
      return;
    }

    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      
      // Chuyển đổi base64 thành Blob
      const parts = compressed.split(",");
      const mime = parts[0].match(/:(.*?);/)![1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });

      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.url) {
        setEditPhotoURL(data.url);
        showAlert(ui('m9a7d703709'), ui('mdc33f21200'));
      } else {
        throw new Error(localizeError(data.error, ui('mfbe7344aca')));
      }
    } catch (err) {
      console.error(err);
      showAlert(ui('md290780737'), ui('m655c8e7348'));
    }
  };


  // Sync inputs on open or update
  useEffect(() => {
    if (activeGroup) {
      setTempGroupName(activeGroup.name || "");
      setTempGroupImage(activeGroup.imageUrl || "");
      
      // Force fund type to be bank
      setConfigFundType("bank");
      
      setMomoPhone("");
      setMomoQrImage("");
      
      const acc = activeGroup.bankAccount || activeGroup.fundPhone || "";
      const name = activeGroup.bankAccountName || activeGroup.fundName || "";
      
      setBankAccount(acc);
      setBankCode(activeGroup.bankCode || activeGroup.fundBankName || "VCB");
      setBankAccountName(name);
      setBankQrImage("");
      setAllowMemberAddExpense(activeGroup.allowMemberAddExpense !== false);
      
      if (acc && name) {
        setIsEditingGroupFund(false);
      } else {
        setIsEditingGroupFund(true);
      }
    }
  }, [activeGroup, showGroupSettings]);

  // Handle uploading group image
  const handleGroupImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showAlert(ui('m01719e3808'), ui('mbe2e8dea89'));
      return;
    }
    try {
      const compressed = await compressImage(file, 256, 256, 0.6);
      const timestamp = Date.now();
      const fileName = `group_avatar_${timestamp}.jpg`;

      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressed,
          fileName: fileName,
          groupId: activeGroup?.id || ""
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        setTempGroupImage(data.url);
        showAlert(ui('m9a7d703709'), ui('ma56aa3b368'));
      } else {
        throw new Error(localizeError(data.error, ui('mfbe7344aca')));
      }
    } catch (err) {
      console.error(err);
      showAlert(ui('md290780737'), ui('ma178902969'));
    }
  };

  // Upload fund QR code (MoMo/Bank)
  const handleQrImageUpload = async (file: File, type: "momo" | "bank") => {
    if (!file.type.startsWith("image/")) {
      showAlert(ui('m01719e3808'), ui('mbe2e8dea89'));
      return;
    }
    try {
      const compressed = await compressImage(file, 400, 400, 0.7);
      const timestamp = Date.now();
      const fileName = `fund_qr_${type}_${timestamp}.jpg`;

      const response = await fetch("/api/receipt/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressed,
          fileName: fileName,
          groupId: activeGroup?.id || ""
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        if (type === "momo") {
          setMomoQrImage(data.url);
        } else {
          setBankQrImage(data.url);
        }
        showAlert(ui('m9a7d703709'), ui('m32909ae66b'));
      } else {
        throw new Error(localizeError(data.error, ui('mfbe7344aca')));
      }
    } catch (err) {
      console.error(err);
      showAlert(ui('md290780737'), ui('mac9d6c29e7'));
    }
  };

  // Save changes to Group Settings
  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    if (!isAdmin) {
      showAlert(ui('m1c6ba8de8b'), ui('m3d327f1c42'));
      setShowGroupSettings(false);
      return;
    }
    setIsSaving(true);

    try {
      // Single unified update to prevent race conditions from back-to-back API calls
      const mergedGroup = {
        ...activeGroup,
        name: tempGroupName.trim() || activeGroup.name,
        imageUrl: tempGroupImage || activeGroup.imageUrl,
        allowMemberAddExpense: allowMemberAddExpense,
        fundType: configFundType,
        momoPhone: momoPhone.trim() || undefined,
        momoQrImage: momoQrImage || undefined,
        bankAccount: bankAccount.trim() || undefined,
        bankCode: bankCode || undefined,
        bankAccountName: bankAccountName.toUpperCase().trim() || undefined,
        bankQrImage: bankQrImage || undefined,
        
        // Fallbacks for backwards compatibility
        fundPhone: configFundType === "momo" ? (momoPhone.trim() || undefined) : (bankAccount.trim() || undefined),
        fundName: configFundType === "momo" ? "" : bankAccountName.toUpperCase().trim(),
        fundBankName: configFundType === "momo" ? "momo" : bankCode,
        fundQrImage: configFundType === "momo" ? (momoQrImage || undefined) : (bankQrImage || undefined),
      };

      await onUpdateGroup(mergedGroup);

      showAlert(ui('m9a7d703709'), ui('mbaf4503702'));
      setShowGroupSettings(false);
    } catch (err) {
      console.error(err);
      showAlert(ui('m471434ca39'), ui('m97c81107cb'));
    } finally {
      setIsSaving(false);
    }
  };

  // Dropdown list filtering
  const filteredBanks = VIETNAM_BANKS.filter(
    b =>
      b.name.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
      b.fullName.toLowerCase().includes(bankSearchTerm.toLowerCase()) ||
      b.shortCode?.toLowerCase().includes(bankSearchTerm.toLowerCase())
  );

  const selectedBankObj = VIETNAM_BANKS.find(b => b.code === bankCode);

  const filteredPersonalBanks = VIETNAM_BANKS.filter(
    b =>
      b.name.toLowerCase().includes(personalBankSearchTerm.toLowerCase()) ||
      b.fullName.toLowerCase().includes(personalBankSearchTerm.toLowerCase()) ||
      b.shortCode?.toLowerCase().includes(personalBankSearchTerm.toLowerCase())
  );
  const selectedPersonalBankObj = VIETNAM_BANKS.find(b => b.code === personalBankCode);


  // Avatar and details of User/Logged-in Member
  const userName = effectiveMember ? effectiveMember.name : (user?.displayName || user?.email?.split("@")[0] || ui('mcd264c4a8f'));
  const userAvatarUrl = effectiveMember 
    ? (effectiveMember.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(effectiveMember.name)}`)
    : (user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.email || "Guest")}`);
  const userEmail = effectiveMember 
    ? (effectiveMember.email || (tryOfflineMode ? ui('m51b60aa2fe') : ui('m4a1d394772'))) 
    : (user?.email || ui('m5d85537a09'));

  const groupPlan = tryOfflineMode ? "TRY_OFFLINE" : (activeGroup?.plan || "FREE");

  return (
    <>
      {/* HEADER BAR (MOBILE FIXED) */}
      <header className="fixed top-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-white border-b border-slate-150/70 flex items-center justify-between px-4 z-50 max-w-md mx-auto shadow-xs md:hidden">
        {activeTab === "home" ? (
          <>
            {/* LEFT: User profile circle avatar */}
            <button
              type="button"
              onClick={() => setShowPersonalDrawer(true)}
              className="relative focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-full active:scale-95 transition-all"
            >
              <img
                src={userAvatarUrl}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></div>
            </button>

            {/* MIDDLE: Application text logo */}
            <div className="flex items-center">
              <span className="font-black text-xl tracking-tight text-[#00B276]">
                SplitMate
              </span>
            </div>

            {/* RIGHT: Minimalist bell notification button */}
            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="relative w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer"
              title={ui('m5d6af377c2')}
            >
              <Bell className="w-4.5 h-4.5 text-slate-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white text-[8px] font-bold text-white items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            {/* LEFT: User profile circle avatar */}
            <button
              type="button"
              onClick={() => setShowPersonalDrawer(true)}
              className="relative focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-full active:scale-95 transition-all"
            >
              <img
                src={userAvatarUrl}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border border-emerald-500/30 object-cover shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></div>
            </button>

            {/* MIDDLE: Group Switcher Button */}
            <button
              type="button"
              onClick={() => setShowGroupSwitcher(true)}
              className="flex items-center gap-1 bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-all rounded-full px-3 py-1.5 max-w-[180px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-98"
            >
              <span className="font-extrabold text-xs text-slate-850 truncate">
                {activeGroup?.name || ui('m396f962afd')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-450 shrink-0" />
            </button>

            {/* RIGHT: Avatar Stack and Group Settings Cog */}
            <div className="flex items-center gap-1.5">
              {/* Notification bell button */}
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer"
                title={ui('m5d6af377c2')}
              >
                <Bell className="w-4 h-4 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white text-[8px] font-black text-white items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {/* Avatar stack click to manage members */}
              <button
                type="button"
                onClick={() => setShowMemberManagement(true)}
                className="relative flex -space-x-1.5 p-0.5 hover:bg-slate-50 rounded-lg active:scale-95 transition-all focus:outline-none"
                title={ui('m2251dabb56')}
              >
                <div className="flex -space-x-1.5">
                  {members.slice(0, 3).map((m, index) => (
                    <span
                      key={m.id}
                      className="w-6.5 h-6.5 rounded-full bg-white text-[10px] flex items-center justify-center border border-slate-200 shadow-3xs overflow-hidden shrink-0"
                      style={{ zIndex: 10 - index }}
                    >
                      <img src={getMemberAvatar(m)} alt={m.name} className="w-full h-full object-cover" />
                    </span>
                  ))}
                  {members.length > 3 && (
                    <span 
                      className="w-6.5 h-6.5 rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 flex items-center justify-center border border-slate-200 shadow-3xs shrink-0"
                      style={{ zIndex: 0 }}
                    >
                      +{members.length - 3}
                    </span>
                  )}
                </div>
              </button>

              {/* Group settings gear icon */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowGroupSettings(true)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer"
                  title={ui('mbd75ce1856')}
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </>
        )}
      </header>

      {/* 1. LEFT DRAWER (PERSONAL DETAILS) */}
      <AnimatePresence>
        {showPersonalDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPersonalDrawer(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 max-w-md mx-auto"
            />
            {/* Drawer Body */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-[290px] bg-white z-50 shadow-2xl flex flex-col justify-between"
            >
                {/* Header of Drawer */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 px-5 pt-5 shrink-0">
                  <span className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    {ui('m96d16c56fa')}</span>
                  <button
                    onClick={() => setShowPersonalDrawer(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full active:scale-95 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5 pt-5">
                  {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
                  {isEditingProfile ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 text-left">
                      <div className="text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{ui('me4ab17bfcc')}</span>
                      </div>
                      
                      {/* Chọn Avatar */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m21bba55588')}</label>
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={editPhotoURL}
                              alt="edit avatar"
                              className="w-14 h-14 rounded-full border border-slate-200 object-cover shadow-2xs"
                              referrerPolicy="no-referrer"
                            />
                            <label
                              htmlFor="personal-avatar-file"
                              className="absolute -bottom-1 -right-1 p-1 bg-slate-800 hover:bg-slate-900 text-white rounded-full border border-white cursor-pointer transition-all active:scale-90"
                            >
                              <Camera className="w-3 h-3" />
                            </label>
                            <input
                              id="personal-avatar-file"
                              type="file"
                              accept="image/*"
                              onChange={handlePersonalAvatarUpload}
                              className="hidden"
                            />
                          </div>
                          
                          <div className="text-[10px] text-slate-400 font-bold leading-tight">
                            {ui('m107ed51637')}</div>
                        </div>

                        {/* List các avatar hoạt hình có sẵn để chọn nhanh */}
                        <div className="grid grid-cols-5 gap-2 max-h-[85px] overflow-y-auto p-1.5 bg-white border border-slate-100 rounded-xl">
                          {PRESET_AVATARS.map((av, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setEditPhotoURL(av)}
                              className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all active:scale-90 shrink-0 ${
                                editPhotoURL === av ? 'border-emerald-500 scale-105 shadow-2xs' : 'border-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <img src={av} alt="cartoon avatar" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nhập tên */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m1e9d85d892')}</label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all"
                          placeholder={ui('m78b3a4db1e')}
                        />
                      </div>

                      {/* Nhập Email liên kết */}
                      {(() => {
                        const isEmailLocked = !!((effectiveMember?.email && effectiveMember?.emailVerified) || (user && user.email));
                        const currentLockedEmail = (effectiveMember?.emailVerified ? effectiveMember?.email : undefined) || user?.email || effectiveMember?.email || "";

                        return (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">
                              {isEmailLocked ? ui('me2b2c915fb') : ui('ma6e8a24ced')}
                            </label>
                            <div className="relative">
                              <input
                                type="email"
                                value={isEmailLocked ? currentLockedEmail : editEmail}
                                disabled={isEmailLocked}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className={`w-full border rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                                  isEmailLocked 
                                    ? "bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed pr-8" 
                                    : "bg-white border-slate-200 text-slate-800 outline-none focus:border-emerald-500"
                                }`}
                                placeholder={ui('m43b4587ed6')}
                              />
                              {isEmailLocked && (
                                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                              )}
                            </div>

                            {isEmailLocked ? (
                              <p className="text-[10px] text-slate-500 font-medium leading-tight flex items-center gap-1">
                                {ui('m98a39113c3')}</p>
                            ) : (
                              <p className="text-[10px] text-emerald-600 font-semibold leading-tight">
                                {ui('m738b90d77c')}</p>
                            )}

                            {/* Nếu chưa khóa email và đang nhập email mới -> hiển thị Mật khẩu & Xác thực OTP */}
                            {!isEmailLocked && editEmail.trim() !== "" && (
                              <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2 mt-2">
                                <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                  {ui('m6b24e90476')}</p>
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase">{ui('m3fdd699440')}</label>
                                  <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                                    placeholder={ui('m9b049cb69c')}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase">{ui('m7386c6b173')}</label>
                                  <input
                                    type="password"
                                    value={editConfirmPassword}
                                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                                    placeholder={ui('me818181bbc')}
                                  />
                                </div>

                                {/* Nút gửi OTP và Khung nhập mã OTP */}
                                <div className="pt-1.5 space-y-1.5 border-t border-emerald-200/50">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="block text-[9px] font-extrabold text-slate-600 uppercase">{ui('m08946704bf')}</label>
                                    <button
                                      type="button"
                                      onClick={handleSendMemberOtp}
                                      disabled={isSendingMemberOtp || memberOtpCooldown > 0}
                                      className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      {isSendingMemberOtp
                                        ? ui('mcecc548a2b')
                                        : memberOtpCooldown > 0
                                        ? ui('m1b45225c4d', { v0: memberOtpCooldown })
                                        : ui('m1b4f6178e9')}
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={editOtpCode}
                                    onChange={(e) => setEditOtpCode(e.target.value.replace(/\D/g, ""))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-emerald-500 tracking-widest text-center"
                                    placeholder={ui('m9bbb753f7e')}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Nút lưu */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition-all active:scale-95"
                        >
                          {ui('m34ca764caf')}</button>
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isSavingProfile ? ui('m063670e1bf') : ui('ma306970e8b')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Thông tin bình thường */
                    <div className="flex flex-col items-center text-center p-4 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 relative">
                      <div className="relative">
                        <img
                          src={userAvatarUrl}
                          alt="Avatar large"
                          className="w-20 h-20 rounded-full border-[3px] border-emerald-500 mx-auto shadow-sm object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-0 right-1 w-5 h-5 bg-[#00B276] border-2 border-white rounded-full"></div>
                      </div>
                      <div className="mt-2 text-center">
                        <h4 className="font-bold text-base text-slate-800 truncate max-w-[220px] mx-auto uppercase">{userName}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-[220px] mx-auto mt-0.5">{userEmail}</p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setEditDisplayName(userName);
                          setEditPhotoURL(userAvatarUrl);
                          setEditEmail(effectiveMember?.email || (user?.email || ""));
                          setEditPassword("");
                          setEditConfirmPassword("");
                          setIsEditingProfile(true);
                        }}
                        className="mt-3 flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-150 hover:border-emerald-100 rounded-full text-[11px] font-black transition-all active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        {ui('m085de759b0')}</button>
                    </div>
                  )}

                  {/* PHẦN 2: TÀI KHOẢN NHẬN TIỀN MẶC ĐỊNH */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    {tryOfflineMode ? (
                      <div className="text-left space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>{ui('m5aad9cc61f')}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {ui('m73b88a06b2')}</p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPersonalDrawer(false);
                              setShowGroupSettings(true);
                            }}
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{ui('m66f51b1b75')}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {!isEditingBankInfo && personalBankAccount ? (
                          <div className="bg-gradient-to-br from-emerald-600 to-teal-750 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
                            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                            
                            <div className="flex justify-between items-start pr-7">
                              <div>
                                <p className="text-[9px] font-black tracking-widest text-emerald-100 uppercase">{ui('mcc73646a87')}</p>
                                <h6 className="text-sm font-extrabold mt-1 truncate max-w-[150px]">
                                  {selectedPersonalBankObj ? (selectedPersonalBankObj.shortCode || selectedPersonalBankObj.name) : personalBankCode}
                                </h6>
                              </div>
                            </div>

                            <div className="mt-5 flex justify-between items-end">
                              <div className="space-y-1">
                                <p className="text-xs font-mono tracking-wider font-extrabold">{personalBankAccount}</p>
                                <p className="text-[9px] uppercase font-black tracking-wider text-emerald-100 truncate">{personalBankAccountName || ui('m75c88f33b6')}</p>
                              </div>
                              {selectedPersonalBankObj?.logoUrl ? (
                                <div className="bg-white/90 p-1 rounded-lg shrink-0 flex items-center justify-center h-6 min-w-10">
                                  <img src={selectedPersonalBankObj.logoUrl} alt="bank logo" className="h-4 object-contain" />
                                </div>
                              ) : (
                                <CreditCard className="w-5 h-5 text-emerald-100 shrink-0" />
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsEditingBankInfo(true)}
                              className="absolute right-3 top-3 p-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-all active:scale-90 cursor-pointer z-10"
                              title={ui('m4838e71d9f')}
                            >
                              <Edit2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{ui('mcc73646a87')}</h5>
                            
                            {/* Bank Selection */}
                            <div className="space-y-1.5 relative">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m3838d295ac')}</label>
                              <button
                                type="button"
                                onClick={() => setIsPersonalBankDropdownOpen(!isPersonalBankDropdownOpen)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-left flex items-center justify-between text-xs font-bold text-slate-850"
                              >
                                {selectedPersonalBankObj ? (
                                  <div className="flex items-center gap-2">
                                    {selectedPersonalBankObj.logoUrl && (
                                      <img src={selectedPersonalBankObj.logoUrl} alt={selectedPersonalBankObj.name} className="h-4.5 object-contain" />
                                    )}
                                    <span className="truncate">{selectedPersonalBankObj.shortCode || selectedPersonalBankObj.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">{ui('mcca29f897f')}</span>
                                )}
                                <ChevronDown className="w-4 h-4 text-slate-450 shrink-0" />
                              </button>

                              {isPersonalBankDropdownOpen && (
                                <div className="absolute top-[100%] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[200px]">
                                  <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50 shrink-0">
                                    <Search className="w-3.5 h-3.5 text-slate-450" />
                                    <input
                                      type="text"
                                      value={personalBankSearchTerm}
                                      onChange={(e) => setPersonalBankSearchTerm(e.target.value)}
                                      className="w-full bg-transparent outline-none border-none text-[11px] font-bold text-slate-700"
                                      placeholder={ui('m5f91a2bd38')}
                                    />
                                  </div>
                                  <div className="overflow-y-auto flex-1">
                                    {filteredPersonalBanks.map((b) => (
                                      <button
                                        key={b.code}
                                        type="button"
                                        onClick={() => {
                                          setPersonalBankCode(b.code);
                                          setPersonalFundType(b.code.toUpperCase() === "MOMO" ? "momo" : "bank");
                                          setIsPersonalBankDropdownOpen(false);
                                          setPersonalBankSearchTerm("");
                                        }}
                                        className="w-full px-3 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-50 last:border-0"
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          {b.logoUrl && <img src={b.logoUrl} alt={b.name} className="h-4 object-contain shrink-0" />}
                                          <span className="truncate">{b.shortCode}</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('mdf680bda86')}</label>
                              <input
                                type="text"
                                value={personalBankAccount}
                                onChange={(e) => setPersonalBankAccount(e.target.value.replace(/[^0-9]/g, ""))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all font-mono"
                                placeholder={ui('me60db9b83b')}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">{ui('m25d681ecfe')}</label>
                              <input
                                type="text"
                                value={personalBankAccountName}
                                onChange={(e) => setPersonalBankAccountName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all uppercase"
                                placeholder="VD: NGUYEN VAN A..."
                              />
                            </div>

                            <div className="flex gap-2">
                              {personalBankAccount && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingBankInfo(false)}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95"
                                >
                                  {ui('m34ca764caf')}</button>
                              )}
                              <button
                                type="button"
                                onClick={handleSavePersonalBank}
                                disabled={isSavingPersonalBank}
                                className={`font-bold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 ${
                                  personalBankAccount ? 'flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-50' : 'w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-50'
                                }`}
                              >
                                {isSavingPersonalBank ? ui('m063670e1bf') : ui('m8d7fe16a6a')}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* PHẦN 3: TIỆN ÍCH & CÀI ĐẶT */}
                  <div className="space-y-1">
                    <div className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-slate-450" />
                        <span>{ui('m65074a8565')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-450 text-[10px]">
                        <LanguageSwitcher />
                      </div>
                    </div>
                    
                    <button className="w-full flex items-center justify-between px-3 py-3 hover:bg-slate-50 transition-all rounded-xl cursor-pointer text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{ui('m0bfa09e539')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>

                    <button 
                      onClick={() => {
                        setShowPersonalDrawer(false);
                        showFaqPage();
                      }}
                      className="w-full flex items-center justify-between px-3 py-3 hover:bg-slate-50 transition-all rounded-xl cursor-pointer text-xs font-bold text-slate-700"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                        <span>{ui('md9a76861a7')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                    
                    {isInstallable && (
                      <button 
                        onClick={() => {
                          promptInstall();
                          setShowPersonalDrawer(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 hover:bg-emerald-50 bg-emerald-50/50 transition-all rounded-xl cursor-pointer text-xs font-bold text-emerald-700 border border-emerald-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <Download className="w-4 h-4 text-emerald-600 animate-bounce" />
                          <span>{ui('mfab1a261e5')}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">{ui('m82849b9335')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PHẦN 4: THAO TÁC TÀI KHOẢN */}
              <div className="p-5 border-t border-slate-100 bg-white space-y-2.5 shrink-0">
                <button
                  onClick={() => {
                    askConfirm(
                      ui('m8b1c92e7c9'),
                      ui('m17a3ca4cb5'),
                      () => {
                        setShowPersonalDrawer(false);
                        onLogout();
                      }
                    );
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-98"
                >
                  <LogOut className="w-4 h-4" />
                  {ui('m6827e6178d')}</button>
                <button
                  onClick={() => {
                    handleDeleteAccount();
                  }}
                  className="w-full bg-red-50 hover:bg-red-100 border border-red-150 text-red-600 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-98 shadow-2xs"
                >
                  <Trash2 className="w-4 h-4" />
                  {ui('maac306d18e')}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. BOTTOM SHEET (GROUP SWITCHER) */}
      <AnimatePresence>
        {showGroupSwitcher && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGroupSwitcher(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 max-w-md mx-auto"
            />
            {/* Bottom Sheet Body */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col z-50 max-h-[75vh] overflow-hidden"
            >
              {/* Drag bar decoration */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3 shrink-0"></div>

              {/* Title Header */}
              <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4.5 h-4.5 text-emerald-600" />
                  {ui('m45559d7fa9')}</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 py-0.5 px-2.5 rounded-full">
                  {groups.length} {ui('m77c7dc3b70')}</span>
              </div>

              {/* List of groups */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[45vh]">
                {groups.map((g) => {
                  const isCurrent = g.id === activeGroup?.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectGroup(g.id);
                        setShowGroupSwitcher(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-98 ${
                        isCurrent
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950"
                          : "bg-white border-slate-150/70 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Group Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-3xs flex items-center justify-center overflow-hidden shrink-0">
                          {g.imageUrl ? (
                            <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🏕️</span>
                          )}
                        </div>
                        {/* Group Details */}
                        <div className="min-w-0">
                          <h4 className="font-black text-xs min-[390px]:text-sm truncate pr-2">
                            {g.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {g.members?.length || 0} {ui('m1c51eca543')}{((g.plan as string) === "HOI_LANG" || (g.plan as string) === "PREMIUM") ? ui('m14724ffbc4') : ((g.plan as string) === "BE_BAN" || (g.plan as string) === "VIP") ? ui('m1c14d48cd2') : ((g.plan as string) === "DU_HI_30") ? ui('m47f66d8cab') : "Free 🌱"}
                          </p>
                        </div>
                      </div>

                      {/* Right Checkmark */}
                      {isCurrent && (
                        <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Drawer Footer (Create new group trigger) */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  onClick={() => {
                    setShowGroupSwitcher(false);
                    if (onRequestCreateGroup) {
                      onRequestCreateGroup();
                    } else {
                      const btn = document.querySelector('[data-create-group-btn="true"]') as HTMLButtonElement;
                      if (btn) {
                        btn.click();
                      } else {
                        // Fallback: Dispatch simulated button
                        const addBtn = document.getElementById("add-group-btn");
                        if (addBtn) addBtn.click();
                      }
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {ui('m36c0424fa9')}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. MODAL: MEMBER MANAGEMENT */}
      <AnimatePresence>
        {showMemberManagement && (
          <div className="fixed inset-0 z-50 flex items-end min-[400px]:items-center justify-center p-0 min-[400px]:p-4 max-w-md mx-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemberManagement(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full bg-slate-50 min-[400px]:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 border border-slate-100"
            >
              {/* Header */}
              <div className="bg-white px-5 py-4 border-b border-slate-150/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-850 tracking-tight">{ui('me91fb7a715')}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{ui('m97400ca569')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemberManagement(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content containing MemberSection */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <MemberSection
                  members={members}
                  expenses={expenses}
                  debtOffsets={activeGroup?.debtOffsets}
                  onAddMember={onAddMember}
                  onRemoveMember={onRemoveMember}
                  onEditMember={onEditMember}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  tryOfflineMode={tryOfflineMode}
                  askConfirm={askConfirm}
                  groupId={activeGroup?.id}
                  user={user}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL: GROUP SETTINGS (ADMIN ONLY CHỈNH SỬA TÊN, ẢNH, QUỸ CHUNG VIETQR) */}
      <AnimatePresence>
        {showGroupSettings && (
          <div className="fixed inset-0 z-50 flex items-end min-[400px]:items-center justify-center p-0 min-[400px]:p-4 max-w-md mx-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGroupSettings(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full bg-white min-[400px]:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 border border-slate-100"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-150/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-850 tracking-tight">{ui('mf6c114d91b')}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{ui('me4e9fb5449')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGroupSettings(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveGroupSettings} className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* 4.1. Thông tin chung (Tên, Ảnh đại diện nhóm) */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">{ui('me792fdb6fe')}</h4>
                  
                  <div className="flex items-center gap-4">
                    {/* Square clickable image */}
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        id="smartheader-group-image-upload"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleGroupImageUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <label 
                        htmlFor="smartheader-group-image-upload"
                        className="relative block w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer group active:scale-95 transition-all"
                      >
                        {tempGroupImage ? (
                          <img src={tempGroupImage} alt="Preview Group" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🏕️</span>
                        )}
                        {/* Camera overlay icon at bottom right */}
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 transition-all hover:bg-slate-900">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </label>
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{ui('ma16ca6d463')}</label>
                      <input
                        type="text"
                        value={tempGroupName}
                        onChange={(e) => setTempGroupName(e.target.value)}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-slate-200/60 transition-all"
                        placeholder={ui('m4362e9a00c')}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 4.2. Cấu hình số tài khoản nhận tiền Quỹ chung (VietQR / MoMo) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">{ui('m8ed6fad9d6')}</h4>
                    <span className="bg-emerald-50 text-[#03B875] text-[9px] font-black py-0.5 px-2.5 rounded-full uppercase tracking-wider">{ui('m842e850264')}</span>
                  </div>

                  {/* THẺ VÍ ẢO NẰM NGANG */}
                  <div className="relative group cursor-pointer" onClick={() => setIsEditingGroupFund(true)}>
                    <div className="w-full bg-gradient-to-br from-[#03B875] to-[#008F55] rounded-[24px] p-5 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden transition-all active:scale-[0.98] border border-emerald-400/20">
                      {/* Decorative glossy circles */}
                      <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold tracking-widest text-emerald-100/80 uppercase">{ui('m1b1e3c7fc4')}</p>
                          <h6 className="text-sm font-black tracking-tight mt-1 truncate max-w-[200px]">
                            {selectedBankObj ? (selectedBankObj.shortCode || selectedBankObj.name) : (bankCode || ui('m51036b5d1a'))}
                          </h6>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingGroupFund(true);
                            }}
                            className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg backdrop-blur-xs transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-sm font-mono tracking-widest font-black">
                            {bankAccount ? bankAccount.replace(/(\d{4})(?=\d)/g, "$1 ") : "•••• •••• ••••"}
                          </p>
                          <p className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-100/90 truncate max-w-[180px]">
                            {bankAccountName || ui('m890b8e9946')}
                          </p>
                        </div>
                        {selectedBankObj?.logoUrl ? (
                          <div className="bg-white/95 p-1 px-2 rounded-lg shrink-0 flex items-center justify-center h-7 min-w-12 shadow-sm">
                            <img src={selectedBankObj.logoUrl} alt="bank logo" className="h-4 object-contain" />
                          </div>
                        ) : (
                          <div className="bg-white/15 p-2 rounded-xl">
                            <CreditCard className="w-5 h-5 text-white shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gói cước nhóm & Nâng cấp */}
                {(() => {
                  const groupExpenses = expenses;
                  const invoiceCount = groupExpenses.length;
                  const aiScanCount = groupExpenses.filter(e => e.receiptImage).length;
                  const memberCount = activeGroup?.members?.length || 0;

                  const maxMembers = ((groupPlan as string) === "HOI_LANG" || (groupPlan as string) === "PREMIUM")
                    ? 50
                    : (((groupPlan as string) === "BE_BAN" || (groupPlan as string) === "VIP" || (groupPlan as string) === "DU_HI_30") ? 20 : 10);

                  const maxInvoices = ((groupPlan as string) === "TRY_OFFLINE")
                    ? 10
                    : Infinity;

                  const maxScans = ((groupPlan as string) === "HOI_LANG" || (groupPlan as string) === "PREMIUM")
                    ? Infinity
                    : ((groupPlan as string) === "DU_HI_30")
                      ? 100
                      : (((groupPlan as string) === "BE_BAN" || (groupPlan as string) === "VIP") ? 50 : 10);

                  const memberPercent = Math.min(100, (memberCount / maxMembers) * 100);
                  const invoicePercent = maxInvoices === Infinity ? 100 : Math.min(100, (invoiceCount / maxInvoices) * 100);
                  const scanPercent = maxScans === Infinity ? 100 : Math.min(100, (aiScanCount / maxScans) * 100);

                  const hasPaidPlan = groupPlan !== "FREE" && groupPlan !== "TRY_OFFLINE";
                  const fallbackExpiredAt = activeGroup?.planExpiredAt || (activeGroup?.createdAt ? new Date(parseFormattedDate(activeGroup.createdAt).getTime() + (groupPlan === "DU_HI_30" ? 30 : 365)*24*60*60*1000).toISOString() : new Date(Date.now() + (groupPlan === "DU_HI_30" ? 30 : 365)*24*60*60*1000).toISOString());

                  return (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{ui('m2f1c85f5c7')}</span>
                          
                          {((groupPlan as string) === "TRY_OFFLINE") ? (
                            <span className="bg-amber-50 text-amber-800 text-[10px] font-black py-1 px-3 rounded-xl border border-amber-200 flex items-center gap-1 shadow-2xs">
                              {ui('mf52e7045d3')}</span>
                          ) : ((groupPlan as string) === "HOI_LANG" || (groupPlan as string) === "PREMIUM") ? (
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-black py-1 px-3 rounded-xl border border-amber-200">
                              {ui('m15776b3430')}</span>
                          ) : ((groupPlan as string) === "BE_BAN" || (groupPlan as string) === "VIP") ? (
                            <span className="bg-emerald-50 text-[#03B875] text-[10px] font-black py-1 px-3 rounded-xl border border-emerald-100">
                              {ui('mbbe82fe92a')}</span>
                          ) : ((groupPlan as string) === "DU_HI_30") ? (
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black py-1 px-3 rounded-xl border border-blue-100 flex items-center gap-1">
                              {ui('m3d2f5dadd0')}</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black py-1 px-3 rounded-xl border border-slate-200">
                              {ui('mfefca0c1bf')}</span>
                          )}
                        </div>

                        {hasPaidPlan && (
                          <div className="bg-white/80 p-3 rounded-xl border border-slate-150 flex flex-col gap-1 text-[10.5px]">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">{ui('m14d93a9b8a')}</span>
                              <span className="font-extrabold text-slate-800">
                                {formatDisplayDateTime(fallbackExpiredAt)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px]">
                              <span className="text-slate-500">{ui('ma1fb7e02ed')}</span>
                              <span className="font-extrabold text-[#03B875] bg-[#E6F7F0] px-2 py-0.5 rounded-lg border border-[#03B875]/10">
                                {Math.max(0, Math.ceil((parseFormattedDate(fallbackExpiredAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} {ui('m8ccdd04078')}</span>
                            </div>
                          </div>
                        )}

                        {/* PROGRESS BARS */}
                        <div className="space-y-3 pt-1">
                          {/* Thành viên */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-500 font-medium">{ui('me91fb7a715')}</span>
                              <span className="font-bold text-slate-800">
                                {memberCount} / {maxMembers} {ui('m0021a30f3e')}</span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${memberPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Hóa đơn */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-500 font-medium">{ui('mf5fd4f6017')}</span>
                              <span className="font-bold text-slate-800">
                                {invoiceCount} / {maxInvoices === Infinity ? ui('m9d92999735') : ui('m769a79f9bf', { v0: maxInvoices })}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-[#03B875] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${invoicePercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Quét AI */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-500 font-medium">{ui('m5ebcb54cd3')}</span>
                              <span className="font-bold text-slate-800">
                                {aiScanCount} / {maxScans === Infinity ? "∞" : ui('m077e71f878', { v0: maxScans })}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${scanPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Nâng cấp button */}
                        {!((groupPlan as string) === "HOI_LANG" || (groupPlan as string) === "PREMIUM") && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowGroupSettings(false);
                                showUpgradeModal();
                              }}
                              className="bg-[#03B875]/10 hover:bg-[#03B875]/20 text-[#03B875] font-extrabold px-3 py-1.5 rounded-lg text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-[#03B875]/10" />
                              {ui('m58081fcdb2')}</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4.3. Cấu hình quyền hạn thành viên (Ẩn ở Chế độ 1 lần TRY_OFFLINE vì thành viên không đăng nhập) */}
                {groupPlan !== "TRY_OFFLINE" && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-xs font-extrabold text-slate-800">{ui('mcc1f0f15d6')}</span>
                    
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={allowMemberAddExpense}
                        onChange={(e) => {
                          setAllowMemberAddExpense(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#03B875] shrink-0"></div>
                    </label>
                  </div>
                )}

                {/* 4.4. Danger Zone (Delete group option if settled up) */}
                <div className="pt-2 pb-1 flex flex-col items-center justify-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeIsSettled) {
                        showAlert(ui('md083f712a5'), ui('mef7fda7d49'));
                        return;
                      }
                      setShowGroupSettings(false);
                      onDeleteGroup(activeGroup.id);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-all flex items-center gap-1.5 cursor-pointer py-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{ui('m97ac906ed9')}</span>
                  </button>
                </div>

              </form>

              {/* Custom Slide-up Bottom Sheet for bank editing */}
              <AnimatePresence>
                {isEditingGroupFund && (
                  <div className="absolute inset-0 z-40 overflow-hidden rounded-t-3xl min-[400px]:rounded-3xl">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsEditingGroupFund(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
                    />
                    
                    {/* Sheet container */}
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90%] overflow-hidden border-t border-slate-100 pb-safe"
                    >
                      {/* Pull tab */}
                      <div className="w-full flex justify-center py-2.5 shrink-0 bg-slate-50 border-b border-slate-100">
                        <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
                      </div>

                      {/* Content */}
                      <div className="p-5 overflow-y-auto space-y-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-850">{ui('m2df4575563')}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{ui('m802a08201b')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingGroupFund(false)}
                            className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bank selector */}
                        <div className="space-y-1.5 relative">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{ui('mae1d3a9282')}</label>
                          <button
                            type="button"
                            onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-left flex items-center justify-between text-xs font-bold text-slate-800"
                          >
                            {selectedBankObj ? (
                              <div className="flex items-center gap-2">
                                {selectedBankObj.logoUrl && (
                                  <img src={selectedBankObj.logoUrl} alt={selectedBankObj.name} className="h-4.5 object-contain" />
                                )}
                                <span>{selectedBankObj.fullName} ({selectedBankObj.shortCode || selectedBankObj.name})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">{ui('m0813c838f0')}</span>
                            )}
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>

                          {/* Searchable dropdown */}
                          {isBankDropdownOpen && (
                            <div className="absolute top-[100%] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[160px]">
                              <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50 shrink-0">
                                <Search className="w-3.5 h-3.5 text-slate-450" />
                                <input
                                  type="text"
                                  value={bankSearchTerm}
                                  onChange={(e) => setBankSearchTerm(e.target.value)}
                                  className="w-full bg-transparent outline-none border-none text-[11px] font-bold text-slate-700"
                                  placeholder={ui('mc26c453ba4')}
                                />
                              </div>
                              <div className="overflow-y-auto flex-1">
                                {filteredBanks.map((b) => (
                                  <button
                                    key={b.code}
                                    type="button"
                                    onClick={() => {
                                      setBankCode(b.code);
                                      setIsBankDropdownOpen(false);
                                      setBankSearchTerm("");
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-50 last:border-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      {b.logoUrl && <img src={b.logoUrl} alt={b.name} className="h-4 object-contain" />}
                                      <span>{b.fullName}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">{b.shortCode}</span>
                                  </button>
                                ))}
                                {filteredBanks.length === 0 && (
                                  <p className="p-4 text-center text-[10px] text-slate-400">{ui('mc13de0184c')}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Account number */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{ui('m0876d747ea')}</label>
                          <input
                            type="text"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-slate-100/80 transition-all font-mono"
                            placeholder={ui('ma922926f5d')}
                            required
                          />
                        </div>

                        {/* Recipient name */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{ui('m118c854f11')}</label>
                          <input
                            type="text"
                            value={bankAccountName}
                            onChange={(e) => setBankAccountName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-slate-100/80 transition-all uppercase"
                            placeholder={ui('mdca9e26dc6')}
                            required
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 pb-4">
                          <button
                            type="button"
                            onClick={() => {
                              const acc = activeGroup?.bankAccount || activeGroup?.fundPhone || "";
                              const name = activeGroup?.bankAccountName || activeGroup?.fundName || "";
                              setBankAccount(acc);
                              setBankAccountName(name);
                              setBankCode(activeGroup?.bankCode || activeGroup?.fundBankName || "VCB");
                              setIsEditingGroupFund(false);
                            }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                          >
                            {ui('m247d4b1efe')}</button>
                          <button
                            type="button"
                            disabled={!bankAccount || !bankAccountName}
                            onClick={() => setIsEditingGroupFund(false)}
                            className="flex-1 bg-[#03B875] hover:bg-[#029E64] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer text-center"
                          >
                            {ui('md74c940daf')}</button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGroupSettings(false)}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-750 border border-slate-200 font-black py-3 rounded-2xl text-xs active:scale-95 transition-all cursor-pointer text-center"
                >
                  {ui('m4ab9d213cf')}</button>
                <button
                  type="button"
                  onClick={handleSaveGroupSettings}
                  disabled={isSaving}
                  className="flex-1 bg-[#03B875] hover:bg-[#029E64] disabled:opacity-50 text-white font-black py-3 rounded-2xl text-xs shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  {isSaving ? ui('m063670e1bf') : ui('m3633ceb693')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        activeGroup={activeGroup}
        members={members}
        expenses={expenses}
        pendingReceipts={activeGroup?.pendingReceipts || []}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showUpgradeModal={showUpgradeModal}
        isAdmin={isAdmin}
        viewingMemberId={viewingMemberId}
      />
    </>
  );
}
