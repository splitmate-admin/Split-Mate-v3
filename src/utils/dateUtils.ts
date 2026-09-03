
/**
 * Utility functions for date formatting and patching legacy timestamps
 */

export const patchOldTimestamp = (description: string, currentTimestamp: string, amount?: number) => {
  let targetTime = "";
  const descLower = description.toLowerCase();

  // 1. Check legacy records for Quỳnh Anh & Linh Trang
  if (description.includes("Quỳnh Anh") && description.includes("đóng quỹ nhóm")) {
    targetTime = "10:53";
  } else if (description.includes("Linh Trang") && description.includes("đóng quỹ nhóm")) {
    targetTime = "10:49";
  } 
  // 2. Check recent fund-in requests
  else if (description.includes("ku Đỉn") && description.includes("đóng quỹ nhóm")) {
    if (amount === 276667) targetTime = "23:28";
  } else if (description.includes("Quỳnh") && !description.includes("Anh") && description.includes("đóng quỹ nhóm")) {
    if (amount === 500000) targetTime = "23:19";
    else if (amount === 1165490) targetTime = "22:41";
    else if (amount === 1000000) targetTime = "22:40";
  } 
  // 3. Specific bills mentioned by user
  else if (descLower.includes("chân gà") && descLower.includes("sả tắc")) {
    targetTime = "22:42";
  }

  if (!targetTime) return currentTimestamp;
  
  // Replace 07:00 error if present
  if (currentTimestamp.includes("07:00")) {
    return currentTimestamp.replace("07:00", targetTime);
  }
  
  // If only date is present, prepend time
  if (!currentTimestamp.includes(":")) {
    return `${targetTime} ${currentTimestamp}`;
  }

  return currentTimestamp;
};

export const formatDateTime = (isoStr?: string) => {
  if (!isoStr) return "";
  try {
    const trimmed = isoStr.trim();
    // Nếu đã ở định dạng hh:mm dd/mm/yyyy hoặc hh:mm dd/mm/yyyy ... thì trả về luôn
    if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Nếu là định dạng chỉ ngày YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }

    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return trimmed;
    
    // Đảm bảo định dạng "HH:mm DD/MM/YYYY" chuẩn xác 100% bằng cách tính múi giờ Việt Nam (UTC+7) thủ công
    // Tránh việc các hệ điều hành/trình duyệt tự xóa khoảng trắng hoặc thêm dấu phẩy
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const vnTime = new Date(utcTime + (3600000 * 7)); // UTC + 7

    const hh = String(vnTime.getHours()).padStart(2, "0");
    const mm = String(vnTime.getMinutes()).padStart(2, "0");
    const dd = String(vnTime.getDate()).padStart(2, "0");
    const MM = String(vnTime.getMonth() + 1).padStart(2, "0");
    const yyyy = vnTime.getFullYear();

    return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
  } catch {
    return isoStr || "";
  }
};

export const parseFormattedDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  
  // match "hh:mm dd/mm/yyyy"
  const match = trimmed.match(/^(\d{2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, hh, mm, dd, MM, yyyy] = match.map(Number);
    return new Date(yyyy, MM - 1, dd, hh, mm);
  }
  
  // match "dd/mm/yyyy"
  const matchDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchDate) {
    const [, dd, MM, yyyy] = matchDate.map(Number);
    return new Date(yyyy, MM - 1, dd, 0, 0);
  }
  
  // match "yyyy-mm-dd"
  const matchIsoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIsoDate) {
    const [, yyyy, MM, dd] = matchIsoDate.map(Number);
    return new Date(yyyy, MM - 1, dd, 0, 0);
  }
  
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  return new Date();
};

export const parsePatchedTime = (patchedTime: string, rawTime: string) => {
  if (patchedTime.includes(":") && patchedTime.includes("/")) {
    try {
      const [timePart, datePart] = patchedTime.split(" ");
      const [h, m] = timePart.split(":").map(Number);
      const [d, mo, y] = datePart.split("/").map(Number);
      return new Date(y, mo - 1, d, h, m).getTime();
    } catch {
      return new Date(rawTime).getTime();
    }
  }
  return new Date(rawTime).getTime();
};
