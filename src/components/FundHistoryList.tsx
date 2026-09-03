import React, { useState } from "react";
import { Member, Expense } from "../types";
import { getMemberAvatar, getGroupFundAvatar } from "../utils/avatar";
import { Search, Users, Calendar, User, Trash2, PiggyBank, ArrowDownLeft, ArrowUpRight, ArrowUpDown, Filter, List, ChevronLeft, ChevronRight } from "lucide-react";

interface FundHistoryListProps {
  expenses: Expense[];
  members: Member[];
  onDeleteExpense: (id: string) => void;
}

export default function FundHistoryList({
  expenses,
  members,
  onDeleteExpense,
}: FundHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayerId, setFilterPayerId] = useState("all");
  const [filterType, setFilterType] = useState("all"); // "all" | "in" | "out"
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const getMemberEmojiName = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? `${m.emoji} ${m.name}` : "Ẩn danh";
  };

  const getMemberNameOnly = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? m.name : "Ẩn danh";
  };

  const getMemberAvatarOnly = (id: string) => {
    if (id === "group" || id === "group-fund") return getGroupFundAvatar();
    const m = members.find((member) => member.id === id);
    if (m) {
      return getMemberAvatar(m);
    }
    return getGroupFundAvatar();
  };

  // Fund transactions are those containing "[Nộp Quỹ]" or "[Nhận Quỹ]"
  const fundExpenses = expenses.filter((e) => {
    return e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]");
  });

  const filteredExpenses = fundExpenses
    .filter((e) => {
      const matchSearch = e.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchPayer = filterPayerId === "all" || e.payerId === filterPayerId;
      
      let matchType = true;
      if (filterType === "in") {
        matchType = e.description.includes("[Nộp Quỹ]");
      } else if (filterType === "out") {
        matchType = e.description.includes("[Nhận Quỹ]");
      }

      return matchSearch && matchPayer && matchType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Formatter helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(Math.round(val)) + "đ";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    let cleanStr = dateStr;
    if (dateStr.includes("T")) {
      cleanStr = dateStr.split("T")[0];
    }
    const parts = cleanStr.split("-");
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

  const getMonthName = (date: Date) => {
    return `Tháng ${date.getMonth() + 1} / ${date.getFullYear()}`;
  };

  const prevMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonthHandler = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const getNormalizedDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  };

  const getDayExpenses = (dateStr: string) => {
    return filteredExpenses.filter((e) => getNormalizedDateStr(e.date) === dateStr);
  };

  const getMonthExpenses = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
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

  const getGridCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const dayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday...

    // Adjust for Monday start (T2 is 0 index, CN is 6 index)
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    // 1. Prev month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDateObj = new Date(year, month - 1, d);
      const dateStr = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, "0")}-${String(prevDateObj.getDate()).padStart(2, "0")}`;
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

    // 3. Next month padding days
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

  const displayExpenses = viewMode === "calendar"
    ? (selectedDate ? selectedDayExpenses : navigatedMonthExpenses)
    : filteredExpenses;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
      {/* Header and View Mode Toggle */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            {viewMode === "calendar" ? (
              <>
                <Calendar className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                Lịch sử giao dịch Quỹ Nhóm
              </>
            ) : (
              <>
                <PiggyBank className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                Lịch sử giao dịch Quỹ Nhóm
              </>
            )}
          </h4>
        </div>
        
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
            <span className="hidden sm:inline">Danh sách</span>
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
            <span className="hidden sm:inline">Lịch</span>
          </button>
        </div>
      </div>

      {/* Filters (List View Only) */}
      {viewMode === "list" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="sm:hidden w-full flex justify-end">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[0.6875rem] font-semibold transition-colors ${
                showMobileFilters || searchTerm || filterType !== "all" || filterPayerId !== "all"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Bộ lọc
              {(searchTerm || filterType !== "all" || filterPayerId !== "all") && (
                <span className="flex items-center justify-center bg-emerald-500 text-white w-4 h-4 rounded-full text-[0.5625rem]">
                  {Number(!!searchTerm) + Number(filterType !== "all") + Number(filterPayerId !== "all")}
                </span>
              )}
            </button>
          </div>

          <div className={`flex-wrap items-center gap-1.5 ${showMobileFilters ? "flex" : "hidden"} sm:flex`}>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tìm giao dịch quỹ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-[0.6875rem] w-full sm:w-32 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 font-medium"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="relative flex-1 sm:flex-none min-w-[7.5rem]">
              <select
                aria-label="Lọc loại quỹ"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-2 pr-6 text-[0.6875rem] font-semibold focus:bg-white focus:outline-none text-slate-705 cursor-pointer appearance-none"
              >
                <option value="all">Mọi loại quỹ</option>
                <option value="in">📥 Thu vào Quỹ</option>
                <option value="out">📤 Chi từ Quỹ</option>
              </select>
            </div>

            <div className="relative flex-1 sm:flex-none min-w-[7.5rem]">
              <select
                aria-label="Lọc thành viên"
                value={filterPayerId}
                onChange={(e) => setFilterPayerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-2 pr-6 text-[0.6875rem] font-semibold focus:bg-white focus:outline-none text-slate-705 cursor-pointer appearance-none"
              >
                <option value="all">Mọi người đóng</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW STYLE (Synchronized with ExpenseList) */}
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
                          const isNopQuy = exp.description.includes("[Nộp Quỹ]");
                          const dotColor = isNopQuy ? "bg-[#03B875]" : "bg-indigo-500";
                          return (
                            <span 
                              key={exp.id} 
                              className={`rounded-full ${dotColor}`}
                              style={{ height: '3.5px', width: '3.5px' }}
                            />
                          );
                        })}
                        {dayExpenses.length > 3 && (
                          <span className="w-1 h-1 rounded-full bg-slate-300" style={{ height: '3.5px', width: '3.5px' }} />
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {displayExpenses.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs space-y-2">
          {viewMode === "calendar" && selectedDate ? (
            <p>Không có giao dịch quỹ nào trong ngày {selectedDate.split("-").reverse().join("/")}</p>
          ) : (
            <>
              <p>Không tìm thấy hoạt động Quỹ nào.</p>
              <p className="text-[0.6875rem] text-slate-450 italic">Bạn hãy thực hiện tất toán công nợ theo phương thức Thu/Chi Quỹ ở trên!</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 divide-y divide-slate-100/80 overflow-hidden max-h-[65vh] md:max-h-[30rem] overflow-y-auto">
          {viewMode === "calendar" && selectedDate && (
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <span className="text-[11px] font-bold text-slate-700">
                Giao dịch ngày {selectedDate.split("-").reverse().join("/")}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
              >
                Đóng
              </button>
            </div>
          )}
          {displayExpenses.map((expense) => {
            const isNopQuy = expense.description.includes("[Nộp Quỹ]");
            const payer = members.find((m) => m.id === expense.payerId);
            const payerAvatar = getMemberAvatarOnly(expense.payerId);

            // Strip the bulky "[Nộp Quỹ]" or "[Nhận Quỹ]" and emojis for a clean premium card header
            const cleanDescription = expense.description
              .replace(/^📥\s*/, "")
              .replace(/^📤\s*/, "")
              .replace(/^\[Nộp Quỹ\]\s*/, "")
              .replace(/^\[Nhận Quỹ\]\s*/, "");

            return (
              <div
                key={expense.id}
                className="group p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Indicator Badge with tailored designs for Nop vs Nhan */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border relative ${
                      isNopQuy
                        ? "bg-rose-50 border-rose-100 text-rose-500"
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    }`}
                    title={isNopQuy ? "Thu vào Quỹ" : "Chi từ Quỹ"}
                  >
                    {isNopQuy ? (
                      <ArrowDownLeft className="h-5 w-5 text-rose-500 shrink-0" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                    <span 
                      className={`absolute -bottom-1 -right-1 border px-1 py-0.5 text-[8px] rounded-md font-black shadow-3xs leading-none uppercase ${
                        isNopQuy 
                          ? "bg-pink-100 border-pink-200 text-pink-700"
                          : "bg-emerald-100 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      {isNopQuy ? "THU" : "CHI"}
                    </span>
                  </div>

                  <div className="text-left min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#0F172A] leading-snug group-hover:text-emerald-650 transition-colors truncate">
                      {cleanDescription}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-400 text-[11px] font-medium mt-1">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        {expense.description.includes("[Nhận Quỹ]") ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <PiggyBank className="w-2.5 h-2.5" />
                          </div>
                        ) : expense.payerId === 'group' ? (
                          <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Users className="w-2.5 h-2.5" />
                          </div>
                        ) : payerAvatar ? (
                          <img src={payerAvatar} className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" alt={getMemberNameOnly(expense.payerId)} />
                        ) : (
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span>
                          {expense.description.includes("[Nhận Quỹ]") 
                            ? "Trưởng nhóm / Thủ quỹ" 
                            : `${getMemberNameOnly(expense.payerId)} (Thành viên)`}
                        </span>
                      </span>
                      <span className="text-slate-350">•</span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(expense.date)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount and delete tools */}
                <div className="flex items-center sm:items-end sm:flex-col justify-between shrink-0 gap-3">
                  <div className="text-left sm:text-right">
                    <p className={`font-black text-sm font-mono ${isNopQuy ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isNopQuy ? "+" : "-"}{formatMoney(expense.amount)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                      {isNopQuy ? "Đã nộp vào quỹ" : "Đã trả từ quỹ"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-1.5 px-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5 text-[11px] cursor-pointer font-bold border border-slate-100 hover:border-rose-100"
                      title="Xóa giao dịch này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
