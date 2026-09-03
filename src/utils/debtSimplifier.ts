import { Member, Expense, SimplifiedTransaction, MemberBalance, DebtOffset } from "../types";

/**
 * Calculates the total paid, total share and net balance for each member.
 */
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  debtOffsets?: DebtOffset[]
): MemberBalance[] {
  const balances: Record<string, { paid: number; share: number; fundRequired: number }> = {};

  // Initialize for all members
  members.forEach((m) => {
    balances[m.id] = { paid: 0, share: 0, fundRequired: 0 };
  });

  // Accumulate
  expenses.forEach((expense) => {
    const amount = expense.amount;
    const payerId = expense.payerId;
    const participants = expense.participantIds;

    if (expense.isFundDeposit) {
      // This is a fund requirement, track it in fundRequired instead of direct share
      if (participants.length > 0) {
        if (expense.customSplit) {
          Object.entries(expense.customSplit).forEach(([pId, customAmount]) => {
            if (balances[pId]) {
              balances[pId].fundRequired += customAmount;
            }
          });
        } else {
          const sharePerPerson = amount / participants.length;
          participants.forEach((pId) => {
            if (balances[pId]) {
              balances[pId].fundRequired += sharePerPerson;
            }
          });
        }
      }
      return; // Skip normal expense processing for fund deposit requirement
    }

    // Add to payer's paid amount (as long as payer is still in the group)
    if (balances[payerId]) {
      balances[payerId].paid += amount;
    }

    if (participants.length > 0) {
      if (expense.customSplit) {
        Object.entries(expense.customSplit).forEach(([pId, customAmount]) => {
          if (balances[pId]) {
            balances[pId].share += customAmount;
          }
        });
      } else {
        const sharePerPerson = amount / participants.length;
        participants.forEach((pId) => {
          if (balances[pId]) {
            balances[pId].share += sharePerPerson;
          }
        });
      }
    }
  });

  // Calculate offsets adjustment
  const offsetAdjustments: Record<string, number> = {};
  members.forEach((m) => {
    offsetAdjustments[m.id] = 0;
  });

  if (debtOffsets) {
    debtOffsets.forEach((offset) => {
      const isApproved = offset.status === "approved" || (!offset.status && !!offset.approvedAt);
      if (isApproved) {
        if (offsetAdjustments[offset.fromId] !== undefined) {
          offsetAdjustments[offset.fromId] += offset.amount;
        }
        if (offsetAdjustments[offset.toId] !== undefined) {
          offsetAdjustments[offset.toId] -= offset.amount;
        }
      }
    });
  }

  return members.map((m) => {
    const basePaid = balances[m.id]?.paid || 0;
    const realShare = balances[m.id]?.share || 0;
    const fundReq = balances[m.id]?.fundRequired || 0;

    // Remaining required fund deposit after member has deposited money (uses basePaid, not offsetAdjustments)
    const remainingFundRequirement = Math.max(0, fundReq - basePaid);
    const totalShare = realShare + remainingFundRequirement;

    const baseNetBalance = basePaid - totalShare;
    const netBalance = baseNetBalance + (offsetAdjustments[m.id] || 0);

    return {
      memberId: m.id,
      paid: basePaid + (offsetAdjustments[m.id] || 0),
      share: realShare,
      netBalance,
    };
  });
}

/**
 * Simplifies debts within a group to find the minimum number of transactions.
 * Uses a greedy matchmaking algorithm between highest debtor and highest creditor.
 */
export function simplifyDebts(
  members: Member[],
  expenses: Expense[],
  debtOffsets?: DebtOffset[]
): SimplifiedTransaction[] {
  const memberBalances = calculateBalances(members, expenses, debtOffsets);
  
  // Clone balances for manipulation
  const debtors = memberBalances
    .filter((b) => Math.round(Math.abs(b.netBalance)) >= 1 && b.netBalance < 0) // ignore 0đ after rounding
    .map((b) => ({ id: b.memberId, balance: b.netBalance }))
    .sort((a, b) => a.balance - b.balance); // Most negative first

  const creditors = memberBalances
    .filter((b) => Math.round(b.netBalance) >= 1)
    .map((b) => ({ id: b.memberId, balance: b.netBalance }))
    .sort((a, b) => b.balance - a.balance); // Most positive first

  const transactions: SimplifiedTransaction[] = [];

  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Amount to transfer
    const amountToSettle = Math.min(-debtor.balance, creditor.balance);

    if (Math.round(amountToSettle) >= 1) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: Math.round(amountToSettle),
      });
    }

    // Adjust balances
    debtor.balance += amountToSettle;
    creditor.balance -= amountToSettle;

    // Move pointers if settled
    if (Math.abs(debtor.balance) < 0.5) {
      i++;
    }
    if (Math.abs(creditor.balance) < 0.5) {
      j++;
    }
  }

  return transactions;
}
