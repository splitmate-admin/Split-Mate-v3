import jsQR from "jsqr";

interface EMVCoTag {
  tag: string;
  value: string;
}

export interface VietQRData {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  memo?: string;
  storeName?: string;
  accountName?: string;
  rawText: string;
}

/**
 * Parses raw EMVCo TLV data into a key-value record of tags.
 */
export function parseEMVCo(qrText: string): Record<string, EMVCoTag> {
  const tags: Record<string, EMVCoTag> = {};
  
  // Convert payload to UTF-8 bytes to correctly handle multibyte characters (Vietnamese accents)
  // EMVCo lengths represent byte length, not JavaScript string (UTF-16) character length.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");
  const bytes = encoder.encode(qrText);
  
  let index = 0;
  
  while (index < bytes.length) {
    if (index + 4 > bytes.length) break;
    
    const tag = decoder.decode(bytes.slice(index, index + 2));
    const lengthStr = decoder.decode(bytes.slice(index + 2, index + 4));
    const length = parseInt(lengthStr, 10);
    
    if (isNaN(length)) break;
    
    index += 4;
    if (index + length > bytes.length) break;
    
    const valueBytes = bytes.slice(index, index + length);
    const value = decoder.decode(valueBytes);
    index += length;
    
    tags[tag] = { tag, value };
  }
  
  return tags;
}

/**
 * Decodes a standard VietQR / EMVCo QR code string to retrieve bank details,
 * account number, payment amount, and merchant name/memo.
 */
export function parseVietQR(qrText: string): VietQRData | null {
  if (!qrText || !qrText.startsWith("00")) return null;
  
  try {
    const tags = parseEMVCo(qrText);
    
    let bankBin = "";
    let accountNumber = "";
    let amount: number | undefined = undefined;
    let memo = "";
    let storeName = "";
    let accountName = "";
    
    // Tag 54: Amount
    if (tags["54"]) {
      const parsedAmount = parseFloat(tags["54"].value);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        amount = parsedAmount;
      }
    }
    
    // Tag 59: Store / Merchant Name (Root level)
    if (tags["59"] && tags["59"].value) {
      storeName = tags["59"].value.trim();
    }
    
    // Tag 62: Additional Data Field (Memo / Message / Reference)
    if (tags["62"]) {
      const subTags62 = parseEMVCo(tags["62"].value);
      if (subTags62["08"]) {
        memo = subTags62["08"].value.trim();
      } else if (subTags62["05"]) {
        memo = subTags62["05"].value.trim();
      } else if (subTags62["01"]) {
        memo = subTags62["01"].value.trim();
      }
      if (!storeName && subTags62["03"]) {
        storeName = subTags62["03"].value.trim();
      }
      if (!storeName && subTags62["07"]) {
        storeName = subTags62["07"].value.trim();
      }
    }
    
    // Tag 38: Consumer Merchant Information (standard for VietQR)
    if (tags["38"]) {
      const subTags38 = parseEMVCo(tags["38"].value);
      
      // Sub-tag 08 inside Tag 38 often holds Merchant/Account Name
      if (subTags38["08"] && subTags38["08"].value) {
        accountName = subTags38["08"].value.trim();
      }

      // Sub-tag 01 is the Payment Service Provider template
      if (subTags38["01"]) {
        const subTagsMerchant = parseEMVCo(subTags38["01"].value);
        if (subTagsMerchant["00"]) {
          bankBin = subTagsMerchant["00"].value;
        }
        if (subTagsMerchant["01"]) {
          accountNumber = subTagsMerchant["01"].value;
        }
        if (subTagsMerchant["08"] && !accountName) {
          accountName = subTagsMerchant["08"].value.trim();
        }
      }
    }
    
    // Fallback: Check tags 26 to 51 (standard EMVCo merchant ID ranges)
    for (let tagNum = 26; tagNum <= 51; tagNum++) {
      const tagStr = tagNum.toString();
      if (tags[tagStr]) {
        const subTags = parseEMVCo(tags[tagStr].value);
        if (subTags["08"] && !accountName) {
          accountName = subTags["08"].value.trim();
        }
        if (!bankBin || !accountNumber) {
          if (subTags["01"]) {
            const subTagsMerchant = parseEMVCo(subTags["01"].value);
            if (subTagsMerchant["00"] && subTagsMerchant["01"]) {
              bankBin = bankBin || subTagsMerchant["00"].value;
              accountNumber = accountNumber || subTagsMerchant["01"].value;
            }
          }
        }
      }
    }

    // Clean up store / account name
    let rawFoundName = accountName || storeName || "";
    if (rawFoundName) {
      rawFoundName = rawFoundName
        .replace(/^(MOMO_|ZALOPAY_|VIETQR_|BVBANK_|VCB_|TCB_|MB_|MBB_)/i, "")
        .replace(/^(MOMO|ZALOPAY|VIETQR|VNPAY)$/i, "")
        .replace(/_/g, " ")
        .trim();
    }
    
    if (bankBin && accountNumber) {
      return {
        bankBin,
        accountNumber,
        amount,
        memo: memo || undefined,
        storeName: rawFoundName || memo || undefined,
        accountName: rawFoundName || memo || undefined,
        rawText: qrText
      };
    }
  } catch (error) {
    console.error("Error parsing VietQR code:", error);
  }
  
  return null;
}

/**
 * Maps bank code / name to VietQR Bank BIN
 */
export function getBankBin(bankCode?: string): string {
  if (!bankCode) return "970436"; // VCB default
  const code = bankCode.toUpperCase().trim();

  // Direct map for popular aliases
  const map: Record<string, string> = {
    VCB: "970436",
    VIETCOMBANK: "970436",
    TCB: "970407",
    TECHCOMBANK: "970407",
    MB: "970422",
    MBB: "970422",
    MBBANK: "970422",
    "MB BANK": "970422",
    ACB: "970416",
    VPB: "970432",
    VPBANK: "970432",
    BIDV: "970418",
    CTG: "970415",
    ICB: "970415",
    VIETINBANK: "970415",
    TPB: "970423",
    TPBANK: "970423",
    STB: "970403",
    SACOMBANK: "970403",
    VBA: "970405",
    AGRIBANK: "970405",
    HDB: "970437",
    HDBANK: "970437",
    SHB: "970443",
    VIB: "970441",
    MSB: "970426",
    OCB: "970448",
    LPB: "970449",
    LPBANK: "970449",
    EIB: "970431",
    EXIMBANK: "970431",
    SEAB: "970440",
    SEABANK: "970440",
    NAB: "970428",
    NAMABANK: "970428",
    MOMO: "971025",
    ZALOPAY: "970423",
    TIMO: "963388",
    BVB: "970454",
    BVBANK: "970454"
  };

  if (map[code]) return map[code];

  // If already a 6-digit BIN
  if (/^\d{6}$/.test(code)) return code;

  // Search in VIETNAM_BANKS array
  const found = VIETNAM_BANKS.find(
    (b) =>
      b.bin === code ||
      b.code.toUpperCase() === code ||
      (b.shortCode && b.shortCode.toUpperCase() === code) ||
      b.name.toUpperCase() === code ||
      code.includes(b.name.toUpperCase())
  );
  if (found && found.bin) return found.bin;

  return "970436";
}

/**
 * Generates direct VietQR Image URL for pre-filled payment code
 */
export function generateVietQRQuickUrl(params: {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  memo?: string;
}): string {
  const { bankCode, accountNumber = "", accountName = "", amount, memo = "" } = params;
  const bin = getBankBin(bankCode);

  const cleanMemo = memo
    ? memo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_")
        .slice(0, 20)
    : "SPLITMATE";

  const cleanName = accountName
    ? accountName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .toUpperCase()
        .slice(0, 25)
    : "";

  const amountParam = Math.round(amount) > 0 ? `amount=${Math.round(amount)}` : "";
  const nameParam = cleanName ? `accountName=${encodeURIComponent(cleanName)}` : "";
  const memoParam = cleanMemo ? `addInfo=${encodeURIComponent(cleanMemo)}` : "";

  const queryParams = [amountParam, memoParam, nameParam].filter(Boolean).join("&");
  const queryString = queryParams ? `?${queryParams}` : "";

  return `https://img.vietqr.io/image/${bin}-${accountNumber.trim()}-compact2.png${queryString}`;
}

/**
 * List of popular Vietnamese Banks for Deep Linking support
 */
import { VIETNAM_BANKS, BankOption } from "./banks";

export const SUPPORTED_BANKS: BankOption[] = VIETNAM_BANKS;

/**
 * Checks if the user is currently using an in-app browser (Zalo, Facebook Messenger, Instagram...)
 */
export function isInAppBrowser(): boolean {
  if (typeof window === "undefined" || !navigator || !navigator.userAgent) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  return /zalo/i.test(ua) || /FBAV/i.test(ua) || /FBAN/i.test(ua) || /Instagram/i.test(ua) || /Line/i.test(ua);
}

/**
 * Computes CRC16-CCITT checksum for EMVCo payload string
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates an EMVCo VietQR text string format according to Napas specs.
 */
export function generateVietQREmvcoString(params: {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  memo?: string;
}): string {
  const { bankBin, accountNumber, amount, memo } = params;
  const cleanAccount = (accountNumber || "").replace(/\s+/g, "").trim();
  const cleanBin = (bankBin || "").replace(/\s+/g, "").trim();

  // Sub-tag 01 inside tag 38
  const sub00 = `0006${cleanBin.padStart(6, "0")}`;
  const sub01 = `01${cleanAccount.length.toString().padStart(2, "0")}${cleanAccount}`;
  const sub38_01_val = sub00 + sub01;
  const sub38_01 = `01${sub38_01_val.length.toString().padStart(2, "0")}${sub38_01_val}`;
  const sub38_02 = `0208QRIBFTTA`;
  const sub38_00 = `0010A000000727`;

  const tag38_val = sub38_00 + sub38_01 + sub38_02;
  const tag38 = `38${tag38_val.length.toString().padStart(2, "0")}${tag38_val}`;

  const tag00 = `000201`;
  const tag01 = amount ? `010212` : `010211`;
  const tag53 = `5303704`;

  let tag54 = "";
  if (amount && amount > 0) {
    const amtStr = Math.round(amount).toString();
    tag54 = `54${amtStr.length.toString().padStart(2, "0")}${amtStr}`;
  }

  const tag58 = `5802VN`;

  let tag62 = "";
  if (memo) {
    const rawMemo = memo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 25);
    if (rawMemo) {
      const sub08 = `08${rawMemo.length.toString().padStart(2, "0")}${rawMemo}`;
      tag62 = `62${sub08.length.toString().padStart(2, "0")}${sub08}`;
    }
  }

  const payloadWithoutCRC = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
  const crc = crc16(payloadWithoutCRC);
  return `${payloadWithoutCRC}${crc}`;
}

/**
 * Generates the perfect deep link URL to open a mobile banking app with filled transaction info.
 * Universal Link VietQR Paylink: https://dl.vietqr.co/pay?app=${selected_bank_code}&ba=${account_number}@${bank_code}&am=${amount}&tn=${encodeURIComponent(memo)}
 */
export function generateBankDeepLink(params: {
  bankCode: string;
  bankBin?: string;
  accountNumber: string;
  amount: number;
  memo: string;
}): string {
  const { bankCode, bankBin, accountNumber, amount, memo } = params;
  const rawCleanMemo = (memo || "Chuyen khoan SplitMate")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);

  const cleanMemo = encodeURIComponent(rawCleanMemo || "Chuyen khoan SplitMate");
  const roundedAmount = Math.round(amount);
  const cleanAccount = (accountNumber || "").replace(/\s+/g, "").trim();
  const codeLower = (bankCode || "").toLowerCase().trim();
  const bankIdentifier = bankBin || getBankBin(bankCode) || codeLower;

  // MoMo: dùng Universal Link chính thức MoMo nhantien.momo.vn hoặc VietQR Paylink mở mượt P2P không bị lỗi đơn hàng
  if (codeLower === "momo") {
    // Nếu là SĐT MoMo (bắt đầu bằng 0) -> dùng Universal Link nhantien.momo.vn
    if (/^0\d{9,10}$/.test(cleanAccount)) {
      return `https://nhantien.momo.vn/${cleanAccount}/${roundedAmount}`;
    }
    // Hoặc VietQR Paylink chuẩn cho ví MoMo
    return `https://dl.vietqr.co/pay?app=momo&ba=${cleanAccount}@momo&am=${roundedAmount}&tn=${cleanMemo}`;
  }

  // Universal Link VietQR Paylink mở thẳng ứng dụng ngân hàng di động
  return `https://dl.vietqr.co/pay?app=${codeLower}&ba=${cleanAccount}@${bankIdentifier}&am=${roundedAmount}&tn=${cleanMemo}`;
}

/**
 * Scans a base64 image (data URL) for any QR codes and returns raw text if found.
 */
export function scanQrFromImage(base64Image: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          resolve(code ? code.data : null);
        } catch (e) {
          console.error("Lỗi khi giải mã QR từ ảnh tải lên:", e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = base64Image;
  });
}
