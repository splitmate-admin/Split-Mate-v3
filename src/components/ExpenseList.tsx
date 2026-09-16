import React, { useState, useEffect } from "react";
import { Member, Expense, Group } from "../types";
import { 
  Search, Calendar, User, Trash2, PiggyBank, Sparkles, Pencil, 
  FileText, X, List, ChevronLeft, ChevronRight, TrendingUp, Filter, 
  ChevronDown, ChevronUp, CheckCircle2, UserCheck, ArrowRightLeft, Eye, UserPlus,
  Plus, Users, FolderPlus
} from "lucide-react";
import { formatDateTime, patchOldTimestamp, parsePatchedTime } from "../utils/dateUtils";
import { formatCurrencyAmount, useTranslation } from "../utils/i18n";

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  isAdmin?: boolean;
  allowMemberAddExpense?: boolean;
  onNavigateToAdd?: () => void;
  groups?: Group[];
  activeGroup?: Group | null;
  onSelectGroup?: (groupId: string) => void;
  viewingMemberId?: string;
}

const CATEGORY_FILTERS = [
  { key: "all", name: "Tất cả", emoji: "✨" },
  { key: "food", name: "Ăn uống", emoji: "🍔" },
  { key: "transport", name: "Xe cộ", emoji: "🚗" },
  { key: "shopping", name: "Mua sắm", emoji: "🛍️" },
  { key: "accommodation", name: "Chỗ ở", emoji: "🏨" },
  { key: "entertainment", name: "Vui chơi", emoji: "🎉" },
  { key: "other", name: "Khác", emoji: "💸" }
];

export default function ExpenseList({
  expenses,
  members,
  onDeleteExpense,
  onEditExpense,
  isAdmin = true,
  allowMemberAddExpense = false,
  onNavigateToAdd,
  groups = [],
  activeGroup = null,
  onSelectGroup,
  viewingMemberId,
}: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayerId, setFilterPayerId] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "updated_at">("date");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeReceiptImage, setActiveReceiptImage] = useState<string | null>(null);
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { lang, t } = useTranslation();
  
  const categoryFilters = [
    { key: "all", name: t("cat_all"), emoji: "✨" },
    { key: "food", name: t("cat_food"), emoji: "🍔" },
    { key: "transport", name: t("cat_transport"), emoji: "🚗" },
    { key: "shopping", name: t("cat_shopping"), emoji: "🛍️" },
    { key: "accommodation", name: t("cat_hotel"), emoji: "🏨" },
    { key: "entertainment", name: t("cat_entertainment"), emoji: "🎉" },
    { key: "other", name: t("cat_other"), emoji: "💸" }
  ];
  
  const toggleExpenseExpand = (id: string) => {
    setExpandedExpenseIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  
  // Custom states for Calendar view
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<string | null>(null);

  // Focus target listener when notification card is clicked
  useEffect(() => {
    const handleFocusTarget = (e: CustomEvent<{ targetId?: string; linkTab?: string }>) => {
      if (e.detail?.targetId && e.detail.targetId.startsWith("expense-")) {
        const expId = e.detail.targetId.replace("expense-", "");
        // Reset filters so the item is guaranteed to be rendered in DOM
        setViewMode("list");
        setSearchTerm("");
        setSelectedCategory("all");
        setFilterPayerId("all");
        setSelectedDate(null);
        // Expand target expense
        setExpandedExpenseIds((prev) => ({ ...prev, [expId]: true }));
        // Highlight it natively
        setHighlightedExpenseId(expId);
        setTimeout(() => setHighlightedExpenseId(null), 4000);
      }
    };

    window.addEventListener("focus-target-item" as any, handleFocusTarget);
    return () => {
      window.removeEventListener("focus-target-item" as any, handleFocusTarget);
    };
  }, []);

  const getMemberNameOnly = (id: string) => {
    if (id === "group") return "Quỹ Nhóm";
    const m = members.find((member) => member.id === id);
    return m ? m.name : "Thành viên cũ";
  };

  const getMemberAvatarOnly = (id: string) => {
    if (id === "group") return "https://api.dicebear.com/7.x/identicon/svg?seed=group-fund";
    const m = members.find((member) => member.id === id);
    if (m) {
      return m.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}`;
    }
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=guest`;
  };

  // Formatter helpers
  const formatMoney = (val: number) => {
    return formatCurrencyAmount(val, activeGroup?.currency || "VND");
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

  // Auto detect category from description
  const getCategoryFromDescription = (description: string, customCategoryKey?: string) => {
    if (customCategoryKey) {
      if (customCategoryKey === "food") return { name: "Ăn uống", emoji: "🍔", bg: "bg-orange-50", text: "text-orange-500", key: "food" };
      if (customCategoryKey === "transport") return { name: "Xe cộ", emoji: "🚗", bg: "bg-blue-50", text: "text-blue-500", key: "transport" };
      if (customCategoryKey === "shopping") return { name: "Mua sắm", emoji: "🛍️", bg: "bg-purple-50", text: "text-purple-500", key: "shopping" };
      if (customCategoryKey === "accommodation") return { name: "Chỗ ở", emoji: "🏨", bg: "bg-cyan-50", text: "text-cyan-500", key: "accommodation" };
      if (customCategoryKey === "entertainment") return { name: "Vui chơi", emoji: "🎉", bg: "bg-rose-50", text: "text-rose-500", key: "entertainment" };
      if (customCategoryKey === "other") return { name: "Khác", emoji: "💸", bg: "bg-emerald-50 text-emerald-500", text: "text-emerald-500", key: "other" };
    }
    const desc = description.toLowerCase();
    
    if (desc.includes("ăn") || desc.includes("uống") || desc.includes("trà") || desc.includes("sữa") || desc.includes("lẩu") || desc.includes("nướng") || desc.includes("cơm") || desc.includes("bún") || desc.includes("phở") || desc.includes("cafe") || desc.includes("cà phê") || desc.includes("nhậu") || desc.includes("buffet") || desc.includes("pizza") || desc.includes("bánh") || desc.includes("gà") || desc.includes("quán") || desc.includes("tiệc") || desc.includes("beer") || desc.includes("bia") || desc.includes("mì") || desc.includes("food") || desc.includes("snack") || desc.includes("ngọt")) {
      return { name: "Ăn uống", emoji: "🍔", bg: "bg-orange-50", text: "text-orange-500", key: "food" };
    }
    if (desc.includes("xe") || desc.includes("xăng") || desc.includes("taxi") || desc.includes("grab") || desc.includes("bus") || desc.includes("buýt") || desc.includes("tàu") || desc.includes("máy bay") || desc.includes("vé") || desc.includes("gửi xe") || desc.includes("di chuyển") || desc.includes("ô tô") || desc.includes("phí đường") || desc.includes("toll") || desc.includes("phà")) {
      return { name: "Xe cộ", emoji: "🚗", bg: "bg-blue-50", text: "text-blue-500", key: "transport" };
    }
    if (desc.includes("mua") || desc.includes("sắm") || desc.includes("siêu thị") || desc.includes("chợ") || desc.includes("quần") || desc.includes("áo") || desc.includes("giày") || desc.includes("dép") || desc.includes("shopee") || desc.includes("lazada") || desc.includes("vinmart") || desc.includes("coop") || desc.includes("kính") || desc.includes("túi")) {
      return { name: "Mua sắm", emoji: "🛍️", bg: "bg-purple-50", text: "text-purple-500", key: "shopping" };
    }
    if (desc.includes("homestay") || desc.includes("khách sạn") || desc.includes("phòng") || desc.includes("ở") || desc.includes("villa") || desc.includes("resort") || desc.includes("nhà nghỉ") || desc.includes("airbnb")) {
      return { name: "Chỗ ở", emoji: "🏨", bg: "bg-cyan-50", text: "text-cyan-500", key: "accommodation" };
    }
    if (desc.includes("karaoke") || desc.includes("phim") || desc.includes("rạp") || desc.includes("trò chơi") || desc.includes("game") || desc.includes("bar") || desc.includes("club") || desc.includes("spa") || desc.includes("tour") || desc.includes("vui chơi") || desc.includes("giải trí") || desc.includes("vé vào") || desc.includes("cáp treo") || desc.includes("vịnh")) {
      return { name: "Vui chơi", emoji: "🎉", bg: "bg-rose-50", text: "text-rose-500", key: "entertainment" };
    }
    return { name: "Khác", emoji: "💸", bg: "bg-emerald-50 text-emerald-500", text: "text-emerald-500", key: "other" };
  };

  // Parser foreign currencies if any
  const parseForeignCurrency = (description: string) => {
    // Regex matches common patterns like "(120 CNY)" or "25 USD" or "50 SGD" or "150,000 KRW"
    const regex = /(?:[\(]?)(\d+(?:[.,]\d+)?)\s*(USD|CNY|SGD|EUR|JPY|KRW|THB|AUD|CAD)(?:[\)]?)/i;
    const match = description.match(regex);
    if (match) {
      const amtStr = match[1].replace(",", "");
      const currency = match[2].toUpperCase();
      const amount = parseFloat(amtStr);
      if (!isNaN(amount)) {
        return { amount, currency };
      }
    }
    return null;
  };

  // Filter and Search logic
  const filteredExpenses = expenses
    .filter((e) => {
      const isFundTransaction = e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]");
      const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPayer = isFundTransaction || filterPayerId === "all" || e.payerId === filterPayerId;
      
      const catInfo = getCategoryFromDescription(e.description, e.categoryKey);
      const matchCategory = selectedCategory === "all" || isFundTransaction || catInfo.key === selectedCategory;

      return matchSearch && matchPayer && matchCategory;
    })
    .sort((a, b) => {
      const getSortTime = (e: Expense, useUpdateAt: boolean = false) => {
        const rawTime = (useUpdateAt && e.updated_at) ? e.updated_at : (e.created_at || e.date);
        const displayTime = formatDateTime(rawTime);
        const patchedTime = patchOldTimestamp(e.description, displayTime, e.amount);
        return parsePatchedTime(patchedTime, rawTime || "");
      };

      if (sortBy === "updated_at") {
        return getSortTime(b, true) - getSortTime(a, true);
      } else {
        return getSortTime(b) - getSortTime(a);
      }
    });

  // Helper to render new/edited badges
  const renderBadges = (expense: Expense) => {
    const createdTime = expense.created_at ? new Date(expense.created_at).getTime() : 0;
    const updatedTime = expense.updated_at ? new Date(expense.updated_at).getTime() : 0;
    const now = new Date().getTime();

    const isNew = createdTime > 0 && (now - createdTime < 24 * 60 * 60 * 1000);
    const isEdited = createdTime > 0 && updatedTime > 0 && (Math.abs(updatedTime - createdTime) > 1000);

    if (isNew) {
      return (
        <span key="new" className="inline-flex items-center bg-rose-50 text-rose-500 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-rose-100 select-none uppercase tracking-wider animate-pulse">
          {lang === 'vi' ? 'MỚI THÊM' : 'NEW'}
        </span>
      );
    }
    if (isEdited) {
      return (
        <span key="edited" className="inline-flex items-center bg-orange-50 text-orange-500 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-orange-100 select-none uppercase tracking-wider">
          {lang === 'vi' ? 'ĐÃ SỬA ✏️' : 'EDITED ✏️'}
        </span>
      );
    }
    return null;
  };

  // Convert/Normalize date string to YYYY-MM-DD
  const getNormalizedDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  };

  // Get expenses for a specific date
  const getDayExpenses = (dateStr: string) => {
    return filteredExpenses.filter((e) => getNormalizedDateStr(e.date) === dateStr);
  };

  // Get expenses for the currently navigated month
  const getMonthExpenses = (targetMonth: Date) => {
    const y = targetMonth.getFullYear();
    const m = targetMonth.getMonth();
    return filteredExpenses.filter((e) => {
      const norm = getNormalizedDateStr(e.date);
      if (!norm) return false;
      const d = new Date(norm);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  };

  const getDayTotalStr = (dayExpenses: Expense[]) => {
    if (dayExpenses.length === 0) return null;
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    if (total >= 1000000) {
      return `${(total / 1000000).toFixed(1).replace(".0", "")}M`;
    }
    if (total >= 1000) {
      return `${(total / 1000).toFixed(0)}K`;
    }
    return `${Math.round(total).toLocaleString("vi-VN")}đ`;
  };

  // Month navigation handlers
  const prevMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  // Month name helper
  const getMonthName = (date: Date) => {
    return `Tháng ${date.getMonth() + 1} / ${date.getFullYear()}`;
  };

  // Group expenses by Date for clean categorized history lists
  const groupExpensesByDate = (expensesList: Expense[]) => {
    const groupsObj: { [key: string]: Expense[] } = {};
    expensesList.forEach((e) => {
      const dateKey = sortBy === "updated_at"
        ? getNormalizedDateStr(e.updated_at || e.created_at || e.date)
        : getNormalizedDateStr(e.date);
      if (!groupsObj[dateKey]) {
        groupsObj[dateKey] = [];
      }
      groupsObj[dateKey].push(e);
    });

    return Object.keys(groupsObj)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateStr) => {
        const sortedItems = groupsObj[dateStr].sort((a, b) => {
          if (sortBy === "updated_at") {
            const timeA = new Date(a.updated_at || a.created_at || a.date).getTime();
            const timeB = new Date(b.updated_at || b.created_at || b.date).getTime();
            return timeB - timeA;
          } else {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
        });
        return {
          dateStr,
          expenses: sortedItems,
          totalDayAmount: groupsObj[dateStr].reduce((sum, item) => sum + ((item.description.includes("[Nộp Quỹ]") || item.description.includes("[Nhận Quỹ]")) ? 0 : item.amount), 0),
        };
      });
  };

  // Generate 42 calendar grid cells (6 rows of 7 columns) for consistency
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

    // 3. Next month loading padding days
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

  const gridCells = getGridCells();
  const navigatedMonthExpenses = getMonthExpenses(currentMonth);
  const selectedDayExpenses = selectedDate ? getDayExpenses(selectedDate) : [];
  
  // Choose which expenses to list
  const displayExpenses = viewMode === "calendar"
    ? (selectedDate ? selectedDayExpenses : navigatedMonthExpenses)
    : filteredExpenses;

  const totalNavigatedMonth = navigatedMonthExpenses.reduce((sum, e) => sum + ((e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? 0 : e.amount), 0);
  const totalSelectedDay = selectedDayExpenses.reduce((sum, e) => sum + ((e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? 0 : e.amount), 0);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Smart User Avatar for the mỏng nhẹ header
  const currentUser = members.find(m => m.id === viewingMemberId);
  const userAvatarUrl = currentUser?.avatar || (isAdmin ? "https://api.dicebear.com/7.x/adventurer/svg?seed=admin" : "https://api.dicebear.com/7.x/adventurer/svg?seed=guest");
  const userName = currentUser?.name || "Trưởng nhóm";

  return (
    <div className="bg-[#FFFFFF] p-6 max-sm:p-4 rounded-[24px] shadow-[0_8px_30px_rgba(15,23,42,0.03)] border border-slate-100 space-y-5 max-sm:space-y-4 max-sm:h-full max-sm:flex max-sm:flex-col max-sm:overflow-hidden text-[#0F172A]">
      
      {/* View Mode Toggle: Danh sách vs Lịch chi tiêu */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
          {viewMode === "calendar" ? (
            <>
              <Calendar className="w-4 h-4 text-[#03B875]" />
              <span>{lang === 'vi' ? 'Lịch chi tiêu' : 'Expense Calendar'}</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4 text-[#03B875]" />
              <span>{lang === 'vi' ? 'Danh sách chi tiêu' : 'Expense List'}</span>
            </>
          )}
        </h4>
        
        {/* Segmented Control viên thuốc */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-slate-800 shadow-3xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Danh sách' : 'List'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-white text-slate-800 shadow-3xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Lịch' : 'Calendar'}</span>
          </button>
        </div>
      </div>

      {/* 1. SEARCH & QUICK FILTERS (FLAT DESIGN) */}
      <div className="space-y-3">
        {/* Search Bar & Filter Icon Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100/60 border-none rounded-2xl py-2.5 pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-2xl transition-all ${
              showMobileFilters || filterPayerId !== "all" || sortBy !== "date"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100/60 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Extended Filters (if active) */}
        {showMobileFilters && (
          <div className="bg-slate-50 p-3 rounded-2xl flex flex-col sm:flex-row gap-2 animate-fade-in border border-slate-100">
            <div className="relative flex-1">
              <select
                aria-label="Lọc người chi"
                value={filterPayerId}
                onChange={(e) => setFilterPayerId(e.target.value)}
                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 pl-3 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-[#03B875] transition-all text-slate-700 cursor-pointer appearance-none"
              >
                <option value="all">{lang === 'vi' ? 'Tất cả người chi' : 'All Payers'}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative flex-1">
              <select
                aria-label="Sắp xếp hóa đơn"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "updated_at")}
                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 pl-3 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-[#03B875] transition-all font-bold text-[#03B875] cursor-pointer appearance-none"
              >
                <option value="date">{lang === 'vi' ? '📅 Ngày đi ăn' : '📅 Expense Date'}</option>
                <option value="updated_at">{lang === 'vi' ? '✏️ Mới cập nhật' : '✏️ Recently Updated'}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#03B875] pointer-events-none" />
            </div>
          </div>
        )}

        {/* Horizontal Quick Filter Pills */}
        <div className="no-scrollbar overflow-x-auto flex gap-2 py-1 select-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categoryFilters.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-white shadow-sm border border-emerald-500/20 text-emerald-600 scale-[1.02]"
                    : "bg-slate-100/60 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CALENDAR VIEW STYLE UPDATE */}
      {viewMode === "calendar" && (
        <div className="space-y-4 animate-fade-in">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={prevMonthHandler}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-extrabold text-xs text-slate-700 tracking-wide uppercase">
              {getMonthName(currentMonth)}
            </span>
            <button
              type="button"
              onClick={nextMonthHandler}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((wd) => (
              <div key={wd} className="text-center font-extrabold text-[10px] text-slate-400 py-1 uppercase tracking-wider">
                {wd}
              </div>
            ))}
            
            {gridCells.map((cell, idx) => {
              const dayExpenses = getDayExpenses(cell.dateStr);
              const totalStr = getDayTotalStr(dayExpenses);
              const hasExpenses = dayExpenses.length > 0;
              const isSelected = selectedDate === cell.dateStr;
              const isToday = cell.dateStr === new Date().toISOString().split("T")[0];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(selectedDate === cell.dateStr ? null : cell.dateStr);
                  }}
                  className={`focus:outline-none transition-all rounded-2xl p-1 sm:p-1.5 min-h-[3rem] sm:min-h-[3.75rem] relative text-left flex flex-col justify-between border cursor-pointer ${
                    !cell.isCurrentMonth ? "opacity-25 bg-slate-50/50 border-slate-100/50" : "bg-white border-slate-100"
                  } ${
                    isSelected 
                      ? "ring-2 ring-[#03B875] border-[#03B875] bg-[#E6F7F0]/20" 
                      : "hover:bg-slate-50"
                  } ${
                    isToday && !isSelected
                      ? "border-[#03B875] bg-[#E6F7F0]/10"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] sm:text-[11px] font-black ${
                      isSelected 
                        ? "text-[#03B875] font-black" 
                        : isToday 
                          ? "text-[#03B875] font-black" 
                          : cell.isCurrentMonth 
                            ? "text-[#0F172A]" 
                            : "text-slate-400"
                    }`}>
                      {cell.day}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 bg-[#03B875] rounded-full animate-ping" title="Hôm nay" />
                    )}
                  </div>

                  {hasExpenses && (
                    <div className="space-y-0.5 w-full flex flex-col items-center sm:items-end mt-1">
                      {totalStr && (
                        <span className={`inline-block text-[7.5px] min-[380px]:text-[9px] font-mono font-black px-1 rounded-md border transition-transform ${
                          isSelected 
                            ? "bg-[#03B875] border-[#03B875] text-white shadow-xs scale-[1.02]" 
                            : "bg-[#E6F7F0] border-[#03B875]/10 text-[#03B875] shadow-3xs"
                        }`}>
                          {totalStr}
                        </span>
                      )}
                      
                      <div className="flex justify-center sm:justify-end gap-0.5 pt-0.5">
                        {dayExpenses.slice(0, 3).map((exp) => {
                          const payer = members.find((m) => m.id === exp.payerId);
                          const cleanColor = payer?.color ? payer.color.replace("text-", "bg-").replace("bg-slate-50", "bg-emerald-400") : "bg-[#03B875]";
                          return (
                            <span 
                              key={exp.id} 
                              className={`w-1 h-1 rounded-full ${cleanColor}`}
                              style={{ height: '3.5px', width: '3.5px' }}
                            />
                          );
                        })}
                        {dayExpenses.length > 3 && (
                          <span className="text-[6.5px] text-slate-400 font-bold leading-none">+</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Overview Section for Navigated Month / Selected Day */}
          <div className="bg-[#E6F7F0]/25 p-3.5 rounded-[20px] border border-[#03B875]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E6F7F0] text-[#03B875] flex items-center justify-center font-bold">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
                  {selectedDate 
                    ? (lang === 'vi' ? `Chi tiêu ngày ${formatDate(selectedDate)}` : `Expenses on ${formatDate(selectedDate)}`)
                    : (lang === 'vi' ? `Tổng chi tiêu ${getMonthName(currentMonth)}` : `Total expenses ${getMonthName(currentMonth)}`)}
                </p>
                <p className="font-extrabold text-sm sm:text-base text-[#03B875] font-mono">
                  {formatMoney(selectedDate ? totalSelectedDay : totalNavigatedMonth)}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <p className="text-[11px] text-[#64748B] font-bold">
                {selectedDate 
                  ? (lang === 'vi' ? `Có ${selectedDayExpenses.length} khoản chi tiêu chung` : `${selectedDayExpenses.length} shared expenses`) 
                  : (lang === 'vi' ? `Có ${navigatedMonthExpenses.length} khoản chi tiêu chung` : `${navigatedMonthExpenses.length} shared expenses`)}
              </p>
              {selectedDate && (
                <button 
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] text-[#03B875] hover:text-[#02935d] font-black cursor-pointer hover:underline inline-flex items-center gap-0.5 mt-0.5"
                >
                  <span>{lang === 'vi' ? '← Xem chi tiêu cả tháng' : '← View whole month'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          {members.length <= 1 ? (
            /* BƯỚC 2: THÊM THÀNH VIÊN VÀO NHÓM (Chỉ hiển thị khi nhóm mới có 1 người) */
            <div className="p-6 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border-2 border-amber-300/80 rounded-[22px] space-y-3 shadow-xs relative overflow-hidden text-center ring-2 ring-amber-400/30">
              <div className="mx-auto w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20 animate-bounce">
                <UserPlus className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider mb-1 shadow-2xs">
                  {lang === 'vi' ? '👉 BƯỚC 2: THÊM THÀNH VIÊN VÀO NHÓM' : '👉 STEP 2: ADD GROUP MEMBERS'}
                </span>
                <h4 className="font-extrabold text-[#0F172A] text-xs sm:text-sm">
                  {lang === 'vi' ? 'Nhóm của bạn hiện mới có 1 người!' : 'Your group currently has only 1 member!'}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {lang === 'vi' ? 'Để chia tiền chính xác, hãy thêm các bạn cùng ăn chơi / đi du lịch vào nhóm trước nhé.' : 'To split bills accurately, add your friends/trip mates to the group first.'}
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-member-management"))}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  <UserPlus className="w-4 h-4 text-white shrink-0" />
                  <span>{lang === 'vi' ? 'Bấm Thêm Thành Viên Ngay' : 'Add Members Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* BƯỚC 3: GHI SỔ HÓA ĐƠN (Hiển thị khi đã hoàn thành Bước 2) */
            <div className="text-center py-7 px-6 bg-emerald-50/30 border border-dashed border-emerald-200/80 rounded-[22px] space-y-3 shadow-3xs">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 text-[#03B875] flex items-center justify-center font-bold text-lg animate-pulse">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black bg-[#03B875] text-white uppercase tracking-wider mb-1 shadow-2xs">
                  {lang === 'vi' ? '👉 BƯỚC 3: GHI SỔ HÓA ĐƠN ĐẦU TIÊN' : '👉 STEP 3: RECORD FIRST EXPENSE'}
                </span>
                <h4 className="font-bold text-[#0F172A] text-xs sm:text-sm">
                  {lang === 'vi' ? 'Nhập các khoản chi tiêu phát sinh' : 'Record your group expenses'}
                </h4>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  {lang === 'vi' ? 'Hãy bấm nút bên dưới để thêm chi phí phát sinh chung, tự động tính toán và chia tiền hoàn hảo.' : 'Click below to add shared expenses, auto-calculate and split debts perfectly.'}
                </p>
              </div>
              {onNavigateToAdd && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onNavigateToAdd}
                    className="inline-flex items-center gap-1.5 bg-[#03B875] hover:bg-[#02935d] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#03B875]/20 active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <span>{lang === 'vi' ? 'Thêm chi tiêu ngay' : 'Add Expense Now'}</span>
                    <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : displayExpenses.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs space-y-2">
          <p>Không tìm thấy khoản chi tiêu nào khớp bộ lọc.</p>
          <p className="text-[10px] text-slate-400">
            {viewMode === "calendar" 
              ? (selectedDate ? "Không có chi phí vào ngày này. Thử chọn ngày khác nhé!" : "Không có dữ liệu trong tháng này.") 
              : "Dùng thanh tìm kiếm hoặc thử bộ lọc danh mục khác."}
          </p>
        </div>
      ) : (
        /* 5. CẤU TRÚC THẺ HÓA ĐƠN (TRANSACTION CARD) & COLLAPSIBLE (FLAT FINTECH STYLE) */
        <div className="max-h-[60vh] md:max-h-[30rem] max-sm:max-h-none max-sm:flex-1 overflow-y-auto pr-1 space-y-6 max-sm:space-y-5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {groupExpensesByDate(displayExpenses).map((group) => (
            <div key={group.dateStr} className="space-y-2">
              {/* Group Day Header (FLAT) */}
              <div className="flex items-center justify-between px-1 select-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {sortBy === "updated_at" ? `Sửa ngày ${formatDate(group.dateStr)}` : formatDate(group.dateStr)}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {formatMoney(group.totalDayAmount)}
                </span>
              </div>
              
              {/* Group Body Items - UNIFIED CARD */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {group.expenses.map((expense) => {
                  const payer = members.find((m) => m.id === expense.payerId);
                  const isExpanded = !!expandedExpenseIds[expense.id];
                  const isFundTransaction = expense.description.includes("[Nộp Quỹ]") || expense.description.includes("[Nhận Quỹ]");
                  
                  // Compute personal debt for this expense
                  let personalDebtAmount = 0;
                  let personalDebtType = "none";
                  
                  if (viewingMemberId) {
                    const totalParticipants = (expense.participantIds || []).length;
                    const myShare = (expense.participantIds || []).includes(viewingMemberId) ? (expense.customSplit ? (expense.customSplit[viewingMemberId] || 0) : (totalParticipants > 0 ? expense.amount / totalParticipants : 0)) : 0;
                    const isPayer = expense.payerId === viewingMemberId;
                    
                    if (isPayer && myShare > 0) {
                      personalDebtAmount = expense.amount - myShare;
                      personalDebtType = personalDebtAmount > 0 ? "owed" : "none";
                    } else if (isPayer && myShare === 0) {
                      personalDebtAmount = expense.amount;
                      personalDebtType = "owed";
                    } else if (!isPayer && myShare > 0) {
                      personalDebtAmount = myShare;
                      personalDebtType = "owe";
                    }
                  }

                  // 5a. Quỹ Transaction Card
                  if (isFundTransaction) {
                    const isFundIn = expense.description.includes("[Nộp Quỹ]");
                    const rawTimestamp = expense.created_at ? formatDateTime(expense.created_at) : (expense.date ? formatDateTime(expense.date) : "");
                    const timestampStr = patchOldTimestamp(expense.description, rawTimestamp, expense.amount);
                    const timeOnly = timestampStr.includes(":") ? timestampStr.split(" ")[0] : "";
                    const formattedDesc = expense.description.replace(/\[.*?\]\s*/, "");
                    
                    return (
                      <div 
                        key={expense.id} 
                        id={`expense-${expense.id}`}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-500 ease-in-out hover:bg-slate-50 ${highlightedExpenseId === expense.id ? "ring-2 ring-emerald-500 ring-offset-1 bg-emerald-50 shadow-lg scale-[1.02] z-10 rounded-xl" : "bg-white"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isFundIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                            <ArrowRightLeft className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h5 className="font-semibold text-sm text-[#0F172A] leading-snug">
                              {formattedDesc}
                            </h5>
                            <p className="text-xs text-slate-400 mt-0.5 leading-none flex items-center gap-1.5">
                              <span>{isFundIn ? (lang === 'vi' ? "Nộp Quỹ" : "Fund Deposit") : (lang === 'vi' ? "Nhận Quỹ" : "Fund Withdraw")}</span>
                              {timeOnly && <span>• {timeOnly}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          <span className={`font-bold text-sm font-mono whitespace-nowrap ${isFundIn ? "text-emerald-600" : "text-rose-500"}`}>
                            {isFundIn ? "+" : "-"}{formatMoney(expense.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 5b. Tiêu chuẩn Transaction Card
                  const catInfo = getCategoryFromDescription(expense.description, expense.categoryKey);
                  const foreignCurrency = parseForeignCurrency(expense.description);
                  const expenseTime = getExpenseTime(expense);

                  return (
                    <div
                      key={expense.id}
                      id={`expense-${expense.id}`}
                      className={`p-4 transition-all duration-500 ease-in-out flex flex-col hover:bg-slate-50 ${highlightedExpenseId === expense.id ? "ring-2 ring-emerald-500 ring-offset-1 bg-emerald-50 shadow-lg scale-[1.02] z-10 rounded-xl" : "bg-white"}`}
                    >
                      {/* CARD COLLAPSED / EXPANDED TOGGLE TRIGGER */}
                      <div 
                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                        onClick={() => toggleExpenseExpand(expense.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Bên trái: Icon danh mục màu pastel dịu mắt */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${catInfo.bg} ${catInfo.text}`}>
                            <span>{catInfo.emoji}</span>
                          </div>
                          
                          {/* Ở giữa: Tên hóa đơn + Badges & Giờ chi */}
                          <div className="min-w-0 text-left flex-1">
                            <h5 className="font-semibold text-sm text-[#0F172A] leading-snug flex items-center flex-wrap gap-1.5">
                              <span className={isExpanded ? "break-words whitespace-normal w-full text-base font-bold" : "truncate w-full block text-[13px]"}>
                                {expense.description}
                              </span>
                              {renderBadges(expense)}
                            </h5>
                            
                            {expenseTime && (
                              <p className="text-[10px] text-slate-400 mt-1 font-mono leading-none">
                                {expenseTime}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bên phải: Số tiền ngoại tệ / nội tệ */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {foreignCurrency ? (
                              <>
                                <p className="text-[10px] font-bold text-slate-400 font-mono leading-none mb-0.5">
                                  {foreignCurrency.amount.toLocaleString()} {foreignCurrency.currency}
                                </p>
                                <p className="font-bold text-sm text-[#0F172A] font-mono leading-none">
                                  {formatMoney(expense.amount)}
                                </p>
                              </>
                            ) : (
                              <p className="font-bold text-sm text-[#0F172A] font-mono">
                                {formatMoney(expense.amount)}
                              </p>
                            )}
                          </div>
                          
                          <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* DETAILED BODY - COLLAPSIBLE WITH SMOOTH ENTRANCE */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-4 text-left w-full animate-in fade-in slide-in-from-top-1 duration-200">
                          
                          {/* Top metadata (receipt, dates, personal debt) */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md text-[11px]">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {lang === 'vi' ? 'Ngày' : 'Date'}: {formatDate(expense.date)}
                            </span>
                            
                            {personalDebtType === "owed" && (
                              <span className="font-bold text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs border border-emerald-100 animate-pulse">
                                💸 {lang === 'vi' ? 'Nhận lại' : 'Receive'}: {formatMoney(personalDebtAmount)}
                              </span>
                            )}
                            {personalDebtType === "owe" && (
                              <span className="font-bold text-[10px] text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs border border-rose-100 animate-pulse">
                                💸 {lang === 'vi' ? 'Cần trả' : 'Must Pay'}: {formatMoney(personalDebtAmount)}
                              </span>
                            )}

                            {expense.addedBy && (
                              <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider text-[10px]">
                                {lang === 'vi' ? 'Thêm' : 'Added'}: {expense.addedBy === "admin" ? "Ad" : (getMemberNameOnly(expense.addedBy) || (lang === 'vi' ? "Thành viên" : "Member"))}
                              </span>
                            )}
                            {expense.editedBy && (
                              <span className="font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-md uppercase tracking-wider text-[10px]">
                                {lang === 'vi' ? 'Sửa' : 'Edited'}: {expense.editedBy === "admin" ? "Ad" : (getMemberNameOnly(expense.editedBy) || (lang === 'vi' ? "Thành viên" : "Member"))}
                              </span>
                            )}
                            {expense.receiptImage && (
                              <button
                                type="button"
                                onClick={() => setActiveReceiptImage(expense.receiptImage || null)}
                                className="inline-flex items-center gap-1 text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold px-2 py-1 rounded-md cursor-pointer transition-colors border border-sky-100"
                              >
                                <FileText className="h-3 w-3" />
                                {lang === 'vi' ? 'Hóa đơn gốc' : 'Original receipt'}
                              </button>
                            )}
                          </div>

                          {/* Left: Người trả trước (đối diện phần chia sẻ), Right: Avatars Chia Sẻ */}
                          <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-2 text-left">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                                <img 
                                  src={getMemberAvatarOnly(expense.payerId)} 
                                  className="w-full h-full object-cover" 
                                  alt={getMemberNameOnly(expense.payerId)}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                                  {lang === 'vi' ? 'Người trả trước' : 'Paid by'}
                                </span>
                                <span className="text-xs font-bold text-[#0F172A] leading-tight mt-0.5">
                                  {getMemberNameOnly(expense.payerId)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                               <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                 {lang === 'vi' ? `Chia sẻ: ${(expense.participantIds || []).length} người` : `Split: ${(expense.participantIds || []).length} people`}
                               </span>
                               <div className="flex -space-x-2">
                                 {(expense.participantIds || []).slice(0, 5).map((pId, idx) => (
                                     <div key={pId} className="w-7 h-7 rounded-full border-2 border-white overflow-hidden shrink-0 shadow-sm" style={{ zIndex: 10 - idx }}>
                                         <img src={getMemberAvatarOnly(pId)} className="w-full h-full object-cover" />
                                     </div>
                                 ))}
                                 {(expense.participantIds || []).length > 5 && (
                                     <div className="w-7 h-7 rounded-full border-2 border-white overflow-hidden shrink-0 shadow-sm bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600" style={{ zIndex: 4 }}>
                                        +{(expense.participantIds || []).length - 5}
                                     </div>
                                 )}
                               </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          {(isAdmin || allowMemberAddExpense) && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => onEditExpense(expense)}
                                className="flex-1 px-3 py-2.5 bg-slate-100/50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>{t("edit")}</span>
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(expense.id)}
                                  className="flex-1 px-3 py-2.5 bg-rose-50/50 hover:bg-rose-50 text-rose-600 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>{t("delete")}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Lightbox Modal for Receipt Image */}
      {activeReceiptImage && (
        <div
          className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setActiveReceiptImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 relative space-y-4 shadow-2xl border border-slate-100 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-[#0F172A] text-sm flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-[#03B875]" />
                {lang === 'vi' ? 'Ảnh hóa đơn đính kèm' : 'Attached receipt image'}
              </h4>
              <button
                type="button"
                onClick={() => setActiveReceiptImage(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-[#0F172A] cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex justify-center bg-slate-50 rounded-2xl overflow-hidden p-1 max-h-[70vh]">
              <img
                src={activeReceiptImage}
                alt="Receipt Detail"
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>
            
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setActiveReceiptImage(null)}
                className="bg-[#0F172A] text-white font-black py-2.5 px-8 rounded-xl hover:bg-slate-800 transition-all text-xs cursor-pointer shadow-md"
              >
                Tôi đã xem xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Private helper to parse exact hours & minutes safely from iso timestamp string
function getExpenseTime(expense: Expense): string {
  const raw = expense.created_at || expense.date;
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
}
