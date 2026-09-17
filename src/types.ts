import { ui } from './i18n/core';
import type { SupportedCurrency } from './utils/money';
export interface FxSnapshot {
  currency: SupportedCurrency;
  originalAmount: number;
  rateToVnd: number;
  quotedAt: string;
  source: string;
  originalCustomSplit?: Record<string, number>;
}
export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex (e.g., bg-red-500)
  emoji: string; // Fun representation
  avatar?: string; // Base64 or URL of custom AI anime avatar
  email?: string; // Email for linking groups across accounts
  emailVerified?: boolean; // Whether email has been verified via OTP
  userId?: string; // UID of user if registered
  accessCode?: string; // Unique access code for member logging in to view group info
  isUpcomingActive?: boolean; // Participation status flag for future expenses
  fundType?: "momo" | "bank";
  fundPhone?: string; // Legacy fallback
  fundName?: string;  // Legacy fallback
  fundBankName?: string; // Legacy fallback
  fundQrImage?: string; // Legacy fallback
  momoPhone?: string;
  momoQrImage?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
  bankQrImage?: string;
}

export interface Expense {
  fx?: FxSnapshot;
  id: string;
  description: string;
  amount: number;
  payerId: string; // ID of Member who paid
  date: string; // YYYY-MM-DD
  participantIds: string[]; // List of Member IDs who participate in this expense
  customSplit?: Record<string, number>; // Maps member ID to their specific amount
  receiptImage?: string; // Optional invoice image string (Data URL or placeholder)
  addedBy?: string; // Information on who added the expense (member id or admin)
  editedBy?: string; // Information on who last edited the expense
  created_at?: string; // ISO string representing creation time
  updated_at?: string; // ISO string representing update time
  categoryKey?: string; // Optional custom selected category key
  isFundDeposit?: boolean; // If true, this is a fund deposit where participants are the ones contributing
}

export interface PendingReceipt {
  id: string;
  fromId: string;
  toId?: string; // If paid to a creditor
  amount: number;
  receiptImage: string; // Base64 data URL
  uploadedAt: string;
  createdAt?: string; // ISO string for precise time
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  memberNote?: string; // Member can write something like: "Em chuyển khoản rồi ạ"
  verified_by_ai?: boolean; // AI Auto-Reconciliation flag
}

export interface BillingCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  expenses: Expense[];
  archivedAt: string;
  totalSpending?: number;
  expensesCount?: number;
  archivedExpenses?: Expense[];
  archivedDebtOffsets?: DebtOffset[];
  archivedPendingReceipts?: PendingReceipt[];
  closedAt?: string;
}

export type PlanType = "FREE" | "BE_BAN" | "HOI_LANG" | "DU_HI_30" | "TRY_OFFLINE";

export const getPlanLabel = (plan?: string, isOffline?: boolean): string => {
  if (isOffline || plan === 'TRY_OFFLINE' || plan === 'OFFLINE') return ui('m9c9c248a4c');
  if (!plan || plan === 'FREE') return ui('m730d8df48c');
  if (plan === 'VIP' || plan === 'BE_BAN') return ui('m1c14d48cd2');
  if (plan === 'PREMIUM' || plan === 'HOI_LANG') return ui('m14724ffbc4');
  if (plan === 'DU_HI_30') return ui('m47f66d8cab');
  return plan;
};

export interface Voucher {
  code: string;
  plan_type: PlanType;
  is_used: boolean;
  used_at?: string;
  used_by_group_id?: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
  members: Member[];
  expenses: Expense[];
  pendingReceipts?: PendingReceipt[]; // Custom proof list uploaded by members
  fundType?: "momo" | "bank";
  fundPhone?: string; // Legacy fallback
  fundName?: string;  // Legacy fallback
  fundBankName?: string; // Legacy fallback
  fundQrImage?: string; // Legacy fallback
  momoPhone?: string;
  momoQrImage?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
  bankQrImage?: string;
  imageUrl?: string;
  memberAccessCodes?: string[];
  allowMemberAddExpense?: boolean;
  billingCycles?: BillingCycle[];
  currentCycleName?: string;
  debtOffsets?: DebtOffset[];
  plan?: PlanType;
  ocrUsage?: number;
  lastOcrMonth?: string; // YYYY-MM
  planActivatedAt?: string; // ISO string representing active time
  planExpiredAt?: string; // ISO string representing expiration time
  appliedVoucher?: string; // Mã voucher đã dùng để nâng cấp
  adminEmail?: string;
  admin_email?: string;
}

export interface DebtOffset {
  id: string;
  fromId: string; // Người nợ quỹ (B, netBalance < 0)
  toId: string;   // Người gánh/được nhận tiền (A, netBalance > 0)
  amount: number; // Số tiền cấn trừ
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface SimplifiedTransaction {
  fromId: string; // Member who owes
  toId: string;   // Member who is owed
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  paid: number;      // Total paid by member
  share: number;     // Total share member consumed
  netBalance: number; // paid - share (Positive: owed, Negative: owes)
}

export interface Feedback {
  id: string;
  type: "feedback" | "suggestion" | "bug";
  name?: string;
  email?: string;
  content: string;
  rating?: number; // 1-5
  createdAt: string;
  status: "pending" | "reviewed" | "replied";
  reply?: string;
  repliedAt?: string;
}

