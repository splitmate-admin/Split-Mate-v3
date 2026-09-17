import { formatDisplayDateTime } from './utils/dateUtils';
import { errorMessage as localizeError } from './i18n/core';
import { getLocale } from './i18n/core';
import { ui, t } from './i18n/core';
import React, { useState, useEffect } from "react";
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useI18n } from './i18n/I18nProvider';
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Group, Member, Expense, PendingReceipt, Feedback, getPlanLabel } from "./types";
import { MOCK_GROUPS, MEMBER_COLORS, MEMBER_EMOJIS } from "./utils/mockData";
import { calculateBalances, simplifyDebts } from "./utils/debtSimplifier";
import { TEST_MEMBERS, TEST_EXPENSES } from "./vungTauTestData";
import { VietQRData, generateVietQRQuickUrl, getBankBin } from "./utils/vietqr";
import { fetchVietQRBanks } from "./utils/banks";
import { getMemberAvatar } from "./utils/avatar";

import MemberSection from "./components/MemberSection";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import SettleUpSection from "./components/SettleUpSection";
import FundHistoryList from "./components/FundHistoryList";
import StatsSection from "./components/StatsSection";
import ParticipationSection from "./components/ParticipationSection";
import InstructionView from "./components/InstructionView";
import { formatDateTime } from "./utils/dateUtils";
import { compressImage } from "./utils/imageCompressor";

import FaqPage from "./components/FaqPage";
import PersonalStatementModal from "./components/PersonalStatementModal";
import SmartHeader from "./components/SmartHeader";
import CloseCycleSection from "./components/CloseCycleSection";
import DuHiOnboarding from "./components/DuHiOnboarding";
import { CreateGroupModal } from "./components/CreateGroupModal";
import { OfflineModal } from "./components/OfflineModal";
import { supabase } from "./lib/supabaseClient";

import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Activity,
  ArrowLeftRight,
  Sparkles,
  RotateCcw,
  Plus,
  Compass,
  FolderLock,
  Trash2,
  ListFilter,
  CheckCircle,
  HelpCircle,
  Download,
  Share2,
  UserCheck,
  Cloud,
  Crown,
  Lock,
  Edit2,
  Check,
  X,
  Database,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Info,
  KeyRound,
  Pencil,
  ScanLine,
  Award,
  ArrowLeft,
  Settings,
  Camera,
  Keyboard,
  FileText,
  Search,
  ArrowRight, ArrowUp
} from "lucide-react";

import { LiveCamera } from "./components/LiveCamera";
import UpgradeModal from "./components/UpgradeModal";
import { InstallAppBanner } from "./components/InstallAppBanner";
import confetti from "canvas-confetti";

export default function App() {
  useI18n();
  const [, setBanksLoaded] = useState(0);

  useEffect(() => {
    fetchVietQRBanks();
    const onBanksUpdated = () => setBanksLoaded(prev => prev + 1);
    window.addEventListener("banks-updated", onBanksUpdated);
    return () => window.removeEventListener("banks-updated", onBanksUpdated);
  }, []);

  // Firebase Auth & Sync states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [initialGroupsFetched, setInitialGroupsFetched] = useState<boolean>(() => {
    return !localStorage.getItem("splitmate_custom_leader_user");
  });
  const [showCustomLeaderLogin, setShowCustomLeaderLogin] = useState<boolean>(false);
  const [showAuthPassword, setShowAuthPassword] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineGuestName, setOfflineGuestName] = useState<string>("");
  /* Scroll to top disabled per user request */

  const [tryOfflineMode, setTryOfflineModeObj] = useState<boolean>(() => {
    return localStorage.getItem("splitmate_tryOfflineMode") === "true";
  });
  
  const confirmOfflineMode = (e: React.FormEvent) => {
    e.preventDefault();
    const guestName = offlineGuestName.trim() || ui('md383a8558f');
    
    setShowOfflineModal(false);
    setTryOfflineModeObj(true);
    localStorage.setItem("splitmate_tryOfflineMode", "true");
    
    const randomColor = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)].class;
    const randomEmoji = MEMBER_EMOJIS[Math.floor(Math.random() * MEMBER_EMOJIS.length)];

    const newGroup: Group = {
      id: "offline-group-id",
      name: "Nhóm ăn chơi",
      members: [{ id: "offline-member-id", name: guestName, color: randomColor, emoji: randomEmoji, avatar: "" }],
      expenses: [],
      createdAt: new Date().toISOString(),
      ownerId: "offline",
      billingCycles: [],
      plan: "TRY_OFFLINE"
    };

    setGroups([newGroup]);
    setSelectedGroupId(newGroup.id);
    setIsAdmin(true);
    setViewingMemberId(undefined);
    setShowOnboarding(true);
    localStorage.removeItem("splitmate_groups");
    localStorage.removeItem("splitmate_selected_id");
    localStorage.removeItem("splitmate_isAdmin");
    localStorage.removeItem("splitmate_viewingMemberId");
  };

  const handleSetTryOffline = (val: boolean, showPopup = true) => {
    if (val) {
      if (showPopup) {
         setShowOfflineModal(true);
         return;
      }
      setTryOfflineModeObj(true);
      localStorage.setItem("splitmate_tryOfflineMode", "true");
      // Resets local modifications
      setGroups(MOCK_GROUPS);
      setSelectedGroupId(MOCK_GROUPS[0].id);
      setIsAdmin(true);
      setViewingMemberId(undefined);
      localStorage.removeItem("splitmate_groups");
      localStorage.removeItem("splitmate_selected_id");
      localStorage.removeItem("splitmate_isAdmin");
      localStorage.removeItem("splitmate_viewingMemberId");
    } else {
      setTryOfflineModeObj(false);
      localStorage.removeItem("splitmate_tryOfflineMode");
      // Xoá toàn bộ dữ liệu thao tác nếu có
      setGroups(MOCK_GROUPS);
      setSelectedGroupId(MOCK_GROUPS[0].id);
      
      // Nếu có tài khoản Trưởng nhóm đang đăng nhập, giữ isAdmin = true, ngược lại mới set false
      const hasLeader = !!localStorage.getItem("splitmate_custom_leader_user");
      setIsAdmin(hasLeader);
      
      setViewingMemberId(undefined);
      localStorage.removeItem("splitmate_groups");
      localStorage.removeItem("splitmate_selected_id");
      if (hasLeader) {
        localStorage.setItem("splitmate_isAdmin", "true");
      } else {
        localStorage.removeItem("splitmate_isAdmin");
      }
      localStorage.removeItem("splitmate_viewingMemberId");
    }
  };

  const [memberAccessCodeUser, setMemberAccessCodeUser] = useState<{
    code: string;
    memberId: string;
    groupId: string;
  } | null>(() => {
    const saved = localStorage.getItem("splitmate_memberAccessCodeUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem("splitmate_groups");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_GROUPS;
      }
    }
    return MOCK_GROUPS;
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const savedId = localStorage.getItem("splitmate_selected_id");
    return savedId || MOCK_GROUPS[0].id;
  });

  // Handle Web Share Target shared receipt
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("shared_receipt") === "true") {
      const handleSharedReceipt = async () => {
        try {
          const cache = await caches.open("splitmate-share-target");
          const response = await cache.match("/shared-receipt");
          if (response) {
            const blob = await response.blob();
            const type = response.headers.get("Content-Type") || "image/jpeg";
            const ext = type.split("/")[1] || "jpeg";
            const file = new File([blob], `shared-receipt-${Date.now()}.${ext}`, { type });
            
            setPendingScanFile(file);
            setActiveTab("add");
            
            // Cleanup the cache
            await cache.delete("/shared-receipt");
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error("Error reading shared receipt from cache:", e);
        }
      };
      
      handleSharedReceipt();
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const savedCustomLeader = localStorage.getItem("splitmate_custom_leader_user");
    if (savedCustomLeader) {
      try {
        const parsed = JSON.parse(savedCustomLeader);
        setUser(parsed);
        setIsAdmin(true);
        setAuthLoading(false);
        setMemberAccessCodeUser(null);
        setViewingMemberId(undefined);
        handleSetTryOffline(false);
        return;
      } catch (err) {
        console.error("Lỗi parse custom leader saved state:", err);
      }
    }
    setAuthLoading(false);
  }, []);

  // Listen to Supabase Auth Link Callback
  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") && session?.user?.email) {
        const cleanEmail = session.user.email.toLowerCase().trim();
        const displayName = session.user.user_metadata?.displayName || cleanEmail.split("@")[0];
        
        const leaderUser = {
          uid: session.user.id || `leader_${Date.now()}`,
          email: cleanEmail,
          displayName: displayName,
          isLeader: true
        };

        localStorage.setItem("splitmate_custom_leader_user", JSON.stringify(leaderUser));
        setUser(leaderUser);
        setIsAdmin(true);
        setMemberAccessCodeUser(null);
        setViewingMemberId(undefined);
        handleSetTryOffline(false);

        if (window.location.hash.includes("access_token") || window.location.search.includes("type=")) {
          showAlert(
            ui('m4f0279c666'),
            ui('m2086f231c6', { v0: cleanEmail })
          );
          setToastMsg({
            get title() { return ui('m864a2c2cf8'); },
            desc: ui('m2ac4234cb1', { v0: cleanEmail }),
            type: "success"
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Listen for real-time Server groups if logged in as Google Owner
  useEffect(() => {
    if (!user) {
      setInitialGroupsFetched(true);
      return;
    }

    setInitialGroupsFetched(false);

    let isMounted = true;
    const fetchGroups = async () => {
      try {
        const res = await fetch(`/api/groups?ownerId=${user.uid}&email=${encodeURIComponent(user.email || "")}`);
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || ui('md7ec5b83c5'));
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(ui('m1906200a98'));
        }
        
        const data = await res.json();
        
        if (isMounted) {
          // If the user has no groups on the server yet, show onboarding tutorial
          if (data.length === 0) {
            setGroups([]);
            // Trigger onboarding if this is a fresh login with no data
            if (!localStorage.getItem(`splitmate_onboarding_done_${user.uid}`)) {
               setShowOnboarding(true);
            }
          } else {
            setGroups(data);
            setSelectedGroupId((prevId) => {
              if (data.some((g: any) => g.id === prevId)) return prevId;
              return data[0].id;
            });
          }
          setInitialGroupsFetched(true);
        }
      } catch (err) {
        console.error(`Error fetching admin groups [Owner: ${user.uid}]:`, err);
        if (isMounted) {
          setInitialGroupsFetched(true); // Don't hang forever if there's an API error
        }
      }
    };

    // Initial fetch
    fetchGroups();

    // Subscribe to changes
    const channel = supabase
      ? supabase
          .channel('groups_channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, (payload: any) => {
            console.log('Change received, refreshing groups!', payload);
            
            // Trigger confetti if plan was upgraded
            if (payload.new && payload.old && payload.new.plan !== payload.old.plan && payload.new.plan !== 'FREE') {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#f59e0b']
              });
              showAlert(ui('m9c82dd18f0'), ui('md00a9ba390', { v0: payload.new.name || "", v1: payload.new.plan }));
            }
            
            fetchGroups();
          })
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  // Real-time listener of group data for Access Code Member mode via API
  useEffect(() => {
    if (user || !memberAccessCodeUser) return;

    let isMounted = true;
    const fetchMemberGroup = async () => {
      try {
        const res = await fetch(`/api/groups/${memberAccessCodeUser.groupId}`);
        if (!res.ok) throw new Error("Could not fetch group details");
        const groupData = await res.json();
        
        if (isMounted) {
          setGroups([groupData]);
          setSelectedGroupId(groupData.id);
          setIsAdmin(false);
          setViewingMemberId(memberAccessCodeUser.memberId);
        }
      } catch (err) {
        console.error(`Snapshot read error for member details [Group: ${memberAccessCodeUser.groupId}]:`, err);
      }
    };

    fetchMemberGroup();

    // Subscribe to changes
    const channel = supabase
      ? supabase
          .channel('member_group_channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, (payload) => {
            console.log('Change received, refreshing member group!', payload);
            fetchMemberGroup();
          })
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, memberAccessCodeUser]);

  const handleRequestCreateGroup = () => {
    if (tryOfflineMode) {
      showAlert(
        ui('mcd0074d548'),
        ui('m5c6d4571ec')
      );
      return;
    }
    setIsCreatingGroup(true);
  };

  // Unified helper to save active group changes
  const handleOnboardingStart = () => {
    setShowOnboarding(false);
    if (user) {
      localStorage.setItem(`splitmate_onboarding_done_${user.uid}`, "true");
    }
    handleRequestCreateGroup();
  };

  const updateGroupOnDbAndState = async (updatedGroup: Group) => {
    if (user || memberAccessCodeUser) {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updatedGroup,
            ownerId: updatedGroup.ownerId // Use the group's existing ownerId
          })
        });
        if (!res.ok) throw new Error("API post fail");
        const data = await res.json();
        
        // Optimistically update locally
        setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? data.group : g)));
      } catch (err) {
        console.error("Server API save error, saving locally as backup:", err);
        setGroups((prev) => {
          const next = prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
          localStorage.setItem("splitmate_groups", JSON.stringify(next));
          return next;
        });
      }
    } else {
      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const [authInProg, setAuthInProg] = useState<boolean>(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string>("");
  const [memberCodeErrorMsg, setMemberCodeErrorMsg] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc: string; type: "success" | "error" | "info" } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);


  // OTP Verification States for Registration
  const [authOtpCode, setAuthOtpCode] = useState<string>("");
  const [authOtpSent, setAuthOtpSent] = useState<boolean>(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [isOtpSending, setIsOtpSending] = useState<boolean>(false);
  const [mockOtpHint, setMockOtpHint] = useState<string | null>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: any = null;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpCooldown]);

  const handleSendOtp = async () => {
    if (!authEmail || !authEmail.trim()) {
      showAlert(ui('ma8e93dddeb'), ui('m36c6237108'));
      return;
    }
    const cleanEmail = authEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAlert(ui('me3d38be3c7'), ui('m5797a4db85'));
      return;
    }

    if (otpCooldown > 0) return;

    setIsOtpSending(true);
    setAuthErrorMsg("");
    try {
      const res = await fetch("/api/leader/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          displayName: authDisplayName.trim() || undefined
        })
      });
      const data = await res.json();
      setIsOtpSending(false);

      if (!res.ok) {
        setAuthErrorMsg(localizeError(data.error, ui('m93181c4c2b')));
        showAlert(ui('me1db07a8d8'), localizeError(data.error, ui('m93181c4c2b')));
        setToastMsg({
          get title() { return ui('m6c502d90f3'); },
          desc: localizeError(data.error, ui('m93181c4c2b')),
          type: "error"
        });
        if (data.cooldownRemaining) {
          setOtpCooldown(data.cooldownRemaining);
        }
        return;
      }

      setAuthOtpSent(true);
      setOtpCooldown(60);
      setAuthOtpCode("");

      showAlert(
        ui('mcdc26da9fb'),
        ui('mb39582098a', { v0: cleanEmail })
      );
      setToastMsg({
        get title() { return ui('m1ea7522870'); },
        desc: ui('mdfc5bad4ac', { v0: cleanEmail }),
        type: "success"
      });
    } catch (err: any) {
      setIsOtpSending(false);
      setAuthErrorMsg(ui('m520ece5021'));
      showAlert(ui('m7a197f4237'), ui('m633b5ff655'));
      setToastMsg({
        get title() { return ui('mf3103ad102'); },
        desc: "Không thể kết nối máy chủ để gửi mã xác thực.",
        type: "error"
      });
    }
  };

  const handleLeaderAuth = async (email: string, password: string, displayName?: string, action: "login" | "register" = "login") => {
    if (!email.trim() || !password.trim()) {
      showAlert(ui('m70b9b03643'), ui('m270a0d6f3a'));
      return;
    }
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      showAlert(ui('mfb3f3e97de'), ui('mb581f4360c'));
      return;
    }

    if (action === "register") {
      if (!authOtpSent) {
        showAlert(ui('m34623b81b2'), ui('m807fc641e8'));
        return;
      }
      if (!authOtpCode || authOtpCode.trim().length < 6) {
        showAlert(ui('m976220bbd1'), ui('m3ac8b8cfd3'));
        return;
      }
    }

    setAuthInProg(true);
    setAuthErrorMsg("");
    try {
      const res = await fetch("/api/leader/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          displayName,
          action,
          otpCode: action === "register" ? authOtpCode.trim() : undefined
        })
      });
      const data = await res.json();
      setAuthInProg(false);

      if (!res.ok) {
        const errorText = localizeError(data.error, (action === "register" ? ui('ma84db1c179') : ui('m4fc8e57986')));
        setAuthErrorMsg(errorText);
        showAlert(action === "register" ? ui('m905da524b7') : ui('mab8b3138c1'), errorText);
        setToastMsg({
          title: action === "register" ? ui('me7ab9de2b8') : ui('mfb63ae220b'),
          desc: errorText,
          type: "error"
        });
        return;
      }

      // Login/Registration Success!
      if (action === "register") {
        setAuthErrorMsg("");
        setAuthOtpSent(false);
        setAuthOtpCode("");
        setMockOtpHint(null);

        // Auto-login user upon successful OTP registration
        if (data.user) {
          localStorage.setItem("splitmate_custom_leader_user", JSON.stringify(data.user));
          setUser(data.user);
          setIsAdmin(true);
          setMemberAccessCodeUser(null);
          localStorage.removeItem("splitmate_memberAccessCodeUser");
          setViewingMemberId(undefined);
          handleSetTryOffline(false);

          // Show Onboarding Tutorial Popup for New User
          setShowOnboarding(true);
        }

        showAlert(ui('m2b4def5542'), ui('maadc4430b7', { v0: cleanEmail, v1: data.user?.displayName || cleanEmail }));
        setToastMsg({
          get title() { return ui('me06d9a1fc5'); },
          desc: ui('m1cd22ef6ba', { v0: cleanEmail }),
          type: "success"
        });
        return;
      }

      localStorage.setItem("splitmate_custom_leader_user", JSON.stringify(data.user));
      setUser(data.user);
      setIsAdmin(true);
      setMemberAccessCodeUser(null);
      localStorage.removeItem("splitmate_memberAccessCodeUser");
      setViewingMemberId(undefined);
      handleSetTryOffline(false);
      setAuthErrorMsg("");

      // Trigger onboarding for first-time login
      if (data.user && !localStorage.getItem(`splitmate_onboarding_done_${data.user.uid}`)) {
        setShowOnboarding(true);
      }

      showAlert(ui('m9746865cb6'), ui('m3f8627be8f', { v0: data.user.displayName }));
      setToastMsg({
        get title() { return ui('mbeedda74be'); },
        desc: ui('m8c4be4b093', { v0: data.user.displayName }),
        type: "success"
      });
    } catch (err: any) {
      setAuthInProg(false);
      console.error("Leader authentication error:", err);
      const networkErr = ui('m09e4fac3c3');
      setAuthErrorMsg(networkErr);
      showAlert(ui('mf4629d97cc'), networkErr);
      setToastMsg({
        get title() { return ui('mf3103ad102'); },
        desc: networkErr,
        type: "error"
      });
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!email || !email.trim()) {
      showAlert(ui('mee1d9ce393'), ui('m81e5760446'));
      return;
    }
    const cleanEmail = email.trim();
    setIsForgotSubmitting(true);
    try {
      const res = await fetch("/api/leader/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      setIsForgotSubmitting(false);

      if (!res.ok) {
        showAlert(ui('m87f2cc8d42'), localizeError(data.error, ui('m659f678e07')));
        return;
      }

      if (data.isMock) {
        // Mock mode (No SMTP configured) - return password on screen so testing works instantly
        showAlert(
          ui('m837049b0ae'),
          t('testRecovery', { password: data.password })
        );
      } else {
        showAlert(
          ui('mfea16f3e68'),
          ui('md3bbfa610c')
        );
      }
      setShowForgotPasswordModal(false);
      setForgotEmail("");
    } catch (err: any) {
      setIsForgotSubmitting(false);
      console.error("Forgot password error:", err);
      showAlert(ui('mf3103ad102'), ui('mdcced0ec0a'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      showAlert(ui('me87085e960'), ui('m029f8841c6'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert(ui('m0525d0d744'), ui('mc9861345f6'));
      return;
    }
    if (newPassword.length < 4) {
      showAlert(ui('m984e73d3c6'), ui('m9882a456b0'));
      return;
    }

    setIsChangeSubmitting(true);
    try {
      const res = await fetch("/api/leader/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });
      const data = await res.json();
      setIsChangeSubmitting(false);

      if (!res.ok) {
        showAlert(ui('mb7b1717321'), localizeError(data.error, ui('ma9c29b3a08')));
        return;
      }

      showAlert(ui('m97227b9a99'), ui('ma9de25e4d4'));
      setShowChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setIsChangeSubmitting(false);
      console.error("Change password error:", err);
      showAlert(ui('mf3103ad102'), ui('mb7857c3e97'));
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Nuclear Clear: Remove ALL splitmate related keys from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("splitmate_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      // 2. Immediate State Cleanup
      setUser(null);
      setMemberAccessCodeUser(null);
      setViewingMemberId(undefined);
      setIsAdmin(true);
      handleSetTryOffline(false);
      
      // Reset to fresh mock data to avoid showing old user's groups
      setGroups(MOCK_GROUPS);
      setSelectedGroupId(MOCK_GROUPS[0].id);

      showAlert(ui('m0a391d8aa8'), ui('m325e535597'));
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleMemberCodeLogin = async (code: string) => {
    if (!code.trim()) {
      const errText = ui('m71091600d8');
      setMemberCodeErrorMsg(errText);
      showAlert(ui('m7ad20e8808'), errText);
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    setMemberCodeErrorMsg("");

    // 1. Check local offline groups first
    try {
      const offlineGroupsStr = localStorage.getItem("splitmate_groups");
      if (offlineGroupsStr) {
        const offlineGroups: Group[] = JSON.parse(offlineGroupsStr);
        for (const g of offlineGroups) {
          const matchedMember = g.members?.find((m) => m.accessCode === cleanCode);
          if (matchedMember) {
            const loggedInfo = {
              code: cleanCode,
              memberId: matchedMember.id,
              groupId: g.id,
            };
            setMemberAccessCodeUser(loggedInfo);
            localStorage.setItem("splitmate_memberAccessCodeUser", JSON.stringify(loggedInfo));
            setIsAdmin(false);
            setViewingMemberId(matchedMember.id);
            setGroups([g]);
            setSelectedGroupId(g.id);
            setMemberCodeErrorMsg("");
            showAlert(ui('m2aa472c317'), ui('md7577ca852', { v0: g.name }));
            return;
          }
        }
      }
    } catch(e) {}

    // 2. Fetch from server
    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.log("Member login failed data:", data);
        const errText = localizeError(data.error, ui('md95be31a11'));
        setMemberCodeErrorMsg(errText);
        showAlert(ui('mfb63ae220b'), errText);
        return;
      }

      const loggedInfo = {
        code: cleanCode,
        memberId: data.memberId,
        groupId: data.group.id,
      };

      setMemberAccessCodeUser(loggedInfo);
      localStorage.setItem("splitmate_memberAccessCodeUser", JSON.stringify(loggedInfo));

      setIsAdmin(false);
      setViewingMemberId(data.memberId);
      setGroups([data.group]);
      setSelectedGroupId(data.group.id);
      setMemberCodeErrorMsg("");

      showAlert(ui('md12e38a46f'), ui('m6db93f2b33', { v0: data.group.name }));
    } catch (error) {
      console.error("Member login error:", error);
      const networkErr = ui('m2e101fc449');
      setMemberCodeErrorMsg(networkErr);
      showAlert(ui('mf3103ad102'), networkErr);
    }
  };

  // Listen for Magical Join Link on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/join/")) {
      const code = path.split("/join/")[1]?.split("/")[0];
      if (code) {
        if (!user) {
          // Automatically try to login with this code
          handleMemberCodeLogin(code).then(() => {
            // Change URL back to root without reloading the page
            window.history.replaceState({}, document.title, "/");
          });
        } else {
          // If they are already logged in as leader, just clean the URL
          window.history.replaceState({}, document.title, "/");
        }
      }
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<"home" | "bills" | "add" | "settle" | "participation">("home");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "general" | "travel">("all");
  const [addExpenseSubTab, setAddExpenseSubTab] = useState<"scan" | "manual">("scan");

  // Cuộn lên đầu trang khi đổi tab (đặc biệt cho giao diện mobile)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Khóa cuộn trang toàn cục khi đang ở tab quét hóa đơn mobile
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile && activeTab === "add" && addExpenseSubTab === "scan") {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100%";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    }

    const handleResize = () => {
      const isMobileNow = window.matchMedia('(max-width: 767px)').matches;
      if (isMobileNow && activeTab === "add" && addExpenseSubTab === "scan") {
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
      } else {
        document.body.style.overflow = "";
        document.body.style.height = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, [activeTab, addExpenseSubTab]);

  const [expandedRecentExpenseId, setExpandedRecentExpenseId] = useState<string | null>(null);
  const [showFaqPage, setShowFaqPage] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [pendingScanFile, setPendingScanFile] = useState<File | null>(null);
  const [activeQrData, setActiveQrData] = useState<VietQRData | null>(null);

  // Khi chỉnh sửa khoản chi, có file quét AI hoặc quét VietQR, tự động chuyển sang tab nhập thủ công/điền form
  useEffect(() => {
    if (editingExpense || pendingScanFile || activeQrData) {
      setAddExpenseSubTab("manual");
    }
  }, [editingExpense, pendingScanFile, activeQrData]);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Role based access control states
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    // Ưu tiên kiểm tra giá trị đã lưu trong localStorage trước để tôn trọng lựa chọn chuyển đổi của người dùng
    const saved = localStorage.getItem("splitmate_isAdmin");
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // bỏ qua nếu lỗi
      }
    }

    // Nếu có tài khoản Trưởng nhóm đăng nhập và không có Mã thành viên, thì mặc định ban đầu là admin (Trưởng nhóm)
    const hasLeader = !!localStorage.getItem("splitmate_custom_leader_user");
    const hasMemberCode = !!localStorage.getItem("splitmate_memberAccessCodeUser");
    if (hasLeader && !hasMemberCode) return true;
    if (hasMemberCode) return false;

    return true;
  });

  const [viewingMemberId, setViewingMemberId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem("splitmate_viewingMemberId");
    return (saved && saved !== "undefined") ? saved : undefined;
  });

  const [selectedParticipationMemberId, setSelectedParticipationMemberId] = useState<string>("");

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showPersonalStatement, setShowPersonalStatement] = useState<boolean>(false);
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  
  const [activeAuthTab, setActiveAuthTab] = useState<"login" | "register">("login");
  const [authScreen, setAuthScreen] = useState<"welcome" | "auth">("welcome");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authDisplayName, setAuthDisplayName] = useState<string>("");

  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState<boolean>(false);

  // Change Password States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isChangeSubmitting, setIsChangeSubmitting] = useState<boolean>(false);


  useEffect(() => {
    if (!memberAccessCodeUser) {
      localStorage.setItem("splitmate_isAdmin", JSON.stringify(isAdmin));
    }
  }, [isAdmin, memberAccessCodeUser]);

  // Sync isAdmin with active group or offline trial mode
  useEffect(() => {
    if (tryOfflineMode) {
      if (!isAdmin) setIsAdmin(true);
      if (memberAccessCodeUser) setMemberAccessCodeUser(null);
      if (viewingMemberId) setViewingMemberId(undefined);
    }
  }, [tryOfflineMode, memberAccessCodeUser, viewingMemberId]);

  useEffect(() => {
    if (!memberAccessCodeUser) {
      localStorage.setItem("splitmate_viewingMemberId", viewingMemberId || "undefined");
    }
  }, [viewingMemberId, memberAccessCodeUser]);

  // Custom dialogs (confirms & alerts) to bypass iframe browser blockers
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertState, setAlertState] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertState({ title, message });
  };

  // New Group input controls
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSuccess, setNewGroupSuccess] = useState(false);

  // Listen for open-create-group custom event
  useEffect(() => {
    const handleOpenCreateGroup = () => {
      setIsCreatingGroup(true);
    };
    window.addEventListener("open-create-group", handleOpenCreateGroup);
    return () => window.removeEventListener("open-create-group", handleOpenCreateGroup);
  }, []);

  // Edit Group Name controls
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [tempGroupImage, setTempGroupImage] = useState("");

  // Sync groups to localStorage format (Offline backup)
  useEffect(() => {
    localStorage.setItem("splitmate_groups", JSON.stringify(groups));
  }, [groups]);

  // Sync selected group ID to localStorage
  useEffect(() => {
    localStorage.setItem("splitmate_selected_id", selectedGroupId);
  }, [selectedGroupId]);

  // Find active group
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Auto-sanitize active group's debtOffsets & pendingReceipts if a cycle was previously closed
  useEffect(() => {
    if (!activeGroup || !activeGroup.billingCycles || activeGroup.billingCycles.length === 0) return;

    const latestCycle = activeGroup.billingCycles[0];
    const latestClosedAtTime = new Date(latestCycle.closedAt || latestCycle.archivedAt || 0).getTime();

    let needsUpdate = false;
    let newDebtOffsets = activeGroup.debtOffsets || [];
    let newPendingReceipts = activeGroup.pendingReceipts || [];

    if (!activeGroup.expenses || activeGroup.expenses.length === 0) {
      if (newDebtOffsets.length > 0) {
        newDebtOffsets = [];
        needsUpdate = true;
      }
      if (newPendingReceipts.length > 0) {
        newPendingReceipts = [];
        needsUpdate = true;
      }
    } else if (latestClosedAtTime > 0) {
      const filteredOffsets = newDebtOffsets.filter(o => {
        if (!o.createdAt) return false;
        return new Date(o.createdAt).getTime() > latestClosedAtTime;
      });
      if (filteredOffsets.length !== newDebtOffsets.length) {
        newDebtOffsets = filteredOffsets;
        needsUpdate = true;
      }

      const filteredReceipts = newPendingReceipts.filter(r => {
        const timeStr = r.uploadedAt || r.createdAt;
        if (!timeStr) return false;
        return new Date(timeStr).getTime() > latestClosedAtTime;
      });
      if (filteredReceipts.length !== newPendingReceipts.length) {
        newPendingReceipts = filteredReceipts;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const sanitizedGroup: Group = {
        ...activeGroup,
        debtOffsets: newDebtOffsets,
        pendingReceipts: newPendingReceipts
      };
      updateGroupOnDbAndState(sanitizedGroup);
    }
  }, [activeGroup?.id, activeGroup?.expenses?.length, activeGroup?.billingCycles?.length, activeGroup?.debtOffsets?.length, activeGroup?.pendingReceipts?.length]);

  // Prevent unauthorized access to add expense tab
  useEffect(() => {
    if (activeTab === "add" && !isAdmin && activeGroup?.allowMemberAddExpense === false) {
      setActiveTab("home");
    }
  }, [activeTab, isAdmin, activeGroup?.allowMemberAddExpense]);

  // Auto-switch Admin/Member role when changing groups for Leader accounts
  useEffect(() => {
    if (!user) return;
    if (memberAccessCodeUser) return; // Ignore if logged in as member access code
    if (!activeGroup) return;

    const isOwner = activeGroup.ownerId === user.uid;
    if (isOwner) {
      if (!isAdmin) {
        setIsAdmin(true);
      }
    } else {
      const cleanUserEmail = user.email?.trim()?.toLowerCase();
      const matchedMember = activeGroup.members?.find((m: any) => m.email?.trim()?.toLowerCase() === cleanUserEmail);
      if (matchedMember) {
        if (isAdmin) {
          setIsAdmin(false);
        }
        if (viewingMemberId !== matchedMember.id) {
          setViewingMemberId(matchedMember.id);
        }
      }
    }
  }, [selectedGroupId, activeGroup?.id, user?.uid, user?.email, memberAccessCodeUser]);

  // Helper selectors
  const members = activeGroup?.members || [];
  const allExpenses = activeGroup?.expenses || [];
  const expenses = isAdmin ? allExpenses : allExpenses.filter(e => e.payerId === viewingMemberId || (e.participantIds || []).includes(viewingMemberId!));
  const activeIsSettled = activeGroup ? simplifyDebts(activeGroup.members, allExpenses).length === 0 : true;
  const getMember = (id: string) => members.find((m) => m.id === id);

  // Group Management Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tryOfflineMode) {
      showAlert(
        ui('mcd0074d548'),
        ui('m5c6d4571ec')
      );
      setIsCreatingGroup(false);
      return;
    }
    const name = newGroupName.trim();
    if (!name) return;

    // Find the most recent name used by this owner
    let recentName = user?.displayName || ui('m2f6dde052a');
    let recentEmail = user?.email || undefined;
    if (user && groups.length > 0) {
      const ownedGroups = groups.filter(g => g.ownerId === user.uid);
      if (ownedGroups.length > 0) {
        const latestGroup = ownedGroups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        // The admin is typically the first member created in the group.
        // We can just rely on members[0] as the most accurate representation of the admin's profile in that group.
        const ownerMember = latestGroup.members[0];
        if (ownerMember) {
          if (ownerMember.name) recentName = ownerMember.name;
          if (ownerMember.email) recentEmail = ownerMember.email;
        }
      }
    }

    // Create owner-as-first-member with custom access code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newGroup: Group = {
      id: "g_" + Date.now(),
      name,
      createdAt: new Date().toISOString().split("T")[0],
      members: [
        { 
          id: "m_first_" + Date.now(), 
          name: recentName, 
          email: recentEmail,
          color: MEMBER_COLORS[0].class, 
          emoji: "🎒", 
          accessCode: recentEmail ? undefined : code 
        }
      ],
      expenses: [],
    };

    if (user) {
      try {
        const cloudGroup = {
          ...newGroup,
          ownerId: user.uid,
          memberAccessCodes: [code]
        };
         const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cloudGroup)
         });
         if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || ui('m7819a0594b'));
         }
         const data = await res.json();
         setGroups((prev) => [...prev, data.group]);
      } catch (err: any) {
        console.error("API group creation error:", err);
        showAlert(ui('m544756f744'), ui('mefd59d2c41', { v0: localizeError(err.message, err) }));
        setGroups((prev) => [...prev, newGroup]);
      }
    } else {
      setGroups((prev) => [...prev, newGroup]);
    }
    
    setSelectedGroupId(newGroup.id);
    setNewGroupName("");
    setIsCreatingGroup(false);
    setNewGroupSuccess(true);
    setTimeout(() => setNewGroupSuccess(false), 2500);
  };

  const handleDeleteGroup = (groupId: string) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return;

    const txs = simplifyDebts(targetGroup.members, targetGroup.expenses);
    const isSettled = txs.length === 0;

    if (!isSettled) {
      showAlert(ui('mdf4e37a748'), ui('m02f6e098a8'));
      return;
    }

    const performDeletion = async () => {
      const remaining = groups.filter((g) => g.id !== groupId);
      if (user) {
        try {
          const delRes = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
          if (!delRes.ok) {
            const text = await delRes.text();
            let errData;
            try {
              errData = JSON.parse(text);
            } catch (e) {
              errData = { error: text };
            }
            throw new Error(errData.error || `Lỗi xóa nhóm từ máy chủ: ${text}`);
          }
          setGroups(remaining);
          if (selectedGroupId === groupId) {
            setSelectedGroupId(remaining[0]?.id || "");
          }
        } catch (err: any) {
          console.error(err);
          showAlert(ui('mfa0697dd77'), localizeError(err.message, ui('me98731c73b')));
        }
      } else {
        setGroups(remaining);
        if (selectedGroupId === groupId) {
          setSelectedGroupId(remaining[0]?.id || "");
        }
      }
    };

    askConfirm(
      ui('m47af0d95b9'),
      ui('m20a23f4172', { v0: targetGroup.name }),
      () => {
        performDeletion();
      }
    );
  };

  const handleSaveGroupName = async () => {
    if (!activeGroup) return;
    if (!isAdmin) {
      showAlert(ui('m1c6ba8de8b'), ui('m9b04e471fb'));
      setIsEditingGroupName(false);
      return;
    }

    const updatedGroup = {
      ...activeGroup,
      name: tempGroupName.trim() || activeGroup.name,
      imageUrl: tempGroupImage || activeGroup.imageUrl
    };

    try {
      await updateGroupOnDbAndState(updatedGroup);
      setIsEditingGroupName(false);
    } catch (err) {
      console.error(err);
      showAlert(ui('md1e7f5d1d0'), ui('mbe987adf8f'));
    }
  };

  const handleGroupImageSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showAlert(ui('md290780737'), ui('m0fbb61b38b'));
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
          groupId: activeGroup?.id || selectedGroupId || ""
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        setTempGroupImage(data.url);
      } else {
        throw new Error(localizeError(data.error, ui('mfbe7344aca')));
      }
    } catch (err) {
      console.error("Lỗi xử lý ảnh nhóm:", err);
      showAlert(ui('md290780737'), ui('ma178902969'));
    }
  };

  // Reset current Application Database
  const handleResetToPresets = () => {
    askConfirm(
      ui('m5a113c57cd'),
      ui('m8746481334'),
      async () => {
        if (user) {
          try {
            const res = await fetch("/api/groups/presets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ownerId: user.uid })
            });
            if (!res.ok) throw new Error("Could not reset presets");
            const data = await res.json();
            setGroups(data.groups);
            setSelectedGroupId(data.groups[0].id);
            setActiveTab("bills");
          } catch (err) {
            console.error(err);
          }
        } else {
          setGroups(MOCK_GROUPS);
          setSelectedGroupId(MOCK_GROUPS[0].id);
          setActiveTab("bills");
        }
      }
    );
  };

  // Clear current active group transactions
  const handleClearActiveGroupData = async () => {
    askConfirm(
      ui('m5c4dc7fe4f'),
      ui('m3fc184da7d'),
      async () => {
        const updated = {
          ...activeGroup,
          expenses: []
        };
        await updateGroupOnDbAndState(updated);
      }
    );
  };

  // Load complete Vũng Tàu Test Dataset (45 expenses, 10 matched members)
  const handleLoadVungTauTestData = async () => {
    if (!activeGroup) return;
    askConfirm(
      ui('m174eab3805'),
      ui('m5b4b1c66f5'),
      async () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const populatedMembers = TEST_MEMBERS.map((m) => {
          let code = "";
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return {
            ...m,
            accessCode: code
          };
        });

        const updated = {
          ...activeGroup,
          name: "Trip Vũng Tàu 2026 (Test)",
          members: populatedMembers,
          expenses: TEST_EXPENSES
        };
        await updateGroupOnDbAndState(updated);
        showAlert(ui('m9a7d703709'), ui('mac53f91ae0'));
      }
    );
  };

  // Member Management Handlers
  const handleAddMember = async (member: Member) => {
    if (!activeGroup) return;

    const plan = activeGroup.plan || 'FREE';
    const limit = plan === 'PREMIUM' || plan === 'HOI_LANG' ? 50 : (plan === 'VIP' || plan === 'BE_BAN' || plan === 'DU_HI_30' ? 20 : 10);
    
    if (activeGroup.members.length >= limit) {
      setToastMsg({
        get title() { return ui('m274518ff7a'); },
        desc: ui('md0ecce0165', { v0: plan, v1: limit }),
        type: "error"
      });
      return;
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const memberWithCode = { 
      ...member, 
      accessCode: (member.email && member.email.trim() !== "") ? undefined : code 
    };

    const updated = {
      ...activeGroup,
      members: [...activeGroup.members, memberWithCode]
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeGroup) return;

    // Kiểm tra xem nhóm đã sòng phẳng chưa
    const txs = simplifyDebts(activeGroup.members, activeGroup.expenses || []);
    const isSettled = txs.length === 0;

    if (!isSettled) {
      showAlert(
        ui('m5d2f43458e'),
        ui('m963af27a7f')
      );
      return;
    }

    // Xóa thành viên khỏi danh sách
    const updatedMembers = activeGroup.members.filter((m) => m.id !== memberId);

    // BẢO TOÀN DỮ LIỆU HÓA ĐƠN CỦ:
    // Giữ nguyên activeGroup.expenses để các hóa đơn cũ vẫn hiển thị đầy đủ người đó tham gia/trả tiền.
    const updated = {
      ...activeGroup,
      members: updatedMembers,
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleUpdateOcrUsage = async () => {
    if (!activeGroup) return;
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let newUsage = (activeGroup.ocrUsage || 0) + 1;
    if (activeGroup.lastOcrMonth !== currentMonth) {
      newUsage = 1;
    }
    
    const updated = {
      ...activeGroup,
      ocrUsage: newUsage,
      lastOcrMonth: currentMonth
    };
    await updateGroupOnDbAndState(updated);
  };

  // Expense Management Handlers
  const handleBatchSettleAndReceipt = async (expense: Expense | null, receiptUpdates: PendingReceipt[]) => {
    if (!activeGroup) return;
    const updated = {
      ...activeGroup,
      pendingReceipts: receiptUpdates
    };
    if (expense) {
      updated.expenses = [expense, ...(activeGroup.expenses || [])];
    }
    await updateGroupOnDbAndState(updated);
  };

  const handleAddExpense = async (expense: Expense) => {
    const expenseCount = (activeGroup?.expenses || []).length;

    if (tryOfflineMode && expenseCount >= 10) {
      showAlert(ui('m071e443846'), ui('m4403061ffa'));
      return;
    }

    const nowIso = new Date().toISOString();
    const expenseWithAdder = {
      ...expense,
      addedBy: isAdmin ? "admin" : (viewingMemberId || "unknown"),
      created_at: expense.created_at || nowIso,
      updated_at: nowIso
    };
    const updated = {
      ...activeGroup,
      expenses: [expenseWithAdder, ...(activeGroup.expenses || [])]
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleBatchAddExpenses = async (newExpenses: Expense[]) => {
    const currentExpenses = activeGroup.expenses || [];
    if (tryOfflineMode && currentExpenses.length + newExpenses.length > 10) {
      showAlert(ui('m8bfb741bc5'), ui('m47d711a63c'));
      return;
    }

    const nowIso = new Date().toISOString();
    const processed = newExpenses.map((expense) => ({
      ...expense,
      addedBy: isAdmin ? "admin" : (viewingMemberId || "unknown"),
      created_at: expense.created_at || nowIso,
      updated_at: nowIso
    }));
    const updated = {
      ...activeGroup,
      expenses: [...processed, ...currentExpenses]
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!isAdmin) {
      showAlert(ui('mdf9a1edb35'), ui('m25b44f3fad'));
      return;
    }
    const expenseToDelete = (activeGroup.expenses || []).find((e) => e.id === expenseId);
    if (expenseToDelete?.receiptImage && expenseToDelete.receiptImage.startsWith("/api/receipt/view/")) {
      try {
        await fetch('/api/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: expenseToDelete.receiptImage })
        });
      } catch (e) {
        console.error("Lỗi khi xóa hóa đơn khi xóa chi phí:", e);
      }
    }
    const updated = {
      ...activeGroup,
      expenses: (activeGroup.expenses || []).filter((e) => e.id !== expenseId)
    };
    await updateGroupOnDbAndState(updated);
    if (editingExpense?.id === expenseId) {
      setEditingExpense(null);
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    const oldExpense = (activeGroup.expenses || []).find(e => e.id === updatedExpense.id);
    if (oldExpense?.receiptImage && oldExpense.receiptImage !== updatedExpense.receiptImage && oldExpense.receiptImage.startsWith("/api/receipt/view/")) {
      try {
        await fetch('/api/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: oldExpense.receiptImage })
        });
      } catch (e) {
        console.error("Lỗi khi xóa hóa đơn cũ khi cập nhật chi phí:", e);
      }
    }
    
    const nowIso = new Date().toISOString();
    const expenseWithEditor = {
      ...updatedExpense,
      editedBy: isAdmin ? "admin" : (viewingMemberId || "unknown"),
      created_at: oldExpense?.created_at || oldExpense?.date || updatedExpense.created_at || updatedExpense.date || nowIso,
      updated_at: nowIso
    };
    
    const updated = {
      ...activeGroup,
      expenses: (activeGroup.expenses || []).map((e) => (e.id === updatedExpense.id ? expenseWithEditor : e))
    };
    await updateGroupOnDbAndState(updated);
    setEditingExpense(null);
  };

  const handleUpdateGroupConfig = async (config: any) => {
    const updated = {
      ...activeGroup,
      ...config
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleEditMember = async (updatedMember: Member) => {
    if (!isAdmin && viewingMemberId !== updatedMember.id) {
      showAlert(ui('m6766eff226'), ui('m2c8671fda6'));
      return;
    }
    if (tryOfflineMode) {
      const updatedMembers = members.map((m) =>
        m.id === updatedMember.id ? updatedMember : m
      );
      const updatedGroup = {
        ...activeGroup,
        members: updatedMembers,
      };
      await updateGroupOnDbAndState(updatedGroup);
      showAlert(ui('m9a7d703709'), ui('m4c28e2a045'));
      return;
    }
    try {
      const res = await fetch("/api/member/update-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          memberId: updatedMember.id,
          accessCode: memberAccessCodeUser?.code,
          userEmail: user?.email || "",
          fundType: updatedMember.fundType,
          momoPhone: updatedMember.momoPhone || "",
          bankAccount: updatedMember.bankAccount || "",
          bankCode: updatedMember.bankCode || "",
          bankAccountName: updatedMember.bankAccountName || "",
          name: updatedMember.name,
          color: updatedMember.color,
          emoji: updatedMember.emoji,
          avatar: updatedMember.avatar || null,
          email: updatedMember.email || "",
          password: (updatedMember as any).password || "",
          otpCode: (updatedMember as any).otpCode || ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.updatedGroups && Array.isArray(data.updatedGroups) && data.updatedGroups.length > 0) {
          setGroups((prev) =>
            prev.map((g) => {
              const match = data.updatedGroups.find((ug: Group) => ug.id === g.id);
              return match || g;
            })
          );
        } else if (data.group) {
          setGroups((prev) => prev.map((g) => (g.id === selectedGroupId ? data.group : g)));
        }

        const oldMember = activeGroup?.members.find(m => m.id === updatedMember.id);
        const memberEmail = updatedMember.email || oldMember?.email;
        if (user && memberEmail && user.email?.toLowerCase() === memberEmail.toLowerCase()) {
           const updatedUser = { ...user, displayName: updatedMember.name };
           setUser(updatedUser);
           localStorage.setItem("splitmate_custom_leader_user", JSON.stringify(updatedUser));
        }

        showAlert(ui('m9a7d703709'), ui('m42d60125d8'));
      } else {
        showAlert(ui('m471434ca39'), localizeError(data.error, ui('m128784033d')));
      }
    } catch (err) {
      console.error("Update bank info error:", err);
      showAlert(ui('mf3103ad102'), ui('m5958088d72'));
    }
  };

  const convertUrlToBase64 = async (url: string): Promise<string> => {
    if (!url) return "";
    if (url.startsWith("data:image")) return url;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || url);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn("fetch base64 failed, fallback to canvas method:", e);
    }

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
            return;
          }
        } catch (err) {
          console.warn("Canvas toDataURL failed:", err);
        }
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  };

  const getReportHTML = async (archiveExpenses?: Expense[], archiveCycleName?: string, includeHistory: boolean = false) => {
    if (!activeGroup) return document.createElement("div");

    const element = document.createElement("div");
    element.style.padding = "24px";
    element.style.fontFamily = "system-ui, -apple-system, sans-serif";
    element.style.backgroundColor = "#ffffff";
    element.style.color = "#1e293b";
    
    const targetExpenses = Array.isArray(archiveExpenses) ? archiveExpenses : expenses;
    const cycleTitle = (typeof archiveCycleName === "string" && archiveCycleName) || activeGroup.currentCycleName || ui('m8f99d17c4b');
    
    const balances = calculateBalances(members, targetExpenses);
    const debtsData = balances
      .map((b) => {
        const mem = members.find((m) => m.id === b.memberId)?.name || b.memberId;
        return {
          name: mem,
          status: b.netBalance > 0 ? ui('m03deb4b7a1') : (b.netBalance < 0 ? ui('me99fb4bcb0') : ui('mc66efcf181')),
          amount: Math.round(Math.abs(b.netBalance)),
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    // Check config QR for Group Fund to embed
    const hasGroupConfig = !!(activeGroup?.fundQrImage || activeGroup?.fundPhone || activeGroup?.bankAccount);
    let qrHtml = "";
    if (hasGroupConfig) {
      let qrImgUrl = activeGroup.fundQrImage || "";
      if (qrImgUrl) {
        const separator = qrImgUrl.includes("?") ? "&" : "?";
        qrImgUrl = `${qrImgUrl}${separator}_t=${Date.now()}`;
      }
      
      // If we don't have custom fundQrImage but we have bank/phone details, we can dynamically generate a VietQR helper image
      if (!qrImgUrl && (activeGroup.fundPhone || activeGroup.bankAccount)) {
        const rawBank = activeGroup.bankCode || activeGroup.fundBankName || "VCB";
        const isMomo = rawBank.toUpperCase() === "MOMO";
        const mQrBank = isMomo ? "971025" : rawBank.toUpperCase();
        const mQrPhone = activeGroup.bankAccount || activeGroup.fundPhone || "";
        
        // Sanitize name and memo
        const mQrName = (activeGroup.bankAccountName || activeGroup.fundName || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .toUpperCase();
          
        const mMemo = `NCHIP ${activeGroup.name}`;
        qrImgUrl = generateVietQRQuickUrl({
          bankCode: mQrBank,
          accountNumber: mQrPhone,
          accountName: mQrName,
          amount: 0,
          memo: mMemo
        });
      }

      if (qrImgUrl) {
        qrImgUrl = await convertUrlToBase64(qrImgUrl);
      }

      qrHtml = `
        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center; padding: 20px 16px;">
          <h2 style="color: #0f172a; font-size: 15px; font-weight: 700; margin: 0 0 14px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; text-transform: uppercase;">${ui('m8b79fce01d')}</h2>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding-top: 4px;">
            ${qrImgUrl ? `<img src="${qrImgUrl}" alt="QR code" style="width: 180px; height: 180px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background: #fff;" />` : ""}
            <div style="text-align: center;">
              <p style="margin: 4px 0; color: #010101; font-size: 14px; font-weight: 700;">
                ${ui('me82031c955')} <span style="color: #4338ca;">${activeGroup.fundType === "momo" ? ui('mac3482da66') : (activeGroup.fundBankName || ui('m69ba2e4467'))}</span>
              </p>
              <p style="margin: 4px 0; color: #475569; font-size: 13px; font-weight: 600;">
                ${ui('m370de03220')} <strong style="color: #0f172a; font-family: monospace;">${activeGroup.fundPhone || activeGroup.bankAccount || ""}</strong>
              </p>
              ${activeGroup.fundName || activeGroup.bankAccountName ? `
                <p style="margin: 4px 0; color: #475569; font-size: 13px; font-weight: 600;">
                  ${ui('ma395ed9df7')} <strong style="color: #0f172a; text-transform: uppercase;">${activeGroup.fundName || activeGroup.bankAccountName}</strong>
                </p>
              ` : ""}
              <p style="margin: 8px 0 0 0; color: #059669; font-size: 12px; font-weight: 700; background-color: #ecfdf5; padding: 4px 12px; border-radius: 9999px; display: inline-block;">
                ${ui('m09fd513824')}
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const plan = activeGroup.plan || 'FREE';
    const isFree = plan === 'FREE' || plan === 'TRY_OFFLINE';
    const isVip = plan === 'VIP' || plan === 'BE_BAN';
    const isPremium = plan === 'PREMIUM' || plan === 'HOI_LANG';
    const isDuHi = plan === 'DU_HI_30';
    const hasPayableQrFeature = !isFree;

    let debtQrHtml = "";

    if (hasPayableQrFeature) {
      const fundBankNo = activeGroup.bankAccount || activeGroup.fundPhone || "";
      const fundRawBank = activeGroup.bankCode || activeGroup.fundBankName || "VCB";
      const fundAccountName = activeGroup.bankAccountName || activeGroup.fundName || activeGroup.name || "";

      if (fundBankNo) {
        // Mode 1: All debtor members pay into Group Fund (Quỹ Nhóm)
        const debtors = balances
          .filter((b) => Math.round(b.netBalance) <= -1)
          .map((b) => {
            const mem = members.find((m) => m.id === b.memberId);
            return {
              debtorName: mem?.name || b.memberId,
              amount: Math.round(Math.abs(b.netBalance)),
            };
          })
          .sort((a, b) => b.amount - a.amount);

        const fundBin = getBankBin(fundRawBank);
        const isFundMomo = fundBin === "971025" || fundRawBank.toUpperCase().includes("MOMO");

        const qrCardsPromises = debtors.map(async (d) => {
          const cleanMemo = `NCHIP ${activeGroup.name} ${d.debtorName} NOP QUY`;
          const debtQrUrl = generateVietQRQuickUrl({
            bankCode: fundRawBank,
            accountNumber: fundBankNo,
            accountName: fundAccountName,
            amount: d.amount,
            memo: cleanMemo
          });

          const base64QrUrl = await convertUrlToBase64(debtQrUrl);

          return `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); width: calc(50% - 16px); max-width: 320px; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; font-size: 13px;">
              <div style="margin-bottom: 4px;">
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                  <span style="color: #e11d48;">${d.debtorName}</span> ➔ <span style="color: #059669;">${ui('m3f56f2dd08')}</span>
                </div>
                <div style="font-size: 15px; font-weight: 900; color: #03B875; font-family: monospace;">
                  ${d.amount.toLocaleString(getLocale())} ${ui('mc5f95801df')}
                </div>
              </div>
              <div style="display: block; text-align: center; margin: 4px 0;">
                <img src="${base64QrUrl}" crossorigin="anonymous" alt="QR ${d.debtorName}" style="width: 140px; height: 140px; object-fit: contain; margin: 0 auto; display: block;" />
              </div>
              <div style="font-size: 11px; color: #0369a1; font-weight: 700; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 4px 8px; border-radius: 8px; width: 100%; box-sizing: border-box;">
                ${ui('mecc090e6da')} <strong>${d.amount.toLocaleString(getLocale())}${ui('mc5f95801df')}</strong> ${ui('m7d636bd63c')}
              </div>
            </div>
          `;
        });

        const qrCards = await Promise.all(qrCardsPromises);

        if (qrCards.length > 0) {
          const chunkedCards = [];
          for (let i = 0; i < qrCards.length; i += 6) {
            chunkedCards.push(qrCards.slice(i, i + 6));
          }

          debtQrHtml = chunkedCards.map(chunk => `
            <div style="page-break-before: always; break-before: page; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="background: #ecfdf5; padding: 12px 16px; border-bottom: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: #065f46; font-size: 14px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${ui('m649f0e2a6e')}
                </h2>
                <span style="font-size: 11px; background: #03B875; color: #ffffff; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
                  ${getPlanLabel(activeGroup.plan)}
                </span>
              </div>
              <div style="padding: 16px 8px; text-align: center; background: #fafafa; box-sizing: border-box; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
                ${chunk.join('')}
              </div>
            </div>
          `).join('');
        }
      } else {
        // Mode 2: Pair-to-pair settlement fallback if Group Fund bank is not configured
        const simplifiedTransactions = simplifyDebts(members, targetExpenses, activeGroup.debtOffsets);
        if (simplifiedTransactions.length > 0) {
          const qrCardsPromises = simplifiedTransactions.map(async (tx) => {
            const debtor = members.find(m => m.id === tx.fromId);
            const creditor = members.find(m => m.id === tx.toId);
            const debtorName = debtor?.name || tx.fromId;
            const creditorName = creditor?.name || tx.toId;
            const amount = Math.round(tx.amount);

            let bankNo = creditor?.bankAccount || "";
            let rawBank = creditor?.bankCode || "VCB";
            let accountName = creditor?.bankAccountName || creditor?.name || "";

            if (bankNo && rawBank) {
              const cleanMemo = `NCHIP ${activeGroup.name} ${debtorName} TRA NO ${creditorName}`;

              const debtQrUrl = generateVietQRQuickUrl({
                bankCode: rawBank,
                accountNumber: bankNo,
                accountName: accountName,
                amount: amount,
                memo: cleanMemo
              });

              const base64QrUrl = await convertUrlToBase64(debtQrUrl);

              return `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); width: calc(50% - 16px); max-width: 320px; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; font-size: 13px;">
                  <div style="margin-bottom: 4px;">
                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
                      <span style="color: #e11d48;">${debtorName}</span> ➔ <span style="color: #059669;">${creditorName}</span>
                    </div>
                    <div style="font-size: 15px; font-weight: 900; color: #03B875; font-family: monospace;">
                      ${amount.toLocaleString(getLocale())} ${ui('mc5f95801df')}
                    </div>
                  </div>
                  <div style="display: block; text-align: center; margin: 4px 0;">
                    <img src="${base64QrUrl}" crossorigin="anonymous" alt="QR ${debtorName}" style="width: 140px; height: 140px; object-fit: contain; margin: 0 auto; display: block;" />
                  </div>
                  <div style="font-size: 11px; color: #0369a1; font-weight: 700; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 4px 8px; border-radius: 8px; width: 100%; box-sizing: border-box;">
                    ${ui('mecc090e6da')} <strong>${amount.toLocaleString(getLocale())}${ui('mc5f95801df')}</strong> ${ui('m7d636bd63c')}
                  </div>
                </div>
              `;
            }
            return "";
          });

          const resolvedCards = await Promise.all(qrCardsPromises);
          const qrCards = resolvedCards.filter(Boolean);

          if (qrCards.length > 0) {
            const chunkedCards = [];
            for (let i = 0; i < qrCards.length; i += 6) {
              chunkedCards.push(qrCards.slice(i, i + 6));
            }

            debtQrHtml = chunkedCards.map(chunk => `
              <div style="page-break-before: always; break-before: page; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: #ecfdf5; padding: 12px 16px; border-bottom: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center;">
                  <h2 style="color: #065f46; font-size: 14px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${ui('me70eb39f62')}
                  </h2>
                  <span style="font-size: 11px; background: #03B875; color: #ffffff; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
                    ${getPlanLabel(activeGroup.plan)}
                  </span>
                </div>
                <div style="padding: 16px 8px; text-align: center; background: #fafafa; box-sizing: border-box; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
                  ${chunk.join('')}
                </div>
              </div>
            `).join('');
          }
        }
      }
    }

    // Nếu đã có sẵn mã QR tất toán nợ cụ thể có sẵn số tiền (debtQrHtml), ẩn mã QR Quỹ Nhóm chung ở đầu
    if (debtQrHtml && debtQrHtml.trim() !== "") {
      qrHtml = "";
    }

    // Generate spending history table based on plan tier
    let historyHtml = "";
    let appendixHtml = "";

    if (!isFree && targetExpenses && targetExpenses.length > 0) {
      const sortedExpenses = [...targetExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const spendingExpenses = sortedExpenses.filter(exp => !exp.id.startsWith("settle_"));
      const fundTransactions = sortedExpenses.filter(exp => exp.id.startsWith("settle_"));
      
      const getMemberEmojiName = (id: string) => {
        if (id.startsWith("g_")) return ui('m8a5333a376');
        const m = members.find((mem) => mem.id === id);
        return m ? `${m.emoji || "👤"} ${m.name}` : ui('mcd264c4a8f');
      };

      const getParticipantsString = (ids: string[]) => {
        if (!ids || ids.length === 0) return ui('m165ec1609e');
        if (ids.length === members.length) return ui('m165ec1609e');
        return ids.map(id => {
          const m = members.find(mem => mem.id === id);
          return m ? m.name : "";
        }).filter(Boolean).join(", ");
      };

      let spendingHtml = "";
      if (spendingExpenses.length > 0) {
        spendingHtml = `
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-before: auto;">
            <div style="background: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0; text-transform: uppercase;">
                ${ui('mda1cec8eef')} ${isVip ? ui('mae7f6ef2d8') : ui('m57fb86fc5c')} (${spendingExpenses.length} ${ui('mc7d269a19a')}
              </h2>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #64748b;">
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; width: 80px;">${ui('m368c457574')}</th>
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">${ui('mabdf05335d')}</th>
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; width: 120px;">${ui('m04077a1510')}</th>
                  ${isPremium ? `<th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; width: 150px;">${ui('m775e03a675')}</th>` : ""}
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 100px;">${ui('md5261b2d21')}</th>
                </tr>
              </thead>
              <tbody>
                ${spendingExpenses.map((exp, i) => {
                  const formattedDate = exp.date ? new Date(exp.date).toLocaleDateString(getLocale()) : "-";
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  const textColor = '#1e293b';
                  return `
                    <tr style="background-color: ${rowBg}; color: ${textColor}; page-break-inside: avoid;">
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">${formattedDate}</td>
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${exp.description}</td>
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">${getMemberEmojiName(exp.payerId)}</td>
                      ${isPremium ? `<td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${getParticipantsString(exp.participantIds)}">${getParticipantsString(exp.participantIds)}</td>` : ""}
                      <td style="padding: 10px 16px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-family: monospace; font-size: 13px; white-space: nowrap;">
                        ${Math.round(exp.amount).toLocaleString(getLocale())} ${ui('mc5f95801df')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      let fundHtml = "";
      if (isPremium && fundTransactions.length > 0) {
        fundHtml = `
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-before: auto;">
            <div style="background: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0; text-transform: uppercase;">${ui('m92b31113e2')}${fundTransactions.length} ${ui('m8b791a8154')}</h2>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #64748b;">
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; width: 80px;">${ui('m368c457574')}</th>
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">${ui('mabdf05335d')}</th>
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; width: 120px;">${ui('m04077a1510')}</th>
                  <th style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; width: 100px;">${ui('md5261b2d21')}</th>
                </tr>
              </thead>
              <tbody>
                ${fundTransactions.map((exp, i) => {
                  const formattedDate = exp.date ? new Date(exp.date).toLocaleDateString(getLocale()) : "-";
                  const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  const textColor = '#059669';
                  return `
                    <tr style="background-color: ${rowBg}; color: ${textColor}; font-style: italic; page-break-inside: avoid;">
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">${formattedDate}</td>
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${exp.description}</td>
                      <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">${getMemberEmojiName(exp.payerId)}</td>
                      <td style="padding: 10px 16px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-family: monospace; font-size: 13px; white-space: nowrap;">
                        ${Math.round(exp.amount).toLocaleString(getLocale())} ${ui('mc5f95801df')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      
      historyHtml = spendingHtml + fundHtml;

      // Phụ lục hóa đơn minh chứng gốc dành riêng cho Gói Hội làng (PREMIUM)
      if (isPremium) {
        const expensesWithImages = spendingExpenses.filter(exp => exp.receiptImage);
        if (expensesWithImages.length > 0) {
          const imagesPromises = expensesWithImages.map(async (exp) => {
            const formattedDate = exp.date ? new Date(exp.date).toLocaleDateString(getLocale()) : "-";
            const b64Image = await convertUrlToBase64(exp.receiptImage!);
            return `
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 10px; page-break-inside: avoid;">
                <div style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                  <h4 style="margin: 0 0 4px 0; color: #1e1b4b; font-size: 13px; font-weight: 700;">${exp.description}</h4>
                  <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between;">
                    <span>${ui('m312fb1f0f1')} <strong>${formattedDate}</strong></span>
                    <span>${ui('m611c27763e')} <strong>${getMemberEmojiName(exp.payerId)}</strong></span>
                  </div>
                  <div style="font-size: 12px; color: #4f46e5; font-weight: 800; margin-top: 4px; text-align: right;">
                    ${ui('m47c404e23f')} ${Math.round(exp.amount).toLocaleString(getLocale())} ${ui('mc5f95801df')}
                  </div>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; overflow: hidden; min-height: 180px; max-height: 250px; border: 1px solid #f1f5f9;">
                  <img src="${b64Image}" crossorigin="anonymous" alt="Hóa đơn" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 4px;" />
                </div>
              </div>
            `;
          });
          const renderedCards = await Promise.all(imagesPromises);
          appendixHtml = `
            <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-top: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-before: always;">
              <div style="background: #4f46e5; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <h2 style="color: #ffffff; font-size: 15px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${ui('md29ed6f8cc')}
                </h2>
              </div>
              <div style="padding: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; background: #faf5ff;">
                ${renderedCards.join('')}
              </div>
            </div>
          `;
        }
      }
    }

    element.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #1e293b; max-width: 750px; margin: 0 auto; background: #ffffff; padding: 10px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">${ui('me25c1961ea')}</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">${ui('m0a7ebe7f71')} <strong style="color: #4338ca;">${activeGroup.name}</strong> (${cycleTitle})</p>
          <p style="margin: 4px 0 0 0; color: #4f46e5; font-size: 12px; font-weight: 700; background-color: #f5f3ff; padding: 2px 10px; border-radius: 9999px; display: inline-block;">
            ${ui('m02f03bc96c')} ${getPlanLabel(activeGroup.plan)}
          </p>
        </div>
        
        ${qrHtml}
        
        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-inside: avoid;">
          <div style="background: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0; text-transform: uppercase;">${ui('maff93a3d83')}</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="padding: 10px 20px; text-align: left; border-bottom: 1px solid #e2e8f0;">${ui('mcd264c4a8f')}</th>
                <th style="padding: 10px 20px; text-align: left; border-bottom: 1px solid #e2e8f0;">${ui('me03c1401e3')}</th>
                <th style="padding: 10px 20px; text-align: right; border-bottom: 1px solid #e2e8f0;">${ui('mb6a0f0e198')}</th>
              </tr>
            </thead>
            <tbody>
              ${debtsData.length > 0 ? debtsData.map((d, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">${d.name}</td>
                  <td style="padding: 12px 20px; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; 
                      background-color: ${d.status === 'Nhận về' ? '#ecfdf5' : '#fff1f2'}; 
                      color: ${d.status === 'Nhận về' ? '#059669' : '#e11d48'};">
                      ${d.status}
                    </span>
                  </td>
                  <td style="padding: 12px 20px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-family: monospace; font-size: 14px;">
                    ${Math.round(d.amount).toLocaleString(getLocale())} ${ui('mc5f95801df')}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="3" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">${ui('m98517a7acf')}</td></tr>`}
            </tbody>
          </table>
        </div>

        ${debtQrHtml}

        ${historyHtml}

        ${appendixHtml}

        <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
          <p>${ui('md4831beec4')} <strong>Splitmate</strong> ${ui('m7702e99856')} ${new Date().toLocaleDateString(getLocale())} ${ui('mc2ace851a7')} ${new Date().toLocaleTimeString(getLocale())}</p>
        </div>
      </div>
    `;
    return element;
  };

  const waitForImages = (el: HTMLElement): Promise<void> => {
    const images = Array.from(el.querySelectorAll("img"));
    const promises = images.map((img) => {
      return new Promise<void>((resolve) => {
        const handleDecode = () => {
          if (img.decode) {
            img.decode().then(() => resolve()).catch(() => {
              // Fallback for failed decode
              img.style.display = "none";
              resolve();
            });
          } else {
            resolve();
          }
        };

        const handleError = () => {
          // Replace broken image with a fallback or hide it to prevent canvas taint/failure
          img.style.display = "none";
          resolve();
        };

        if (img.complete) {
          if (img.naturalWidth !== 0) {
            handleDecode();
          } else {
            handleError();
          }
        } else {
          img.onload = () => handleDecode();
          img.onerror = () => handleError();
        }
      });
    });
    return Promise.all(promises).then(() => {});
  };

  const handleShareReport = async () => {
    let element: HTMLDivElement | null = null;
    let loadingDiv: HTMLDivElement | null = null;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    try {
      // Create a full-screen loading overlay with unique ID so html2canvas can ignore it
      loadingDiv = document.createElement("div");
      loadingDiv.id = "pdf-loading-overlay";
      loadingDiv.style.position = "fixed";
      loadingDiv.style.inset = "0";
      loadingDiv.style.zIndex = "999999";
      loadingDiv.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
      loadingDiv.style.backdropFilter = "blur(8px)";
      loadingDiv.style.display = "flex";
      loadingDiv.style.flexDirection = "column";
      loadingDiv.style.alignItems = "center";
      loadingDiv.style.justifyContent = "center";
      loadingDiv.style.color = "#ffffff";
      loadingDiv.style.fontFamily = "system-ui, -apple-system, sans-serif";
      loadingDiv.innerHTML = `
        <div style="background: #ffffff; padding: 28px 36px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; max-width: 340px;">
          <div style="width: 42px; height: 42px; border: 4px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: pdfSpin 0.8s linear infinite;"></div>
          <style>@keyframes pdfSpin { to { transform: rotate(360deg); } }</style>
          <div>
            <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px; font-weight: 800;">${ui('m97125c14c4')}</h3>
            <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">${ui('m6f1d0922db')}</p>
          </div>
        </div>
      `;
      document.body.appendChild(loadingDiv);

      element = await getReportHTML(undefined, undefined, true);
      element.id = "pdf-export-element";
      const filename = `Bao_Cao_${activeGroup.name}.pdf`;

      element.style.width = "780px";
      element.style.backgroundColor = "#ffffff";
      element.style.boxSizing = "border-box";

      // Wait for all base64 images and QR codes to load & decode in memory
      await waitForImages(element);
      
      // Delay 400ms buffer so Browser Layout Engine paints base64 images
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Scroll main container to top to prevent html2canvas offset bugs
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) scrollContainer.scrollTo(0, 0);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const generatePdf = async (isRetry = false): Promise<string> => {
        const currentScale = isRetry ? (isMobile ? 0.8 : 1.5) : (isMobile ? 1.2 : 2);
        
        const opt = {
          margin: 8,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: currentScale, 
            useCORS: true, 
            allowTaint: false, 
            // Do not force scrollY/scrollX to 0 as it breaks relative positioned elements
            windowWidth: 800,
            ignoreElements: (node: Element) => node.id === "pdf-loading-overlay" || node === loadingDiv
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        return new Promise<string>((resolve, reject) => {
          try {
            (html2pdf().from(element).set(opt as any) as any).outputPdf().then((pdfString: string) => {
              // Check if PDF is corrupted / blank (usually very small file size < 10KB)
              if (pdfString && pdfString.length < 10000 && !isRetry) {
                console.warn("PDF appears to be blank or corrupted (size too small). Retrying with lower scale...");
                resolve(generatePdf(true));
              } else {
                resolve(pdfString);
              }
            }).catch(reject);
          } catch (err) {
            reject(err);
          }
        });
      };

      generatePdf().then((pdfString: string) => {
        if (loadingDiv && loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        window.scrollTo(originalScrollX, originalScrollY);
        
        // Convert pdf string to ArrayBuffer and then to Blob
        const len = pdfString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = pdfString.charCodeAt(i);
        }
        const pdfBlob = new Blob([bytes.buffer], { type: "application/pdf" });
        const file = new File([pdfBlob], filename, { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: ui('m5b45c32f7d', { v0: activeGroup.name }),
            get text() { return ui('mba53f72509'); }
          }).catch((error) => console.log('Chia sẻ bị hủy:', error));
        } else {
          // If share API is not supported
          alert(ui('m0c8869fe4e'));
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }).catch((err: any) => {
        console.error("PDF output error:", err);
        if (loadingDiv && loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        window.scrollTo(originalScrollX, originalScrollY);
        alert(ui('mf28a1810c5'));
      });
      
    } catch (error) {
      console.error("Share error:", error);
        if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
      window.scrollTo(originalScrollX, originalScrollY);
      alert(ui('mf28a1810c5'));
    }
  };

  const handleExportPDF = async (archiveExpenses?: any, archiveCycleName?: any) => {
    let element: HTMLDivElement | null = null;
    let loadingDiv: HTMLDivElement | null = null;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    try {
      // Create a full-screen loading overlay with unique ID so html2canvas can ignore it
      loadingDiv = document.createElement("div");
      loadingDiv.id = "pdf-loading-overlay";
      loadingDiv.style.position = "fixed";
      loadingDiv.style.inset = "0";
      loadingDiv.style.zIndex = "999999";
      loadingDiv.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
      loadingDiv.style.backdropFilter = "blur(8px)";
      loadingDiv.style.display = "flex";
      loadingDiv.style.flexDirection = "column";
      loadingDiv.style.alignItems = "center";
      loadingDiv.style.justifyContent = "center";
      loadingDiv.style.color = "#ffffff";
      loadingDiv.style.fontFamily = "system-ui, -apple-system, sans-serif";
      loadingDiv.innerHTML = `
        <div style="background: #ffffff; padding: 28px 36px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; max-width: 340px;">
          <div style="width: 42px; height: 42px; border: 4px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: pdfSpin 0.8s linear infinite;"></div>
          <style>@keyframes pdfSpin { to { transform: rotate(360deg); } }</style>
          <div>
            <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px; font-weight: 800;">${ui('mbbbcc98fa3')}</h3>
            <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 500;">${ui('m6f1d0922db')}</p>
          </div>
        </div>
      `;
      document.body.appendChild(loadingDiv);

      const cleanExpenses = Array.isArray(archiveExpenses) ? archiveExpenses : undefined;
      const cleanCycleName = typeof archiveCycleName === "string" ? archiveCycleName : undefined;
      
      element = await getReportHTML(cleanExpenses, cleanCycleName, true);
      element.id = "pdf-export-element";
      
      const cycleTitle = cleanCycleName || activeGroup?.currentCycleName || "Ky_Hien_Tai";
      const cleanTitle = cycleTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
      
      element.style.width = "780px";
      element.style.backgroundColor = "#ffffff";
      element.style.boxSizing = "border-box";

      // Wait for all base64 images and QR codes to load & decode in memory
      await waitForImages(element);
      
      // Delay 400ms buffer so Browser Layout Engine paints base64 images
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Scroll main container to top to prevent html2canvas offset bugs
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) scrollContainer.scrollTo(0, 0);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const generatePdf = async (isRetry = false): Promise<void> => {
        const currentScale = isRetry ? (isMobile ? 0.8 : 1.5) : (isMobile ? 1.2 : 2);
        
        const opt = {
          margin: 8,
          filename: `Bao_Cao_${activeGroup.name}_${cleanTitle}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: currentScale, 
            useCORS: true, 
            allowTaint: false, 
            // Do not force scrollY/scrollX to 0 as it breaks relative positioned elements
            windowWidth: 800,
            ignoreElements: (node: Element) => node.id === "pdf-loading-overlay" || node === loadingDiv
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        return new Promise<void>((resolve, reject) => {
          try {
            const worker = html2pdf().from(element).set(opt as any);
            // output to string first to check size
            worker.outputPdf().then((pdfString: string) => {
              if (pdfString && pdfString.length < 10000 && !isRetry) {
                console.warn("PDF appears to be blank or corrupted (size too small). Retrying with lower scale...");
                resolve(generatePdf(true));
              } else {
                // If it's good (or if it's already a retry), save it
                worker.save().then(() => resolve()).catch(reject);
              }
            }).catch(reject);
          } catch (err) {
            reject(err);
          }
        });
      };

      generatePdf().then(() => {
        if (loadingDiv && loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        window.scrollTo(originalScrollX, originalScrollY);
      }).catch((err: any) => {
        console.error("PDF save promise error:", err);
        if (loadingDiv && loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        window.scrollTo(originalScrollX, originalScrollY);
        alert(ui('m98f07ea775'));
      });
      
    } catch (error) {
      console.error("Export PDF error:", error);
        if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
      window.scrollTo(originalScrollX, originalScrollY);
      alert(ui('m98f07ea775'));
    }
  };

  const totals = expenses.reduce((sum, e) => (e.isFundDeposit || e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? sum : sum + e.amount, 0);

  // 1. Beautiful Loading state if authenticating or syncing initial groups
  if (authLoading || (user && !initialGroupsFetched)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            {user ? ui('m140b249f4d') : ui('ma1103b4924')}
          </p>
        </div>
      </div>
    );
  }

  // FAQ Page View
  if (showFaqPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden pb-12">
        <FaqPage
          isAdmin={isAdmin}
          currentUser={user ? { name: user.displayName, email: user.email } : (memberAccessCodeUser ? { name: getMember(viewingMemberId || "")?.name || ui('mcd264c4a8f') } : null)}
          onBack={() => setShowFaqPage(false)}
        />
      </div>
    );
  }


  // 2. Beautiful Landing Page if unauthenticated and not forcing offline demo
  if (!user && !memberAccessCodeUser && !tryOfflineMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-sans p-0 sm:p-6 md:p-8 relative overflow-hidden selection:bg-[#03B875]/20 selection:text-[#03B875]">
        <div className="fixed right-3 top-3 z-50"><LanguageSwitcher /></div>
        {/* Decorative background blurs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#03B875]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#03B875]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Device Frame for Desktop, Fullscreen for Mobile */}
        <div className="w-full max-w-md min-h-[100dvh] sm:min-h-[85vh] sm:max-h-[880px] bg-white sm:rounded-[40px] sm:shadow-[0_24px_64px_-16px_rgba(15,23,42,0.1)] sm:border sm:border-slate-100/80 relative overflow-hidden flex flex-col justify-between p-6 sm:p-7.5 z-10 transition-all duration-300">
          <AnimatePresence mode="wait">
            {authScreen === "welcome" ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex-1 flex flex-col justify-between h-full relative"
              >
                {/* FAQ Button */}
                <div className="absolute top-0 right-0 z-20">
                  <button
                    type="button"
                    onClick={() => setShowFaqPage(true)}
                    className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-100 transition-colors cursor-pointer"
                    title={ui('mbd36ef7eda')}
                  >
                    <HelpCircle className="w-4.5 h-4.5 text-slate-400 hover:text-[#03B875]" />
                  </button>
                </div>

                {/* Slogan & Brand Header */}
                <div className="flex flex-col items-center text-center mt-6">
                  <div className="w-14 h-14 rounded-[20px] bg-[#03B875]/10 flex items-center justify-center text-[#03B875] mb-4 shadow-2xs">
                    <ArrowLeftRight className="h-7 w-7 stroke-[2.5px]" />
                  </div>
                  <h1 className="font-black text-2xl text-[#0F172A] tracking-tight">SplitMate</h1>
                  <p className="text-[13px] text-slate-500 mt-2 max-w-[260px] leading-relaxed font-medium">
                    {ui('m3f301109f3')}</p>
                </div>

                {/* Flat Minimalist Illustration */}
                <div className="flex-1 flex items-center justify-center py-6">
                  <svg className="w-48 h-48 max-h-[220px] text-[#03B875]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 6" className="opacity-20 animate-spin" style={{ animationDuration: '60s' }} />
                    
                    {/* Người 1 (Màu Xanh ngọc) */}
                    <circle cx="100" cy="50" r="16" fill="#03B875" />
                    <circle cx="100" cy="50" r="22" stroke="#03B875" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-60" />
                    
                    {/* Người 2 (Màu slate) */}
                    <circle cx="55" cy="130" r="16" fill="#475569" />
                    
                    {/* Người 3 (Màu ngọc lam) */}
                    <circle cx="145" cy="130" r="16" fill="#0EA5E9" />
                    
                    {/* Các mũi tên thanh toán đan chéo */}
                    <path d="M90 70 L65 110" stroke="#03B875" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M135 110 L110 70" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M75 130 L125 130" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Biểu tượng đồng xu / đô la ở chính giữa */}
                    <g transform="translate(100, 105)">
                      <circle cx="0" cy="0" r="12" fill="#03B875" className="animate-pulse" />
                      <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>

                {/* Actions Bottom Block */}
                <div className="space-y-4">
                  {/* Đăng nhập / Đăng ký Button */}
                  <button
                    type="button"
                    onClick={() => setAuthScreen("auth")}
                    className="w-full bg-[#03B875] hover:bg-[#029a62] text-white text-sm font-bold py-3.5 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#03B875]/15 font-sans"
                  >
                    {ui('ma52c35d1b8')}</button>

                  {/* Divider */}
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{ui('mf90c148332')}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Khối nhập mã 6 ký tự */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const codeInput = form.elements.namedItem("memberCode") as HTMLInputElement;
                    handleMemberCodeLogin(codeInput.value);
                  }} className="space-y-2">
                    <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-2xs focus-within:border-[#03B875] transition-colors">
                      <input
                        name="memberCode"
                        type="text"
                        required
                        maxLength={6}
                        onChange={() => setMemberCodeErrorMsg("")}
                        placeholder={ui('m1dcbcbc16e')}
                        className="w-full bg-transparent text-xs py-3 pl-4 pr-12 text-slate-800 font-bold outline-none placeholder:text-slate-400 font-mono tracking-widest text-left"
                      />
                      <button
                        type="submit"
                        disabled={authInProg}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-[#03B875] text-white flex items-center justify-center hover:bg-[#029a62] transition-all active:scale-95 cursor-pointer"
                        title={ui('m9ce40ab9c6')}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    {memberCodeErrorMsg && (
                      <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-red-50 border border-red-200/70 text-red-600 text-[11px] font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{memberCodeErrorMsg}</span>
                      </div>
                    )}
                  </form>

                  {/* Chế độ xài 1 lần */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSetTryOffline(true)}
                      className="w-full bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200/40 text-xs font-bold py-3 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {ui('m53a6b55e63')}</button>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] text-slate-400 mt-6 pt-1">
                  <p>{ui('m03c76b06d5')}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full flex flex-col space-y-5 text-left py-1"
              >
                {/* Upper Sheet Actions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => setAuthScreen("welcome")}
                      className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-700 border border-slate-200/60 transition-colors cursor-pointer"
                      title={ui('m8a09e03d20')}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFaqPage(true)}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-500 border border-slate-200/60 transition-colors cursor-pointer"
                      title={ui('mbd36ef7eda')}
                    >
                      <HelpCircle className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  {/* Header Title */}
                  <div className="space-y-1 mb-5">
                    <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">{ui('m73b4617761')}</h2>
                    <p className="text-sm text-slate-500 font-medium">{ui('m6a0568df43')}</p>
                  </div>

                  {/* Segment Control Tab Switcher */}
                  <div className="bg-slate-100/90 p-1.5 rounded-2xl flex border border-slate-200/60 relative mb-5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAuthTab("login");
                        setAuthErrorMsg("");
                        setAuthOtpSent(false);
                        setAuthOtpCode("");
                      }}
                      className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl transition-colors duration-150 relative z-10 text-center cursor-pointer ${
                        activeAuthTab === "login" ? "text-white" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {ui('m1d5caf099f')}</button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAuthTab("register");
                        setAuthErrorMsg("");
                      }}
                      className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl transition-colors duration-150 relative z-10 text-center cursor-pointer ${
                        activeAuthTab === "register" ? "text-white" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {ui('md07fbd12f4')}</button>
                    <motion.div
                      className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-[#03B875] rounded-xl shadow-md shadow-[#03B875]/20"
                      animate={{
                        x: activeAuthTab === "login" ? "0%" : "100%"
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Form fields */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (activeAuthTab === "register") {
                      if (!authOtpSent) {
                        handleSendOtp();
                      } else {
                        handleLeaderAuth(authEmail, authPassword, authDisplayName, "register");
                      }
                    } else {
                      handleLeaderAuth(authEmail, authPassword, undefined, "login");
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    {activeAuthTab === "register" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider block ml-1 text-slate-500">
                          {ui('m55e1a43512')}</label>
                        <input
                          type="text"
                          required
                          value={authDisplayName}
                          onChange={(e) => {
                            setAuthDisplayName(e.target.value);
                            setAuthErrorMsg("");
                          }}
                          placeholder={ui('me351b11788')}
                          className="w-full h-13 bg-slate-50 border border-slate-200/80 text-sm py-3 px-4 rounded-2xl text-slate-900 outline-none focus:border-[#03B875] focus:bg-white transition-all placeholder:text-slate-400 font-semibold text-left shadow-2xs"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider block ml-1 text-slate-500">
                        {ui('me87b7214ff')}</label>
                      <input
                        type="email"
                        required
                        disabled={activeAuthTab === "register" && authOtpSent}
                        value={authEmail}
                        onChange={(e) => {
                          setAuthEmail(e.target.value);
                          setAuthErrorMsg("");
                        }}
                        placeholder="ten_cua_ban@gmail.com"
                        className={`w-full h-13 border border-slate-200/80 text-sm py-3 px-4 rounded-2xl text-slate-900 outline-none focus:border-[#03B875] focus:bg-white transition-all placeholder:text-slate-400 font-semibold text-left shadow-2xs ${
                          activeAuthTab === "register" && authOtpSent ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-slate-50"
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-black uppercase tracking-wider block text-slate-500">
                          {ui('m9d7ce7de08')}</label>
                        {activeAuthTab === "login" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowForgotPasswordModal(true);
                            }}
                            className="text-xs font-bold text-[#03B875] hover:text-[#029a62] transition-colors cursor-pointer"
                          >
                            {ui('m1630fc027a')}</button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showAuthPassword ? "text" : "password"}
                          required
                          value={authPassword}
                          onChange={(e) => {
                            setAuthPassword(e.target.value);
                            setAuthErrorMsg("");
                          }}
                          placeholder={ui('m8c89566f41')}
                          className="w-full h-13 bg-slate-50 border border-slate-200/80 text-sm py-3 pl-4 pr-11 rounded-2xl text-slate-900 outline-none focus:border-[#03B875] focus:bg-white transition-all placeholder:text-slate-400 font-semibold text-left shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthPassword(!showAuthPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 cursor-pointer flex items-center justify-center transition-colors"
                        >
                          {showAuthPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Trường nhập mã OTP khi ở tab Đăng ký và đã bấm gửi mã */}
                    {activeAuthTab === "register" && authOtpSent && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4 text-[#03B875]" />
                            {ui('mb9b45cdba8')}</label>
                          <span className="text-[11px] text-[#03B875] font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{ui('mc18de1ca7c')}</span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={authOtpCode}
                            onChange={(e) => {
                              setAuthOtpCode(e.target.value.replace(/\D/g, ""));
                              setAuthErrorMsg("");
                            }}
                            placeholder={ui('mf54f4d4010')}
                            className="w-full h-13 bg-emerald-50/60 border border-emerald-300 text-center text-xl font-mono tracking-[0.4em] font-extrabold py-3 px-4 rounded-2xl text-emerald-950 outline-none focus:border-[#03B875] focus:bg-white transition-all shadow-2xs"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs font-extrabold pt-1 px-1">
                          <button
                            type="button"
                            disabled={otpCooldown > 0 || isOtpSending}
                            onClick={handleSendOtp}
                            className="text-[#03B875] hover:text-[#029a62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {isOtpSending ? ui('m91e16117d5') : otpCooldown > 0 ? ui('m37e0e83eb6', { v0: otpCooldown }) : ui('mee6c8c6d1b')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAuthOtpSent(false);
                              setAuthOtpCode("");
                              setAuthErrorMsg("");
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            {ui('m0c35026485')}</button>
                        </div>
                      </div>
                    )}

                    {/* Banner hiển thị lỗi đăng nhập / đăng ký nổi bật */}
                    {authErrorMsg && (
                      <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-bold leading-relaxed">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                        <span>{authErrorMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action buttons */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={authInProg || isOtpSending}
                      className="w-full h-13 bg-[#03B875] hover:bg-[#029a62] text-white text-base py-3.5 px-5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-lg shadow-[#03B875]/25 font-extrabold font-sans disabled:opacity-60"
                    >
                      {authInProg || isOtpSending ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white mr-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {isOtpSending ? ui('m51a4447e11') : ui('m55f54a19e0')}
                        </>
                      ) : activeAuthTab === "register" ? (
                        !authOtpSent ? (
                          ui('mc516bc669d')
                        ) : (
                          ui('m0f649def91')
                        )
                      ) : (
                        ui('mc792dcb2f8')
                      )}
                    </button>
                    <p className="text-xs text-slate-400 text-center font-medium leading-relaxed px-2">
                      {ui('m9717a78607')}</p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Custom Alert Dialog for Landing Page */}

        {/* Custom Forgot Password Modal (For Landing Page) */}

        {/* Modal nhập tên khách cho Chế độ 1 lần (Landing page) */}
        {/* Offline Guest Modal */}
        <OfflineModal
          isOpen={showOfflineModal}
          onClose={() => setShowOfflineModal(false)}
          guestName={offlineGuestName}
          setGuestName={setOfflineGuestName}
          onSubmit={confirmOfflineMode}
        />

        {/* Instruction View Popup (Giới thiệu Splitmate) */}
        {showOnboarding && (
          <InstructionView
            mode={tryOfflineMode ? 'one-time' : 'login'}
            onClose={() => {
              setShowOnboarding(false);
              if (user) {
                localStorage.setItem(`splitmate_onboarding_done_${user.uid}`, "true");
              }
            }}
          />
        )}
      </div>
    );
  }

  // 3. For logged in or offline preview users, let's keep the standard layout but tweak the top panels!
  const isGroupFundConfigured = !!(
    activeGroup?.fundQrImage || 
    activeGroup?.momoQrImage || 
    activeGroup?.bankQrImage ||
    (activeGroup?.bankAccount && activeGroup?.bankCode)
  );

  const isDuHi = activeGroup?.plan === "DU_HI_30";
  const hasFundDeposit = activeGroup?.expenses?.some((e) => e.description.includes("[Nộp Quỹ]")) || false;
  const hasStandardExpense = activeGroup?.expenses?.some((e) => !e.description.includes("[Nộp Quỹ]") && !e.description.includes("[Nhận Quỹ]")) || false;

  const currentStep = !isAdmin ? 0 : (
    members.length <= 1 ? 1 : (
      isDuHi ? (
        !isGroupFundConfigured ? 2 : (
          !hasFundDeposit ? 3 : (
            !hasStandardExpense ? 4 : 0
          )
        )
      ) : (
        (activeGroup?.expenses || []).length === 0 ? 2 : (
          isGroupFundConfigured ? 0 : 3
        )
      )
    )
  );

  return (
    <div className={`bg-slate-50 text-slate-800 ${
      (activeTab === "add" && addExpenseSubTab === "scan") || activeTab === "home"
        ? "h-[100dvh] w-full overflow-hidden md:min-h-screen md:h-auto md:overflow-visible md:pb-16 overscroll-none"
        : "min-h-[100dvh] pb-16 md:min-h-screen overscroll-none"
    } flex flex-col selection:bg-emerald-100 selection:text-emerald-800`}>
      {/* (NEW) Onboarding Tutorial Popup */}
      {/* Dynamic Success Toast */}

      {/* ----------------- DESKTOP-ONLY LAYOUT WRAPPER ----------------- */}
      <div className="hidden md:flex flex-col flex-1">
        {/* Top Notification Stripe */}
        <div className="bg-slate-900 text-slate-300 py-2 px-4 text-center text-xs border-b border-slate-800/80 font-medium font-sans mb-2.5">
        {ui('m85aef29ace')}</div>

      {/* Cloud & Member Sync Panel/Banner */}
      {user ? (
        /* Logged in as Google User (Leader/Owner/Thu quy) */
        <div className="bg-emerald-950 border-b border-emerald-800 text-white py-3.5 px-4 shadow-sm relative z-20 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-400 shrink-0 shadow-sm shadow-emerald-500/20">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-700 flex items-center justify-center font-bold text-xs uppercase">{user.email?.charAt(0)}</div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black flex items-center justify-center sm:justify-start gap-1 text-emerald-300 tracking-wider">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                  {ui('m57037d9f88')}</p>
                <p className="text-[10.5px] text-emerald-200 mt-0.5">
                  {ui('m85c449f033')}<strong className="text-emerald-100">{user.displayName || user.email}</strong> {ui('mfa4393cfd0')}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="bg-emerald-900/60 hover:bg-emerald-850/80 border border-emerald-800/80 hover:border-emerald-700/80 text-emerald-100 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                {ui('md4e1de2330')}</button>
              <button
                onClick={handleLogout}
                className="bg-emerald-800 hover:bg-emerald-705 border border-emerald-700 hover:border-emerald-600 text-emerald-50 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {ui('m97a1414953')}</button>
            </div>
          </div>
        </div>
      ) : memberAccessCodeUser ? (
        /* Logged in as Member User via access code */
        <div className="bg-gradient-to-r from-teal-950 to-slate-950 border-b border-teal-900 text-white py-3.5 px-4 shadow-md relative z-20 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black text-teal-300 tracking-wider uppercase flex items-center justify-center sm:justify-start gap-1">
                  <span>{ui('mdbaa3c8c0b')}{getMember(viewingMemberId || "")?.name || ui('mcd264c4a8f')}</span>
                  <span className="bg-teal-500/20 text-teal-300 text-[0.5625rem] font-bold py-0.5 px-1.5 border border-teal-500/30 rounded">{ui('mb425fc74ba')}{memberAccessCodeUser.code}</span>
                </p>
                <p className="text-[10.5px] text-slate-350 mt-0.5">
                  {ui('mddb7c4ed85')}<strong className="text-white">{activeGroup?.name || ui('m4cf91fea91')}</strong> {ui('m0e27a37901')}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-teal-900 hover:bg-teal-800 border border-teal-800 hover:border-teal-700 text-teal-100 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {ui('m2fe2f8213d')}</button>
          </div>
        </div>
      ) : (
        /* Cloud Sync Panel - Unauthenticated (Using offline mode now) */
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white py-3.5 px-4 shadow-md relative z-20 font-sans border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-amber-500 tracking-wider uppercase">{ui('mab8f8a6cd9')}</p>
                <p className="text-[10.5px] text-slate-355 mt-0.5">
                  {ui('me958a841d1')}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleSetTryOffline(false)}
              className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 hover:border-emerald-400 text-white py-1.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 uppercase"
            >
              {ui('m2d7f1d6dca')}</button>
          </div>
        </div>
      )}

      {/* Primary Header/Console */}
      <header className="bg-white border-b border-slate-100 shadow-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20 flex items-center justify-center text-white">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                SplitMate
              </h1>
              <p className="text-[0.6875rem] text-slate-400 mt-0.5 tracking-wide">
                {ui('m01a0d3975d')}</p>
            </div>
          </div>

          {/* Group and Action control panel */}
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            
            {groups.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                <span className="text-xs text-slate-500 font-bold px-1.5 hidden sm:inline">{ui('m0a7ebe7f71')}</span>
                <select
                  aria-label={ui('mbbcd987ff8')}
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-6 pl-1 cursor-pointer"
                >
                  {groups.map((g) => {
                    const isOwner = user && g.ownerId === user.uid;
                    const roleText = isOwner ? ui('m114e15a095') : ui('mcd264c4a8f');
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name} [{getPlanLabel(g.plan, tryOfflineMode)}]
                      </option>
                    );
                  })}
                </select>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-group-settings"));
                    }}
                    title={ui('mdf6812e65d')}
                    className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    disabled={!activeIsSettled}
                    onClick={() => {
                      handleDeleteGroup(selectedGroupId);
                    }}
                    title={activeIsSettled ? ui('mae22ff302b') : ui('ma82abb6976')}
                    className={`p-1 rounded-lg transition-colors ${
                      activeIsSettled 
                        ? "cursor-pointer hover:bg-rose-50 text-slate-400 hover:text-rose-500" 
                        : "text-slate-200 opacity-30 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* inline triggers to add quick groups or reset mockup data */}
            <div className="flex items-center gap-2 flex-wrap">
              {user && !tryOfflineMode && (
                <button
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{ui('m629e3e093d')}</span>
                </button>
              )}

              {user && !tryOfflineMode && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedGroupId) {
                      showAlert(ui('m5d6af377c2'), ui('m6ecd05f5d8'));
                      return;
                    }
                    setShowUpgradeModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-amber-200"
                >
                  <Crown className="h-3.5 w-3.5 fill-white" />
                  <span>{ui('m58081fcdb2')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFaqPage(true)}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200/50 text-amber-700 text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="h-3.5 h-3.5 shrink-0" />
                <span>{ui('mbd36ef7eda')}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Create Group Inline Form Drawer */}
      </header>

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 mt-6 sm:mt-8 flex-1 w-full space-y-6 animate-fade-in">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="p-6 bg-emerald-50 rounded-[40px] border-4 border-emerald-100/50 shadow-inner">
              <Sparkles className="w-16 h-16 text-emerald-600 animate-pulse" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{ui('m0b1c654e65')}</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {ui('m9f32f5f2c7')}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                console.log("Create group button clicked on empty state");
                handleRequestCreateGroup();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>{ui('m861658c3b6')}</span>
            </button>
          </div>
        ) : (
          /* Normal Group Content */
          <>
            {/* Dynamic Mode Switcher Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 pt-0 pb-0 px-[10px] sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs relative overflow-hidden">
          {/* Subtle decoration background color based on role state */}
          <div className={`absolute top-0 bottom-0 left-0 w-2.5 ${isAdmin ? "bg-emerald-600" : "bg-teal-550"}`} />
          
          <div className="flex items-center gap-3.5 pl-2 text-left py-4 sm:py-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs ${
              isAdmin ? "bg-emerald-50 text-emerald-700" : "bg-teal-50 text-teal-700"
            }`}>
              {isAdmin ? <FolderLock className="w-5.5 h-5.5" /> : <UserCheck className="w-5.5 h-5.5" />}
            </div>
            <div>
              <p className="text-[0.625rem] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{ui('m7a021db493')}</p>
              <h2 className="font-extrabold text-[0.9375rem] sm:text-sm text-slate-800 mt-1.5 leading-none flex items-center gap-1.5 flex-wrap">
                {isAdmin ? (
                  <>
                    <span className="text-emerald-600">{ui('ma2b4195817')}</span>
                    <span className="text-[0.5625rem] bg-emerald-55 border border-emerald-150 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold uppercase">{ui('m050caa745b')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-teal-600 font-bold">{ui('m739b06e939')}</span>
                    <span className="text-[0.5625rem] bg-teal-100/50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-md font-extrabold uppercase">{ui('m60a298da74')}</span>
                  </>
                )}
              </h2>
              <p className="text-[0.8125rem] sm:text-[0.6875rem] text-slate-500 mt-1.5 md:mt-1.5 leading-normal font-medium px-[10px] sm:px-0">
                {isAdmin 
                  ? ui('m344bf21e5e')
                  : ui('m6d29bf6f10')}
              </p>
              {isAdmin && activeGroup && (
                <div id="member-permission-container" className="mt-2.5 flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer select-none py-1.5 px-2 -ml-2 rounded-xl active:bg-slate-50/80 transition-all w-full sm:w-auto">
                    <input
                      id="allow-member-add-expense-toggle"
                      type="checkbox"
                      checked={activeGroup.allowMemberAddExpense !== false}
                      onChange={async (e) => {
                        const updatedGroup = {
                          ...activeGroup,
                          allowMemberAddExpense: e.target.checked
                        };
                        await updateGroupOnDbAndState(updatedGroup);
                      }}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shrink-0"></div>
                    <span className="ms-3 text-[0.6875rem] font-black text-slate-650 uppercase tracking-wider select-none">
                      {ui('mad431b2912')}</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pl-2 md:pl-0">
            {groups.length > 0 && !isAdmin && viewingMemberId && (
              <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 py-2.5 px-4 rounded-xl mb-5 text-xs font-extrabold text-teal-800">
                <span className="uppercase tracking-wider">{ui('m6df5c75083')}</span>
                <span className="text-xs font-black text-teal-950 pl-0.5">
                  {members.find(m => m.id === viewingMemberId)?.name || ui('mcd264c4a8f')}
                </span>
              </div>
            )}

            {isAdmin ? (
              <div className="flex items-center gap-2.5 flex-wrap mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdmin(false);
                    if (members.length > 0) {
                      setViewingMemberId(members[0].id);
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{ui('m276c74a405')}</span>
                </button>

                {user?.email === "splitmate.admin@gmail.com" && (
                  <button
                    type="button"
                    onClick={handleLoadVungTauTestData}
                    className="bg-amber-500 hover:bg-amber-600 border border-amber-600/10 text-white text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{ui('m60ea8b8da6')}</span>
                  </button>
                )}

                {user?.email === "splitmate.admin@gmail.com" && activeGroup && (activeGroup.expenses || []).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearActiveGroupData}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{ui('m5c4dc7fe4f')}</span>
                  </button>
                )}
              </div>
            ) : (!memberAccessCodeUser && user?.uid === activeGroup?.ownerId) ? (
              <button
                type="button"
                onClick={() => {
                  setMemberAccessCodeUser(null);
                  localStorage.removeItem("splitmate_memberAccessCodeUser");
                  setViewingMemberId(undefined);
                  setIsAdmin(true);
                  if (!user) {
                    showAlert(ui('m93f5f406b8'), ui('md960fde80f'));
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-emerald-600/10 cursor-pointer flex items-center gap-1.5 mb-5"
              >
                <FolderLock className="w-4 h-4" />
                <span>{user ? ui('m47c710ea93') : ui('m139baa548d')}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Bento Grid Header / Top row */}
        <div className="grid grid-cols-12 gap-5">
          
          {/* Main Balance Box Bento Tile (8/12 col) */}
          <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[28px] p-6 flex flex-col justify-between shadow-[0_12px_30px_rgba(0,178,118,0.15)] text-white relative overflow-hidden group">
            <div className="flex justify-between items-start gap-3 relative z-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  {ui('md228d4735f')}{activeGroup?.name || ui('m2bff612520')})
                </span>
                <p className="text-xs text-emerald-200/80 mt-0.5">{ui('mbd84db8770')}{activeGroup?.createdAt ? formatDisplayDateTime(activeGroup.createdAt) : "..."}</p>
              </div>
              <span className={`px-2.5 py-1 ${expenses.length > 0 ? "bg-white/20 text-white border border-white/20" : "bg-white/10 text-emerald-100"} rounded-full text-[0.625rem] font-bold uppercase shrink-0`}>
                {expenses.length > 0 ? ui('mbcf74dfd25', { v0: expenses.length }) : ui('m964b4be42a')}
              </span>
            </div>

            <div className="my-5 flex items-baseline gap-2 relative z-10">
              <span className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tight">
                {new Intl.NumberFormat(getLocale()).format(Math.round(totals))}
              </span>
              <span className="text-lg font-extrabold text-emerald-200">VND</span>
            </div>

            {/* Inner Bento Stats cards */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 transition-all hover:bg-white/15">
                <p className="text-[0.875rem] text-emerald-100 mb-1 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{ui('m448ae61e1f')}</p>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <p className="text-lg font-black text-white leading-none">{members.length} {ui('m0021a30f3e')}</p>
                  <div className="flex -space-x-1.5 md:-space-x-2 overflow-hidden">
                    {members.slice(0, 3).map((m) => (
                      <span key={m.id} title={m.name} className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-white/20 text-[0.625rem] md:text-sm flex items-center justify-center border border-white/20 shadow-xs overflow-hidden shrink-0">
                        <img src={getMemberAvatar(m)} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </span>
                    ))}
                    {members.length > 3 && (
                      <span className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-white/10 text-[0.5rem] md:text-xs font-bold text-white flex items-center justify-center border border-white/20">
                        +{members.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 transition-all hover:bg-white/15">
                <p className="text-[0.875rem] text-emerald-100 mb-1 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{ui('md4ced838e6')}</p>
                <p className="text-lg font-black text-white">
                  {expenses.length} {ui('m139ebca73d')}</p>
              </div>
            </div>
          </div>

          {/* Quick Interactive Group Selection Bento Tile (4/12 col) */}
          <div className="col-span-12 lg:col-span-4 bg-emerald-950 rounded-3xl p-6 text-white flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-200">{ui('m82b31c9a40')}</h3>
                <span className="text-[0.625rem] bg-white/15 px-2 py-0.5 rounded-full font-semibold">{ui('m9c71f9e815')}</span>
              </div>
              
              <div className="space-y-1.5 max-h-[10rem] overflow-y-auto pr-1">
                {groups.map((g) => {
                  if (!g) return null;
                  const isActive = g.id === selectedGroupId;
                  const groupMembers = g.members || [];
                  const groupExpenses = g.expenses || [];
                  const groupTotal = groupExpenses.reduce((sum, e) => (e.isFundDeposit || e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? sum : sum + e.amount, 0);
                  const txs = simplifyDebts(groupMembers, groupExpenses);
                  const isSettled = txs.length === 0;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border transition-all relative group/item ${
                        isActive
                          ? "bg-white/15 border-white/20 shadow-md scale-[1.01]"
                          : "bg-emerald-900/30 border-white/5 hover:bg-emerald-900/65"
                      }`}
                    >
                      {g.imageUrl ? (
                        <img src={g.imageUrl} alt={g.name} className="w-8 h-8 rounded-xl object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-orange-400 flex items-center justify-center text-sm font-bold shadow-xs select-none shrink-0">
                          {g.name.includes("🌲") || g.name.toLowerCase().includes("lạt") ? "🌲" : g.name.includes("🍲") || g.name.toLowerCase().includes("ăn") ? "🍲" : "☕"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-[0.75rem] text-white truncate max-w-[50%]">
                            {g.name}
                          </span>
                          {user && (
                            <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold shrink-0">
                              {g.ownerId === user.uid ? ui('m114e15a095') : ui('mcd264c4a8f')}
                            </span>
                          )}
                          {tryOfflineMode && (g.id === "g1" || g.id === "g2") && (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[0.5rem] font-black bg-amber-500 text-amber-950 border border-amber-500/30 uppercase tracking-widest leading-none">
                              {ui('mb8099c9559')}</span>
                          )}
                        </div>
                        <p className="text-[0.625rem] text-emerald-200 flex justify-between items-center mt-0.5">
                          <span>{groupMembers.length} {ui('m1c9742eddd')}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[0.5rem] font-bold tracking-wide ${
                            isSettled ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/20" : "bg-slate-500/25 text-slate-350 border border-white/5"
                          }`}>
                            {isSettled ? ui('m9b39c1b164') : ui('mfe468c65f9')}
                          </span>
                        </p>
                      </div>

                      {(user ? g.ownerId === user.uid : isAdmin) && (
                        <button
                          type="button"
                          disabled={!isSettled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(g.id);
                          }}
                          className={`px-2.5 py-1.5 text-white text-[0.625rem] font-black rounded-lg transition-all shrink-0 flex items-center gap-1 shadow-md border ${
                            isSettled 
                              ? "bg-rose-600 hover:bg-rose-700 shadow-rose-950/40 border-rose-500/35 cursor-pointer hover:scale-[1.03] active:scale-95" 
                              : "bg-slate-800/50 grayscale-[50%] border-white/5 opacity-80 cursor-not-allowed"
                          }`}
                          title={isSettled ? ui('mae22ff302b') : ui('m5c00995361')}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{ui('ma4564eb2e2')}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {!activeIsSettled && activeGroup && isAdmin && (
                <div className="mt-3 bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-start gap-2 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <p className="text-[0.5625rem] text-emerald-200 font-medium leading-relaxed italic">
                    {ui('mb242a71510')}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-3">
              {tryOfflineMode && activeGroup?.members.length === 1 && (
                <div className="bg-emerald-900/60 border border-emerald-500/30 p-3 rounded-xl text-emerald-100 text-[0.625rem] leading-relaxed relative overflow-hidden">
                  <div className="absolute inset-0 bg-linear-to-r from-amber-500/10 to-transparent"></div>
                  <strong className="text-white relative z-10 flex items-center gap-1.5 mb-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> {ui('m9cfc80c742')}</strong>
                  <div className="relative z-10 space-y-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("participation")}
                      className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-all text-emerald-100 flex items-start gap-1.5 border border-transparent hover:border-white/10 cursor-pointer text-[0.625rem]"
                    >
                      <span className="font-extrabold text-amber-400 shrink-0">1.</span>
                      <span>{ui('m15195523f7')}<b className="text-white underline decoration-amber-400 decoration-2 underline-offset-2">{ui('m320c0d21d7')}</b> {ui('mc9d0c6363e')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("bills")}
                      className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-all text-emerald-100 flex items-start gap-1.5 border border-transparent hover:border-white/10 cursor-pointer text-[0.625rem]"
                    >
                      <span className="font-extrabold text-amber-400 shrink-0">2.</span>
                      <span>{ui('m15195523f7')}<b className="text-white underline decoration-amber-400 decoration-2 underline-offset-2">{ui('m60c96376c1')}</b> {ui('me56ec7e136')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("settle")}
                      className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-all text-emerald-100 flex items-start gap-1.5 border border-transparent hover:border-white/10 cursor-pointer text-[0.625rem]"
                    >
                      <span className="font-extrabold text-amber-400 shrink-0">3.</span>
                      <span>{ui('m15195523f7')}<b className="text-white underline decoration-amber-400 decoration-2 underline-offset-2">{ui('maa2564fd2b')}</b> {ui('mc1093d22a9')}</span>
                    </button>
                  </div>
                </div>
              )}
              {!tryOfflineMode && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      console.log("Create group button clicked");
                      setIsCreatingGroup(!isCreatingGroup);
                    }}
                    className="text-xs bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{ui('m81c37bb782')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab switchers rendered as an elegant Bento accessory */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-left py-1 px-2 shrink-0">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
              <span>{ui('mbf4b17c2ea')}</span>
              {isEditingGroupName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveGroupName();
                  }}
                  className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap"
                >
                  <input
                    type="text"
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    className="bg-slate-50 border border-emerald-500 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:max-w-[12.5rem]"
                    placeholder={ui('med612ae6a3')}
                  />
                  <input
                    type="file"
                    id="group-image-upload"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleGroupImageSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="group-image-upload" className="cursor-pointer bg-slate-50 border border-emerald-500 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-slate-100 whitespace-nowrap">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>{ui('m524d805417')}</span>
                  </label>
                  {tempGroupImage && (
                    <img src={tempGroupImage} alt="Preview" className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <button
                    type="submit"
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    title={ui('ma306970e8b')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGroupName(false)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title={ui('m34ca764caf')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-black italic">{activeGroup?.name}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempGroupName(activeGroup?.name || "");
                        setTempGroupImage(activeGroup?.imageUrl || "");
                        setIsEditingGroupName(true);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                      title={ui('m857b6a151f')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              )}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap sm:justify-end w-full">
            <div className="bg-slate-100 p-1.5 rounded-full grid grid-cols-3 gap-1 w-full sm:flex sm:flex-row sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`font-extrabold rounded-full transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer flex-1 sm:flex-initial py-2 px-1 sm:py-2.5 sm:px-4 ${
                  activeTab === "bills"
                    ? "bg-white text-emerald-600 shadow-md border border-emerald-100/20 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }`}
              >
                <Activity className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'bills' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap text-xs hidden sm:inline">{ui('meef766f84b')}</span>
                <span className="whitespace-nowrap text-[0.625rem] sm:hidden truncate px-1">{ui('m60c96376c1')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settle")}
                className={`font-extrabold rounded-full transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer flex-1 sm:flex-initial py-2 px-1 sm:py-2.5 sm:px-4 ${
                  activeTab === "settle"
                    ? "bg-white text-emerald-600 shadow-md border border-emerald-100/20 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }`}
              >
                <ArrowLeftRight className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'settle' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap text-xs hidden sm:inline">{ui('mff5345d174')}</span>
                <span className="whitespace-nowrap text-[0.625rem] sm:hidden truncate px-1">{ui('maa2564fd2b')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("participation")}
                className={`font-extrabold rounded-full transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer flex-1 sm:flex-initial py-2 px-1 sm:py-2.5 sm:px-4 ${
                  activeTab === "participation"
                    ? "bg-white text-emerald-600 shadow-md border border-emerald-100/20 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                }`}
              >
                <FolderLock className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'participation' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap text-xs hidden sm:inline">{ui('m4348d30932')}</span>
                <span className="whitespace-nowrap text-[0.625rem] sm:hidden truncate px-1">{ui('m8cd7101975')}</span>
              </button>
            </div>

            {expenses.length > 0 && (
              <div className="flex items-center gap-2 justify-center sm:justify-start w-full sm:w-auto mt-1 sm:mt-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareReport}
                  title={ui('ma0a64ae243')}
                  className="p-2.5 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 min-w-[4.375rem] sm:flex-none"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span className="text-[0.625rem] sm:text-xs font-bold whitespace-nowrap">{ui('m1cb9508032')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  title={ui('mad88ac010d')}
                  className="p-2.5 border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 min-w-[4.375rem] sm:flex-none"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="text-[0.625rem] sm:text-xs font-bold whitespace-nowrap">{ui('mafd8cd46a2')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Workspace tabs with smooth layout animation */}
        <div>
          {activeTab === "bills" ? (
            /* TAB 1: Core recording & Expense entries list */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Left Column: Expense creation form (or Lock state) */}
              <div className="col-span-12 lg:col-span-5 space-y-5">
                {(isAdmin || (activeGroup?.allowMemberAddExpense !== false)) ? (
                  <ExpenseForm
                    members={members}
                    onAddExpense={(exp) => {
                      handleAddExpense(exp);
                      setActiveQrData(null);
                    }}
                    editingExpense={editingExpense}
                    onCancelEdit={() => {
                      setEditingExpense(null);
                      setActiveQrData(null);
                    }}
                    onUpdateExpense={(exp) => {
                      handleUpdateExpense(exp);
                      setActiveQrData(null);
                    }}
                    currentMemberId={viewingMemberId || members[0]?.id}
                    initialPendingScanFile={pendingScanFile}
                    onScanComplete={() => setPendingScanFile(null)}
                    groupId={activeGroup?.id}
                    qrAutofill={activeQrData}
                    onClearQr={() => setActiveQrData(null)}
                    tryOfflineMode={tryOfflineMode}
                    groupPlan={activeGroup?.plan || 'FREE'}
                    ocrUsage={activeGroup?.ocrUsage || 0}
                    onUpdateOcrUsage={handleUpdateOcrUsage}
                    expenses={activeGroup?.expenses || []}
                    
                  />
                ) : (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center py-8 text-center space-y-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <FolderLock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{ui('mf2ab20ef97')}</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-normal">
                        {(!isAdmin && activeGroup?.allowMemberAddExpense === false) 
                          ? ui('m130e8544b6')
                          : ui('m4e2c078be3')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Expense entries list (Full width of the remaining grid space) */}
              <div className="col-span-12 lg:col-span-7">
                {activeGroup?.plan === "DU_HI_30" && (
                  <DuHiOnboarding
                    members={members}
                    expenses={expenses}
                    isGroupFundConfigured={isGroupFundConfigured}
                    isAdmin={isAdmin}
                    onBatchAddExpenses={handleBatchAddExpenses}
                    onNavigateToAdd={() => {
                      setEditingExpense(null);
                      window.scrollTo({ top: 380, behavior: "smooth" });
                    }}
                    showToast={(title, desc, type) => {
                      setToastMsg({ title, desc, type });
                    }}
                  />
                )}
                <ExpenseList
                  expenses={expenses}
                  members={members}
                  onDeleteExpense={(expenseId) => {
                    askConfirm(
                      ui('m386f8ff3a8'),
                      ui('m63e9db9057'),
                      () => handleDeleteExpense(expenseId)
                    );
                  }}
                  onEditExpense={(exp) => {
                    setEditingExpense(exp);
                    window.scrollTo({ top: 380, behavior: "smooth" });
                  }}
                  isAdmin={isAdmin}
                  allowMemberAddExpense={activeGroup?.allowMemberAddExpense !== false}
                  groups={groups}
                  activeGroup={activeGroup}
                  onSelectGroup={setSelectedGroupId}
                  viewingMemberId={viewingMemberId}
                />
              </div>

            </div>
          ) : activeTab === "settle" ? (
            /* TAB 2: Settlement recommendation, balances and visual analyzer charts */
            <div className="hidden lg:grid grid-cols-12 gap-5 items-start">
              
              {/* Settle Up recommendations mapping */}
              <div className="col-span-12 lg:col-span-7 space-y-5">
                <SettleUpSection
                  activeGroup={activeGroup}
                  onUpdateGroupConfig={handleUpdateGroupConfig}
                  onUpdateGroup={updateGroupOnDbAndState}
                  onExportPDF={handleExportPDF}
                  onShowUpgradeModal={() => setShowUpgradeModal(true)}
                  members={members}
                  expenses={allExpenses}
                  onAddExpense={handleAddExpense}
                  onBatchSettleAndReceipt={handleBatchSettleAndReceipt}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  tryOfflineMode={tryOfflineMode}
                  
                  onUpdatePendingReceipts={async (receipts) => {
                    const updatedGroup = {
                      ...activeGroup,
                      pendingReceipts: receipts
                    };
                    if (isAdmin) {
                      await updateGroupOnDbAndState(updatedGroup);
                    } else {
                      const newReceipt = receipts.find(
                        r => !activeGroup.pendingReceipts?.some(p => p.id === r.id)
                      );
                      if (newReceipt) {
                        try {
                          const res = await fetch("/api/member/upload-receipt", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              groupId: selectedGroupId,
                              memberId: viewingMemberId,
                              accessCode: memberAccessCodeUser?.code,
                              pendingReceipt: newReceipt
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setGroups([data.group]);
                            showAlert(ui('m18cf9cb114'), ui('mf9744a8db2'));
                          } else {
                            showAlert(ui('m4ce781318e'), localizeError(data.error, ui('m7ef6a3151f')));
                          }
                        } catch (err) {
                          console.error(err);
                          showAlert(ui('mb3af2fa4d2'), ui('m73e0ba0fc4'));
                        }
                      } else {
                        setGroups((prev) =>
                          prev.map((g) => (g.id === selectedGroupId ? updatedGroup : g))
                        );
                      }
                    }
                  }}
                />
                {!tryOfflineMode && (
                  <FundHistoryList
                    expenses={expenses}
                    members={members}
                    onDeleteExpense={handleDeleteExpense}
                  />
                )}
              </div>

              {/* Statistics distribution summary & charts */}
              {!tryOfflineMode && (
                <div className="col-span-12 lg:col-span-5">
                  <StatsSection
                    members={members}
                    expenses={expenses}
                    debtOffsets={activeGroup?.debtOffsets}
                  />
                </div>
              )}

            </div>
          ) : (
            /* TAB 3: Participation Management Panel & Member section */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-300">
              
              {/* Column 1: Thêm thành viên mới, Thành viên nhóm, Điểm danh & Tự động chia (5/12) */}
              <div className="col-span-12 lg:col-span-5 space-y-5">
                <MemberSection
                  members={members}
                  expenses={expenses}
                  debtOffsets={activeGroup?.debtOffsets}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  onEditMember={handleEditMember}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  editingId={editingMemberId}
                  onSetEditingId={setEditingMemberId}
                  tryOfflineMode={tryOfflineMode}
                  askConfirm={askConfirm}
                  groupId={activeGroup?.id}
                  user={user}
                  memberAccessCodeUser={memberAccessCodeUser}
                />
                
                <ParticipationSection
                  members={activeGroup?.members || []}
                  expenses={expenses}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  activeGroup={activeGroup}
                  onSetEditingMemberId={setEditingMemberId}
                  onEditMember={handleEditMember}
                  showPart="left"
                  selectedMemberId={selectedParticipationMemberId}
                  onSelectedMemberIdChange={setSelectedParticipationMemberId}
                  tryOfflineMode={tryOfflineMode}
                  user={user}
                  memberAccessCodeUser={memberAccessCodeUser}
                />
              </div>

              {/* Column 2: Danh sách tham gia & Tự động chia (7/12) */}
              <div className="col-span-12 lg:col-span-7">
                <ParticipationSection
                  members={activeGroup?.members || []}
                  expenses={expenses}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  activeGroup={activeGroup}
                  onSetEditingMemberId={setEditingMemberId}
                  onEditMember={handleEditMember}
                  showPart="right"
                  selectedMemberId={selectedParticipationMemberId}
                  onSelectedMemberIdChange={setSelectedParticipationMemberId}
                  tryOfflineMode={tryOfflineMode}
                  user={user}
                  memberAccessCodeUser={memberAccessCodeUser}
                />
              </div>

            </div>
          )}
        </div>
      </>
    )}
      </main>
    </div>

    {/* ----------------- MOBILE-ONLY LAYOUT WRAPPER ----------------- */}
    <div className="flex md:hidden flex-col flex-1 min-h-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">

      {activeTab === "home" && (() => {
        // Find my representative member in group g
        const findMyMemberInGroup = (g: Group) => {
          if (!g || !g.members || g.members.length === 0) return null;
          if (user) {
            const found = g.members.find((m) => 
              (m.email && m.email === user.email) || 
              (m.userId && m.userId === user.uid)
            );
            if (found) return found;

            const nameFound = g.members.find((m) => m.name === user.displayName);
            if (nameFound) return nameFound;
          }
          if (g.id === selectedGroupId && viewingMemberId) {
            const found = g.members.find((m) => m.id === viewingMemberId);
            if (found) return found;
          }
          return g.members[0] || null;
        };

        // Calculate global balances across all groups
        let totalOwedToMe = 0;
        let totalIOwe = 0;
        let totalInvolvedExpenses = 0;
        const groupBalances: Record<string, number> = {};

        groups.forEach((g) => {
          if (!g || !g.members) return;
          const myMember = findMyMemberInGroup(g);
          if (!myMember) {
            groupBalances[g.id] = 0;
            return;
          }

          const balances = calculateBalances(g.members, g.expenses || [], g.debtOffsets || []);
          const myBal = balances.find((b) => b.memberId === myMember.id);
          const netVal = myBal ? myBal.netBalance : 0;
          
          groupBalances[g.id] = netVal;

          if (netVal > 0.1) {
            totalOwedToMe += netVal;
          } else if (netVal < -0.1) {
            totalIOwe += Math.abs(netVal);
          }

          // Calculate total involved expenses for the current user
          const groupExpenses = g.expenses || [];
          groupExpenses.forEach((e) => {
            const participantIds = e.participantIds || [];
            if (e.payerId === myMember.id || participantIds.includes(myMember.id)) {
              totalInvolvedExpenses++;
            }
          });
        });

        const netBalance = totalOwedToMe - totalIOwe;

        const getGroupCategory = (groupName: string) => {
          const name = groupName.toLowerCase();
          const travelKeywords = ["du lịch", "trip", "chuyến đi", "vũng tàu", "đà lạt", "chơi", "hè", "biển", "phượt", "camping", "xe", "hotel", "hội an", "phú quốc", "nha trang", "sapa"];
          if (travelKeywords.some(kw => name.includes(kw))) {
            return "travel";
          }
          return "general";
        };

        const getGroupIcon = (groupName: string) => {
          const name = groupName.toLowerCase();
          if (name.includes("lẩu") || name.includes("ăn") || name.includes("nhậu") || name.includes("uống") || name.includes("party") || name.includes("buffet")) return "🍲";
          if (name.includes("đá banh") || name.includes("bóng") || name.includes("cup") || name.includes("sport") || name.includes("thể thao")) return "⚽";
          if (name.includes("du lịch") || name.includes("trip") || name.includes("vũng tàu") || name.includes("biển") || name.includes("hè") || name.includes("hội an") || name.includes("phú quốc")) return "🌴";
          if (name.includes("đà lạt") || name.includes("camping") || name.includes("núi") || name.includes("phượt") || name.includes("sapa")) return "🌲";
          if (name.includes("nhà") || name.includes("chung") || name.includes("phòng") || name.includes("trọ")) return "🏠";
          if (name.includes("cà phê") || name.includes("cafe") || name.includes("coffee") || name.includes("trà")) return "☕";
          return "💸";
        };

        return (
          /* TAB 1: HOME - GLOBAL DEBT DASHBOARD with scroll padding */
          <div className="flex-1 flex flex-col h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] overflow-y-auto pb-40 select-none space-y-6">
            
            {/* Hero Card: Global Balance (with shrink-0 to prevent layout collapse) */}
            <div className="mx-4 mt-4 bg-gradient-to-br from-[#00B276] to-[#008F55] rounded-3xl p-6 text-white shadow-[0_15px_30px_rgba(0,178,118,0.2)] relative overflow-hidden space-y-5 shrink-0">
              {/* Decorative Background Elements */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
              <div className="absolute left-1/4 bottom-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mb-20" />
              
              <div className="relative z-10 space-y-1">
                <p className="text-[10px] font-black tracking-widest text-emerald-100/85 uppercase">
                  {ui('mfae1bf601f')}</p>
                <h2 className="text-3xl font-black tracking-tight font-sans">
                  {netBalance >= 0 ? "+" : "-"} {new Intl.NumberFormat(getLocale()).format(Math.round(Math.abs(netBalance)))} <span className="text-sm font-bold">{ui('mc5f95801df')}</span>
                </h2>
                
                {/* Dynamic Badge */}
                <div className="pt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white shadow-3xs">
                    {netBalance > 1000 ? ui('mdb428f6e62') : netBalance < -1000 ? ui('m465aeeba7a') : ui('m5ef9edcb19')}
                  </span>
                </div>
              </div>

              {/* Dual Mini Cards */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 relative z-10">
                <div className="bg-white/15 backdrop-blur-md border border-white/25 p-3.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/20 shadow-sm shadow-black/5">
                  <p className="text-[9px] font-black text-emerald-100 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse inline-block" /> {ui('m31c971e3f8')}</p>
                  <p className="text-base font-black mt-1 text-white tracking-tight">
                    {new Intl.NumberFormat(getLocale()).format(Math.round(totalOwedToMe))}{ui('mc5f95801df')}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-md border border-white/25 p-3.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/20 shadow-sm shadow-black/5">
                  <p className="text-[9px] font-black text-emerald-100 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#38BDF8] rounded-full animate-pulse inline-block" /> {ui('mff26ad5ec4')}</p>
                  <p className="text-base font-black mt-1 text-white tracking-tight">
                    {totalInvolvedExpenses} <span className="text-xs font-bold text-emerald-100/95">{ui('mc692d6a105')}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-4 space-y-3 shrink-0">
              {/* Search Field */}
              <div className="relative flex items-center bg-slate-100 rounded-2xl border border-slate-200/40 px-3.5 py-2.5 shadow-3xs">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder={ui('mbbfda535ae')}
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none border-none p-0 focus:ring-0"
                />
                {groupSearchQuery && (
                  <button 
                    onClick={() => setGroupSearchQuery("")}
                    className="p-0.5 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-full shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Pill Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { key: "all", get label() { return ui('mf7a578dcbd'); } },
                  { key: "general", get label() { return ui('m2a3b749188'); } },
                  { key: "travel", get label() { return ui('m2a3d7fdd7e'); } }
                ].map((filter) => {
                  const isSelected = groupFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setGroupFilter(filter.key as any)}
                      className={`px-4 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? "bg-[#00B276] text-white shadow-sm shadow-[#00B276]/10"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BƯỚC 1: TẠO NHÓM CỦA BẠN (Hiển thị nổi bật ở trang Tổng quan cho người dùng lần đầu khi chưa có nhóm nào) */}
            {groups.length === 0 && (
              <div className="mx-4 p-5 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/50 border-2 border-[#03B875]/60 rounded-[24px] space-y-3 shadow-xs relative overflow-hidden ring-2 ring-[#03B875]/20 animate-in fade-in duration-300 text-center shrink-0">
                <div className="mx-auto w-11 h-11 rounded-full bg-[#03B875] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#03B875]/20 animate-bounce">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black bg-[#03B875] text-white uppercase tracking-wider mb-1 shadow-2xs">
                    {ui('m6843c3c915')}</span>
                  <h4 className="font-extrabold text-[#0F172A] text-xs sm:text-sm">{ui('m148bea7cc3')}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {ui('mf18a2baf66')}</p>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingGroup(true)}
                    className="inline-flex items-center gap-1.5 bg-[#03B875] hover:bg-[#02935d] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#03B875]/25 active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4 text-white shrink-0" />
                    <span>{ui('ma4fdbfe38c')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Groups List */}
            <div className="px-4 text-left flex-1 space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#00B276]" />
                  {ui('m73875c30a5')}{groups.length})
                </span>
              </div>

              <div className="space-y-3">
                {groups.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl text-slate-400 text-xs shadow-xs border border-slate-100">
                    {ui('m698dad3919')}</div>
                ) : (() => {
                  // Filter groups
                  const filteredGroups = groups.filter((g) => {
                    if (!g) return false;
                    
                    // Search by name
                    const matchesSearch = g.name.toLowerCase().includes(groupSearchQuery.toLowerCase());
                    
                    // Filter by quick pill
                    if (groupFilter === "all") return matchesSearch;
                    return matchesSearch && getGroupCategory(g.name) === groupFilter;
                  });

                  if (filteredGroups.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white rounded-2xl text-slate-400 text-xs shadow-xs border border-slate-100">
                        {ui('m92b7ef34e6')}</div>
                    );
                  }

                  // Sắp xếp nhóm đang được chọn (selectedGroupId) lên vị trí đầu tiên
                  const sortedGroups = [...filteredGroups].sort((a, b) => {
                    if (a.id === selectedGroupId) return -1;
                    if (b.id === selectedGroupId) return 1;
                    return 0;
                  });

                  return sortedGroups.map((g) => {
                    const netVal = groupBalances[g.id] || 0;
                    const planLabel = getPlanLabel(g.plan);
                    const isActive = g.id === selectedGroupId;
                    
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          // Auto switch to detailed bills tab (Tab 2)
                          setActiveTab("bills");
                        }}
                        className={`relative flex flex-col justify-between p-5 rounded-[24px] transition-all cursor-pointer select-none active:scale-[0.98] group/card duration-300 border ${
                          isActive 
                            ? "bg-white border-[#03B875] shadow-[0_12px_35px_rgba(3,184,117,0.18)] text-slate-800 ring-2 ring-[#03B875]/30" 
                            : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-[0_8px_25px_rgba(15,23,42,0.04)] text-slate-600"
                        }`}
                      >
                        {/* 1. TOP ROW: Net Balance (Left) & Avatars Pile (Right) */}
                        <div className="flex items-start justify-between gap-4">
                          
                          {/* Left: Net balance value & status */}
                          <div className="text-left">
                            {netVal > 0.1 ? (
                              <div>
                                <p className="text-lg font-black text-[#03B875] tracking-tight">
                                  +{new Intl.NumberFormat(getLocale()).format(Math.round(netVal))} <span className="text-xs font-bold">{ui('mc5f95801df')}</span>
                                </p>
                                <p className="text-[10px] text-[#03B875] font-extrabold tracking-wide uppercase mt-0.5">{ui('m3cae78dc04')}</p>
                              </div>
                            ) : netVal < -0.1 ? (
                              <div>
                                <p className="text-lg font-black text-rose-500 tracking-tight">
                                  -{new Intl.NumberFormat(getLocale()).format(Math.round(Math.abs(netVal)))} <span className="text-xs font-bold">{ui('mc5f95801df')}</span>
                                </p>
                                <p className="text-[10px] text-rose-400 font-extrabold tracking-wide uppercase mt-0.5">{ui('mf9b4b13fb2')}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-black text-slate-400 tracking-tight">
                                  0 <span className="text-xs font-bold">{ui('mc5f95801df')}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase mt-0.5">{ui('m6df583b4a8')}</p>
                              </div>
                            )}
                          </div>

                          {/* Right: Premium Bubble Avatar pile with overlapping style */}
                          <div className="flex items-center -space-x-2 shrink-0">
                            {(g.members || []).slice(0, 4).map((m: any, idx: number) => (
                              <div
                                key={m.id}
                                className="w-7.5 h-7.5 rounded-full border-2 bg-white shadow-3xs overflow-hidden shrink-0 transition-transform hover:scale-110 hover:z-20 relative"
                                style={{ 
                                  zIndex: 10 - idx,
                                  borderColor: isActive ? "#E6F7F0" : "#F1F5F9"
                                }}
                              >
                                <img 
                                  src={getMemberAvatar(m)} 
                                  alt={m.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            ))}
                            {(g.members || []).length > 4 && (
                              <div
                                className={`w-7.5 h-7.5 rounded-full text-[9px] font-black flex items-center justify-center border-2 shadow-3xs shrink-0 z-0 ${
                                  isActive 
                                    ? "bg-[#E6F7F0] text-[#03B875] border-[#E6F7F0]" 
                                    : "bg-slate-50 text-slate-500 border-slate-100"
                                }`}
                              >
                                +{(g.members || []).length - 4}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Divider space */}
                        <div className="h-4" />

                        {/* 2. BOTTOM ROW: Group Name & Metadata Pills */}
                        <div className="space-y-2">
                          
                          {/* Group Name with active status blink dot */}
                          <div className="flex items-center gap-1.5 text-left">
                            {g.imageUrl ? (
                              <img 
                                src={g.imageUrl} 
                                alt={g.name} 
                                className="w-5 h-5 rounded-md object-cover shrink-0 border border-slate-200/60 shadow-3xs" 
                              />
                            ) : (
                              <span className="text-base shrink-0 select-none">
                                {getGroupIcon(g.name)}
                              </span>
                            )}
                            <h4 className={`font-black text-[15px] truncate transition-colors ${
                              isActive ? "text-slate-900" : "text-slate-700 group-hover/card:text-[#03B875]"
                            }`}>
                              {g.name}
                            </h4>
                            
                            {/* Animated connection status dot */}
                            {isActive ? (
                              <span className="relative flex h-2 w-2 ml-1 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#03B875] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#03B875]"></span>
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-slate-300 ml-1 shrink-0"></span>
                            )}
                          </div>

                          {/* Metadata Badges line: Plan & Member counts */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            
                            {/* Plan Badge */}
                            {g.plan === "TRY_OFFLINE" || (tryOfflineMode && g.id === selectedGroupId) ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shadow-3xs">
                                {ui('maf62b2f09d')}</span>
                            ) : (g.plan === "HOI_LANG" || g.plan === "PREMIUM") ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFFDF0] text-amber-600 border border-amber-100 shadow-3xs">
                                {ui('m12a40b0f8f')}</span>
                            ) : (g.plan === "BE_BAN" || g.plan === "VIP") ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#F0F9FF] text-sky-600 border border-sky-100 shadow-3xs">
                                {ui('m8cb1f3d1e3')}</span>
                            ) : g.plan === "DU_HI_30" ? (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-600 border border-blue-100 shadow-3xs">
                                {ui('m0851d81e2b')}</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-50 text-slate-500 border border-slate-100 shadow-3xs">
                                {ui('macc8f1ca0f')}</span>
                            )}

                            {/* Member count Badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-50 text-slate-500 border border-slate-100 shadow-3xs">
                              👥 {(g.members || []).length} {ui('m1c9742eddd')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Floating Action Button for Group Creation (static & clean design) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRequestCreateGroup}
              className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#00B276] hover:bg-[#009A65] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(0,178,118,0.35)] cursor-pointer z-40"
              title={ui('m629e3e093d')}
            >
              <Plus className="w-7 h-7" />
            </motion.button>
          </div>
        );
      })()}

            {activeTab === "bills" && (
              /* TAB 2: DETAILED BILLS LIST */
              <div className="flex-1 flex flex-col bg-slate-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
                <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white pt-5 min-[390px]:pt-6 pb-5 px-4 min-[390px]:px-5 rounded-b-[1.5rem] min-[390px]:rounded-b-[2rem] flex items-center justify-between shadow-md shrink-0">
                  <button onClick={() => setActiveTab("home")} className="text-white p-1">
                    <ArrowLeftRight className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6 rotate-180" />
                  </button>
                  <span className="font-extrabold text-sm min-[390px]:text-base tracking-tight">{ui('m7b341c8b1b')}</span>
                  <div className="w-5 h-5 min-[390px]:w-6 min-[390px]:h-6" />
                </div>
                
                <div className="px-3.5 min-[390px]:px-4.5 pt-3 min-[390px]:pt-4 pb-3 flex-1 flex flex-col">
                  {activeGroup?.plan === "DU_HI_30" && (
                    <DuHiOnboarding
                      members={members}
                      expenses={expenses}
                      isGroupFundConfigured={isGroupFundConfigured}
                      isAdmin={isAdmin}
                      onBatchAddExpenses={handleBatchAddExpenses}
                      onNavigateToAdd={() => {
                        setEditingExpense(null);
                        setAddExpenseSubTab("scan");
                        setActiveTab("add");
                      }}
                      showToast={(title, desc, type) => {
                        setToastMsg({ title, desc, type });
                      }}
                    />
                  )}
                  <ExpenseList
                    expenses={expenses}
                    members={members}
                    onDeleteExpense={(expenseId) => {
                      askConfirm(
                        ui('m386f8ff3a8'),
                        ui('m63e9db9057'),
                        () => handleDeleteExpense(expenseId)
                      );
                    }}
                    onEditExpense={(exp) => {
                      setEditingExpense(exp);
                      setActiveTab("add");
                    }}
                    isAdmin={isAdmin}
                    allowMemberAddExpense={activeGroup?.allowMemberAddExpense !== false}
                    onNavigateToAdd={() => {
                      setEditingExpense(null);
                      setAddExpenseSubTab("scan");
                      setActiveTab("add");
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "add" && (
              /* TAB 3: ADD NEW EXPENSE FORM */
              <div className={`${addExpenseSubTab === "scan" ? "flex-1 flex flex-col overflow-hidden min-h-0" : "pb-5"}`}>
                <style>{`
                  @keyframes scanMotion {
                    0% { transform: translateY(0); opacity: 0.3; }
                    50% { transform: translateY(320px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 0.3; }
                  }
                `}</style>

                <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white pt-5 min-[390px]:pt-6 pb-5 px-4 min-[390px]:px-5 rounded-b-[1.5rem] min-[390px]:rounded-b-[2rem] flex items-center justify-between shadow-md shrink-0">
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      setPendingScanFile(null);
                      setActiveTab("bills");
                    }}
                    className="text-emerald-100 font-bold text-xs min-[390px]:text-sm"
                  >
                    {ui('m34ca764caf')}</button>
                  <span className="font-extrabold text-sm min-[390px]:text-base tracking-tight uppercase">
                    {addExpenseSubTab === "scan" ? ui('m2dddfe9b86') : (editingExpense ? ui('mf7a7a57e07') : ui('m44cb0ef735'))}
                  </span>
                  <div className="w-5" />
                </div>

                <div className={`px-3.5 pt-4 ${addExpenseSubTab === "scan" ? "flex-1 flex flex-col overflow-hidden justify-between min-h-0 pb-4" : "max-w-2xl mx-auto w-full pb-5"}`}>
                  {/* THÔNG BÁO GIỚI HẠN HÓA ĐƠN CHẾ ĐỘ THỬ NGHIỆM / DÙNG 1 LẦN */}
                  {tryOfflineMode && (
                    <div className={`${addExpenseSubTab === "scan" ? "mb-2.5 shrink-0" : "mb-4"} animate-in fade-in slide-in-from-top-3 duration-300`}>
                      {allExpenses.length < 9 ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
                          <div className="bg-emerald-100 text-emerald-700 p-1 rounded-xl shrink-0">
                            <Info className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-[11px] font-extrabold text-emerald-950">{ui('m7848b06d8f')}</h4>
                            <p className="text-[10px] text-emerald-700 leading-normal">
                              {ui('m13251b536e')}<strong>{ui('m22dab9c958')}</strong>{ui('mec6d75d769')}<strong>{allExpenses.length}/10</strong> {ui('m3884bd621c')}</p>
                          </div>
                        </div>
                      ) : allExpenses.length === 9 ? (
                        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-start gap-2 shadow-2xs ring-2 ring-amber-400/20">
                          <div className="bg-amber-100 text-amber-600 p-1 rounded-xl shrink-0 animate-bounce">
                            <AlertCircle className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-[11px] font-extrabold text-amber-950">{ui('mae9cbad6bf')}</h4>
                            <p className="text-[10px] text-amber-800 leading-normal font-medium">
                              {ui('m9b7c7ea806')}<strong>9/10</strong> {ui('m69508c91ca')}<strong>{ui('m32ae7c102f')}</strong> {ui('m2931b95605')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 flex items-start gap-2 shadow-2xs ring-2 ring-rose-400/20 animate-pulse">
                          <div className="bg-rose-100 text-rose-600 p-1 rounded-xl shrink-0">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-[11px] font-extrabold text-rose-950">{ui('mb1d09989ac')}</h4>
                            <p className="text-[10px] text-rose-800 leading-normal font-semibold">
                              {ui('m66976f9eeb')}<strong>10/10</strong> {ui('m09a7e48150')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {addExpenseSubTab === "scan" ? (
                    <div className="flex-1 flex flex-col items-center justify-between py-1 px-0 animate-in fade-in duration-300 overflow-hidden min-h-0">
                      {/* Stunning Camera scanning box */}
                      <div className="relative w-full flex-1 rounded-[2rem] bg-emerald-950 active:scale-98 transition-all overflow-hidden shadow-lg flex flex-col">
                        {/* Viewfinder corner overlays */}
                        <div className="absolute top-16 left-8 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl z-10" />
                        <div className="absolute top-16 right-8 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl z-10" />
                        <div className="absolute bottom-20 left-8 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl z-10" />
                        <div className="absolute bottom-20 right-8 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl z-10" />
                        
                        {/* Glowing moving laser scanner line */}
                        <div className="absolute top-24 inset-x-8 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] rounded-full z-10" style={{
                          animation: "scanMotion 3s infinite ease-in-out"
                        }} />

                        {/* Floating Text Overlay - Công nghệ bóc tách AI ✨ */}
                        <div className="absolute top-4 left-0 right-0 flex flex-col items-center justify-center space-y-1.5 z-20 pointer-events-none px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border border-emerald-400/20">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                            {ui('m548191e4e8')}</span>
                          {/* <h3 className="text-white font-extrabold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] tracking-tight">
                            Bóc tách hóa đơn AI hoặc Quét mã VietQR 1-Chạm
                          </h3> */}
                        </div>

                        <LiveCamera 
                          onCapture={(file) => {
                            setPendingScanFile(file);
                            setEditingExpense(null);
                            setAddExpenseSubTab("manual");
                          }} 
                          onQrScan={(qrData) => {
                            setActiveQrData(qrData);
                            setEditingExpense(null);
                            setAddExpenseSubTab("manual");
                          }}
                        />
                      </div>

                      {/* Tip message */}
                      <div className="p-2 bg-slate-100 rounded-2xl w-full border border-slate-200/50 shrink-0 mt-2">
                        <span className="text-[9px] min-[375px]:text-[10px] text-slate-500 leading-normal block text-center font-medium">
                          💡 <strong>{ui('m1ac4f1856b')}</strong> {ui('mb5fb36984d')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-300">
                      <ExpenseForm
                        members={members}
                        onAddExpense={(exp) => {
                          handleAddExpense(exp);
                          setPendingScanFile(null);
                          setEditingExpense(null);
                          setActiveQrData(null);
                          setActiveTab("bills");
                        }}
                        editingExpense={editingExpense}
                        onCancelEdit={() => {
                          setEditingExpense(null);
                          setPendingScanFile(null);
                          setActiveQrData(null);
                          setActiveTab("bills");
                        }}
                        onUpdateExpense={(exp) => {
                          handleUpdateExpense(exp);
                          setPendingScanFile(null);
                          setEditingExpense(null);
                          setActiveQrData(null);
                          setActiveTab("bills");
                        }}
                        onNavigateHome={() => setActiveTab("bills")}
                        currentMemberId={viewingMemberId || members[0]?.id}
                        initialPendingScanFile={pendingScanFile}
                        onScanComplete={() => setPendingScanFile(null)}
                        groupId={activeGroup?.id}
                        groupName={activeGroup?.name || "SplitMate"}
                        qrAutofill={activeQrData}
                        onClearQr={() => setActiveQrData(null)}
                        tryOfflineMode={tryOfflineMode}
                        groupPlan={activeGroup?.plan || 'FREE'}
                        ocrUsage={activeGroup?.ocrUsage || 0}
                        onUpdateOcrUsage={handleUpdateOcrUsage}
                        expenses={activeGroup?.expenses || []}
                        
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "settle" && (() => {
              const settleBalances = calculateBalances(members, expenses, activeGroup?.debtOffsets);
              const sortedByPaid = [...settleBalances].sort((a, b) => b.paid - a.paid);
              const topSpenderId = sortedByPaid[0]?.paid > 0 ? sortedByPaid[0].memberId : null;
              const topSpender = members.find((m) => m.id === topSpenderId);

              const sortedByShare = [...settleBalances].sort((a, b) => b.share - a.share);
              const activeComerId = sortedByShare[0]?.share > 0 ? sortedByShare[0].memberId : null;
              const activeComer = members.find((m) => m.id === activeComerId);

              const actualFundBalance = expenses.reduce((sum, e) => {
                if (e.isFundDeposit) return sum;
                if (e.description.includes("[Nộp Quỹ]")) return sum + e.amount;
                if (e.description.includes("[Nhận Quỹ]")) return sum - e.amount;
                if (e.payerId === "group") return sum - e.amount;
                return sum;
              }, 0);

              return (
                <div className="flex-1 flex flex-col">
                  <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white pt-5 min-[390px]:pt-6 pb-5 px-4 min-[390px]:px-5 rounded-b-[1.5rem] min-[390px]:rounded-b-[2rem] flex items-center justify-between shadow-md">
                    <button onClick={() => setActiveTab("home")} className="text-white p-1">
                      <ArrowLeftRight className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6 rotate-180" />
                    </button>
                    <span className="font-extrabold text-sm min-[390px]:text-base tracking-tight">{ui('mff5345d174')}</span>
                    <div className="w-5 h-5 min-[390px]:w-6 min-[390px]:h-6" />
                  </div>

                  <div className="px-3.5 min-[390px]:px-4.5 pt-4 min-[390px]:pt-5 pb-4 flex-1 space-y-4 min-[390px]:space-y-5">
                    {/* Settle view top overview cards */}
                    <div className="bg-white border border-slate-200/60 p-4.5 min-[390px]:p-5 rounded-3xl shadow-sm text-slate-800">
                      <p className="text-[0.625rem] min-[390px]:text-xs font-black text-slate-400 uppercase tracking-widest text-center">{ui('m5461fbc9f7')}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="text-center border-r border-slate-100 pr-1">
                          <p className="text-[0.625rem] min-[390px]:text-xs font-bold text-slate-400">{ui('m7817b94196')}</p>
                          <p className="text-base min-[390px]:text-lg font-black text-slate-800 mt-1">{new Intl.NumberFormat(getLocale()).format(Math.round(totals))}{ui('mc5f95801df')}</p>
                        </div>
                        <div className="text-center pl-1">
                          <p className="text-[0.625rem] min-[390px]:text-xs font-bold text-slate-400">{ui('ma4be956e19')}</p>
                          <p className="text-base min-[390px]:text-lg font-black text-emerald-600 mt-1">
                            {members.length > 0 ? ui('mf42237c13c', { v0: new Intl.NumberFormat(getLocale()).format(Math.round(totals / members.length)) }) : ui('m4ccb02fc39')}
                          </p>
                        </div>
                      </div>

                      {/* Display current fund balance here */}
                      <div className="mt-4 flex items-center justify-center bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 max-w-xs mx-auto">
                        <span className="text-xs font-bold text-slate-500">{ui('m047b1738dd')}</span>
                        <span className="text-sm font-black text-emerald-600 ml-1.5">{new Intl.NumberFormat(getLocale()).format(Math.round(actualFundBalance))} {ui('mc5f95801df')}</span>
                      </div>

                      {/* Fun Awards on Mobile */}
                      {!tryOfflineMode && expenses.length > 0 && (topSpender || activeComer) && (
                        <div className="space-y-2.5 mt-4 pt-3.5 border-t border-slate-100">
                          {topSpender && (
                            <div className="bg-amber-50/50 border border-amber-200/60 p-3 rounded-2xl flex items-center gap-3 text-left">
                              <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 shrink-0">
                                <Award className="h-4 w-4" />
                              </div>
                              <div className="text-xs">
                                <p className="text-amber-850 font-extrabold flex items-center gap-1">
                                  {ui('m85ed68d8dc')}{topSpender.emoji}
                                </p>
                                <p className="text-slate-600 text-[0.6875rem] leading-tight mt-0.5">
                                  <span className="font-bold text-slate-800">{topSpender.name}</span> {ui('m7818aebf9a')}<span className="font-bold text-amber-700">{new Intl.NumberFormat(getLocale()).format(Math.round(settleBalances.find(b => b.memberId === topSpender.id)?.paid || 0))}{ui('mc5f95801df')}</span>
                                </p>
                              </div>
                            </div>
                          )}

                          {activeComer && (
                            <div className="bg-rose-50/50 border border-rose-200/60 p-3 rounded-2xl flex items-center gap-3 text-left">
                              <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600 shrink-0">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div className="text-xs">
                                <p className="text-rose-800 font-extrabold flex items-center gap-1">
                                  {ui('m92c970af11')}{activeComer.emoji}
                                </p>
                                <p className="text-slate-600 text-[0.6875rem] leading-tight mt-0.5">
                                  <span className="font-bold text-slate-800">{activeComer.name}</span> {ui('m2e9089be1e')}<span className="font-bold text-rose-700">{new Intl.NumberFormat(getLocale()).format(Math.round(settleBalances.find(b => b.memberId === activeComer.id)?.share || 0))}{ui('mc5f95801df')}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-center w-full">
                          <button
                            type="button"
                            onClick={handleShareReport}
                            style={{ backgroundColor: '#03B875' }}
                            className="w-full p-3.5 hover:bg-[#02965f] text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm font-black text-xs uppercase tracking-wide cursor-pointer active:scale-95"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span>{ui('m41bb915513')}</span>
                          </button>
                        </div>
                        
                      </div>
                    </div>

                    {/* Core SettleUpSection */}
                    <SettleUpSection
                      activeGroup={activeGroup}
                      onUpdateGroupConfig={handleUpdateGroupConfig}
                      onUpdateGroup={updateGroupOnDbAndState}
                      onExportPDF={handleExportPDF}
                  onShowUpgradeModal={() => setShowUpgradeModal(true)}
                      members={members}
                      expenses={allExpenses}
                      onAddExpense={(exp) => {
                        handleAddExpense(exp);
                        setActiveTab("bills");
                      }}
                      onBatchSettleAndReceipt={handleBatchSettleAndReceipt}
                      isAdmin={isAdmin}
                      viewingMemberId={viewingMemberId}
                      tryOfflineMode={tryOfflineMode}
                      
                      onUpdatePendingReceipts={async (receipts) => {
                        const updatedGroup = {
                          ...activeGroup,
                          pendingReceipts: receipts
                        };
                        if (isAdmin) {
                          await updateGroupOnDbAndState(updatedGroup);
                        } else {
                          const newReceipt = receipts.find(
                            r => !activeGroup.pendingReceipts?.some(p => p.id === r.id)
                          );
                          if (newReceipt) {
                            try {
                              const res = await fetch("/api/member/upload-receipt", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  groupId: selectedGroupId,
                                  memberId: viewingMemberId,
                                  accessCode: memberAccessCodeUser?.code,
                                  pendingReceipt: newReceipt
                                })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setGroups([data.group]);
                                showAlert(ui('m18cf9cb114'), ui('mf9744a8db2'));
                              } else {
                                showAlert(ui('m4ce781318e'), localizeError(data.error, ui('m7ef6a3151f')));
                              }
                            } catch (err) {
                              console.error(err);
                              showAlert(ui('mb3af2fa4d2'), ui('m73e0ba0fc4'));
                            }
                          } else {
                            setGroups((prev) =>
                              prev.map((g) => (g.id === selectedGroupId ? updatedGroup : g))
                            );
                          }
                        }
                      }}
                    />

                    {/* Lịch sử quỹ nhóm (Mobile) */}
                    {!tryOfflineMode && (
                      <FundHistoryList
                        expenses={expenses}
                        members={members}
                        onDeleteExpense={handleDeleteExpense}
                      />
                    )}


                  </div>
                </div>
              );
            })()}

            {activeTab === "participation" && (
              /* TAB 5: CLOSE CYCLE & ARCHIVES PANEL (RESTRUCTURED) */
              <div className="flex-1 flex flex-col overflow-y-auto pb-14">
                <CloseCycleSection
                  activeGroup={activeGroup}
                  members={members}
                  expenses={expenses}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  onUpdateGroup={updateGroupOnDbAndState}
                  onShowUpgradeModal={() => setShowUpgradeModal(true)}
                  tryOfflineMode={tryOfflineMode}
                  showAlert={showAlert}
                  askConfirm={askConfirm}
                  onGeneratePDFReport={handleExportPDF}
                  user={user}
                  memberAccessCodeUser={memberAccessCodeUser}
                  setIsAdmin={setIsAdmin}
                  setViewingMemberId={setViewingMemberId}
                  setMemberAccessCodeUser={setMemberAccessCodeUser}
                  handleLoadVungTauTestData={handleLoadVungTauTestData}
                  handleClearActiveGroupData={handleClearActiveGroupData}
                  handleLogout={handleLogout}
                />
              </div>
            )}

            {/* --- STUNNING FLOATING NATIVE MOBILE TAB BAR --- */}
            {activeTab !== "add" ? (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-150 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-3 max-[375px]:px-1.5 flex justify-around items-center shadow-2xl max-w-md mx-auto">
                  <button
                    onClick={() => setActiveTab("home")}
                    className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 transition-all ${
                      activeTab === "home" ? "text-emerald-600 scale-105" : "text-slate-455 hover:text-slate-700"
                    }`}
                  >
                    <Compass className={`h-5 w-5 max-[375px]:h-4.5 max-[375px]:w-4.5 min-[390px]:h-6 min-[390px]:w-6 ${activeTab === "home" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                    <span className="text-[0.625rem] max-[375px]:text-[9px] min-[390px]:text-xs font-bold">{ui('m286a38e3d5')}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("bills")}
                    className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 transition-all rounded-xl ${
                      activeTab === "bills"
                        ? "text-emerald-600 scale-105"
                        : "text-slate-455 hover:text-slate-700"
                    }`}
                  >
                    <Activity className={`h-5 w-5 max-[375px]:h-4.5 max-[375px]:w-4.5 min-[390px]:h-6 min-[390px]:w-6 ${activeTab === "bills" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                    <span className="text-[0.625rem] max-[375px]:text-[9px] min-[390px]:text-xs font-bold flex items-center gap-1">
                      {ui('m60c96376c1')}{currentStep === 2 && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Scan Floating Button */}
                  {(isAdmin || (activeGroup?.allowMemberAddExpense !== false)) && (
                    <button
                      onClick={() => {
                        setEditingExpense(null);
                        setAddExpenseSubTab("scan");
                        setActiveTab("add");
                      }}
                      className="relative flex flex-col items-center justify-end cursor-pointer z-50 shrink-0 h-12 w-16 max-[375px]:w-13 min-[390px]:w-18"
                    >
                      <div className={`absolute -top-[24px] max-[375px]:-top-[18px] min-[390px]:-top-[26px] w-[3.25rem] h-[3.25rem] max-[375px]:w-11 max-[375px]:h-11 min-[390px]:w-[3.6rem] min-[390px]:h-[3.6rem] text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border-4 max-[375px]:border-[3px] border-white ${
                        currentStep === 2
                          ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/40 ring-4 max-[375px]:ring-2 ring-amber-400/30 animate-bounce"
                          : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                      }`}>
                        <ScanLine className="h-[1.625rem] w-[1.625rem] max-[375px]:h-5 max-[375px]:w-5 min-[390px]:h-7 min-[390px]:w-7 text-white stroke-[2.5px]" />
                      </div>
                      <span className={`text-[0.5625rem] max-[375px]:text-[8px] min-[390px]:text-[10px] font-bold pb-0.5 whitespace-nowrap px-1.5 max-[375px]:px-1 py-0.5 rounded-full ${
                        currentStep === 2
                          ? "text-amber-700 bg-amber-100 animate-pulse font-extrabold"
                          : "text-emerald-600 bg-emerald-50"
                      }`}>{ui('ma51edee9f1')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("settle")}
                    className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 transition-all rounded-xl ${
                      activeTab === "settle"
                        ? "text-emerald-600 scale-105"
                        : "text-slate-455 hover:text-slate-700"
                    }`}
                  >
                    <ArrowLeftRight className={`h-5 w-5 max-[375px]:h-4.5 max-[375px]:w-4.5 min-[390px]:h-6 min-[390px]:w-6 ${activeTab === "settle" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                    <span className="text-[0.625rem] max-[375px]:text-[9px] min-[390px]:text-xs font-bold flex items-center gap-1">
                      {ui('maa2564fd2b')}{currentStep === 3 && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("participation")}
                    className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 transition-all rounded-xl ${
                      activeTab === "participation"
                        ? "text-emerald-600 scale-105"
                        : "text-slate-455 hover:text-slate-700"
                    }`}
                  >
                    <FolderLock className={`h-5 w-5 max-[375px]:h-4.5 max-[375px]:w-4.5 min-[390px]:h-6 min-[390px]:w-6 ${activeTab === "participation" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                    <span className="text-[0.625rem] max-[375px]:text-[9px] min-[390px]:text-xs font-bold flex items-center gap-1">
                      {ui('m8cd7101975')}</span>
                  </button>
                </div>
            ) : (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-150 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 max-[375px]:px-2 flex justify-around items-center shadow-2xl max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setAddExpenseSubTab("scan")}
                  className={`flex flex-col items-center gap-1 cursor-pointer py-1 flex-1 transition-all ${
                    addExpenseSubTab === "scan" ? "text-emerald-600 scale-105 font-black" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Compass className={`h-5.5 w-5.5 max-[375px]:h-5 max-[375px]:w-5 min-[390px]:h-6.5 min-[390px]:w-6.5 ${addExpenseSubTab === "scan" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                  <span className="text-[0.6875rem] max-[375px]:text-[10px] min-[390px]:text-xs font-bold">{ui('ma51edee9f1')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddExpenseSubTab("manual")}
                  className={`flex flex-col items-center gap-1 cursor-pointer py-1 flex-1 transition-all ${
                    addExpenseSubTab === "manual" ? "text-emerald-600 scale-105 font-black" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Activity className={`h-5.5 w-5.5 max-[375px]:h-5 max-[375px]:w-5 min-[390px]:h-6.5 min-[390px]:w-6.5 ${addExpenseSubTab === "manual" ? "text-emerald-600 stroke-[2.5px]" : "text-slate-400"}`} />
                  <span className="text-[0.6875rem] max-[375px]:text-[10px] min-[390px]:text-xs font-bold">{ui('mb5f60265e7')}</span>
                </button>
              </div>
            )}
          </div>

        {/* Modal tạo nhóm mới trên di động */}

        {/* Custom Confirmation Dialog */}
        <AnimatePresence>
          {confirmState && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmState(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full z-10 space-y-4"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-sm">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none pt-1">
                    {confirmState.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {confirmState.message}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmState(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold rounded-2xl transition-all text-sm cursor-pointer"
                  >
                    {ui('m34ca764caf')}</button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmState.onConfirm();
                    }}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-semibold rounded-2xl shadow-lg shadow-rose-500/20 transition-all text-sm cursor-pointer"
                  >
                    {ui('md53daf2f46')}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Alert Dialog */}
        <AnimatePresence>
          {alertState && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAlertState(null)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full z-10 space-y-4"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#03B875] flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none pt-1">
                    {alertState.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {alertState.message}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAlertState(null)}
                    className="w-full px-4 py-3 bg-[#03B875] hover:bg-[#03B875]/90 active:scale-95 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm text-center block cursor-pointer"
                  >
                    {ui('mf2d7bd4ace')}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Admin Leader Login Modal */}

        {/* Custom Forgot Password Modal */}

        {/* Custom Toast Notification System */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] max-w-md w-full px-4 pointer-events-none"
            >
              <div className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
                toastMsg.type === "success" 
                  ? "bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/10"
                  : toastMsg.type === "error"
                    ? "bg-rose-500/90 border-rose-400 text-white shadow-rose-500/10"
                    : "bg-slate-900/90 border-slate-700 text-white shadow-slate-900/10"
              }`}>
                <div className={`p-1.5 rounded-lg text-white ${
                  toastMsg.type === "success" ? "bg-emerald-600" : toastMsg.type === "error" ? "bg-rose-600" : "bg-slate-800"
                }`}>
                  {toastMsg.type === "success" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : toastMsg.type === "error" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm tracking-tight">{toastMsg.title}</h4>
                  <p className="text-xs text-white/95 mt-0.5 font-medium leading-relaxed">{toastMsg.desc}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Change Password Modal */}

        <SmartHeader
          user={user}
          activeGroup={activeGroup}
          groups={groups}
          members={members}
          expenses={allExpenses}
          isAdmin={isAdmin}
          currentStep={currentStep}
          onSelectGroup={setSelectedGroupId}
          onLogout={handleLogout}
          onUpdateGroup={updateGroupOnDbAndState}
          onUpdateGroupConfig={async (config) => {
            if (!activeGroup) return;
            const updatedGroup = { ...activeGroup, ...config };
            await updateGroupOnDbAndState(updatedGroup);
          }}
          onDeleteGroup={handleDeleteGroup}
          activeIsSettled={activeIsSettled}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onEditMember={handleEditMember}
          viewingMemberId={viewingMemberId}
          tryOfflineMode={tryOfflineMode}
          askConfirm={askConfirm}
          showAlert={showAlert}
          showUpgradeModal={() => setShowUpgradeModal(true)}
          showFaqPage={() => setShowFaqPage(true)}
          onUpdateUser={(updatedUser, updatedGroups) => {
            setUser(updatedUser);
            localStorage.setItem("splitmate_custom_leader_user", JSON.stringify(updatedUser));
            if (updatedGroups) {
              setGroups(updatedGroups);
            }
          }}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
          group={activeGroup}
          currentUser={user}
          tryOfflineMode={tryOfflineMode}
          onRequireLogin={() => handleSetTryOffline(false)}
          onUpgradeSuccess={(newPlan, activatedAt, expiredAt) => {
            if (activeGroup) {
               setGroups(prev => prev.map(g => g.id === activeGroup.id ? { 
                ...g, 
                plan: newPlan,
                planActivatedAt: activatedAt || new Date().toISOString(),
                planExpiredAt: expiredAt || new Date(Date.now() + 365*24*60*60*1000).toISOString()
              } : g));
            }
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#3b82f6', '#f59e0b']
            });
            showAlert(ui('m0f6a38b930'), ui('m6b4767043f', { v0: newPlan }));
          }}
          showAlert={showAlert}
          onRequestCreateGroup={handleRequestCreateGroup}
        />

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={isCreatingGroup}
          onClose={() => setIsCreatingGroup(false)}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          onSubmit={handleCreateGroup}
        />

        {/* Personal Statement Modal */}
        
        {/* Offline Guest Modal */}
        <OfflineModal
          isOpen={showOfflineModal}
          onClose={() => setShowOfflineModal(false)}
          guestName={offlineGuestName}
          setGuestName={setOfflineGuestName}
          onSubmit={confirmOfflineMode}
        />

        {/* Instruction View Popup (Giới thiệu Splitmate) */}
        {showOnboarding && (
          <InstructionView
            mode={tryOfflineMode ? 'one-time' : 'login'}
            onClose={() => {
              setShowOnboarding(false);
              if (user) {
                localStorage.setItem(`splitmate_onboarding_done_${user.uid}`, "true");
              }
            }}
          />
        )}

        <InstallAppBanner />
      </div>
  );
}
