import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState } from "react";
import { Member, Expense, MemberBalance, DebtOffset } from "../types";
import { calculateBalances } from "../utils/debtSimplifier";
import { getMemberAvatar } from "../utils/avatar";
import { Wallet, PieChart, TrendingUp, Sparkles, Award, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StatsSectionProps {
  members: Member[];
  expenses: Expense[];
  debtOffsets?: DebtOffset[];
  hideOverview?: boolean;
  hideAwards?: boolean;
}

const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
];

export default function StatsSection({ members, expenses, debtOffsets, hideOverview = false, hideAwards = false }: StatsSectionProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const balances = calculateBalances(members, expenses, debtOffsets);
  const totalGroupSpent = expenses.reduce((sum, e) => (e.isFundDeposit || e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]")) ? sum : sum + e.amount, 0);

  // Find the top payer (who spent the most absolute money out of pocket)
  const sortedByPaid = [...balances].sort((a, b) => b.paid - a.paid);
  const topSpenderId = sortedByPaid[0]?.paid > 0 ? sortedByPaid[0].memberId : null;
  const topSpender = members.find((m) => m.id === topSpenderId);

  // Find person who consumed the most
  const sortedByShare = [...balances].sort((a, b) => b.share - a.share);
  const activeComerId = sortedByShare[0]?.share > 0 ? sortedByShare[0].memberId : null;
  const activeComer = members.find((m) => m.id === activeComerId);

  // Formatter
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "VND",
    }).format(Math.round(num));
  };

  const getColor = (memberId: string) => {
    const index = members.findIndex(m => m.id === memberId);
    return CHART_COLORS[(index >= 0 ? index : 0) % CHART_COLORS.length];
  };

  const paidData = balances.filter(b => b.paid > 0).map((b) => ({
    name: members.find(m => m.id === b.memberId)?.name || 'Unknown',
    value: b.paid,
    memberId: b.memberId,
    color: getColor(b.memberId)
  }));

  const shareData = balances.filter(b => b.share > 0).map((b) => ({
    name: members.find(m => m.id === b.memberId)?.name || 'Unknown',
    value: b.share,
    memberId: b.memberId,
    color: getColor(b.memberId)
  }));

  const toggleExpand = (memberId: string) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
    } else {
      setExpandedMember(memberId);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-[0.625rem] p-2.5 rounded-xl shadow-lg border-0 outline-none text-left space-y-0.5">
          <p className="font-extrabold text-slate-200 border-b border-slate-750 pb-1 mb-1">{payload[0].payload.name}</p>
          <p className="font-mono text-sky-400">{formatVnd(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      {!hideOverview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-650 to-emerald-950 text-white p-5 rounded-3xl shadow-sm border border-emerald-950/20 flex flex-col justify-between h-32">
            <div className="p-2 bg-white/10 rounded-xl w-fit self-end">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <span className="text-emerald-200 text-[0.625rem] font-bold uppercase tracking-wider">{ui('m5331a41cd5')}</span>
              <h3 className="text-xl font-black tracking-tight">{formatVnd(totalGroupSpent)}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-col justify-between h-32">
            <div className="p-2 bg-emerald-50 rounded-xl w-fit self-end">
              <PieChart className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[0.625rem] font-bold uppercase tracking-wider">{ui('mc109103877')}</span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {members.length > 0 ? formatVnd(totalGroupSpent / members.length) : ui('m39c1dfe6c2')}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Fun Awards */}
      {!hideAwards && expenses.length > 0 && (topSpender || activeComer) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topSpender && (
            <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="text-amber-800 font-extrabold flex items-center gap-1 text-xs">
                  {ui('m85ed68d8dc')}{topSpender.emoji}
                </p>
                <p className="text-slate-600 text-[0.6875rem] leading-tight">
                  <span className="font-bold text-slate-800">{topSpender.name}</span> {ui('m7818aebf9a')}<span className="font-bold text-amber-700">{formatVnd(balances.find(b => b.memberId === topSpender.id)?.paid || 0)}</span>
                </p>
              </div>
            </div>
          )}

          {activeComer && (
            <div className="bg-rose-50/50 border border-rose-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-600 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="text-rose-800 font-extrabold flex items-center gap-1 text-xs">
                  {ui('m92c970af11')}{activeComer.emoji}
                </p>
                <p className="text-slate-600 text-[0.6875rem] leading-tight">
                  <span className="font-bold text-slate-800">{activeComer.name}</span> {ui('m2e9089be1e')}<span className="font-bold text-rose-700">{formatVnd(balances.find(b => b.memberId === activeComer.id)?.share || 0)}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breakdown chart per member Bento block */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            {ui('mc9dd109223')}</h4>
        </div>

        {/* Biểu đồ tròn */}
        <div className="pt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center">
            <h5 className="text-xs font-bold text-slate-500 mb-2">{ui('m7ee7090961')}</h5>
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={paidData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paidData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <h5 className="text-xs font-bold text-slate-500 mb-2">{ui('mfa3185b2fa')}</h5>
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={shareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {shareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Legend / Chú thích */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 text-[0.625rem] font-bold text-slate-500 border-b border-slate-100 pb-4">
          {members.filter(m => balances.some(b => b.memberId === m.id && (b.paid > 0 || b.share > 0))).map((member) => (
            <div key={member.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getColor(member.id) }} />
              <span className="truncate max-w-[5rem]">{member.name}</span>
            </div>
          ))}
        </div>

        {/* Chi tiết bằng text tóm tắt nhanh gọn để người dùng dễ dàng nhìn thấy mà không cần hover */}
        <div className="flex flex-col gap-2 pt-1">
          {balances.map((bal) => {
            const member = members.find((m) => m.id === bal.memberId);
            if (!member) return null;
            const isRefund = bal.netBalance >= 0;
            const isExpanded = expandedMember === member.id;

            return (
              <div 
                key={bal.memberId} 
                className="flex flex-col p-3 bg-slate-50/65 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleExpand(member.id)}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-[0.75rem] border border-slate-200 overflow-hidden shrink-0">
                      <img src={getMemberAvatar(member)} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </span>
                    <span className="font-extrabold text-slate-700 truncate">{member.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-black ${isRefund ? "text-emerald-650 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg" : "text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg"}`}>
                      {isRefund ? "+" : "-"} {formatVnd(Math.abs(bal.netBalance))}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-4 text-xs animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">{ui('md38af918e7')}</span>
                      <span className="font-bold text-sky-600">{formatVnd(bal.paid)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">{ui('maa7e281cba')}</span>
                      <span className="font-bold text-emerald-600">{formatVnd(bal.share)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

