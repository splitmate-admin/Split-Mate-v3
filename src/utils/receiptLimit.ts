import { Expense, PendingReceipt } from "../types";

export function getMonthlyReceiptImageCount(
  expenses: Expense[] = [],
  pendingReceipts: PendingReceipt[] = []
): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`; // YYYY-MM

  // 1. Đếm trong expenses của nhóm có date thuộc tháng hiện tại và có receiptImage
  const expenseImagesCount = (expenses || []).filter((exp) => {
    if (!exp.receiptImage) return false;
    
    // exp.date có định dạng YYYY-MM-DD hoặc ISO string
    if (exp.date && exp.date.includes("-")) {
      return exp.date.startsWith(currentMonthStr);
    }
    return false;
  }).length;

  // 2. Đếm trong pendingReceipts (minh chứng chuyển tiền của thành viên)
  const pendingImagesCount = (pendingReceipts || []).filter((rec) => {
    if (!rec.receiptImage) return false;

    // rec.uploadedAt thường có định dạng "dd/mm/yyyy hh:mm" từ SettleUpSection.tsx
    // rec.createdAt có thể là ISO string
    const uploadedAt = rec.uploadedAt || rec.createdAt || "";
    if (uploadedAt.includes("/")) {
      const datePart = uploadedAt.split(" ")[0]; // "dd/mm/yyyy"
      const parts = datePart.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return parseInt(y, 10) === currentYear && parseInt(m, 10) === currentMonth;
      }
    }

    if (uploadedAt.includes("-")) {
      return uploadedAt.startsWith(currentMonthStr);
    }

    return false;
  }).length;

  return expenseImagesCount + pendingImagesCount;
}
