import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import Jimp from "jimp";
import bcrypt from "bcryptjs";
import { MOCK_GROUPS } from "../src/utils/mockData.js";
import { Group } from "../src/types.js";

// In-memory cache cho các file storage đã tải về server để giảm 100% Supabase Storage Egress trên các lượt xem lặp lại
interface CachedStorageFile {
  buffer: Buffer;
  mimeType: string;
  etag: string;
  timestamp: number;
}

const fileMemoryCache = new Map<string, CachedStorageFile>();
const MAX_CACHE_ENTRIES = 250; // Lưu tối đa 250 ảnh trong RAM (~30MB)

function getCachedStorageFile(fileName: string): CachedStorageFile | undefined {
  return fileMemoryCache.get(fileName);
}

function setCachedStorageFile(fileName: string, buffer: Buffer, mimeType: string) {
  if (fileMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = fileMemoryCache.keys().next().value;
    if (oldestKey) fileMemoryCache.delete(oldestKey);
  }
  const etag = `W/"${Buffer.from(fileName).toString("base64")}-${buffer.length}"`;
  fileMemoryCache.set(fileName, {
    buffer,
    mimeType,
    etag,
    timestamp: Date.now(),
  });
}

async function compressBufferWithJimp(inputBuffer: Buffer, maxDimension = 1200, quality = 75): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const image = await Jimp.read(inputBuffer);
    const width = image.getWidth();
    const height = image.getHeight();

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        image.resize(maxDimension, Jimp.AUTO);
      } else {
        image.resize(Jimp.AUTO, maxDimension);
      }
    }

    image.quality(quality);
    const compressedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return { buffer: compressedBuffer, mimeType: "image/jpeg" };
  } catch (err) {
    console.warn("[STORAGE OPTIMIZE] Lỗi nén bằng Jimp, giữ nguyên buffer gốc:", err);
    return { buffer: inputBuffer, mimeType: "image/jpeg" };
  }
}

// Supabase Client setup
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

let supabaseDb: any = null;
let supabaseInitError: string | null = null;
let isUsingServiceRole = false;

console.log(`[DEBUG] ENV check - SUPABASE_URL: ${process.env.SUPABASE_URL ? "Defined" : "Undefined"}, NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "Defined" : "Undefined"}`);

if (supabaseUrl && (supabaseServiceKey || supabaseAnonKey)) {
  try {
    // Ưu tiên sử dụng Service Role Key (nếu có) trên server-side để bypass RLS một cách an toàn
    const activeKey = supabaseServiceKey || supabaseAnonKey;
    isUsingServiceRole = !!supabaseServiceKey;
    console.log(`[DEBUG] SUPABASE_URL: ${supabaseUrl ? "Defined" : "Undefined"}, Key present: ${!!activeKey}`);
    supabaseDb = createClient(supabaseUrl, activeKey);
    console.log(`[SUPABASE] Khởi tạo Supabase Client thành công. Sử dụng: ${isUsingServiceRole ? "Service Role Key (Bypass RLS)" : "Anon Key (Cần cấu hình RLS Policy nếu tải ảnh)"}`);
  } catch (e: any) {
    console.error("[SUPABASE] Lỗi khởi tạo Client:", e);
    supabaseInitError = e.message;
  }
} else if (!supabaseUrl) {
  supabaseInitError = "Thiếu cấu hình SUPABASE_URL.";
  console.error("[SUPABASE] Thiếu SUPABASE_URL.");
} else {
  supabaseInitError = "Thiếu mã khóa bảo mật (SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).";
  console.warn("[SUPABASE] Thiếu mã khóa. Hệ thống sử dụng offline file DB.");
}

// Supabase helper functions for Vercel/Prod serverless environment
async function supabaseUploadImage(base64Data: string, fileName: string): Promise<string> {
  if (!supabaseDb) {
    throw new Error("Cơ sở dữ liệu Supabase chưa được cấu hình hoặc khởi tạo.");
  }
  
  try {
    const bucketName = "Split Mate";
    
    // Thử tạo bucket nếu chưa tồn tại (yêu cầu Service Role Key hoặc quyền Admin trong Supabase)
    try {
      await supabaseDb.storage.createBucket(bucketName, { public: true });
    } catch (e) {
      // Bỏ qua lỗi nếu bucket đã tồn tại hoặc không đủ quyền tạo tự động
    }

    // Tách phần header của base64 (data:image/png;base64,...)
    const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    let buffer = Buffer.from(base64Content, "base64");
    
    // Xác định mimeType
    let mimeType = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      mimeType = base64Data.split(",")[0].split(":")[1].split(";")[0];
    }

    // Tối ưu nén ảnh phía server nếu dung lượng buffer > 120KB
    if (buffer.length > 120 * 1024) {
      try {
        const compressed = await compressBufferWithJimp(buffer, 1200, 75);
        buffer = compressed.buffer;
        mimeType = compressed.mimeType;
        console.log(`[STORAGE OPTIMIZE] Đã nén file ${fileName} xuống còn ${(buffer.length / 1024).toFixed(1)} KB trước khi đẩy lên Supabase Storage.`);
      } catch (e) {
        console.warn("[STORAGE OPTIMIZE] Lỗi nén file server, đẩy bản gốc:", e);
      }
    }

    const { data, error } = await supabaseDb.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "31536000"
      });

    if (error) {
      console.error("Supabase storage upload error:", error.message);
      if (error.message.toLowerCase().includes("row-level security") || error.message.toLowerCase().includes("violates row-level security")) {
        console.warn("Lỗi Row-Level Security (RLS) hoặc chưa cấu hình đúng Storage. Fallback sang lưu Base64 trực tiếp.");
        return base64Data; // Fallback to storing raw base64 string
      }
      throw new Error(error.message);
    }

    // Cập nhật ngay vào Memory Cache để các yêu cầu xem ảnh tiếp theo đọc trực tiếp từ RAM
    setCachedStorageFile(fileName, buffer, mimeType);
    setCachedStorageFile(decodeURIComponent(fileName), buffer, mimeType);

    return `/api/receipt/view/${fileName}`;
  } catch (err: any) {
    console.error("supabaseUploadImage exception:", err);
    // Fallback if any other setup issue occurs
    return base64Data;
  }
}

async function deleteFileFromStorage(fileName: string) {
  try {
    const bucketName = "Split Mate";
    const decodedFileName = decodeURIComponent(fileName);
    fileMemoryCache.delete(fileName);
    fileMemoryCache.delete(decodedFileName);
    console.log(`[STORAGE] Cố gắng xóa file: ${decodedFileName}`);
    const { error } = await supabaseDb.storage.from(bucketName).remove([decodedFileName]);
    if (error) {
      console.error(`[STORAGE] Lỗi xóa file ${decodedFileName}:`, error.message);
    } else {
      console.log(`[STORAGE] Đã xóa thành công file: ${decodedFileName}`);
    }
  } catch (err) {
    console.error(`[STORAGE] Lỗi exception khi xóa file ${fileName}:`, err);
  }
}

function getGroupStorageFiles(group: Group): Set<string> {
  const files = new Set<string>();
  
  const extractFile = (url: string | undefined | null) => {
    if (url && url.startsWith("/api/receipt/view/")) {
      const fileName = url.split("/api/receipt/view/")[1];
      if (fileName) {
        files.add(decodeURIComponent(fileName));
      }
    }
  };

  extractFile(group.imageUrl);
  extractFile(group.momoQrImage);
  extractFile(group.bankQrImage);

  if (group.members && Array.isArray(group.members)) {
    group.members.forEach((m: any) => {
      extractFile(m.avatar);
      extractFile(m.momoQrImage);
      extractFile(m.bankQrImage);
    });
  }

  if (group.pendingReceipts && Array.isArray(group.pendingReceipts)) {
    group.pendingReceipts.forEach((r: any) => {
      extractFile(r.receiptImage);
    });
  }

  if (group.expenses && Array.isArray(group.expenses)) {
    group.expenses.forEach((e: any) => {
      extractFile(e.receiptImage);
    });
  }

  return files;
}

async function deleteOrphanedGroupFiles(oldGroup: Group, newGroup: Group) {
  try {
    const oldFiles = getGroupStorageFiles(oldGroup);
    const newFiles = getGroupStorageFiles(newGroup);

    for (const file of oldFiles) {
      if (!newFiles.has(file)) {
        console.log(`[CLEANUP] Phát hiện ảnh không dùng nữa, tiến hành dọn dẹp khỏi storage: ${file}`);
        await deleteFileFromStorage(file);
      }
    }
  } catch (err) {
    console.error("[CLEANUP] Lỗi khi dọn dẹp ảnh mồ côi:", err);
  }
}

async function supabaseGetLeader(email: string): Promise<any | null> {
  if (!supabaseDb) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabaseDb
      .from("leaders")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();
    
    if (error) {
      console.error("Supabase get leader database error:", error.message || error);
      throw error;
    }
    
    if (data && data.displayName && data.displayName.includes(" ||| ")) {
      const parts = data.displayName.split(" ||| ");
      data.displayName = parts[0] || "";
      data.bankAccountName = parts[1] || "";
      data.bankAccount = parts[2] || "";
      data.bankCode = parts[3] || "";
      data.fundType = parts[4] || "";
      data.avatar = parts[5] || ""; // Trích xuất avatar đã đóng gói
    }
    
    return data;
  } catch (err: any) {
    console.error("Supabase get leader error:", err.message || err);
    throw err;
  }
}

async function supabaseSaveLeader(leader: any): Promise<boolean> {
  if (!supabaseDb) return false;
  try {
    const cleanEmail = leader.email.trim().toLowerCase();
    
    // Đóng gói thông tin ngân hàng mở rộng và avatar vào displayName để tránh lỗi schema của Supabase
    const bankAccount = leader.bankAccount || "";
    const bankCode = leader.bankCode || "";
    const bankAccountName = leader.bankAccountName || "";
    const fundType = leader.fundType || "";
    const avatar = leader.avatar || "";
    
    const baseDisplayName = (leader.displayName || "").split(" ||| ")[0];
    const packedDisplayName = `${baseDisplayName} ||| ${bankAccountName} ||| ${bankAccount} ||| ${bankCode} ||| ${fundType} ||| ${avatar}`;
    
    // Tạo bản sao đối tượng để lưu và xóa các cột không được định nghĩa trong schema của Supabase
    const dbLeader = { ...leader };
    delete dbLeader.bankAccount;
    delete dbLeader.bankCode;
    delete dbLeader.bankAccountName;
    delete dbLeader.fundType;
    delete dbLeader.avatar;
    delete dbLeader.photoURL;
    
    dbLeader.displayName = packedDisplayName;
    
    const cleanLeader = removeUndefinedFields(dbLeader);
    
    const { error } = await supabaseDb
      .from("leaders")
      .upsert({ email: cleanEmail, ...cleanLeader });
    
    if (error) {
      console.error("Supabase save leader error:", error.message || error);
      throw error;
    }
    return true;
  } catch (err: any) {
    console.error("Supabase save leader error:", err.message || err);
    throw err;
  }
}

// Biến cache để tránh kiểm tra cấu trúc bảng liên tục
let groupsTableHasDataColumn: boolean | null = null;

async function checkGroupsSchema(): Promise<boolean> {
  if (groupsTableHasDataColumn !== null) return groupsTableHasDataColumn;
  if (!supabaseDb) return false;
  try {
    const { data, error } = await supabaseDb
      .from("groups")
      .select("data")
      .limit(1);
    
    if (error) {
      const errMsg = error.message || String(error);
      if (errMsg.includes("column") && errMsg.includes("does not exist")) {
        console.log("[SUPABASE HYBRID SCHEMA] Phát hiện bảng 'groups' KHÔNG có cột 'data'. Kích hoạt chế độ tự động đóng gói Auto-Pack.");
        groupsTableHasDataColumn = false;
        return false;
      }
    }
    groupsTableHasDataColumn = true;
    return true;
  } catch (err) {
    groupsTableHasDataColumn = true;
    return true;
  }
}

function unpackGroupRow(row: any): Group {
  if (!row) return row;
  
  let name = "";
  let ownerId = "";
  let members: any[] = [];
  let memberAccessCodes: string[] = [];
  let fundPhone = "";
  let momoPhone = "";
  let momoQrImage = "";
  let expenses: any[] = [];
  let debtOffsets: any[] = [];
  let billingCycles: any[] = [];
  
  let packedAllow: any = undefined;
  if (row.expenses) {
    try {
      const parsed = typeof row.expenses === "string" ? JSON.parse(row.expenses) : row.expenses;
      if (parsed && typeof parsed === "object" && parsed.__isPacked) {
        name = parsed.name || "";
        ownerId = parsed.ownerId || "";
        members = parsed.members || [];
        memberAccessCodes = parsed.memberAccessCodes || [];
        fundPhone = parsed.fundPhone || "";
        momoPhone = parsed.momoPhone || "";
        momoQrImage = parsed.momoQrImage || "";
        expenses = parsed.expenses || [];
        debtOffsets = parsed.debtOffsets || [];
        billingCycles = parsed.billingCycles || [];
        if (parsed.allowMemberAddExpense !== undefined) {
          packedAllow = parsed.allowMemberAddExpense;
        }
      } else if (Array.isArray(parsed)) {
        expenses = parsed;
      }
    } catch (e) {
      console.error("[SUPABASE UNPACK ERROR] Không thể giải nén mảng expenses:", e);
    }
  }

  if (row.billing_cycles) {
    try {
      billingCycles = typeof row.billing_cycles === "string" ? JSON.parse(row.billing_cycles) : row.billing_cycles;
    } catch (e) {
      console.error("[SUPABASE UNPACK ERROR] Không thể giải nén billing_cycles:", e);
    }
  } else if (row.billingCycles) {
    try {
      billingCycles = typeof row.billingCycles === "string" ? JSON.parse(row.billingCycles) : row.billingCycles;
    } catch (e) {
      console.error("[SUPABASE UNPACK ERROR] Không thể giải nén billingCycles:", e);
    }
  }

  let rawAllow = row.allowMemberAddExpense !== undefined ? row.allowMemberAddExpense : row.allow_member_add_expense;
  if (rawAllow === undefined && packedAllow !== undefined) {
    rawAllow = packedAllow;
  }
  const allowMemberAddExpense = rawAllow === undefined || rawAllow === null ? true : (rawAllow !== false && rawAllow !== "false" && rawAllow !== 0);
  
  return {
    id: row.id || row["Document ID"],
    name: name || row.name || "",
    ownerId: ownerId || row.ownerId || "",
    createdAt: row.createdAt || "",
    allowMemberAddExpense: allowMemberAddExpense,
    fundType: row.fundType || "momo",
    fundQrImage: row.fundQrImage || momoQrImage || "",
    fundPhone: fundPhone || row.fundPhone || "",
    momoPhone: momoPhone || row.momoPhone || "",
    momoQrImage: momoQrImage || row.momoQrImage || "",
    expenses: expenses,
    members: members,
    memberAccessCodes: memberAccessCodes,
    debtOffsets: debtOffsets || [],
    billingCycles: billingCycles || []
  };
}

async function supabaseGetGroupsByOwnerOrEmail(ownerId: string, email?: string, fallbackOwnerId?: string): Promise<Group[]> {
  if (!supabaseDb) return [];
  try {
    const hasDataCol = await checkGroupsSchema();
    const hasExtra = await hasExtraColumns();
    const hasPlanCols = await hasPlanColumns();
    const hasBillingCols = await hasBillingCyclesColumns();
    const cleanEmail = email?.trim()?.toLowerCase();
    
    let allGroups: Group[] = [];
    if (hasDataCol) {
      let selectTarget = hasExtra ? "data, members, expenses, pending_receipts" : "data";
      if (hasPlanCols) {
        selectTarget += ", plan, plan_activated_at, plan_expired_at";
      }
      if (hasBillingCols) {
        selectTarget += ", billing_cycles";
      }
      
      const { data, error } = await supabaseDb.from("groups").select(selectTarget);
      if (error) {
        console.error("Supabase getGroups error (Data layout):", error.message || error);
        throw error;
      }
      
      allGroups = await Promise.all(((data || []).filter((row: any) => row.data) as any[]).map(async (row: any) => {
        let groupData = (row.data || {}) as Group;
        if (hasExtra && groupData) {
          if (row.members) groupData.members = row.members;
          if (row.expenses) groupData.expenses = row.expenses;
          if (row.pending_receipts) groupData.pendingReceipts = row.pending_receipts;
        }
        if (hasPlanCols && groupData) {
          if (row.plan) groupData.plan = row.plan;
          if (row.plan_activated_at) groupData.planActivatedAt = row.plan_activated_at;
          if (row.plan_expired_at) groupData.planExpiredAt = row.plan_expired_at;
        }
        if (hasBillingCols && row.billing_cycles) {
          groupData.billingCycles = typeof row.billing_cycles === "string" ? JSON.parse(row.billing_cycles) : row.billing_cycles;
        }
        if (groupData) {
          if (!groupData.billingCycles) groupData.billingCycles = [];
          if (groupData.allowMemberAddExpense === undefined || groupData.allowMemberAddExpense === null) {
            groupData.allowMemberAddExpense = true;
          }
          await autoSyncGroupPlanColumns(row, groupData);
        }
        return groupData;
      }));
    } else {
      // Bảng phẳng không có cột ownerId để filter qua SQL, load các cột phẳng rồi filter tại server
      const allowMemberCol = await getAllowMemberAddExpenseCol();
      let selectCols = "id, createdAt, expenses, fundQrImage, fundType, billing_cycles";
      if (allowMemberCol === "camel") selectCols += ", allowMemberAddExpense";
      if (allowMemberCol === "snake") selectCols += ", allow_member_add_expense";
      const { data, error } = await supabaseDb
        .from("groups")
        .select(selectCols);
        
      if (error) {
        console.error("Supabase getGroups error (Flat layout):", error.message || error);
        throw error;
      }
      
      allGroups = (data || []).map(unpackGroupRow);
    }

    // Filter by ownerId and/or cleanEmail accurately
    const filtered = allGroups.filter((g) => {
      const isOwner = ownerId ? (g.ownerId === ownerId || (fallbackOwnerId && g.ownerId === fallbackOwnerId)) : false;
      const isMember = cleanEmail ? (g.members || []).some((m: any) => m.email && m.email.trim().toLowerCase() === cleanEmail) : false;
      return isOwner || isMember;
    });

    // Deduplicate by group ID
    const combinedMap = new Map<string, Group>();
    for (const g of filtered) {
      combinedMap.set(g.id, g);
    }
    
    return Array.from(combinedMap.values());
  } catch (err: any) {
    console.error("Supabase getGroupsByOwnerOrEmail exception caught:", err.message || err);
    return [];
  }
}

async function supabaseGetGroupById(id: string): Promise<Group | null> {
  if (!supabaseDb) return null;
  try {
    const hasDataCol = await checkGroupsSchema();
    const hasExtra = await hasExtraColumns();
    const hasPlanCols = await hasPlanColumns();
    const hasBillingCols = await hasBillingCyclesColumns();
    if (hasDataCol) {
      let selectTarget = hasExtra ? "data, members, expenses, pending_receipts" : "data";
      if (hasPlanCols) {
        selectTarget += ", plan, plan_activated_at, plan_expired_at";
      }
      if (hasBillingCols) {
        selectTarget += ", billing_cycles";
      }
      const { data, error } = await supabaseDb
        .from("groups")
        .select(selectTarget)
        .eq("id", id)
        .maybeSingle();
        
      if (error) {
        console.error("Supabase getGroupById error (Data layout):", error.message || error);
        throw error;
      }
      
      if (!data) return null;
      let groupData = (data.data || {}) as Group;
      if (hasExtra && groupData) {
        if (data.members) groupData.members = data.members;
        if (data.expenses) groupData.expenses = data.expenses;
        if (data.pending_receipts) groupData.pendingReceipts = data.pending_receipts;
      }
      if (hasPlanCols && groupData) {
        if (data.plan) groupData.plan = data.plan;
        if (data.plan_activated_at) groupData.planActivatedAt = data.plan_activated_at;
        if (data.plan_expired_at) groupData.planExpiredAt = data.plan_expired_at;
      }
      if (hasBillingCols && data.billing_cycles) {
        groupData.billingCycles = typeof data.billing_cycles === "string" ? JSON.parse(data.billing_cycles) : data.billing_cycles;
      }
      if (groupData) {
        if (!groupData.billingCycles) groupData.billingCycles = [];
        if (groupData.allowMemberAddExpense === undefined || groupData.allowMemberAddExpense === null) {
          groupData.allowMemberAddExpense = true;
        }
        await autoSyncGroupPlanColumns(data, groupData);
      }
      return groupData;
    } else {
      const allowMemberCol = await getAllowMemberAddExpenseCol();
      let selectCols = "id, createdAt, expenses, fundQrImage, fundType, billing_cycles";
      if (allowMemberCol === "camel") selectCols += ", allowMemberAddExpense";
      if (allowMemberCol === "snake") selectCols += ", allow_member_add_expense";
      const { data, error } = await supabaseDb
        .from("groups")
        .select(selectCols)
        .eq("id", id)
        .maybeSingle();
        
      if (error) {
        console.error("Supabase getGroupById error (Flat layout):", error.message || error);
        throw error;
      }
      if (!data) return null;
      return unpackGroupRow(data);
    }
  } catch (err: any) {
    console.error("Supabase getGroupById exception caught:", err.message || err);
    return null;
  }
}

async function checkGroupsSchemaAllowMemberAddExpenseColumns(): Promise<"snake" | "camel" | null> {
  if (!supabaseDb) return null;
  try {
    const { error: errSnake } = await supabaseDb
      .from("groups")
      .select("allow_member_add_expense")
      .limit(1);
    if (!errSnake) return "snake";

    const { error: errCamel } = await supabaseDb
      .from("groups")
      .select("allowMemberAddExpense")
      .limit(1);
    if (!errCamel) return "camel";

    return null;
  } catch (err) {
    return null;
  }
}

let groupsTableAllowMemberCol: "snake" | "camel" | null | undefined = undefined;
async function getAllowMemberAddExpenseCol(): Promise<"snake" | "camel" | null> {
  if (groupsTableAllowMemberCol !== undefined) return groupsTableAllowMemberCol;
  groupsTableAllowMemberCol = await checkGroupsSchemaAllowMemberAddExpenseColumns();
  return groupsTableAllowMemberCol;
}

async function checkGroupsSchemaBillingCyclesColumns(): Promise<boolean> {
  if (!supabaseDb) return false;
  try {
    const { error } = await supabaseDb
      .from("groups")
      .select("billing_cycles")
      .limit(1);
    
    if (error) {
      return false; // Columns likely do not exist
    }
    return true; // Columns exist
  } catch (err) {
    return false;
  }
}

let groupsTableHasBillingCyclesColumns: boolean | null = null;
async function hasBillingCyclesColumns(): Promise<boolean> {
  if (groupsTableHasBillingCyclesColumns !== null) return groupsTableHasBillingCyclesColumns;
  groupsTableHasBillingCyclesColumns = await checkGroupsSchemaBillingCyclesColumns();
  return groupsTableHasBillingCyclesColumns;
}

async function checkGroupsSchemaExtraColumns(): Promise<boolean> {
  if (!supabaseDb) return false;
  try {
    const { error } = await supabaseDb
      .from("groups")
      .select("members, expenses, pending_receipts")
      .limit(1);
    
    if (error) {
      return false; // Columns likely do not exist
    }
    return true; // Columns exist
  } catch (err) {
    return false;
  }
}

let groupsTableHasExtraColumns: boolean | null = null;
async function hasExtraColumns(): Promise<boolean> {
  if (groupsTableHasExtraColumns !== null) return groupsTableHasExtraColumns;
  groupsTableHasExtraColumns = await checkGroupsSchemaExtraColumns();
  return groupsTableHasExtraColumns;
}

async function checkGroupsSchemaPlanColumns(): Promise<boolean> {
  if (!supabaseDb) return false;
  try {
    const { error } = await supabaseDb
      .from("groups")
      .select("plan, plan_activated_at, plan_expired_at")
      .limit(1);
    
    if (error) {
      return false; // Columns likely do not exist
    }
    return true; // Columns exist
  } catch (err) {
    return false;
  }
}

let groupsTableHasPlanColumns: boolean | null = null;
async function hasPlanColumns(): Promise<boolean> {
  if (groupsTableHasPlanColumns !== null) return groupsTableHasPlanColumns;
  groupsTableHasPlanColumns = await checkGroupsSchemaPlanColumns();
  return groupsTableHasPlanColumns;
}

function normalizePlanValue(p?: string | null): string {
  if (!p) return "FREE";
  const val = p.toUpperCase().trim();
  if (val === "PREMIUM") return "HOI_LANG";
  if (val === "VIP") return "BE_BAN";
  return val;
}

function formatVNTime(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null;
  try {
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      const trimmed = String(dateInput).trim();
      if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      return trimmed;
    }
    
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const vnTime = new Date(utcTime + (3600000 * 7)); // UTC + 7

    const hh = String(vnTime.getHours()).padStart(2, "0");
    const mm = String(vnTime.getMinutes()).padStart(2, "0");
    const dd = String(vnTime.getDate()).padStart(2, "0");
    const MM = String(vnTime.getMonth() + 1).padStart(2, "0");
    const yyyy = vnTime.getFullYear();

    return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
  } catch {
    return typeof dateInput === "string" ? dateInput : null;
  }
}

async function autoSyncGroupPlanColumns(row: any, groupData: Group): Promise<boolean> {
  if (!supabaseDb) return false;
  try {
    const hasPlanCols = await hasPlanColumns();
    if (!hasPlanCols) return false;

    let needsUpdate = false;
    
    const rowPlanNormalized = normalizePlanValue(row.plan);
    const dataPlanNormalized = normalizePlanValue(groupData.plan);
    
    groupData.plan = dataPlanNormalized as any;
    
    if (row.plan === null || row.plan === undefined || rowPlanNormalized !== dataPlanNormalized || row.plan !== dataPlanNormalized) {
      needsUpdate = true;
    }

    const currentActivated = row.plan_activated_at;
    const dataActivated = groupData.planActivatedAt;
    let targetActivated = currentActivated;
    
    if (dataActivated) {
      const formattedDataActivated = formatVNTime(dataActivated);
      if (formattedDataActivated && formattedDataActivated !== currentActivated) {
        targetActivated = formattedDataActivated;
        needsUpdate = true;
      }
    } else if (currentActivated && (currentActivated.includes("T") || currentActivated.includes("Z"))) {
      targetActivated = formatVNTime(currentActivated);
      needsUpdate = true;
    }

    const currentExpired = row.plan_expired_at;
    const dataExpired = groupData.planExpiredAt;
    let targetExpired = currentExpired;

    if (dataExpired) {
      const formattedDataExpired = formatVNTime(dataExpired);
      if (formattedDataExpired && formattedDataExpired !== currentExpired) {
        targetExpired = formattedDataExpired;
        needsUpdate = true;
      }
    } else if (currentExpired && (currentExpired.includes("T") || currentExpired.includes("Z"))) {
      targetExpired = formatVNTime(currentExpired);
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`[AUTO-SYNC-PLAN] Đồng bộ lại các cột phẳng gói cước cho nhóm: ${groupData.name} (${groupData.id})`);
      groupData.plan = dataPlanNormalized as any;
      if (targetActivated) groupData.planActivatedAt = targetActivated;
      if (targetExpired) groupData.planExpiredAt = targetExpired;
      
      await supabaseSaveGroup(groupData);
      return true;
    }
  } catch (err) {
    console.error("[AUTO-SYNC-PLAN] Lỗi khi tự động đồng bộ gói cước nhóm:", err);
  }
  return false;
}

function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  }
  if (typeof obj === "object") {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        clean[key] = removeUndefinedFields(obj[key]);
      }
    }
    return clean;
  }
  return obj;
}

async function supabaseSaveGroup(group: Group): Promise<boolean> {
  if (!supabaseDb) {
    console.error("Supabase DB is not initialized.");
    return false;
  }
  try {
    console.log("[SUPABASE] Đang lưu nhóm cùng cơ chế thích ứng tự phục hồi:", group.id);
    const cleanGroup = removeUndefinedFields(group);
    
    // Luôn đồng bộ và đảm bảo memberAccessCodes được gom đầy đủ từ mảng members
    if (cleanGroup.members && Array.isArray(cleanGroup.members)) {
      const codesFromMembers = cleanGroup.members.map((m: any) => m.accessCode?.trim()?.toUpperCase() || "").filter(Boolean);
      const existingCodes = Array.isArray(cleanGroup.memberAccessCodes) ? cleanGroup.memberAccessCodes.map((c: string) => c?.trim()?.toUpperCase()).filter(Boolean) : [];
      cleanGroup.memberAccessCodes = Array.from(new Set([...codesFromMembers, ...existingCodes]));
    }

    const hasDataCol = await checkGroupsSchema();
    const hasExtra = await hasExtraColumns();
    const hasBillingCols = await hasBillingCyclesColumns();
    const allowMemberCol = await getAllowMemberAddExpenseCol();
    
    if (hasDataCol) {
      if (cleanGroup.planActivatedAt) {
        cleanGroup.planActivatedAt = formatVNTime(cleanGroup.planActivatedAt);
      }
      if (cleanGroup.planExpiredAt) {
        cleanGroup.planExpiredAt = formatVNTime(cleanGroup.planExpiredAt);
      }

      const dataGroup = {
        ...cleanGroup,
        allowMemberAddExpense: cleanGroup.allowMemberAddExpense !== false,
        memberAccessCodes: cleanGroup.memberAccessCodes || []
      };
      if (hasExtra) {
        delete dataGroup.members;
        delete dataGroup.expenses;
        delete dataGroup.pendingReceipts;
      }
      if (hasBillingCols) {
        delete dataGroup.billingCycles;
      }

      const upsertPayload: any = {
        id: cleanGroup.id,
        ownerId: cleanGroup.ownerId,
        name: cleanGroup.name,
        memberAccessCodes: cleanGroup.memberAccessCodes || [],
        data: dataGroup,
        createdAt: cleanGroup.createdAt || new Date().toISOString()
      };

      if (allowMemberCol === "snake") {
        upsertPayload.allow_member_add_expense = cleanGroup.allowMemberAddExpense !== false;
      } else if (allowMemberCol === "camel") {
        upsertPayload.allowMemberAddExpense = cleanGroup.allowMemberAddExpense !== false;
      }

      if (hasExtra) {
        upsertPayload.members = cleanGroup.members || [];
        upsertPayload.expenses = cleanGroup.expenses || [];
        upsertPayload.pending_receipts = cleanGroup.pendingReceipts || [];
      }

      if (hasBillingCols) {
        upsertPayload.billing_cycles = cleanGroup.billingCycles || [];
      }

      const hasPlanCols = await hasPlanColumns();
      if (hasPlanCols) {
        upsertPayload.plan = normalizePlanValue(cleanGroup.plan) || "FREE";
        upsertPayload.plan_activated_at = cleanGroup.planActivatedAt || null;
        upsertPayload.plan_expired_at = cleanGroup.planExpiredAt || null;
      }

      const { error } = await supabaseDb
        .from("groups")
        .upsert(upsertPayload, { onConflict: "id" });
        
      if (error) {
        console.error("Supabase saveGroup error (Data layout):", error.message || error);
        throw error;
      }
    } else {
      // Đóng gói toàn bộ cấu trúc đầy đủ của group (bao gồm members, accessCodes, tên nhóm...) vào trong trường expenses
      const packedExpenses = JSON.stringify({
        __isPacked: true,
        name: cleanGroup.name,
        ownerId: cleanGroup.ownerId,
        allowMemberAddExpense: cleanGroup.allowMemberAddExpense !== false,
        members: cleanGroup.members || [],
        memberAccessCodes: cleanGroup.memberAccessCodes || [],
        fundPhone: cleanGroup.fundPhone || "",
        momoPhone: cleanGroup.momoPhone || "",
        momoQrImage: cleanGroup.momoQrImage || "",
        expenses: cleanGroup.expenses || [],
        debtOffsets: cleanGroup.debtOffsets || [],
        billingCycles: cleanGroup.billingCycles || []
      });
      
      const payload: any = {
        id: cleanGroup.id,
        "Document ID": cleanGroup.id,
        createdAt: cleanGroup.createdAt || new Date().toISOString(),
        expenses: packedExpenses,
        fundQrImage: cleanGroup.fundQrImage || cleanGroup.momoQrImage || "",
        fundType: cleanGroup.fundType || "momo"
      };

      if (allowMemberCol === "camel") {
        payload.allowMemberAddExpense = cleanGroup.allowMemberAddExpense ? "true" : "false";
      } else if (allowMemberCol === "snake") {
        payload.allow_member_add_expense = cleanGroup.allowMemberAddExpense ? "true" : "false";
      }
      
      console.log("[SUPABASE AUTO-PACK] Thực hiện upsert phẳng hóa:", { 
        id: payload.id, 
        fundType: payload.fundType, 
        hasQr: !!payload.fundQrImage, 
        packedLen: packedExpenses.length 
      });
      
      const { error } = await supabaseDb
        .from("groups")
        .upsert(payload, { onConflict: "id" });
        
      if (error) {
        console.error("Supabase saveGroup error (Flat layout):", error.message || error);
        throw error;
      }
    }
    console.log("[SUPABASE] Lưu group thích ứng lên Supabase thành công!");
    return true;
  } catch (err: any) {
    console.error("Supabase saveGroup exception caught:", err.message || err);
    throw new Error(`Dữ liệu Supabase lưu thất bại: ${err.message || err}`);
  }
}

async function autoConvertGroupBase64Images(group: Group): Promise<{ updated: boolean; group: Group }> {
  if (!supabaseDb) return { updated: false, group };
  
  let changed = false;
  const updatedGroup = JSON.parse(JSON.stringify(group)) as Group;

  const convertField = async (val: string | undefined, prefix: string): Promise<string | undefined> => {
    if (val && val.startsWith("data:image/")) {
      if (val.length < 100) return val; // Skip corrupted/short strings
      const timestamp = Date.now();
      const rand = Math.floor(Math.random() * 10000);
      
      // Determine file extension
      let ext = "jpg";
      const matches = val.match(/^data:image\/([A-Za-z-+]+);base64,/);
      if (matches && matches[1]) {
        ext = matches[1];
      }
      
      const fileName = `${group.id}/${prefix}_${timestamp}_${rand}.${ext}`;
      console.log(`[AUTO-CONVERT] Đang lưu ảnh Base64 sang Storage cho: ${prefix}`);
      try {
        const publicUrl = await supabaseUploadImage(val, fileName);
        if (publicUrl) {
          changed = true;
          return publicUrl;
        }
      } catch (err: any) {
        console.error(`[AUTO-CONVERT] Lỗi convert ảnh cho ${prefix}:`, err.message || err);
      }
    }
    return val;
  };

  // Convert Group image
  if (updatedGroup.imageUrl) {
    updatedGroup.imageUrl = await convertField(updatedGroup.imageUrl, "group_img");
  }

  // Convert Momo Qr and Bank Qr
  if (updatedGroup.momoQrImage) {
    updatedGroup.momoQrImage = await convertField(updatedGroup.momoQrImage, "momo_qr");
  }
  if (updatedGroup.bankQrImage) {
    updatedGroup.bankQrImage = await convertField(updatedGroup.bankQrImage, "bank_qr");
  }

  // Convert members avatars
  if (updatedGroup.members && Array.isArray(updatedGroup.members)) {
    const updatedMembers = [];
    for (const m of updatedGroup.members) {
      if (m.avatar && m.avatar.startsWith("data:image/")) {
        const newAvatar = await convertField(m.avatar, `avatar_m_${m.id}`);
        updatedMembers.push({ ...m, avatar: newAvatar });
      } else {
        updatedMembers.push(m);
      }
    }
    updatedGroup.members = updatedMembers;
  }

  // Convert pending receipts images
  if (updatedGroup.pendingReceipts && Array.isArray(updatedGroup.pendingReceipts)) {
    const updatedPending = [];
    for (const rec of updatedGroup.pendingReceipts) {
      if (rec.receiptImage && rec.receiptImage.startsWith("data:image/")) {
        const newReceiptImg = await convertField(rec.receiptImage, `receipt_p_${rec.fromId}`);
        updatedPending.push({ ...rec, receiptImage: newReceiptImg });
      } else {
        updatedPending.push(rec);
      }
    }
    updatedGroup.pendingReceipts = updatedPending;
  }

  // Convert expenses receipts images
  if (updatedGroup.expenses && Array.isArray(updatedGroup.expenses)) {
    const updatedExpenses = [];
    for (const exp of updatedGroup.expenses) {
      if (exp.receiptImage && exp.receiptImage.startsWith("data:image/")) {
        const newReceiptImg = await convertField(exp.receiptImage, `receipt_e_${exp.id}`);
        updatedExpenses.push({ ...exp, receiptImage: newReceiptImg });
      } else {
        updatedExpenses.push(exp);
      }
    }
    updatedGroup.expenses = updatedExpenses;
  }

  return { updated: changed, group: updatedGroup };
}

function ensureSecureViewUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith("/api/receipt/view/")) return url;
  
  // Trích xuất fileName từ url dạng: https://[project-id].supabase.co/storage/v1/object/public/Split%20Mate/filename.jpg
  if (url.includes("/storage/v1/object/public/") || url.includes("/storage/v1/object/sign/")) {
    const marker = url.includes("/storage/v1/object/public/") ? "/storage/v1/object/public/" : "/storage/v1/object/sign/";
    const pathAfterMarker = url.split(marker)[1];
    if (pathAfterMarker) {
      const parts = pathAfterMarker.split("/");
      parts.shift(); // Xóa bucket name
      const fileName = parts.join("/");
      if (fileName) {
        return `/api/receipt/view/${decodeURIComponent(fileName)}`;
      }
    }
  }
  return url;
}

function secureGroupImages(group: Group): Group {
  const g = JSON.parse(JSON.stringify(group)) as Group;
  g.imageUrl = ensureSecureViewUrl(g.imageUrl);
  g.momoQrImage = ensureSecureViewUrl(g.momoQrImage);
  g.bankQrImage = ensureSecureViewUrl(g.bankQrImage);
  
  if (g.members && Array.isArray(g.members)) {
    g.members = g.members.map(m => ({
      ...m,
      avatar: ensureSecureViewUrl(m.avatar)
    }));
  }
  
  if (g.pendingReceipts && Array.isArray(g.pendingReceipts)) {
    g.pendingReceipts = g.pendingReceipts.map(r => ({
      ...r,
      receiptImage: ensureSecureViewUrl(r.receiptImage)
    }));
  }
  
  if (g.expenses && Array.isArray(g.expenses)) {
    g.expenses = g.expenses.map(e => ({
      ...e,
      receiptImage: ensureSecureViewUrl(e.receiptImage)
    }));
  }
  
  return g;
}

async function supabaseDeleteGroup(id: string): Promise<boolean> {
  if (!supabaseDb) {
    console.error("Supabase DB is not initialized.");
    return false;
  }
  try {
    console.log("[SUPABASE] Deleting group:", id);
    
    // Delete files in storage
    const bucketName = "Split Mate";
    const { data: files } = await supabaseDb.storage.from(bucketName).list(id, { limit: 1000 });
    if (files && files.length > 0) {
      const filePaths = files.map((f: any) => `${id}/${f.name}`);
      await supabaseDb.storage.from(bucketName).remove(filePaths);
      console.log(`[SUPABASE] Deleted ${files.length} files from storage folder: ${id}`);
    }

    const { error } = await supabaseDb
      .from("groups")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Supabase deleteGroup error:", error.message || error);
      throw error;
    }
    console.log("[SUPABASE] Successfully deleted group.");
    return true;
  } catch (err: any) {
    console.error("Supabase deleteGroup error:", err.message || err);
    return false;
  }
}

async function supabaseGetGroupByMemberAccessCode(code: string): Promise<Group | null> {
  if (!supabaseDb) return null;
  try {
    const cleanCode = code.trim().toUpperCase();
    const hasDataCol = await checkGroupsSchema();
    const hasExtra = await hasExtraColumns();
    const hasPlanCols = await hasPlanColumns();
    const hasBillingCols = await hasBillingCyclesColumns();

    if (hasDataCol) {
      let selectTarget = hasExtra ? "data, members, expenses, pending_receipts" : "data";
      if (hasPlanCols) selectTarget += ", plan, plan_activated_at, plan_expired_at";
      if (hasBillingCols) selectTarget += ", billing_cycles";

      // Quét tất cả các dòng nhóm trên Supabase để tìm kiếm chính xác
      const { data: allRows, error: errorAll } = await supabaseDb
        .from("groups")
        .select(selectTarget);
        
      if (!errorAll && allRows) {
        for (const row of allRows) {
          let g = (row.data || {}) as Group;
          if (hasExtra && g) {
            if (row.members) g.members = row.members;
            if (row.expenses) g.expenses = row.expenses;
            if (row.pending_receipts) g.pendingReceipts = row.pending_receipts;
          }
          if (hasPlanCols && g) {
            if (row.plan) g.plan = row.plan;
            if (row.plan_activated_at) g.planActivatedAt = row.plan_activated_at;
            if (row.plan_expired_at) g.planExpiredAt = row.plan_expired_at;
          }
          if (hasBillingCols && row.billing_cycles) {
            g.billingCycles = typeof row.billing_cycles === "string" ? JSON.parse(row.billing_cycles) : row.billing_cycles;
          }
          if (g && !g.billingCycles) {
            g.billingCycles = [];
          }

          const members = g.members || [];
          const matchMember = members.some((m: any) => m.accessCode && m.accessCode.trim().toUpperCase() === cleanCode);
          const matchCodes = (g.memberAccessCodes || []).some((c: string) => c && c.trim().toUpperCase() === cleanCode);

          if (matchMember || matchCodes) {
            console.log(`[AUTH] Tìm thấy nhóm thành công qua Access Code (${cleanCode}): ID=${g.id}, Tên=${g.name}`);
            return g;
          }
        }
      }
    } else {
      const allowMemberCol = await getAllowMemberAddExpenseCol();
      let selectCols = "id, createdAt, expenses, fundQrImage, fundType, billing_cycles";
      if (allowMemberCol === "camel") selectCols += ", allowMemberAddExpense";
      if (allowMemberCol === "snake") selectCols += ", allow_member_add_expense";
      const { data: allRows, error: errorAll } = await supabaseDb
        .from("groups")
        .select(selectCols);
        
      if (!errorAll && allRows) {
        for (const row of allRows) {
          const g = unpackGroupRow(row);
          if (g) {
            const matchMember = (g.members || []).some((m: any) => m.accessCode && m.accessCode.trim().toUpperCase() === cleanCode);
            const matchCodes = (g.memberAccessCodes || []).some((c: string) => c && c.trim().toUpperCase() === cleanCode);
            if (matchMember || matchCodes) {
              console.log(`[AUTH] Tìm thấy nhóm phẳng qua Access Code (${cleanCode}): ID=${g.id}, Tên=${g.name}`);
              return g;
            }
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error("Supabase getGroupByMemberAccessCode error:", err);
    return null;
  }
}

// File-based database configuration (for fallback/offline usage)
const DB_FILE = path.join(process.cwd(), "groups_db.json");
const LEADERS_FILE = path.join(process.cwd(), "leaders_db.json");

// In-memory data persistence fallback for serverless environments (Vercel)
let inMemoryLeaders: any[] | null = null;
let inMemoryGroups: Group[] | null = null;
let fsWriteErrorOccurred = false;

// Sync reading of local leaders file database
function readLeaders(): any[] {
  if (inMemoryLeaders) return inMemoryLeaders;
  try {
    if (!fs.existsSync(LEADERS_FILE)) {
      try {
        if (!fsWriteErrorOccurred) {
          fs.writeFileSync(LEADERS_FILE, JSON.stringify([], null, 2), "utf-8");
        }
      } catch (e) {
        fsWriteErrorOccurred = true;
        console.warn("[FS] Readonly filesystem detected for leaders, using memory.");
      }
      inMemoryLeaders = [];
      return [];
    }
    const data = fs.readFileSync(LEADERS_FILE, "utf-8");
    if (!data || data.trim() === "") {
        inMemoryLeaders = [];
    } else {
        try {
            inMemoryLeaders = JSON.parse(data) || [];
        } catch (e) {
            inMemoryLeaders = [];
        }
    }
    return inMemoryLeaders!;
  } catch (err) {
    console.error("Lỗi khi đọc file leaders:", err);
    inMemoryLeaders = inMemoryLeaders || [];
    return inMemoryLeaders;
  }
}

// Sync writing of local leaders file database
function writeLeaders(leadersList: any[]): boolean {
  inMemoryLeaders = leadersList;
  if (fsWriteErrorOccurred) return false;
  try {
    fs.writeFileSync(LEADERS_FILE, JSON.stringify(leadersList, null, 2), "utf-8");
    return true;
  } catch (err) {
    fsWriteErrorOccurred = true;
    console.error("Lỗi khi ghi file leaders - Readonly FileSystem:", err);
    return false;
  }
}

// SMTP sending email function with simulated logging fallback
async function sendCredentialsEmail(
  toEmail: string, 
  password: string, 
  displayName: string, 
  operationType: 'registration' | 'forgot' | 'password_changed' = 'registration'
): Promise<{ sent: boolean; isMock: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== "false"; // Default securely
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"SplitMate" <noreply@gmail.com>`;

  let subject = "";
  if (operationType === 'forgot') {
    subject = `[SplitMate] Khôi phục mật khẩu tài khoản ${displayName}`;
  } else if (operationType === 'password_changed') {
    subject = `[SplitMate] Thông báo cập nhật mật khẩu tài khoản`;
  } else {
    subject = `[SplitMate] Thông tin đăng nhập tài khoản ${displayName}`;
  }

  let preamble = "";
  if (operationType === 'forgot') {
    preamble = "Bạn (hoặc ai đó) đã gửi yêu cầu lấy lại thông tin mật khẩu bảo mật của tài khoản của bạn.";
  } else if (operationType === 'password_changed') {
    preamble = "Tài khoản của bạn vừa được cập nhật mật khẩu mới! Dưới đây là thông tin tài khoản đã cập nhật:";
  } else {
    preamble = "Chào mừng bạn! Dưới đây là thông tin tài khoản đã được liên kết và kích hoạt thành công trên SplitMate:";
  }

  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #03B875; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SplitMate Applet</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Quản lý chi tiêu nhóm thông minh, minh bạch</p>
      </div>
      
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Chào <strong>${displayName}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">${preamble}</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #166534;"><strong>Địa chỉ Email:</strong> <span style="font-family: monospace; font-size: 14px; color: #0f172a;">${toEmail}</span></p>
        <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Mật khẩu mới:</strong> <strong style="background-color: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 15px;">${password}</strong></p>
      </div>

      <p style="font-size: 13px; color: #03B875; font-weight: 600; margin: 0 0 6px 0;">🔒 Đổi mật khẩu dễ dàng:</p>
      <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.4;">
        Sau khi đăng nhập vào hệ thống, bạn có thể tự đổi mật khẩu bất kỳ lúc nào tại giao diện quản trị góc trên màn hình.
      </p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Đây là thư tự động từ SplitMate. Vui lòng không phản hồi thư này.</p>
    </div>
  `;

  if (!host || !user || !pass) {
    console.log(`\n=================== [MOCK EMAIL SENT] ===================`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Password: ${password}`);
    console.log(`=========================================================\n`);
    return { sent: true, isMock: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html: bodyHtml
    });

    return { sent: true, isMock: false };
  } catch (err: any) {
    console.error("Nodemailer send email error:", err);
    return { sent: false, isMock: false, error: err.message || JSON.stringify(err) };
  }
}

// In-memory OTP Store for email registration verification
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  sendCount: number;
  lastSentAt: number;
  displayName: string;
}

const otpStore = new Map<string, OtpEntry>();

async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  displayName: string
): Promise<{ sent: boolean; isMock: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"SplitMate" <noreply@gmail.com>`;

  const subject = `[SplitMate] Mã xác minh OTP đăng ký tài khoản (${otpCode})`;

  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #03B875; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SplitMate Applet</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Quản lý chi tiêu nhóm thông minh, minh bạch</p>
      </div>
      
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Chào <strong>${displayName}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Mã xác minh (OTP) để hoàn tất đăng ký tài khoản Thủ quỹ của bạn là:</p>
      
      <div style="text-align: center; background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #15803d;">${otpCode}</span>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534;">Mã OTP có hiệu lực trong <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này cho ai.</p>
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.4;">
        Nếu bạn không thực hiện đăng ký tài khoản tại SplitMate, vui lòng bỏ qua thư này.
      </p>
      
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Đây là thư tự động từ SplitMate. Vui lòng không phản hồi thư này.</p>
    </div>
  `;

  if (!host || !user || !pass) {
    if (supabaseDb) {
      try {
        console.log(`[SUPABASE AUTH OTP] Đang kích hoạt gửi OTP qua Supabase Auth SMTP tới ${toEmail}...`);
        const { error: sbAuthErr } = await supabaseDb.auth.signInWithOtp({
          email: toEmail,
          options: {
            shouldCreateUser: true,
            data: { displayName }
          }
        });
        if (!sbAuthErr) {
          console.log(`[SUPABASE AUTH OTP] Gửi OTP thành công qua Supabase Auth SMTP tới ${toEmail}`);
          return { sent: true, isMock: false };
        } else {
          console.warn(`[SUPABASE AUTH OTP] Cảnh báo từ Supabase Auth:`, sbAuthErr.message);
        }
      } catch (sbErr: any) {
        console.warn(`[SUPABASE AUTH OTP] Ngoại lệ khi kết nối Supabase Auth:`, sbErr);
      }
    }

    console.log(`\n=================== [MOCK OTP EMAIL SENT] ===================`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`=============================================================\n`);
    return { sent: true, isMock: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html: bodyHtml
    });

    return { sent: true, isMock: false };
  } catch (err: any) {
    console.error("Lỗi gửi email OTP thực tế:", err);
    return { sent: false, isMock: false, error: err.message || JSON.stringify(err) };
  }
}

// Sync reading of server database
function readDb(): Group[] {
  if (inMemoryGroups) return inMemoryGroups;
  try {
    if (!fs.existsSync(DB_FILE)) {
      try {
        if (!fsWriteErrorOccurred) {
          fs.writeFileSync(DB_FILE, JSON.stringify(MOCK_GROUPS, null, 2), "utf-8");
        }
      } catch (e) {
        fsWriteErrorOccurred = true;
        console.error("Non-writable filesystem detected, using in-memory mock data array.");
        inMemoryGroups = [...MOCK_GROUPS];
        return inMemoryGroups;
      }
      inMemoryGroups = [...MOCK_GROUPS];
      return inMemoryGroups;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    if (!data || data.trim() === "") {
        inMemoryGroups = [...MOCK_GROUPS];
    } else {
        try {
            inMemoryGroups = JSON.parse(data) || [];
        } catch (e) {
            inMemoryGroups = [...MOCK_GROUPS];
        }
    }
    return inMemoryGroups!;
  } catch (error) {
    console.error("Lỗi khi đọc file db:", error);
    inMemoryGroups = inMemoryGroups || [...MOCK_GROUPS];
    return inMemoryGroups;
  }
}

// Sync writing of server database
function writeDb(groupsList: Group[]): boolean {
  inMemoryGroups = groupsList;
  if (fsWriteErrorOccurred) return false;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(groupsList, null, 2), "utf-8");
    return true;
  } catch (error) {
    fsWriteErrorOccurred = true;
    console.error("Lỗi khi ghi file db - Readonly FileSystem:", error);
    return false;
  }
}

// Cloud SQL PostgreSQL direct helper functions - Disabled in Firestore Mode
const app = express();

// --- SECURITY SHIELD: CORS CONFIGURATION ---
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://splitmate.space",
    "https://www.splitmate.space",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  
  const origin = req.headers.origin;
  
  // Kiểm tra nếu origin khớp tên miền chính thức, localhost hoặc các domain sandbox (AI Studio run.app, Vercel)
  if (origin) {
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith(".run.app") || 
                      origin.endsWith(".vercel.app");
                      
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  } else {
    // Không có origin (gọi từ server-to-server hoặc mobile client an toàn không qua browser)
    res.setHeader("Access-Control-Allow-Origin", "https://splitmate.space");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, api-key, x-api-key, x-sepay-token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// --- SECURITY SHIELD: RATE LIMITING ENGINE ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Dọn dẹp RAM định kỳ tránh Memory Leak cho Rate Limiting Map
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function createRateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
    const key = `${clientIp}:${req.path}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      console.warn(`[SECURITY WARN] Rate limit exceeded for IP ${clientIp} on path ${req.path}`);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Bạn đã thao tác quá nhanh. Hệ thống giới hạn tối đa 5 lần mỗi phút để chống spam và bảo mật. Vui lòng đợi 1 phút và thử lại."
      });
    }

    record.count += 1;
    next();
  };
}

const apiScanRateLimiter = createRateLimiter(5, 60 * 1000); // 5 requests/phút
const apiLoginRateLimiter = createRateLimiter(5, 60 * 1000); // 5 requests/phút

// Set up Express JSON parser with higher limit for base64 images
app.use(express.json({ limit: "15mb" }));

// Initialize server-side Gemini client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
}

const PORT = Number(process.env.PORT || 3000);

// API Endpoints
  // --- HEALTH & SUPABASE KEEP-ALIVE ENDPOINTS ---
  app.get(["/api/health", "/api/keep-alive"], async (req, res) => {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    let supabaseStatus = "disconnected";
    let supabaseLatencyMs = 0;
    let queryDetails: any = null;

    if (supabaseDb) {
      try {
        const queryStart = Date.now();
        // Thực hiện truy vấn siêu nhẹ (head count hoặc limit 1) để kích hoạt API Gateway của Supabase, chống pause tự động sau 7 ngày
        const { count, error } = await supabaseDb
          .from("groups")
          .select("id", { count: "exact", head: true });
        
        supabaseLatencyMs = Date.now() - queryStart;
        if (error) {
          // Thử dự phòng bảng leaders nếu bảng groups có RLS hạn chế
          const { error: leaderErr } = await supabaseDb.from("leaders").select("email").limit(1);
          if (leaderErr) {
            supabaseStatus = `error: ${error.message}`;
          } else {
            supabaseStatus = "active";
            queryDetails = { source: "leaders", pingLatencyMs: supabaseLatencyMs };
          }
        } else {
          supabaseStatus = "active";
          queryDetails = { source: "groups", groupsCount: count ?? 0, pingLatencyMs: supabaseLatencyMs };
        }
      } catch (err: any) {
        supabaseStatus = `exception: ${err.message || String(err)}`;
      }
    } else {
      supabaseStatus = supabaseInitError || "not_configured (using local mock db)";
    }

    const totalDurationMs = Date.now() - startTime;
    return res.status(200).json({
      status: "ok",
      service: "SplitMate API Gateway",
      timestamp,
      durationMs: totalDurationMs,
      supabase: {
        status: supabaseStatus,
        isUsingServiceRole,
        latencyMs: supabaseLatencyMs,
        details: queryDetails
      }
    });
  });

  // --- PAYMENT & UPGRADE ENDPOINTS ---

  // 1. Voucher Apply API
  app.post("/api/vouchers/apply", async (req, res) => {
    try {
      const { code, groupId, adminEmail } = req.body;
      if (!code || !groupId) {
        return res.status(400).json({ error: "Thiếu thông tin mã voucher hoặc ID nhóm." });
      }

      const cleanCode = code.trim().toUpperCase();

      if (supabaseDb) {
        const group = await supabaseGetGroupById(groupId);
        if (!group) return res.status(404).json({ error: "Không tìm thấy nhóm." });

        const cleanAdminEmail = (adminEmail || group.adminEmail || group.admin_email || "").trim().toLowerCase();

        // Kiểm tra 1: Nhóm này đã sử dụng voucher trước đó chưa
        if (group.appliedVoucher) {
          return res.status(400).json({ 
            error: `Nhóm "${group.name}" đã từng áp dụng mã voucher "${group.appliedVoucher}". Mỗi nhóm chỉ được sử dụng 1 voucher.` 
          });
        }

        // Kiểm tra 2: Ràng buộc Email Trưởng nhóm chỉ được dùng Voucher 1 lần trên toàn bộ các nhóm
        if (cleanAdminEmail) {
          // Kiểm tra xem email này đã từng dùng voucher chưa trong bảng vouchers
          const { data: usedVoucherRecord } = await supabaseDb
            .from("vouchers")
            .select("code, used_by_email")
            .eq("used_by_email", cleanAdminEmail)
            .maybeSingle();

          if (usedVoucherRecord) {
            return res.status(400).json({
              error: `Email trưởng nhóm (${cleanAdminEmail}) đã từng áp dụng mã voucher "${usedVoucherRecord.code}". Mỗi email trưởng nhóm chỉ được dùng voucher 1 lần duy nhất.`
            });
          }

          // Kiểm tra xem có bất kỳ nhóm nào do email này quản lý đã từng áp dụng voucher chưa
          const { data: existingVoucherGroups } = await supabaseDb
            .from("groups")
            .select("id, name, applied_voucher")
            .eq("admin_email", cleanAdminEmail)
            .not("applied_voucher", "is", null);

          if (existingVoucherGroups && existingVoucherGroups.length > 0) {
            return res.status(400).json({
              error: `Email trưởng nhóm (${cleanAdminEmail}) đã sử dụng voucher trên nhóm "${existingVoucherGroups[0].name}". Mỗi email trưởng nhóm chỉ được áp dụng voucher 1 lần.`
            });
          }
        }

        const { data: voucher, error } = await supabaseDb
          .from("vouchers")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (error) throw error;
        if (!voucher) return res.status(404).json({ error: "Mã voucher không tồn tại." });
        
        // Kiểm tra thời hạn (nếu có)
        const expiryDate = voucher.expires_at || voucher.expiry_date;
        if (expiryDate && new Date(expiryDate) < new Date()) {
          return res.status(400).json({ error: "Mã voucher này đã hết hạn sử dụng." });
        }

        // Kiểm tra is_active nếu có
        if (voucher.hasOwnProperty('is_active') && voucher.is_active === false) {
           return res.status(400).json({ error: "Mã voucher này đã bị vô hiệu hóa hoặc hết lượt sử dụng." });
        }
        
        if (voucher.hasOwnProperty('is_used') && voucher.is_used === true) {
           return res.status(400).json({ error: "Mã voucher này đã được sử dụng hết." });
        }

        // Kiểm tra số lượng sử dụng
        if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
          return res.status(400).json({ error: "Mã voucher này đã hết lượt sử dụng." });
        }

        // Cập nhật trạng thái voucher & tăng lượt dùng
        const isExpired = voucher.max_uses ? ((voucher.used_count || 0) + 1) >= voucher.max_uses : false;
        
        const updatePayload: any = {
          used_count: (voucher.used_count || 0) + 1
        };

        if (voucher.hasOwnProperty('is_active')) {
           updatePayload.is_active = !isExpired;
        }
        if (voucher.hasOwnProperty('is_used')) {
           updatePayload.is_used = isExpired;
        }
        if (voucher.hasOwnProperty('used_at')) {
           updatePayload.used_at = new Date().toISOString();
        }
        if (voucher.hasOwnProperty('used_by_group_id')) {
           updatePayload.used_by_group_id = groupId;
        }
        if (voucher.hasOwnProperty('used_by_email') && cleanAdminEmail) {
           updatePayload.used_by_email = cleanAdminEmail;
        }

        const { data: updatedVoucher, error: updateError } = await supabaseDb
          .from("vouchers")
          .update(updatePayload)
          .eq("code", cleanCode)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error("Lỗi cập nhật voucher:", updateError);
        }

        // Xử lý gói dịch vụ tương ứng với Voucher
        let resolvedPlan = voucher.plan_type || "BE_BAN";
        if (resolvedPlan === 'be_ban' || resolvedPlan === 'VIP' || resolvedPlan === 'BE_BAN') {
          resolvedPlan = 'BE_BAN';
        } else if (resolvedPlan === 'hoi_lang' || resolvedPlan === 'PREMIUM' || resolvedPlan === 'HOI_LANG') {
          resolvedPlan = 'HOI_LANG';
        } else if (resolvedPlan === 'du_hi_30' || resolvedPlan === 'DU_HI_30' || resolvedPlan === 'DUHI30') {
          resolvedPlan = 'DU_HI_30';
        }

        group.plan = resolvedPlan;
        group.planActivatedAt = formatVNTime(new Date()) || new Date().toISOString();
        
        const durationMonths = voucher.duration_months || (resolvedPlan === 'DU_HI_30' ? 1 : 12);
        const expiredDate = new Date();
        if (resolvedPlan === 'DU_HI_30') {
          expiredDate.setDate(expiredDate.getDate() + 30);
        } else {
          expiredDate.setMonth(expiredDate.getMonth() + durationMonths);
        }

        group.planExpiredAt = formatVNTime(expiredDate) || expiredDate.toISOString();
        group.appliedVoucher = cleanCode;
        if (cleanAdminEmail) {
          group.adminEmail = cleanAdminEmail;
        }
        
        await supabaseSaveGroup(group);

        return res.json({ 
          success: true, 
          planType: resolvedPlan,
          planActivatedAt: group.planActivatedAt,
          planExpiredAt: group.planExpiredAt
        });
      } else {
        const group = await supabaseGetGroupById(groupId);
        if (!group) return res.status(404).json({ error: "Không tìm thấy nhóm." });

        let resolvedPlan: any = "BE_BAN";
        if (cleanCode.includes("DUHI") || cleanCode.includes("TRIP")) {
          resolvedPlan = "DU_HI_30";
        } else if (cleanCode.includes("HOI") || cleanCode.includes("VILLAGE")) {
          resolvedPlan = "HOI_LANG";
        }

        group.plan = resolvedPlan;
        group.planActivatedAt = new Date().toISOString();
        const expiredDate = new Date();
        if (resolvedPlan === "DU_HI_30") {
          expiredDate.setDate(expiredDate.getDate() + 30);
        } else {
          expiredDate.setFullYear(expiredDate.getFullYear() + 1);
        }
        group.planExpiredAt = expiredDate.toISOString();
        group.appliedVoucher = cleanCode;

        return res.json({
          success: true,
          planType: resolvedPlan,
          planActivatedAt: group.planActivatedAt,
          planExpiredAt: group.planExpiredAt
        });
      }
    } catch (err: any) {
      console.error("Voucher apply error:", err);
      return res.status(500).json({ error: err.message || "Lỗi hệ thống khi áp dụng voucher." });
    }
  });

  // 2. SePay Webhook API
  const sepayHandler = async (req: express.Request, res: express.Response) => {
    try {
      // --- SECURITY SHIELD: WEBHOOK SIGNATURE VERIFICATION ---
      const sepayWebhookSecret = process.env.SEPAY_WEBHOOK_SECRET || process.env.SEPAY_API_TOKEN;
      const authHeader = req.headers["authorization"] || "";
      const rawIncomingToken = 
        req.headers["x-sepay-token"] || 
        req.headers["api-key"] || 
        req.headers["x-api-key"] ||
        req.query.token;
      
      let incomingToken = null;
      if (rawIncomingToken) {
        incomingToken = String(rawIncomingToken).trim();
      } else if (authHeader) {
        const authStr = authHeader.toString().trim();
        if (authStr.toUpperCase().startsWith("BEARER ")) {
          incomingToken = authStr.substring(7).trim();
        } else if (authStr.toUpperCase().startsWith("APIKEY ")) {
          incomingToken = authStr.substring(7).trim();
        } else {
          incomingToken = authStr;
        }
      }

      console.log("[SEPAY WEBHOOK] Kiểm tra xác thực chữ ký bảo mật...");
      
      if (!sepayWebhookSecret) {
        console.error("[SECURITY ERROR] SEPAY_WEBHOOK_SECRET chưa được cấu hình trên server! Chặn truy cập để bảo vệ cơ sở dữ liệu.");
        return res.status(403).json({ 
          error: "Forbidden", 
          message: "Webhook Security Shield: SEPAY_WEBHOOK_SECRET chưa được cấu hình. Không thể xử lý yêu cầu." 
        });
      }

      if (!incomingToken || incomingToken !== sepayWebhookSecret) {
        console.warn("[SECURITY ALERT] Phát hiện hành vi truy cập Webhook trái phép! Token hoặc Chữ ký không khớp.");
        console.log(`[DEBUG] Nhận Token: ${incomingToken ? incomingToken.substring(0, 3) + "..." : "NULL"}`);
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "Xác thực chữ ký thất bại. Giao dịch bị từ chối." 
        });
      }

      console.log("[SEPAY WEBHOOK] Xác thực chữ ký thành công 100%. Tiếp tục xử lý giao dịch nâng cấp VIP.");

      // SePay parameters: https://docs.sepay.vn/tich-hop-webhook.html
      const { 
        transferAmount, 
        transferDescription, 
        content,
        transferContent,
        code // SePay transaction code
      } = req.body;

      // Ưu tiên lấy content (nội dung chuyển khoản sạch từ SePay)
      const rawContent = (content || transferContent || transferDescription || "").toString().toUpperCase();
      const amount = Number(transferAmount || 0);
      
      console.log(`[WEBHOOK] Nhận giao dịch: ${amount}đ - Nội dung: ${rawContent} - Mã SePay: ${code}`);

      // Regex tìm mã nhóm (Hỗ trợ: SPLITMATE665976, SPLIT665976, ...)
      const match = rawContent.match(/(?:SPLITMATE|SPLIT)\s*([A-Z0-9]{6})/i);
      if (!match) {
        console.log("[WEBHOOK] Không tìm thấy mã định danh nhóm (6 ký tự cuối) trong nội dung.");
        // Trả về 200 OK với success: true để SePay dừng gửi lại các giao dịch không liên quan
        return res.json({ success: true, message: "No invite code found, but acknowledged to stop retries." });
      }

      const inviteCode = match[1].toUpperCase();
      console.log(`[WEBHOOK] Khớp mã nhóm: ${inviteCode}`);

      if (supabaseDb) {
        // Tìm nhóm theo mã mời (6 ký tự cuối của ID)
        const { data: groupsData, error } = await supabaseDb.from("groups").select("data, id");
        if (error) {
          console.error("[WEBHOOK] Database error fetching groups:", error);
          throw error;
        }

        const targetGroupRow = groupsData.find((row: any) => {
          return row.id.toUpperCase().endsWith(inviteCode);
        });

        if (!targetGroupRow) {
          console.error(`[WEBHOOK] Không tìm thấy nhóm nào khớp với mã mời: ${inviteCode}`);
          // Trả về 200 OK với success: true để SePay dừng gửi lại, ghi log rõ ràng ở server
          return res.json({ success: true, message: `Group not found for code ${inviteCode}, but acknowledged to stop retries.` });
        }

        const group = await supabaseGetGroupById(targetGroupRow.id);
        if (!group) {
          console.error(`[WEBHOOK] Không thể giải nén nhóm: ${targetGroupRow.id}`);
          return res.json({ success: true, message: `Failed to unpack group ${targetGroupRow.id}` });
        }

        if (!group.members) {
          group.members = [];
        }
        if (!group.expenses) {
          group.expenses = [];
        }
        
        let newPlan: "BE_BAN" | "HOI_LANG" | "DU_HI_30" | null = null;

        // Định lượng gói BE_BAN, HOI_LANG, DU_HI_30 chuẩn xác theo yêu cầu và hỗ trợ khoảng linh hoạt
        if (amount === 99000 || amount >= 90000) {
          newPlan = "HOI_LANG";
        } else if (amount === 49000 || (amount >= 45000 && amount < 90000)) {
          newPlan = "BE_BAN";
        } else if (amount === 29000 || (amount >= 25000 && amount < 45000)) {
          newPlan = "DU_HI_30";
        }

        if (newPlan) {
          const currentPlan = (group.plan as string) === "VIP" ? "BE_BAN" : (group.plan as string) === "PREMIUM" ? "HOI_LANG" : group.plan;
          
          // Kiểm tra xem gói hiện tại có lớn hơn hoặc bằng gói mới hay không
          let isCurrentHigherOrEqual = false;
          if (currentPlan === "HOI_LANG") {
            isCurrentHigherOrEqual = true;
          } else if (currentPlan === "BE_BAN" && (newPlan === "BE_BAN" || newPlan === "DU_HI_30")) {
            isCurrentHigherOrEqual = true;
          } else if (currentPlan === "DU_HI_30" && newPlan === "DU_HI_30") {
            isCurrentHigherOrEqual = true;
          }

          if (isCurrentHigherOrEqual) {
             console.log(`[WEBHOOK] Nhóm ${group.name} (${group.id}) đã ở gói ${group.plan} hoặc cao hơn. Không cần nâng cấp.`);
             return res.json({ success: true, message: "Group already upgraded" });
          }

          console.log(`[WEBHOOK] Nâng cấp nhóm ${group.name} (${group.id}) lên gói ${newPlan}`);
          group.plan = newPlan;
          group.planActivatedAt = formatVNTime(new Date()) || new Date().toISOString();
          
          const durationDays = newPlan === "DU_HI_30" ? 30 : 365;
          group.planExpiredAt = formatVNTime(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)) || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
          
          // Tự động tạo hóa đơn nâng cấp cho nhóm
          let planLabel = "Bè Bạn ⭐";
          if (newPlan === "HOI_LANG") planLabel = "Hội Làng 👑";
          if (newPlan === "DU_HI_30") planLabel = "Du Hí 🚗";

          const upgradeExpense = {
            id: "exp_upgrade_" + (code || Date.now()),
            description: `Nâng cấp nhóm lên ${planLabel} (Auto-verified)`,
            amount: amount,
            payerId: group.members[0]?.id || "admin",
            date: new Date().toISOString().split("T")[0],
            participantIds: group.members.map(m => m.id),
            created_at: new Date().toISOString(),
            isAutoUpgrade: true
          };
          
          group.expenses = [upgradeExpense, ...(group.expenses || [])];
          
          await supabaseSaveGroup(group);
          console.log(`[WEBHOOK] Cập nhật database thành công cho nhóm ${group.id}`);
          
          return res.json({ success: true, message: `Upgraded group ${inviteCode} to ${newPlan}` });
        } else {
          console.warn(`[WEBHOOK] Số tiền ${amount}đ không đủ để nâng cấp lên bất kỳ gói nào.`);
        }
      } else {
        console.error("[WEBHOOK] Supabase DB not initialized - cannot process upgrade.");
      }

      return res.json({ success: true, message: "Processed but no upgrade applied" });
    } catch (err: any) {
      console.error("[WEBHOOK ERROR]:", err);
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
  };

  app.post("/api/webhook/sepay", sepayHandler);
  app.post("/webhook/sepay", sepayHandler);

app.post("/api/avatar/anime", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh." });
      }

      // Check if API client exists
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm key trong Settings > Secrets.",
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      }

      // Base64 regex for schema data:image/png;base64,XXXXXX
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = "image/png";
      let base64Data = image;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      console.log(`Đang gửi yêu cầu Anime- hóa ảnh có định dạng: ${mimeType} tới Gemini...`);

      // Call Gemini 3.1 flash image model for transforming and editing images
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Thực hiện tạo ra một ảnh chân dung 1:1 phong cách Anime (vibrant anime profile photo) hoàn toàn tương ứng nhất từ khuôn mặt, góc chụp, tóc và trang phục của tấm ảnh này. Ảnh đầu ra phải là một tác phẩm Anime kỹ thuật số, tươi sáng, sắc nét từng chi tiết, cân đối căn giữa, có viền hoặc nền tối giản đẹp mắt làm hình đại diện.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        return res.status(500).json({ error: "Không nhận được phản hồi hợp lệ từ mô hình AI." });
      }

      // Iterate through parts to find the image block
      let base64ResultImage = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64ResultImage = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64ResultImage) {
        return res.json({ animeAvatar: base64ResultImage });
      } else {
        // Fallback or describe response
        const textResponse = response.text || "Không tìm thấy dữ liệu ảnh.";
        return res.status(500).json({
          error: "Không thể trích xuất phần ảnh AI từ Gemini. Phản hồi mô tả: " + textResponse,
        });
      }
    } catch (error: any) {
      console.error("Lỗi khi xử lý hình ảnh Anime:", error);
      return res.status(500).json({
        error: error.message || "Đã xảy ra lỗi hệ thống trong quá trình xử lý sinh ảnh Anime.",
      });
    }
  });

  // API Endpoint: Delete file from Supabase Storage (supports both POST and DELETE)
  const handleDeleteStorageFile = async (req: express.Request, res: express.Response) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: "Thiếu đường dẫn file." });
      }
      
      // Extract file name from URL: /api/receipt/view/filename
      const fileName = fileUrl.includes("/api/receipt/view/") ? fileUrl.split("/api/receipt/view/")[1] : fileUrl;
      
      await deleteFileFromStorage(fileName);
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Lỗi khi xóa file:", error);
      return res.status(500).json({ error: error.message || "Không thể xóa file." });
    }
  };

  app.post("/api/storage/delete", handleDeleteStorageFile);
  app.delete("/api/storage/delete", handleDeleteStorageFile);

  // API Endpoint: Upload receipt image to Supabase Storage
  app.post("/api/receipt/upload", async (req, res) => {
    try {
      const { image, fileName, groupId } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh." });
      }

      let finalFileName = fileName || `receipt_${Date.now()}.jpg`;
      if (groupId && groupId !== "undefined" && groupId !== "null") {
        finalFileName = `${groupId}/${finalFileName}`;
      }
      
      const publicUrl = await supabaseUploadImage(image, finalFileName);

      return res.json({ success: true, url: publicUrl });
    } catch (error: any) {
      console.error("Lỗi khi upload ảnh hóa đơn:", error);
      return res.status(500).json({ error: error.message || "Không thể tải ảnh lên Storage." });
    }
  });

  // API Endpoint: AI Auto-Reconciliation OCR using Gemini API
  app.post("/api/receipt/ocr-reconcile", async (req, res) => {
    try {
      const { image, expectedAmount, recipientName } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh để phân tích." });
      }

      if (!ai) {
        return res.status(500).json({ error: "Gemini API chưa được cấu hình hoặc khởi tạo trên server." });
      }

      let base64Data = image;
      let mimeType = "image/jpeg";
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      const prompt = `Bạn là chuyên gia đối soát hóa đơn ngân hàng Việt Nam (VietQR, MoMo, Techcombank, Vietcombank, MB, ACB, BIDV...).
Hãy phân tích hình ảnh biên lai chuyển khoản và trích xuất chính xác 4 thông tin dưới dạng JSON:
1. transfer_amount: Số tiền chuyển khoản thực tế (number). Hãy loại bỏ các ký tự dấu chấm, dấu phẩy, chữ đ hoặc VNĐ để lấy số nguyên cuối cùng. Ví dụ: 50000.
2. recipient_name: Họ tên người nhận hoặc số tài khoản người nhận rõ ràng trên biên lai (string).
3. status: Trạng thái giao dịch. Trả về "Thành công" nếu giao dịch chuyển tiền đã được thực hiện thành công, hoàn tất. Ngược lại, trả về trạng thái tương ứng.
4. transaction_date: Ngày phát sinh giao dịch trên hóa đơn (string, định dạng YYYY-MM-DD nếu có thể, hoặc giữ nguyên định dạng trên hóa đơn).

Lưu ý quan trọng:
- Đọc số tiền cẩn thận, tránh nhầm lẫn giữa số tiền chuyển và số dư.
- Trích xuất tên người nhận chính xác (thường viết hoa không dấu hoặc có dấu).`;

      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite"
      ];

      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              prompt
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
              responseSchema: {
                type: "OBJECT",
                properties: {
                  transfer_amount: { type: "INTEGER" },
                  recipient_name: { type: "STRING" },
                  status: { type: "STRING" },
                  transaction_date: { type: "STRING" }
                },
                required: ["transfer_amount", "recipient_name", "status", "transaction_date"]
              }
            }
          });
          if (response && response.text) break;
        } catch (err) {
          lastError = err;
          console.warn(`[RECONCILE OCR] Model ${modelName} gặp lỗi:`, err);
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("Không thể gọi API Gemini với các model hiện tại.");
      }

      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText);

      return res.json({ success: true, data: resultJson });
    } catch (error: any) {
      console.error("Lỗi AI Auto-Reconciliation OCR:", error);
      let errMsg = "";
      if (error instanceof Error) {
        errMsg = error.message;
      } else if (typeof error === "object") {
        try {
          errMsg = JSON.stringify(error);
        } catch (e) {
          errMsg = String(error);
        }
      } else {
        errMsg = String(error || "Lỗi không xác định");
      }
      
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("denied access")) {
        errMsg = "Khóa API Gemini (GEMINI_API_KEY) bị từ chối truy cập (403 Permission Denied). Vui lòng cập nhật API Key trong Settings > Secrets.";
      }
      return res.status(500).json({ error: "Lỗi phân tích hóa đơn từ AI: " + errMsg });
    }
  });

  // API Endpoint: Secure View to proxy private Supabase Storage files
  app.get("/api/receipt/view/*", async (req, res) => {
    try {
      const fileName = req.params[0];
      const decodedFileName = decodeURIComponent(fileName);

      // 1. Kiểm tra RAM Memory Cache để tránh tải lại từ Supabase Storage
      const cached = getCachedStorageFile(decodedFileName) || getCachedStorageFile(fileName);
      if (cached) {
        // Kiểm tra ETag / If-None-Match header từ trình duyệt
        const clientEtag = req.headers["if-none-match"];
        if (clientEtag === cached.etag) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return res.status(304).end(); // Not Modified -> 0 Egress & 0 Bandwidth
        }

        res.setHeader("Content-Type", cached.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", cached.etag);
        return res.send(cached.buffer);
      }

      if (!supabaseDb) {
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280" fill="none"><rect width="400" height="280" rx="16" fill="#F8FAFC"/><rect x="2" y="2" width="396" height="276" rx="14" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 6"/><path d="M170 110H230M170 130H230M170 150H200" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/><rect x="150" y="80" width="100" height="110" rx="10" stroke="#94A3B8" stroke-width="3"/><text x="200" y="220" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="13" font-weight="700">Ảnh hóa đơn không khả dụng</text></svg>`;
        res.setHeader("Content-Type", "image/svg+xml");
        return res.send(Buffer.from(fallbackSvg));
      }
      
      const bucketName = "Split Mate";
      const { data, error } = await supabaseDb.storage
        .from(bucketName)
        .download(decodedFileName);

      if (error) {
        console.warn(`Ảnh hóa đơn không có sẵn trên Supabase storage (${decodedFileName}):`, error.message);
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280" fill="none"><rect width="400" height="280" rx="16" fill="#F8FAFC"/><rect x="2" y="2" width="396" height="276" rx="14" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 6"/><path d="M170 110H230M170 130H230M170 150H200" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/><rect x="150" y="80" width="100" height="110" rx="10" stroke="#94A3B8" stroke-width="3"/><text x="200" y="220" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="13" font-weight="700">Ảnh hóa đơn không khả dụng</text></svg>`;
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.send(Buffer.from(fallbackSvg));
      }

      // Determine mime type
      let mimeType = "image/jpeg";
      const lower = decodedFileName.toLowerCase();
      if (lower.endsWith(".png")) mimeType = "image/png";
      else if (lower.endsWith(".webp")) mimeType = "image/webp";
      else if (lower.endsWith(".gif")) mimeType = "image/gif";
      else if (lower.endsWith(".svg")) mimeType = "image/svg+xml";

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Lưu tệp vào RAM Memory Cache
      setCachedStorageFile(decodedFileName, buffer, mimeType);
      const newCache = getCachedStorageFile(decodedFileName);

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (newCache) res.setHeader("ETag", newCache.etag);
      
      return res.send(buffer);
    } catch (err: any) {
      console.error("Lỗi xem ảnh:", err);
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280" fill="none"><rect width="400" height="280" rx="16" fill="#F8FAFC"/><rect x="2" y="2" width="396" height="276" rx="14" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 6"/><path d="M170 110H230M170 130H230M170 150H200" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/><rect x="150" y="80" width="100" height="110" rx="10" stroke="#94A3B8" stroke-width="3"/><text x="200" y="220" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="13" font-weight="700">Ảnh hóa đơn không khả dụng</text></svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(Buffer.from(fallbackSvg));
    }
  });

  // API Endpoint: AI Receipt Scanning / OCR
  app.post("/api/receipt/scan", apiScanRateLimiter, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh hóa đơn." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm key trong Settings > Secrets.",
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      }

      let mimeType = "image/jpeg";
      let base64Data = "";

      if (image.startsWith("http")) {
        // Nếu là URL (từ Supabase Storage), tải ảnh về
        console.log(`[RECEIPT SCAN] Đang tải ảnh từ URL: ${image}...`);
        const imgRes = await fetch(image);
        if (!imgRes.ok) {
          console.error(`[RECEIPT SCAN] Lỗi tải ảnh từ URL: ${imgRes.status} ${imgRes.statusText}`);
          throw new Error(`Không thể tải ảnh từ hệ thống lưu trữ (Lỗi ${imgRes.status}). Vui lòng kiểm tra quyền truy cập của bucket.`);
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Data = buffer.toString("base64");
        const contentType = imgRes.headers.get("content-type");
        if (contentType) mimeType = contentType;
      } else {
        // Nếu là base64 truyền thống
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = image;
        }
      }

      console.log(`[RECEIPT SCAN] Đang gửi yêu cầu quét hóa đơn tới Gemini với mimeType: ${mimeType}...`);

      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite"
      ];

      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[RECEIPT SCAN] Đang thử quét với model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: "Hãy phân tích hình ảnh hóa đơn, biên lai, hoặc BẢNG MÃ QR THANH TOÁN (bao gồm cả bảng mã QR tĩnh MoMo, VietQR, ZaloPay đặt tại cửa hàng, hoặc màn hình ứng dụng ngân hàng).\n" +
                      "Kiểm tra kỹ xem ảnh có bị mờ, bị tối, bị che khuất một phần hoặc hoàn toàn không đọc được hay không.\n" +
                      "ĐẶC BIỆT LƯU Ý: Nếu ảnh là BẢNG MÃ QR THANH TOÁN hay BIỂN HIỆU ĐẶT MÃ QR (như bảng QR MoMo/VietQR ở quán ăn, cửa hàng):\n" +
                      "- Trích xuất TÊN QUÁN / TÊN CỬA HÀNG / TÊN CHỦ TÀI KHOẢN hiển thị trên bảng QR đó (ví dụ: 'Hủ tiếu mì chú Thu', 'MOMO_HU TIEU MI CHU THU', 'Cơm tấm Sài Gòn'...). Lọc bỏ các tiền tố như MOMO_, ZALOPAY_ nếu có.\n" +
                      "- Nếu bảng mã QR tĩnh không ghi sẵn số tiền thanh toán, hãy đặt 'amount' = 0 và vẫn giữ 'isUnreadable' = false.\n" +
                      "Nếu ảnh bị mờ hoàn toàn không đọc được thông tin gì, hãy đặt 'isUnreadable' thành true và viết 'errorMessage' thân thiện bằng tiếng Việt.\n" +
                      "If readable, set 'isUnreadable' to false, set 'errorMessage' to empty, and extract the list of bills/receipts:\n" +
                      "1. Title/Name: Specific store name, merchant name, account name, or service name readable from the receipt or QR board (e.g., 'Hủ tiếu mì chú Thu', 'Highlands Coffee', 'Grab', 'Bún chả Sinh Từ'...). Keep the exact name, do not replace with generic words.\n" +
                      "2. Total final amount paid (actual spent amount, integer only; set 0 for static payment QR boards with no amount).\n" +
                      "3. Date (format DD/MM/YYYY) for each bill/receipt. Leave empty if not found."
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
              responseSchema: {
                type: "OBJECT",
                properties: {
                  isUnreadable: { type: "BOOLEAN", description: "Đặt thành true nếu ảnh không đọc được, bị che, mờ hoặc thiếu thông tin cốt lõi." },
                  errorMessage: { type: "STRING", description: "Lý do không đọc được hóa đơn bằng tiếng Việt. Để trống nếu đọc tốt." },
                  date: { type: "STRING", description: "Ngày phát sinh của hóa đơn theo định dạng DD/MM/YYYY. Để chuỗi rỗng nếu không có." },
                  items: {
                    type: "ARRAY",
                    description: "Danh sách các hóa đơn/biên lai phát hiện được trong ảnh.",
                    items: {
                      type: "OBJECT",
                      properties: {
                        title: { type: "STRING", description: "Tên người nhận, tên quán, tên cửa hàng hoặc thương hiệu dịch vụ đọc được từ ảnh/mã QR (ví dụ: 'Bún bò cô Thu', 'Highlands Coffee', 'Grab', 'Circle K'). Giữ nguyên tên cụ thể đó, không tự ý rút gọn thành từ chung chung." },
                        amount: { type: "INTEGER", description: "Tổng số tiền cuối cùng của hóa đơn, chỉ lấy số nguyên." },
                      }
                    }
                  },
                },
              },
            },
          });

          if (response && response.text) {
            console.log(`[RECEIPT SCAN] Quét hóa đơn thành công bằng model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[RECEIPT SCAN] Model ${modelName} gặp lỗi:`, err.message || err);
          lastError = err;
          // Continue to next model in the fallback array
        }
      }

      if (!response || !response.text) {
        let rawErrMsg = "";
        if (lastError instanceof Error) {
          rawErrMsg = lastError.message;
        } else if (typeof lastError === "object") {
          try {
            rawErrMsg = JSON.stringify(lastError);
          } catch (e) {
            rawErrMsg = String(lastError);
          }
        } else {
          rawErrMsg = String(lastError || "");
        }
        
        if (rawErrMsg.includes("403") || rawErrMsg.includes("PERMISSION_DENIED") || rawErrMsg.includes("denied access")) {
          return res.status(403).json({
            error: "Khóa API Gemini (GEMINI_API_KEY) bị từ chối truy cập (403 Permission Denied) hoặc chưa được kích hoạt. Vui lòng kiểm tra lại API Key trong Settings > Secrets."
          });
        }
        throw new Error(
          rawErrMsg || "Tất cả các model AI đều bận hoặc không khả dụng lúc này. Vui lòng thử lại sau."
        );
      }

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "Không nhận được phản hồi từ AI." });
      }

      const parsedData = JSON.parse(responseText);

      // Kiểm tra nếu AI phát hiện ảnh không đọc được hoặc thiếu các thông tin bắt buộc
      if (parsedData.isUnreadable) {
        return res.status(422).json({
          success: false,
          error: parsedData.errorMessage || "Ảnh hóa đơn bị mờ hoặc che khuất thông tin. Vui lòng chụp lại rõ ràng và không che thông tin."
        });
      }

      if (!parsedData.items || parsedData.items.length === 0) {
        return res.status(422).json({
          success: false,
          error: "Không thể trích xuất được Tên chi phí hoặc Số tiền từ hóa đơn này. Vui lòng tải lại ảnh rõ nét hơn, không bị che khuất thông tin."
        });
      }

      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Lỗi khi quét hóa đơn bằng AI:", error);
      return res.status(500).json({
        error: error.message || "Đã xảy ra lỗi hệ thống trong quá trình quét hóa đơn bằng AI.",
      });
    }
  });

  // ====== METADATA SECURE MEMBER ROUTES ======

  app.get("/api/db-status", async (req, res) => {
    try {
      const status = {
        useSqlDb: false,
        hasSqlDbObj: false,
        envSqlHost: !!process.env.SQL_HOST,
        hasSupabaseDbObj: !!supabaseDb,
        hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        supabaseInitError: supabaseInitError,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      };
      return res.json(status);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Custom OAuth Google/Gmail authentication route for Leader (Thủ Quỹ) - supports instant auto-registration
  app.post("/api/leader/google-auth", async (req, res) => {
    try {
      console.log("[AUTH] Bắt đầu xử lý google-auth...");
      const { email, displayName, isSimulated } = req.body;
      console.log("[AUTH] Email nhận được:", email);
      
      if (!email) {
        return res.status(400).json({ error: "Thiếu thông tin Email Google." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = (displayName || cleanEmail.split("@")[0]).trim();

      if (supabaseDb) {
        console.log("[AUTH] Sử dụng Supabase DB...");
        // Cloud Supabase database fallback
        const existingLeader = await supabaseGetLeader(cleanEmail);
        console.log("[AUTH] Trạng thái tồn tại leader:", !!existingLeader);

        if (existingLeader) {
          return res.json({
            success: true,
            user: {
              uid: existingLeader.uid,
              email: existingLeader.email,
              displayName: existingLeader.displayName || cleanName
            }
          });
        } else {
          console.log("[AUTH] Đang tạo leader mới trong Supabase...");
          const uid = "usr_" + Math.random().toString(36).substring(2, 11);
          const randomPassword = "gg_" + Math.random().toString(36).substring(2, 11) + Math.random().toString(35).substring(2, 11);
          const newLeader = {
            email: cleanEmail,
            password: randomPassword,
            uid,
            displayName: cleanName,
            createdAt: new Date().toISOString()
          };

          const saveSuccess = await supabaseSaveLeader(newLeader);
          console.log("[AUTH] Lưu Supabase thành công:", saveSuccess);
          
          if (!saveSuccess) {
             throw new Error("Không thể lưu thông tin vào Supabase.");
          }

          return res.json({
            success: true,
            isNew: true,
            user: {
              uid,
              email: cleanEmail,
              displayName: cleanName
            }
          });
        }
      } else {
        console.log("[AUTH] Sử dụng Local File DB fallback...");
        const allLeaders = readLeaders();
        const existingLeader = allLeaders.find(l => l.email === cleanEmail);

        if (existingLeader) {
          return res.json({
            success: true,
            user: {
              uid: existingLeader.uid,
              email: existingLeader.email,
              displayName: existingLeader.displayName || cleanName
            }
          });
        } else {
          const uid = "usr_" + Math.random().toString(36).substring(2, 11);
          const randomPassword = "gg_" + Math.random().toString(36).substring(2, 11);
          const newLeader = {
            email: cleanEmail,
            password: randomPassword,
            uid,
            displayName: cleanName,
            createdAt: new Date().toISOString()
          };

          allLeaders.push(newLeader);
          writeLeaders(allLeaders);

          return res.json({
            success: true,
            isNew: true,
            user: {
              uid,
              email: cleanEmail,
              displayName: cleanName
            }
          });
        }
      }
    } catch (err: any) {
      console.error("Lỗi đăng nhập Gmail thủ quỹ:", err);
      return res.status(500).json({ error: err.message || "Lỗi hệ thống khi đồng bộ tài khoản Gmail." });
    }
  });
  
  // Route gửi mã OTP xác thực email đăng ký
  app.post("/api/leader/send-otp", async (req, res) => {
    try {
      const { email, displayName } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập địa chỉ Email." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = (displayName || cleanEmail.split("@")[0]).trim();

      // Kiểm tra định dạng Email chuẩn Regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Địa chỉ Email không hợp lệ. Vui lòng kiểm tra lại." });
      }

      // Kiểm tra tài khoản email đã tồn tại hay chưa
      if (supabaseDb) {
        const existingLeader = await supabaseGetLeader(cleanEmail);
        if (existingLeader) {
          return res.status(400).json({ error: "Email này đã được đăng ký cho một tài khoản khác trên hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập bằng tài khoản đó." });
        }
      } else {
        const allLeaders = readLeaders();
        if (allLeaders.some((l: any) => l.email === cleanEmail)) {
          return res.status(400).json({ error: "Email này đã được đăng ký cho một tài khoản khác trên hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập bằng tài khoản đó." });
        }
      }

      const now = Date.now();
      const existingOtp = otpStore.get(cleanEmail);

      if (existingOtp) {
        // Cooldown check: Bắt buộc đợi tối thiểu 60s giữa các lần gửi
        const elapsed = (now - existingOtp.lastSentAt) / 1000;
        if (elapsed < 60) {
          const remaining = Math.ceil(60 - elapsed);
          return res.status(429).json({
            error: `Vui lòng đợi ${remaining} giây trước khi yêu cầu gửi lại mã OTP.`,
            cooldownRemaining: remaining
          });
        }

        // Limit maximum sends (Tối đa 5 lần gửi / 10 phút để chống spam)
        if (existingOtp.sendCount >= 5 && (now - existingOtp.lastSentAt) < 10 * 60 * 1000) {
          return res.status(429).json({
            error: "Bạn đã yêu cầu gửi mã quá 5 lần trong 10 phút. Vui lòng đợi 10 phút sau để thử lại."
          });
        }
      }

      // Tạo mã OTP 6 chữ số ngẫu nhiên
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000; // Có hiệu lực trong 10 phút
      const sendCount = (existingOtp && (now - existingOtp.lastSentAt) < 10 * 60 * 1000) ? existingOtp.sendCount + 1 : 1;

      otpStore.set(cleanEmail, {
        code: otpCode,
        expiresAt,
        attempts: 0,
        sendCount,
        lastSentAt: now,
        displayName: cleanName
      });

      const emailResult = await sendOtpEmail(cleanEmail, otpCode, cleanName);

      return res.json({
        success: true,
        message: `Mã OTP 6 chữ số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra hộp thư.`,
        isMock: emailResult.isMock,
        mockOtpCode: emailResult.isMock ? otpCode : undefined
      });
    } catch (err: any) {
      console.error("Lỗi gửi mã OTP xác thực:", err);
      return res.status(500).json({ error: err.message || "Gặp sự cố khi gửi mã OTP. Vui lòng thử lại sau." });
    }
  });

  // Route gửi mã OTP xác thực liên kết email dành cho thành viên
  app.post("/api/member/send-otp", async (req, res) => {
    try {
      const { email, displayName } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập địa chỉ Email." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = (displayName || cleanEmail.split("@")[0]).trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Địa chỉ Email không hợp lệ. Vui lòng kiểm tra lại." });
      }

      let existingLeader = null;
      if (supabaseDb) {
        existingLeader = await supabaseGetLeader(cleanEmail);
      } else {
        const allLeaders = readLeaders();
        existingLeader = allLeaders.find((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
      }

      if (existingLeader) {
        return res.status(400).json({
          error: "Email này đã được đăng ký cho một tài khoản khác trên hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập bằng tài khoản đó."
        });
      }

      const now = Date.now();
      const existingOtp = otpStore.get(cleanEmail);

      if (existingOtp) {
        const elapsed = (now - existingOtp.lastSentAt) / 1000;
        if (elapsed < 60) {
          const remaining = Math.ceil(60 - elapsed);
          return res.status(429).json({
            error: `Vui lòng đợi ${remaining} giây trước khi yêu cầu gửi lại mã OTP.`,
            cooldownRemaining: remaining
          });
        }
        if (existingOtp.sendCount >= 5 && (now - existingOtp.lastSentAt) < 10 * 60 * 1000) {
          return res.status(429).json({
            error: "Bạn đã yêu cầu gửi mã quá 5 lần trong 10 phút. Vui lòng đợi 10 phút sau để thử lại."
          });
        }
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000;
      const sendCount = (existingOtp && (now - existingOtp.lastSentAt) < 10 * 60 * 1000) ? existingOtp.sendCount + 1 : 1;

      otpStore.set(cleanEmail, {
        code: otpCode,
        expiresAt,
        attempts: 0,
        sendCount,
        lastSentAt: now,
        displayName: cleanName
      });

      const emailResult = await sendOtpEmail(cleanEmail, otpCode, cleanName);

      return res.json({
        success: true,
        message: `Mã OTP 6 chữ số đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra hộp thư.`,
        isMock: emailResult.isMock,
        mockOtpCode: emailResult.isMock ? otpCode : undefined
      });
    } catch (err: any) {
      console.error("Lỗi gửi mã OTP xác thực thành viên:", err);
      return res.status(500).json({ error: err.message || "Gặp sự cố khi gửi mã OTP." });
    }
  });

  // Custom smart authentication route for Leader (Thủ Quỹ) - supports explicit login and registration
  app.post("/api/leader/auth", async (req, res) => {
    try {
      const { email, password, displayName, action, otpCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Thiếu thông tin Email hoặc Mật khẩu." });
      }
      
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      
      if (cleanPassword.length < 4) {
        return res.status(400).json({ error: "Mật khẩu bảo mật tối thiểu phải từ 4 ký tự." });
      }

      // Nếu là Đăng ký thì bắt buộc xác thực mã OTP
      if (action === "register") {
        if (!otpCode || !otpCode.trim()) {
          return res.status(400).json({ error: "Vui lòng nhập mã OTP 6 chữ số đã gửi tới Email của bạn." });
        }

        const cleanOtpCode = otpCode.trim();
        const otpData = otpStore.get(cleanEmail);

        if (!otpData) {
          return res.status(400).json({ error: "Mã OTP không hợp lệ hoặc chưa được gửi tới email này. Vui lòng bấm 'Gửi mã OTP'." });
        }

        if (Date.now() > otpData.expiresAt) {
          otpStore.delete(cleanEmail);
          return res.status(400).json({ error: "Mã OTP đã hết hạn (sau 10 phút). Vui lòng bấm 'Gửi lại mã OTP'." });
        }

        if (otpData.attempts >= 5) {
          otpStore.delete(cleanEmail);
          return res.status(400).json({ error: "Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng bấm 'Gửi lại mã OTP' để lấy mã mới." });
        }

        if (otpData.code !== cleanOtpCode) {
          let sbVerified = false;
          if (supabaseDb) {
            try {
              const { error: sbOtpErr1 } = await supabaseDb.auth.verifyOtp({
                email: cleanEmail,
                token: cleanOtpCode,
                type: 'email'
              });
              if (!sbOtpErr1) {
                sbVerified = true;
              } else {
                const { error: sbOtpErr2 } = await supabaseDb.auth.verifyOtp({
                  email: cleanEmail,
                  token: cleanOtpCode,
                  type: 'signup'
                });
                if (!sbOtpErr2) sbVerified = true;
              }
            } catch (e) {
              // Ignore exception
            }
          }

          if (!sbVerified) {
            otpData.attempts += 1;
            return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${5 - otpData.attempts} lần thử.` });
          }
        }

        // Xóa OTP khỏi bộ nhớ sau khi xác thực thành công
        otpStore.delete(cleanEmail);
      }

      if (supabaseDb) {
        // Cloud Supabase database fallback
        const existingLeader = await supabaseGetLeader(cleanEmail);

        if (action === "register") {
          if (existingLeader) {
            return res.status(400).json({ error: "Tài khoản Email này đã tồn tại. Vui lòng chọn bên Đăng nhập." });
          }

          const uid = cleanEmail; // Crucial requirement: email as uid
          const cleanName = (displayName || cleanEmail.split("@")[0]).trim();
          
          // Hash password trước khi lưu
          const salt = bcrypt.genSaltSync(10);
          const hashedPassword = bcrypt.hashSync(cleanPassword, salt);

          const newLeader = {
            email: cleanEmail,
            password: hashedPassword,
            uid,
            displayName: cleanName,
            createdAt: new Date().toISOString()
          };

          await supabaseSaveLeader(newLeader);

          // Gửi mail thông tin đăng ký
          try {
            await sendCredentialsEmail(cleanEmail, cleanPassword, cleanName, 'registration');
          } catch (mailErr) {
            console.error("Lỗi gửi mail đăng ký (Supabase):", mailErr);
          }

          return res.json({
            success: true,
            isNew: true,
            user: {
              uid,
              email: cleanEmail,
              displayName: cleanName
            }
          });
        } else {
          // login action
          if (!existingLeader) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản. Vui lòng chuyển sang tab Đăng ký để tạo mới." });
          }

          // Kiểm tra mật khẩu (hỗ trợ cả plaintext cũ và hash mới)
          let isPasswordValid = false;
          if (existingLeader.password && (existingLeader.password.startsWith("$2a$") || existingLeader.password.startsWith("$2b$"))) {
            isPasswordValid = bcrypt.compareSync(cleanPassword, existingLeader.password);
          } else {
            // Fallback cho mật khẩu cũ chưa hash (chỉ chạy 1 lần khi chuyển đổi)
            isPasswordValid = existingLeader.password === cleanPassword;
            
            // Tự động nâng cấp lên hash nếu đăng nhập đúng bằng plaintext
            if (isPasswordValid) {
              const salt = bcrypt.genSaltSync(10);
              const hashedPassword = bcrypt.hashSync(cleanPassword, salt);
              await supabaseSaveLeader({ ...existingLeader, password: hashedPassword });
              console.log(`[AUTH] Đã tự động nâng cấp mật khẩu lên dạng hash cho: ${cleanEmail}`);
            }
          }

          if (!isPasswordValid) {
            return res.status(401).json({ error: "Mật khẩu không chính xác cho tài khoản này." });
          }

          const uid = existingLeader.uid || cleanEmail;

          return res.json({
            success: true,
            user: {
              uid,
              email: existingLeader.email,
              displayName: existingLeader.displayName || cleanEmail.split("@")[0]
            }
          });
        }
      } else {
        // File-based database fallback for local offline mode
        const allLeaders = readLeaders();
        const existingLeader = allLeaders.find(l => l.email === cleanEmail);
        
        if (action === "register") {
          if (existingLeader) {
            return res.status(400).json({ error: "Tài khoản Email này đã được đăng ký. Vui lòng chọn bên Đăng nhập." });
          }

          const uid = cleanEmail; // Crucial requirement: email as uid
          const cleanName = (displayName || cleanEmail.split("@")[0]).trim();
          
          // Hash password trước khi lưu
          const salt = bcrypt.genSaltSync(10);
          const hashedPassword = bcrypt.hashSync(cleanPassword, salt);

          const newLeader = {
            email: cleanEmail,
            password: hashedPassword,
            uid,
            displayName: cleanName,
            createdAt: new Date().toISOString()
          };
          
          allLeaders.push(newLeader);
          writeLeaders(allLeaders);
          
          // Gửi mail thông tin đăng ký
          try {
            await sendCredentialsEmail(cleanEmail, cleanPassword, cleanName, 'registration');
          } catch (mailErr) {
            console.error("Lỗi gửi mail đăng ký (Local):", mailErr);
          }

          return res.json({
            success: true,
            isNew: true,
            user: {
              uid,
              email: cleanEmail,
              displayName: cleanName
            }
          });
        } else {
          // login action
          if (!existingLeader) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản. Vui lòng chuyển sang tab Đăng ký để tạo mới." });
          }

          // Kiểm tra mật khẩu (hỗ trợ cả plaintext cũ và hash mới)
          let isPasswordValid = false;
          if (existingLeader.password && (existingLeader.password.startsWith("$2a$") || existingLeader.password.startsWith("$2b$"))) {
            isPasswordValid = bcrypt.compareSync(cleanPassword, existingLeader.password);
          } else {
            // Fallback cho mật khẩu cũ chưa hash
            isPasswordValid = existingLeader.password === cleanPassword;
            
            // Tự động nâng cấp lên hash nếu đăng nhập đúng bằng plaintext
            if (isPasswordValid) {
              const salt = bcrypt.genSaltSync(10);
              const hashedPassword = bcrypt.hashSync(cleanPassword, salt);
              existingLeader.password = hashedPassword;
              writeLeaders(allLeaders);
              console.log(`[AUTH-LOCAL] Đã tự động nâng cấp mật khẩu lên dạng hash cho: ${cleanEmail}`);
            }
          }

          if (!isPasswordValid) {
            return res.status(401).json({ error: "Mật khẩu không chính xác cho tài khoản này." });
          }

          const uid = existingLeader.uid || cleanEmail;

          return res.json({
            success: true,
            user: {
              uid,
              email: existingLeader.email,
              displayName: existingLeader.displayName || cleanEmail.split("@")[0]
            }
          });
        }
      }
    } catch (err: any) {
      console.error("Lỗi đăng nhập/đăng ký thủ quỹ:", err);
      return res.status(500).json({ error: err.message || "Gặp sự cố khi kết nối hệ thống. Vui lòng thử lại sau." });
    }
  });

  // 1b. Leader Forgot Password - reset to random password and email it
  app.post("/api/leader/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Vui lòng nhập địa chỉ Email." });
      }

      const cleanEmail = email.trim().toLowerCase();
      let foundLeader: any = null;

      if (supabaseDb) {
        foundLeader = await supabaseGetLeader(cleanEmail);
      } else {
        const allLeaders = readLeaders();
        foundLeader = allLeaders.find(l => l.email === cleanEmail);
      }

      if (!foundLeader) {
        return res.status(404).json({ error: "Không tìm thấy tài khoản Thủ quỹ với địa chỉ Email này." });
      }

      // Khi đã hash, chúng ta không thể lấy lại pass cũ. 
      // Do đó thực hiện reset mật khẩu ngẫu nhiên mới.
      const newTempPassword = Math.random().toString(36).slice(-8);
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newTempPassword, salt);
      
      foundLeader.password = hashedPassword;
      
      if (supabaseDb) {
        await supabaseSaveLeader(foundLeader);
      } else {
        const allLeaders = readLeaders();
        const index = allLeaders.findIndex(l => l.email === cleanEmail);
        allLeaders[index] = foundLeader;
        writeLeaders(allLeaders);
      }

      const displayName = foundLeader.displayName || cleanEmail.split("@")[0];
      const emailResult = await sendCredentialsEmail(cleanEmail, newTempPassword, displayName, 'forgot');

      return res.json({
        success: true,
        message: "Mật khẩu mới đã được tạo và xử lý gửi qua email thành công.",
        isMock: emailResult.isMock,
        password: emailResult.isMock ? newTempPassword : null 
      });
    } catch (err: any) {
      console.error("Lỗi lấy lại mật khẩu Thủ quỹ:", err);
      return res.status(500).json({ error: err.message || "Gặp sự cố khi xử lý. Vui lòng thử lại sau." });
    }
  });

  // 1c. Leader Change Password (either when logged in or authenticated)
  app.post("/api/leader/change-password", async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ: Email, Mật khẩu cũ và Mật khẩu mới." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanNewPassword = newPassword.trim();
      const cleanCurrentPassword = currentPassword.trim();

      if (cleanNewPassword.length < 4) {
        return res.status(400).json({ error: "Mật khẩu mới tối thiểu phải từ 4 ký tự trở lên." });
      }

      let foundLeader: any = null;

      if (supabaseDb) {
        foundLeader = await supabaseGetLeader(cleanEmail);
        if (!foundLeader) {
          return res.status(404).json({ error: "Không tìm thấy tài khoản Thủ quỹ." });
        }

        // Kiểm tra mật khẩu cũ
        let isPasswordValid = false;
        if (foundLeader.password && (foundLeader.password.startsWith("$2a$") || foundLeader.password.startsWith("$2b$"))) {
          isPasswordValid = bcrypt.compareSync(cleanCurrentPassword, foundLeader.password);
        } else {
          isPasswordValid = foundLeader.password === cleanCurrentPassword;
        }

        if (!isPasswordValid) {
          return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(cleanNewPassword, salt);
        foundLeader.password = hashedPassword;
        await supabaseSaveLeader(foundLeader);
      } else {
        const allLeaders = readLeaders();
        const index = allLeaders.findIndex(l => l.email === cleanEmail);
        if (index === -1) {
          return res.status(404).json({ error: "Không tìm thấy tài khoản Thủ quỹ." });
        }

        foundLeader = allLeaders[index];
        
        // Kiểm tra mật khẩu cũ
        let isPasswordValid = false;
        if (foundLeader.password && (foundLeader.password.startsWith("$2a$") || foundLeader.password.startsWith("$2b$"))) {
          isPasswordValid = bcrypt.compareSync(cleanCurrentPassword, foundLeader.password);
        } else {
          isPasswordValid = foundLeader.password === cleanCurrentPassword;
        }

        if (!isPasswordValid) {
          return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(cleanNewPassword, salt);
        allLeaders[index].password = hashedPassword;
        writeLeaders(allLeaders);
      }

      // Optionally send notification email with new password
      try {
        await sendCredentialsEmail(cleanEmail, cleanNewPassword, foundLeader.displayName || cleanEmail.split("@")[0], 'password_changed');
      } catch (mailErr) {
        console.error("Lỗi gửi mail thông báo đổi mật khẩu:", mailErr);
      }

      return res.json({
        success: true,
        message: "Mật khẩu đã được cập nhật thành công!"
      });
    } catch (err: any) {
      console.error("Lỗi thay đổi mật khẩu Thủ quỹ:", err);
      return res.status(500).json({ error: err.message || "Gặp sự cố khi thay đổi mật khẩu. Vui lòng thử lại sau." });
    }
  });

  // 1. Group Synchronize - GET groups matching ownerId
  app.get("/api/groups", async (req, res) => {
    try {
      const { ownerId, fallbackOwnerId, email } = req.query;
      if (!ownerId) {
        return res.status(400).json({ error: "Thiếu thông tin ownerId." });
      }
      if (supabaseDb) {
        const userGroups = await supabaseGetGroupsByOwnerOrEmail(ownerId as string, email as string, fallbackOwnerId as string);
        const processedGroups: Group[] = [];
        for (const g of userGroups) {
          const { updated, group: finalGroup } = await autoConvertGroupBase64Images(g);
          if (updated) {
            try {
              await supabaseSaveGroup(finalGroup);
            } catch (err) {
              console.error("[AUTO-CONVERT] Không thể tự động lưu nhóm đã sửa lỗi lên Supabase:", err);
            }
          }
          processedGroups.push(finalGroup);
        }
        const securedGroups = processedGroups.map(g => secureGroupImages(g));
        return res.json(securedGroups);
      } else {
        const dbGroups = readDb();
        const cleanEmail = (email as string)?.trim()?.toLowerCase();
        const userGroups = dbGroups.filter((g: any) => {
          const isOwner = g.ownerId === ownerId || (fallbackOwnerId && g.ownerId === fallbackOwnerId);
          const isMember = cleanEmail ? g.members?.some((m: any) => m.email?.toLowerCase() === cleanEmail) : false;
          return isOwner || isMember;
        });
        return res.json(userGroups);
      }
    } catch (err: any) {
      console.error("Lỗi GET /api/groups:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Group Synchronize - GET single group by ID
  app.get("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (supabaseDb) {
        let group = await supabaseGetGroupById(id);
        if (!group) {
          return res.status(404).json({ error: "Không tìm thấy nhóm." });
        }
        
        // Auto convert base64 images on load
        const { updated, group: finalGroup } = await autoConvertGroupBase64Images(group);
        if (updated) {
          try {
            await supabaseSaveGroup(finalGroup);
            console.log(`[AUTO-CONVERT] Đã khôi phục thành công các ảnh Base64 của nhóm ${id} và lưu lên Supabase.`);
          } catch (err) {
            console.error("[AUTO-CONVERT] Không thể tự động lưu nhóm đã sửa lỗi lên Supabase:", err);
          }
        }
        
        return res.json(secureGroupImages(finalGroup));
      } else {
        const dbGroups = readDb();
        const group = dbGroups.find((g) => g.id === id);
        if (!group) {
          return res.status(404).json({ error: "Không tìm thấy nhóm." });
        }
        return res.json(group);
      }
    } catch (err: any) {
      console.error("Lỗi GET /api/groups/:id:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Group Synchronize - POST (create or overwrite/sync groups)
  app.post("/api/groups", async (req, res) => {
    try {
      let group = req.body;
      if (!group || !group.id) {
        return res.status(400).json({ error: "Dữ liệu nhóm không hợp lệ." });
      }

      // Auto-heal member access codes on server if missing (strip accessCode for members with registered email)
      if (group.members) {
        group.members = group.members.map((m: any) => {
          if (m.email && m.email.trim() !== "") {
            const { accessCode, ...rest } = m;
            return rest;
          }
          if (!m.accessCode) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return { ...m, accessCode: code };
          }
          return m;
        });
        group.memberAccessCodes = group.members.map((m: any) => m.accessCode || "").filter(Boolean);
      }

      let saveResult = false;
      if (supabaseDb) {
        const oldGroup = await supabaseGetGroupById(group.id);
        
        // Automatically check & convert base64 images to supabase urls on save too
        const { group: finalGroup } = await autoConvertGroupBase64Images(group);
        group = finalGroup;
        
        if (oldGroup) {
          await deleteOrphanedGroupFiles(oldGroup, group);
        }
        
        saveResult = await supabaseSaveGroup(group);
      } else {
        const dbGroups = readDb();
        const index = dbGroups.findIndex((g) => g.id === group.id);
        if (index !== -1) {
          dbGroups[index] = { ...dbGroups[index], ...group };
        } else {
          dbGroups.push(group);
        }
        saveResult = writeDb(dbGroups);
      }

      if (!saveResult) {
        return res.status(500).json({ error: "Lưu dữ liệu nhóm lên máy chủ thất bại (Có thể do chế độ Chỉ Đọc)." });
      }

      // Tự động tạo folder cho nhóm trong Supabase Storage
      if (supabaseDb) {
        try {
          await supabaseDb.storage.from('Split Mate').upload(`${group.id}/.keep`, Buffer.from(''), { contentType: 'text/plain', upsert: true, cacheControl: "31536000" });
          console.log(`[SUPABASE] Tạo folder cho nhóm ${group.id} thành công.`);
        } catch (storageErr: any) {
          console.error(`[SUPABASE] Lỗi tạo folder cho nhóm ${group.id}:`, storageErr);
        }
      }

      return res.json({ success: true, group });
    } catch (err: any) {
      console.error("Lỗi POST /api/groups:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 4. Group Synchronize - DELETE group by ID
  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let deleteResult = false;
      if (supabaseDb) {
        deleteResult = await supabaseDeleteGroup(id);
      } else {
        const dbGroups = readDb();
        const updatedGroups = dbGroups.filter((g) => g.id !== id);
        writeDb(updatedGroups);
        deleteResult = true;
      }

      if (!deleteResult) {
        return res.status(500).json({ error: "Không thể xóa nhóm từ máy chủ." });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Lỗi DELETE /api/groups/:id:", err);
      return res.status(500).json({ error: err.message || "Không thể xóa nhóm." });
    }
  });

  // 5. Group Synchronize - POST reset/save presets for Owner
  app.post("/api/groups/presets", async (req, res) => {
    try {
      const { ownerId } = req.body;
      if (!ownerId) {
        return res.status(400).json({ error: "Thiếu thông tin ownerId." });
      }

      // Populate fresh mock template
      const defaultMock = MOCK_GROUPS.map((grp: any, i) => {
        const updatedMembers = grp.members.map((m: any) => {
          if (!m.accessCode) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let x = 0; x < 6; x++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return { ...m, accessCode: code };
          }
          return m;
        });
        const codes = updatedMembers.map((m: any) => m.accessCode || "").filter(Boolean);
        return {
          ...grp,
          id: `g_mock_${Date.now()}_${i}`,
          ownerId: ownerId,
          members: updatedMembers,
          memberAccessCodes: codes
        };
      });

      if (supabaseDb) {
        // Clear all previous user groups in Supabase
        const userGroups = await supabaseGetGroupsByOwnerOrEmail(ownerId);
        for (const ug of userGroups) {
          await supabaseDeleteGroup(ug.id);
        }
        // Save defaults to Supabase
        for (const dm of defaultMock) {
          await supabaseSaveGroup(dm);
        }
      } else {
        const dbGroups = readDb();
        let updatedGroups = dbGroups.filter((g: any) => g.ownerId !== ownerId);
        updatedGroups = [...updatedGroups, ...defaultMock];
        writeDb(updatedGroups);
      }

      return res.json({ success: true, groups: defaultMock });
    } catch (err: any) {
      console.error("Lỗi POST /api/groups/presets:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 6. Member login with Access Code
  app.post("/api/member/login", apiLoginRateLimiter, async (req, res) => {
    try {
      const { accessCode } = req.body;
      if (!accessCode) {
        return res.status(400).json({ error: "Thiếu mã đăng ký/đăng nhập." });
      }

      const cleanCode = accessCode.trim().toUpperCase();
      console.log(`[AUTH] Đang tìm kiếm nhóm có mã thành viên: ${cleanCode}`);

      let matchedGroup: Group | null = null;
      if (supabaseDb) {
        matchedGroup = await supabaseGetGroupByMemberAccessCode(cleanCode);
      } else {
        const dbGroups = readDb();
        matchedGroup = dbGroups.find((g: any) => {
          const matchMember = (g.members || []).some((m: any) => m.accessCode && m.accessCode.trim().toUpperCase() === cleanCode);
          const matchCodes = (g.memberAccessCodes || []).some((c: string) => c && c.trim().toUpperCase() === cleanCode);
          return matchMember || matchCodes;
        }) || null;
      }

      if (!matchedGroup) {
        console.log(`[AUTH] Không tìm thấy nhóm cho mã: ${cleanCode}`);
        return res.status(404).json({ error: "Mã truy cập không chính xác hoặc nhóm đã bị xóa trực tuyến." });
      }
      console.log(`[AUTH] Đã tìm thấy nhóm: ${matchedGroup.id}. Thành viên:`, matchedGroup.members);
      (matchedGroup.members || []).forEach((m: any, idx: number) => console.log(`[AUTH] Thành viên ${idx}: ID=${m?.id}, Code=${m?.accessCode}`));
      
      // Find the specific member with this code
      const matchedMember = (matchedGroup.members || []).find((m: any) => {
        const isMatched = m?.accessCode && m.accessCode.trim().toUpperCase() === cleanCode;
        console.log(`[AUTH] So sánh: '${m?.accessCode}' === '${cleanCode}'?`, isMatched);
        return isMatched;
      });

      if (!matchedMember) {
        return res.status(404).json({ error: "Thành viên sử dụng mã này không tồn tại trong nhóm." });
      }

      return res.json({
        group: matchedGroup,
        memberId: matchedMember.id
      });
    } catch (error: any) {
      console.error("Lỗi đăng ký/đăng nhập của thành viên:", error);
      return res.status(500).json({ error: "Không thể xác thực mã lúc này. Vui lòng thử lại sau." });
    }
  });

  // 7. Member updates their own SĐT/STK
  app.post("/api/member/update-info", async (req, res) => {
    try {
      const { groupId, memberId, accessCode, userEmail, fundType, momoPhone, bankAccount, bankCode, bankAccountName, name, color, emoji, avatar, email, password } = req.body;

      if (!groupId || !memberId) {
        return res.status(400).json({ error: "Yêu cầu thiếu dữ liệu xác thực (ID nhóm hoặc ID thành viên)." });
      }

      if (!accessCode && !userEmail) {
        return res.status(400).json({ error: "Yêu cầu thiếu dữ liệu xác thực (Mã truy cập hoặc Email người dùng)." });
      }

      let groupData: Group | null = null;

      if (supabaseDb) {
        groupData = await supabaseGetGroupById(groupId);
      } else {
        const dbGroups = readDb();
        groupData = dbGroups.find((g) => g.id === groupId) || null;
      }

      if (!groupData) {
        return res.status(404).json({ error: "Nhóm không tồn tại hoặc đã bị xóa." });
      }

      const members = groupData.members || [];
      const memberIndex = members.findIndex((m: any) => m.id === memberId);

      if (memberIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy thành viên trong nhóm này." });
      }

      const member = members[memberIndex];

      // Validate access right: Either accessCode matches member's accessCode, OR userEmail matches member's email
      let isAuthorized = false;
      if (accessCode) {
        const cleanCode = accessCode.trim().toUpperCase();
        if (member.accessCode && member.accessCode.trim().toUpperCase() === cleanCode) {
          isAuthorized = true;
        }
      } else if (userEmail) {
        const cleanUserEmail = userEmail.trim().toLowerCase();
        if (member.email && member.email.trim().toLowerCase() === cleanUserEmail) {
          isAuthorized = true;
        } else if (groupData.ownerId && groupData.ownerId.toLowerCase() === cleanUserEmail) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa thông tin của thành viên này hoặc phiên đăng nhập đã hết hạn." });
      }

      // If avatar is changing and old avatar exists and is in storage, delete it
      let newAvatarUrl = avatar !== undefined ? avatar : member.avatar;
      if (avatar !== undefined && avatar !== member.avatar && member.avatar && member.avatar.startsWith("/api/receipt/view/")) {
        const oldFileName = member.avatar.split("/api/receipt/view/")[1];
        await deleteFileFromStorage(oldFileName);
      }

      const effectiveEmail = (member.email && member.email.trim() !== "") ? member.email.trim().toLowerCase() : (email !== undefined && email.trim() !== "" ? email.trim().toLowerCase() : undefined);

      const isNewEmailLink = email && email.trim() !== "" && (!member.email || email.trim().toLowerCase() !== member.email.trim().toLowerCase());
      let isVerifiedNow = member.emailVerified || false;

      if (isNewEmailLink) {
        const cleanLinkEmail = email.trim().toLowerCase();

        // 1. Kiểm tra xem Email đã tồn tại trên bảng leaders chưa
        let existingLeader = null;
        if (supabaseDb) {
          existingLeader = await supabaseGetLeader(cleanLinkEmail);
        } else {
          const leadersList = readLeaders();
          existingLeader = leadersList.find((l: any) => l.email && l.email.toLowerCase() === cleanLinkEmail);
        }

        if (existingLeader) {
          if (password && typeof password === 'string' && password.trim()) {
            const match = bcrypt.compareSync(password.trim(), existingLeader.password);
            if (!match) {
              return res.status(400).json({ error: "Email này đã được đăng ký cho một tài khoản khác trên hệ thống. Mật khẩu bạn nhập không chính xác." });
            }
          } else {
            return res.status(400).json({ error: "Email này đã được đăng ký cho một tài khoản khác trên hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập bằng tài khoản đó." });
          }
        }

        // 2. Xác thực mã OTP 6 chữ số
        const reqOtpCode = req.body.otpCode ? String(req.body.otpCode).trim() : "";
        if (!reqOtpCode) {
          return res.status(400).json({ error: "Vui lòng nhập mã OTP 6 chữ số được gửi tới email để xác thực liên kết." });
        }

        const otpData = otpStore.get(cleanLinkEmail);
        if (!otpData) {
          return res.status(400).json({ error: "Mã OTP không hợp lệ hoặc chưa được gửi tới email này. Vui lòng bấm 'Gửi mã OTP'." });
        }
        if (Date.now() > otpData.expiresAt) {
          otpStore.delete(cleanLinkEmail);
          return res.status(400).json({ error: "Mã OTP đã hết hạn (sau 10 phút). Vui lòng bấm 'Gửi lại mã OTP'." });
        }
        if (otpData.code !== reqOtpCode) {
          otpData.attempts += 1;
          return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${Math.max(0, 5 - otpData.attempts)} lần thử.` });
        }

        otpStore.delete(cleanLinkEmail);
        isVerifiedNow = true;
      }

      // Link or create user credentials if password is provided
      if (password && typeof password === 'string' && password.trim().length >= 4 && effectiveEmail) {
        const cleanLinkEmail = effectiveEmail.trim().toLowerCase();
        const cleanLinkPassword = password.trim();
        const cleanLinkName = (name || member.name || cleanLinkEmail.split("@")[0]).trim();

        if (supabaseDb) {
          const existingLeader = await supabaseGetLeader(cleanLinkEmail);
          const salt = bcrypt.genSaltSync(10);
          const hashedPassword = bcrypt.hashSync(cleanLinkPassword, salt);

          if (!existingLeader) {
            const newLeader = {
              email: cleanLinkEmail,
              password: hashedPassword,
              uid: cleanLinkEmail,
              displayName: cleanLinkName,
              createdAt: new Date().toISOString()
            };
            await supabaseSaveLeader(newLeader);
            try {
              await sendCredentialsEmail(cleanLinkEmail, cleanLinkPassword, cleanLinkName, 'registration');
            } catch (mailErr) {
              console.error("Lỗi gửi mail thông báo cho thành viên:", mailErr);
            }
          } else {
            existingLeader.password = hashedPassword;
            if (cleanLinkName) existingLeader.displayName = cleanLinkName;
            await supabaseSaveLeader(existingLeader);
            try {
              await sendCredentialsEmail(cleanLinkEmail, cleanLinkPassword, cleanLinkName, 'password_changed');
            } catch (mailErr) {
              console.error("Lỗi gửi mail cập nhật cho thành viên:", mailErr);
            }
          }
        } else {
          const leadersList = readLeaders();
          const cleanEmailLower = cleanLinkEmail.toLowerCase();
          const index = leadersList.findIndex((l: any) => l.email && l.email.toLowerCase() === cleanEmailLower);
          const salt = bcrypt.genSaltSync(10);
          const hashedPassword = bcrypt.hashSync(cleanLinkPassword, salt);

          if (index === -1) {
            leadersList.push({
              email: cleanLinkEmail,
              password: hashedPassword,
              uid: cleanLinkEmail,
              displayName: cleanLinkName,
              createdAt: new Date().toISOString()
            });
          } else {
            leadersList[index].password = hashedPassword;
            if (cleanLinkName) leadersList[index].displayName = cleanLinkName;
          }
          writeLeaders(leadersList);
          try {
            await sendCredentialsEmail(cleanLinkEmail, cleanLinkPassword, cleanLinkName, index === -1 ? 'registration' : 'password_changed');
          } catch (mailErr) {
            console.error("Lỗi gửi mail thông báo cho thành viên (Local):", mailErr);
          }
        }
      }

      const updatedMember = {
        ...member,
        name: name !== undefined ? (name.trim() || member.name) : member.name,
        color: color !== undefined ? color : member.color,
        emoji: emoji !== undefined ? emoji : member.emoji,
        avatar: newAvatarUrl,
        fundType: fundType || member.fundType,
        momoPhone: momoPhone !== undefined ? (momoPhone.trim() || undefined) : member.momoPhone,
        bankAccount: bankAccount !== undefined ? (bankAccount.trim() || undefined) : member.bankAccount,
        bankCode: bankCode !== undefined ? (bankCode || undefined) : member.bankCode,
        bankAccountName: bankAccountName !== undefined ? (bankAccountName.trim().toUpperCase() || undefined) : member.bankAccountName,
        email: effectiveEmail,
        emailVerified: effectiveEmail ? (isVerifiedNow || true) : false,
        // Strip accessCode if email is linked
        accessCode: effectiveEmail ? undefined : member.accessCode,
        
        // Populate legacy fallbacks
        fundPhone: bankAccount !== undefined ? bankAccount.trim() : member.fundPhone,
        fundName: bankAccountName !== undefined ? bankAccountName.trim().toUpperCase() : member.fundName,
        fundBankName: bankCode !== undefined ? bankCode : member.fundBankName
      };

      const updatedMembers = [...members];
      updatedMembers[memberIndex] = updatedMember;

      groupData.members = updatedMembers;

      if (supabaseDb) {
        const oldGroup = await supabaseGetGroupById(groupId);
        const { group: finalGroup } = await autoConvertGroupBase64Images(groupData);
        groupData = finalGroup;
        if (oldGroup) {
          await deleteOrphanedGroupFiles(oldGroup, groupData);
        }
        await supabaseSaveGroup(groupData);
      } else {
        const dbGroups = readDb();
        const index = dbGroups.findIndex((g) => g.id === groupId);
        if (index !== -1) {
          dbGroups[index] = groupData;
          writeDb(dbGroups);
        }
      }

      // GLOBAL SYNC: If the member has an email, sync this profile update to ALL other groups where this user is a member/owner
      const updatedGroupsList: Group[] = [groupData];
      const syncEmail = effectiveEmail || member.email || userEmail;

      if (syncEmail && typeof syncEmail === 'string' && syncEmail.trim() !== '') {
         const cleanSyncEmail = syncEmail.trim().toLowerCase();
         let allCandidateGroups: Group[] = [];

         if (supabaseDb) {
           const ownerGroups = groupData.ownerId ? await supabaseGetGroupsByOwnerOrEmail(groupData.ownerId, cleanSyncEmail) : [];
           const memberGroups = await supabaseGetGroupsByOwnerOrEmail("", cleanSyncEmail);
           const map = new Map<string, Group>();
           [...ownerGroups, ...memberGroups].forEach(g => map.set(g.id, g));
           allCandidateGroups = Array.from(map.values());
         } else {
           allCandidateGroups = readDb();
         }

         const savePromises = [];
         let localDbUpdated = false;
         let dbGroups: Group[] = [];
         if (!supabaseDb) {
           dbGroups = readDb();
         }

         for (const g of allCandidateGroups) {
            if (g.id === groupData.id) continue;
            
            let changed = false;
            const newMembers = g.members.map((m: any) => {
              if (m.email && m.email.trim().toLowerCase() === cleanSyncEmail) {
                changed = true;
                return {
                  ...m,
                  name: updatedMember.name,
                  color: updatedMember.color,
                  emoji: updatedMember.emoji,
                  avatar: updatedMember.avatar,
                  fundType: updatedMember.fundType,
                  momoPhone: updatedMember.momoPhone,
                  bankAccount: updatedMember.bankAccount,
                  bankCode: updatedMember.bankCode,
                  bankAccountName: updatedMember.bankAccountName,
                  email: cleanSyncEmail,
                  accessCode: undefined,
                  fundPhone: updatedMember.bankAccount || updatedMember.momoPhone || m.fundPhone,
                  fundName: updatedMember.bankAccountName || m.fundName,
                  fundBankName: updatedMember.bankCode || m.fundBankName
                };
              }
              return m;
            });

            if (changed) {
              g.members = newMembers;
              updatedGroupsList.push(g);
              if (supabaseDb) {
                savePromises.push(supabaseSaveGroup(g));
              } else {
                const idx = dbGroups.findIndex((d: Group) => d.id === g.id);
                if (idx !== -1) {
                  dbGroups[idx] = g;
                  localDbUpdated = true;
                }
              }
            }
         }

         if (supabaseDb && savePromises.length > 0) {
            await Promise.all(savePromises);
         } else if (!supabaseDb && localDbUpdated) {
            writeDb(dbGroups);
         }
         
         // Update Leader account displayName/avatar if email matches leader account
         if (supabaseDb) {
            const leader = await supabaseGetLeader(cleanSyncEmail);
            if (leader) {
               leader.displayName = updatedMember.name;
               if (updatedMember.avatar) leader.avatar = updatedMember.avatar;
               await supabaseSaveLeader(leader);
            }
         } else {
            const leaders = readLeaders();
            const lIdx = leaders.findIndex((l: any) => l.email && l.email.toLowerCase() === cleanSyncEmail);
            if (lIdx !== -1) {
               leaders[lIdx].displayName = updatedMember.name;
               if (updatedMember.avatar) leaders[lIdx].avatar = updatedMember.avatar;
               writeLeaders(leaders);
            }
         }
      }

      return res.json({
        success: true,
        group: groupData,
        updatedGroups: updatedGroupsList
      });
    } catch (error: any) {
      console.error("Lỗi cập nhật thông tin thành viên:", error);
      return res.status(500).json({ error: "Có lỗi khi ghi nhận thông tin SĐT/STK lên máy chủ." });
    }
  });

  // 8. Member submits proof photo (pendingReceipts)
  app.post("/api/member/upload-receipt", async (req, res) => {
    try {
      const { groupId, memberId, accessCode, pendingReceipt } = req.body;

      if (!groupId || !memberId || !accessCode || !pendingReceipt) {
        return res.status(400).json({ error: "Thiếu dữ liệu minh chứng giao dịch." });
      }

      const cleanCode = accessCode.trim().toUpperCase();
      let groupData: Group | null = null;

      if (supabaseDb) {
        groupData = await supabaseGetGroupById(groupId);
      } else {
        const dbGroups = readDb();
        groupData = dbGroups.find((g) => g.id === groupId) || null;
      }

      if (!groupData) {
        return res.status(404).json({ error: "Nhóm không tồn tại hoặc đã bị xóa." });
      }

      const members = groupData.members || [];
      const member = members.find((m: any) => m.id === memberId);

      if (!member) {
        return res.status(404).json({ error: "Không tìm thấy thành viên tương ứng." });
      }

      if (member.accessCode !== cleanCode) {
        return res.status(403).json({ error: "Xác thực thất bại, mã không chính xác." });
      }

      const currentReceipts = groupData.pendingReceipts || [];
      const updatedReceipts = [pendingReceipt, ...currentReceipts];

      groupData.pendingReceipts = updatedReceipts;

      if (supabaseDb) {
        const oldGroup = await supabaseGetGroupById(groupId);
        const { group: finalGroup } = await autoConvertGroupBase64Images(groupData);
        groupData = finalGroup;
        if (oldGroup) {
          await deleteOrphanedGroupFiles(oldGroup, groupData);
        }
        await supabaseSaveGroup(groupData);
      } else {
        const dbGroups = readDb();
        const index = dbGroups.findIndex((g) => g.id === groupId);
        if (index !== -1) {
          dbGroups[index] = groupData;
          writeDb(dbGroups);
        }
      }

      return res.json({
        success: true,
        group: groupData
      });
    } catch (error: any) {
      console.error("Lỗi đăng tải minh chứng giao dịch:", error);
      return res.status(500).json({ error: "Có trục trặc khi lưu trữ minh chứng giao dịch. Vui lòng thử lại." });
    }
  });

  // Endpoint di chuyển dữ liệu từ Firestore sang Supabase qua Web Request
  app.get("/api/migrate-from-firestore", async (req, res) => {
    try {
      if (!supabaseDb) {
        return res.status(400).json({ error: "Supabase chưa được khởi hoạt hoặc lỗi: " + supabaseInitError });
      }

      console.log("[MIGRATION] Bắt đầu xử lý yêu cầu di chuyển dữ liệu...");
      const { initializeApp, cert, getApps } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");

      let serviceAccount: any = null;

      // Tìm thông tin Firebase từ biến môi trường
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          project_id: process.env.FIREBASE_PROJECT_ID.trim(),
          client_email: process.env.FIREBASE_CLIENT_EMAIL.trim(),
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, '').trim()
        };
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if (!raw.startsWith("{") && !raw.startsWith('"')) {
          try {
            raw = Buffer.from(raw, 'base64').toString('utf8');
          } catch (e) {}
        }
        if (raw.startsWith('"') && raw.endsWith('"')) {
          raw = JSON.parse(raw);
        }
        serviceAccount = typeof raw === "string" ? JSON.parse(raw) : raw;
      } else {
        const localSvcPath = path.join(process.cwd(), "firebase-service-account.json");
        if (fs.existsSync(localSvcPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(localSvcPath, "utf-8"));
        }
      }

      if (!serviceAccount) {
        return res.status(400).json({ 
          error: "Không tìm thấy thông tin cấu hình Firebase Admin (Service Account) trên Vercel.",
          suggest: "Hãy chắc chắn rằng bạn đã gán FIREBASE_SERVICE_ACCOUNT hoặc gán 3 biến phân tách (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) trong cấu hình Vercel."
        });
      }

      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }

      const adminApp = getApps().length === 0 ? initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      }) : getApps()[0];

      const firestoreDb = getFirestore(adminApp);

      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(removeUndefined);
        if (typeof obj === 'object') {
          const clean: any = {};
          for (const key in obj) {
            if (obj[key] !== undefined) {
              clean[key] = removeUndefined(obj[key]);
            }
          }
          return clean;
        }
        return obj;
      };

      const logs: string[] = [];
      logs.push("Bắt đầu di chuyển dữ liệu từ Firestore sang Supabase...");

      // A. Di chuyển leaders
      const leadersSnapshot = await firestoreDb.collection("leaders").get();
      logs.push(`Tìm thấy ${leadersSnapshot.size} tài khoản thủ quỹ trong Firestore.`);
      
      let leadersMigrated = 0;
      for (const doc of leadersSnapshot.docs) {
        const leader = doc.data();
        const email = leader.email || doc.id;
        const cleanEmail = email.trim().toLowerCase();
        
        const cleanLeader = removeUndefined({
          email: cleanEmail,
          password: leader.password || "",
          displayName: leader.displayName || leader.name || cleanEmail.split("@")[0],
          createdAt: leader.createdAt || new Date().toISOString(),
          ...leader
        });

        const { error } = await supabaseDb
          .from("leaders")
          .upsert(cleanLeader);
          
        if (error) {
          logs.push(`❌ Lỗi lưu thủ quỹ [${cleanEmail}]: ${error.message}`);
        } else {
          leadersMigrated++;
          logs.push(`✅ Đã di chuyển Thủ quỹ: ${cleanEmail}`);
        }
      }

      // B. Di chuyển groups
      const groupsSnapshot = await firestoreDb.collection("groups").get();
      logs.push(`Tìm thấy ${groupsSnapshot.size} nhóm chi tiêu trong Firestore.`);
      
      let groupsMigrated = 0;
      for (const doc of groupsSnapshot.docs) {
        const groupData = doc.data();
        const groupId = groupData.id || doc.id;
        
        const cleanGroup = removeUndefined(groupData);
        
        const { error } = await supabaseDb
          .from("groups")
          .upsert({
            id: groupId,
            ownerId: cleanGroup.ownerId || "",
            name: cleanGroup.name || "Nhóm không tên",
            memberAccessCodes: cleanGroup.memberAccessCodes || [],
            data: cleanGroup,
            createdAt: cleanGroup.createdAt || new Date().toISOString()
          }, { onConflict: "id" });
          
        if (error) {
          logs.push(`❌ Lỗi lưu nhóm [${groupId} - ${cleanGroup.name}]: ${error.message}`);
        } else {
          groupsMigrated++;
          logs.push(`✅ Đã di chuyển Nhóm: "${cleanGroup.name}" (${groupId})`);
        }
      }

      res.json({
        success: true,
        message: "Di chuyển dữ liệu thành công!",
        summary: {
          leadersTotal: leadersSnapshot.size,
          leadersMigrated,
          groupsTotal: groupsSnapshot.size,
          groupsMigrated
        },
        logs
      });

    } catch (err: any) {
      console.error("Lỗi đồng bộ dữ liệu Firestore -> Supabase:", err);
      res.status(500).json({
        error: "Đồng bộ dữ liệu gặp sự cố nghiêm trọng.",
        message: err.message || String(err)
      });
    }
  });

  // Endpoint di chuyển dữ liệu từ CSV sang Supabase via POST
  app.post("/api/migrate-from-csv", async (req, res) => {
    try {
      if (!supabaseDb) {
        return res.status(400).json({ error: "Supabase chưa được khởi hoạt hoặc lỗi: " + supabaseInitError });
      }

      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ error: "Thiếu dữ liệu csvData trong yêu cầu." });
      }

      console.log("[MIGRATION] Bắt đầu phân tích dữ liệu CSV...");
      const Papa = (await import("papaparse")).default;

      // Parse CSV Data
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.warn("Cảnh báo lỗi parse CSV:", parseResult.errors);
      }

      const rows = parseResult.data as any[];
      const logs: string[] = [];
      logs.push(`Đã parse thành công CSV với ${rows.length} hàng.`);

      let groupsMigrated = 0;
      for (const row of rows) {
        const id = row.id || row["Document ID"];
        if (!id) {
          logs.push(`⚠️ Bỏ qua hàng không có ID/Document ID`);
          continue;
        }

        try {
          // Reconstruct the Group object
          const allowMemberAddExpense = row.allowMemberAddExpense === "true" || row.allowMemberAddExpense === true;
          
          let expenses = [];
          if (row.expenses) {
            try {
              expenses = typeof row.expenses === "string" ? JSON.parse(row.expenses) : row.expenses;
            } catch (err) {
              logs.push(`⚠️ Không parse được JSON expenses cho nhóm ${id}: ${err}`);
            }
          }

          let memberAccessCodes = [];
          if (row.memberAccessCodes) {
            try {
              memberAccessCodes = typeof row.memberAccessCodes === "string" ? JSON.parse(row.memberAccessCodes) : row.memberAccessCodes;
            } catch (err) {
              logs.push(`⚠️ Không parse được JSON memberAccessCodes cho nhóm ${id}: ${err}`);
            }
          }

          let members = [];
          if (row.members) {
            try {
              members = typeof row.members === "string" ? JSON.parse(row.members) : row.members;
            } catch (err) {
              logs.push(`⚠️ Không parse được JSON members cho nhóm ${id}: ${err}`);
            }
          }

          const reconstructedGroup = {
            id: id.trim(),
            allowMemberAddExpense,
            createdAt: row.createdAt || new Date().toISOString(),
            expenses,
            fundQrImage: row.fundQrImage || "",
            fundType: row.fundType || "bank",
            memberAccessCodes,
            members,
            momoQrImage: row.momoQrImage || "",
            name: row.name || "Nhóm không tên",
            ownerId: row.ownerId || ""
          };

          const { error } = await supabaseDb
            .from("groups")
            .upsert({
              id: reconstructedGroup.id,
              ownerId: reconstructedGroup.ownerId,
              name: reconstructedGroup.name,
              memberAccessCodes: reconstructedGroup.memberAccessCodes,
              data: reconstructedGroup,
              createdAt: reconstructedGroup.createdAt
            }, { onConflict: "id" });

          if (error) {
            logs.push(`❌ Lỗi lưu nhóm [${reconstructedGroup.id} - ${reconstructedGroup.name}]: ${error.message}`);
          } else {
            groupsMigrated++;
            logs.push(`✅ Đã di chuyển Nhóm CSV: "${reconstructedGroup.name}" (${reconstructedGroup.id})`);
          }
        } catch (rowErr: any) {
          logs.push(`❌ Gặp lỗi bất ngờ khi xử lý hàng nhóm ${id}: ${rowErr.message || rowErr}`);
        }
      }

      return res.json({
        success: true,
        message: "Di chuyển dữ liệu từ file CSV hoàn tất!",
        summary: {
          totalRows: rows.length,
          groupsMigrated
        },
        logs
      });

    } catch (err: any) {
      console.error("Lỗi đồng bộ dữ liệu CSV -> Supabase:", err);
      return res.status(500).json({
        error: "Đồng bộ dữ liệu CSV gặp sự cố nghiêm trọng.",
        message: err.message || String(err)
      });
    }
  });

  // --- REGION FEEDBACKS AND FAQ ---
  const FEEDBACKS_FILE = path.join(process.cwd(), "feedbacks_db.json");
  let inMemoryFeedbacks: any[] | null = null;

  function readFeedbacksLocal(): any[] {
    if (inMemoryFeedbacks) return inMemoryFeedbacks;
    try {
      if (!fs.existsSync(FEEDBACKS_FILE)) {
        try {
          if (!fsWriteErrorOccurred) {
            fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify([], null, 2), "utf-8");
          }
        } catch (e) {
          fsWriteErrorOccurred = true;
          console.warn("[FS] Readonly filesystem detected for feedbacks, using memory.");
        }
        inMemoryFeedbacks = [];
        return [];
      }
      const data = fs.readFileSync(FEEDBACKS_FILE, "utf-8");
      if (!data || data.trim() === "") {
        inMemoryFeedbacks = [];
      } else {
        try {
          inMemoryFeedbacks = JSON.parse(data) || [];
        } catch (e) {
          inMemoryFeedbacks = [];
        }
      }
      return inMemoryFeedbacks!;
    } catch (err) {
      console.error("Lỗi khi đọc file feedbacks:", err);
      inMemoryFeedbacks = inMemoryFeedbacks || [];
      return inMemoryFeedbacks;
    }
  }

  function writeFeedbacksLocal(feedbacksList: any[]): boolean {
    inMemoryFeedbacks = feedbacksList;
    if (fsWriteErrorOccurred) return false;
    try {
      fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacksList, null, 2), "utf-8");
      return true;
    } catch (err) {
      fsWriteErrorOccurred = true;
      console.error("Lỗi khi ghi file feedbacks - Readonly FileSystem:", err);
      return false;
    }
  }

  async function getFeedbacksAll(): Promise<any[]> {
    if (supabaseDb) {
      try {
        const { data, error } = await supabaseDb
          .from("feedbacks")
          .select("*");
        if (!error && data) {
          return data.map((item: any) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            email: item.email,
            content: item.content,
            rating: item.rating,
            createdAt: item.createdAt || item.created_at,
            status: item.status,
            reply: item.reply,
            repliedAt: item.repliedAt || item.replied_at
          })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        console.warn("[SUPABASE] Lỗi truy vấn bảng 'feedbacks' hoặc bảng chưa tồn tại. Phục hồi qua dữ liệu cục bộ.");
      } catch (e: any) {
        console.error("[SUPABASE] Lỗi getFeedbacksAll:", e.message || e);
      }
    }
    return readFeedbacksLocal();
  }

  async function saveFeedbackItem(feedback: any): Promise<boolean> {
    const localList = readFeedbacksLocal();
    const index = localList.findIndex((f) => f.id === feedback.id);
    if (index >= 0) {
      localList[index] = feedback;
    } else {
      localList.unshift(feedback);
    }
    writeFeedbacksLocal(localList);

    if (supabaseDb) {
      try {
        const dbPayload = {
          id: feedback.id,
          type: feedback.type,
          name: feedback.name || "",
          email: feedback.email || "",
          rating: feedback.rating || null,
          content: feedback.content,
          created_at: feedback.createdAt,
          createdAt: feedback.createdAt,
          status: feedback.status || "pending",
          reply: feedback.reply || null,
          replied_at: feedback.repliedAt || null,
          repliedAt: feedback.repliedAt || null
        };
        const { error } = await supabaseDb
          .from("feedbacks")
          .upsert(dbPayload);
        if (!error) {
          return true;
        }
        console.warn("[SUPABASE] Lỗi lưu bảng feedbacks (Có thể bảng chưa tồn tại, dùng local): coding fallback.");
      } catch (e: any) {
        console.error("[SUPABASE] Lỗi saveFeedbackItem:", e.message || e);
      }
    }
    return true;
  }

  async function deleteFeedbackItem(id: string): Promise<boolean> {
    const localList = readFeedbacksLocal();
    const filtered = localList.filter((f) => f.id !== id);
    writeFeedbacksLocal(filtered);

    if (supabaseDb) {
      try {
        const { error } = await supabaseDb
          .from("feedbacks")
          .delete()
          .eq("id", id);
        if (!error) {
          return true;
        }
      } catch (e: any) {
        console.error("[SUPABASE] Lỗi deleteFeedbackItem:", e.message || e);
      }
    }
    return true;
  }

  // API Feedbacks & FAQ Routes
  app.get("/api/feedbacks", async (req, res) => {
    try {
      const list = await getFeedbacksAll();
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ error: "Lỗi tải phản hồi.", message: err.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const { name, email, type, content, rating } = req.body;
      if (!content || !type) {
        return res.status(400).json({ error: "Thiếu dữ liệu: type và content là bắt buộc." });
      }

      const newFeedback = {
        id: "fb_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        type,
        name: name || "Ẩn danh",
        email: email || "",
        content,
        rating: rating ? parseInt(rating) : undefined,
        createdAt: new Date().toISOString(),
        status: "pending",
        reply: "",
        repliedAt: ""
      };

      await saveFeedbackItem(newFeedback);
      return res.json({ success: true, feedback: newFeedback });
    } catch (err: any) {
      return res.status(500).json({ error: "Lỗi gửi phản hồi.", message: err.message });
    }
  });


  // ------------------------------------

  app.post("/api/user/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Thiếu email." });
      
      const cleanEmail = email.trim().toLowerCase();
      let user = null;
      if (supabaseDb) {
        user = await supabaseGetLeader(cleanEmail);
      } else {
        const leaders = readLeaders();
        user = leaders.find(l => l.email === cleanEmail);
      }
      
      if (user) {
        return res.json({ success: true, found: true, name: user.displayName || user.name, avatar: user.photoURL || null });
      } else {
        return res.json({ success: true, found: false });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user/invite-email", async (req, res) => {
    try {
      const { email, groupId } = req.body;
      if (!email || !groupId) return res.status(400).json({ error: "Thiếu email hoặc groupId." });
      
      if (!supabaseDb) return res.status(500).json({ error: "Supabase DB chưa được khởi tạo." });

      // 1. Insert invitation record
      const inviteId = Math.random().toString(36).substring(2, 15);
      const { error: inviteError } = await supabaseDb
        .from("invitations")
        .insert({ id: inviteId, group_id: groupId, email: email.trim().toLowerCase(), status: "pending" });

      if (inviteError) {
        console.error("Lỗi insert invitation:", inviteError);
        return res.status(500).json({ error: "Lỗi ghi nhận lời mời." });
      }

      // 2. Send email (using nodemailer - reuse logic or similar)
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "465", 10);
      const secure = process.env.SMTP_SECURE !== "false";
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || `"SplitMate" <noreply@gmail.com>`;

      const isMock = !(host && user && pass);
      if (!isMock) {
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.sendMail({
          from,
          to: email,
          subject: "[SplitMate] Lời mời tham gia nhóm quản lý chi tiêu",
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #03B875; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SplitMate Applet</h2>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Quản lý chi tiêu nhóm thông minh, minh bạch</p>
              </div>
              
              <p style="font-size: 14px; color: #334155; line-height: 1.5;">Chào bạn,</p>
              <p style="font-size: 14px; color: #334155; line-height: 1.5;">Bạn đã nhận được lời mời tham gia nhóm quản lý chi tiêu trên <strong>SplitMate</strong>. Nhấp vào nút bên dưới để tham gia nhóm ngay:</p>
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="https://www.splitmate.space/register?email=${encodeURIComponent(email)}&groupId=${groupId}" style="background-color: #03B875; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(3,184,117,0.25);">Tham Gia Nhóm Ngay</a>
              </div>

              <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.4;">
                Nếu bạn không biết về nhóm này, vui lòng bỏ qua thư này.
              </p>
              
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Đây là thư tự động từ SplitMate. Vui lòng không phản hồi thư này.</p>
            </div>
          `
        });
      } else {
        console.log(`[EMAIL MOCK] Gửi tới ${email} link: https://www.splitmate.space/register?email=${encodeURIComponent(email)}&groupId=${groupId}`);
      }
      
      return res.json({ 
        success: true, 
        isMock,
        message: isMock 
          ? "Đã ghi nhận lời mời. Thành viên có thể đăng nhập hoặc đặt mật khẩu trực tiếp." 
          : "Đã gửi email mời đăng ký thành công!" 
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin endpoint to clean up orphaned storage folders
  app.get("/api/admin/cleanup-storage", async (req, res) => {
    try {
      if (!supabaseDb) {
        return res.status(500).json({ error: "Supabase DB chưa được khởi tạo." });
      }

      const bucketName = "Split Mate";
      
      // Lấy tất cả các folders/files ở root
      const { data: rootItems, error: listError } = await supabaseDb.storage
        .from(bucketName)
        .list('', { limit: 1000 });
        
      if (listError) throw listError;

      // Tìm các thư mục (hoặc file) bắt đầu bằng 'g_'
      // Note: Supabase list() returns folders as items without id or metadata, or just normal items depending on config.
      const groupFolders = rootItems
        .filter((item: any) => item.name.startsWith('g_'))
        .map((item: any) => item.name);

      // Lấy tất cả ID nhóm hiện có trong DB
      const { data: groups, error: dbError } = await supabaseDb
        .from('groups')
        .select('id');
        
      if (dbError) throw dbError;
      
      const activeGroupIds = new Set(groups.map((g: any) => g.id));
      
      const deletedFolders: string[] = [];
      const errors: string[] = [];

      for (const folder of groupFolders) {
        if (!activeGroupIds.has(folder)) {
          // Thư mục này thuộc về nhóm đã bị xóa (hoặc chưa bao giờ tồn tại)
          console.log(`[CLEANUP] Tìm thấy thư mục mồ côi: ${folder}`);
          
          // Lấy danh sách files trong folder
          const { data: files } = await supabaseDb.storage.from(bucketName).list(folder, { limit: 1000 });
          if (files && files.length > 0) {
            const filePaths = files.map((f: any) => `${folder}/${f.name}`);
            const { error: rmError } = await supabaseDb.storage.from(bucketName).remove(filePaths);
            
            if (rmError) {
              console.error(`[CLEANUP] Lỗi xóa thư mục ${folder}:`, rmError);
              errors.push(`Lỗi xóa files trong ${folder}: ${rmError.message}`);
            } else {
              deletedFolders.push(folder);
            }
          } else {
             // Thư mục rỗng (hoặc chỉ là file trống)
             deletedFolders.push(folder + ' (rỗng)');
          }
        }
      }

      return res.json({
        success: true,
        message: `Đã quét ${groupFolders.length} thư mục nhóm. Có ${groups.length} nhóm đang hoạt động.`,
        deleted: deletedFolders,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err: any) {
      console.error("[CLEANUP] Lỗi:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from SplitMate API on Vercel!", time: new Date().toISOString() });
  });


  // Cập nhật thông tin hồ sơ Thủ Quỹ (Tên, Avatar) và đồng bộ xuống các nhóm
  app.post("/api/user/update-profile", async (req, res) => {
    try {
      const { email, displayName, photoURL } = req.body;
      if (!email) return res.status(400).json({ error: "Thiếu email." });

      const cleanEmail = email.trim().toLowerCase();
      let updatedUser = null;

      // 1. Cập nhật Leader
      if (supabaseDb) {
        const leader = await supabaseGetLeader(cleanEmail);
        if (!leader) return res.status(404).json({ error: "Không tìm thấy tài khoản Thủ quỹ." });

        if (displayName !== undefined) leader.displayName = displayName.trim();
        if (photoURL !== undefined) leader.avatar = photoURL; // Lưu vào avatar cho tương thích schema DB
        
        await supabaseSaveLeader(leader);
        
        // Tạo đối tượng phản hồi cho Client
        updatedUser = {
          uid: leader.uid,
          email: leader.email,
          displayName: leader.displayName,
          photoURL: leader.avatar || null
        };
      } else {
        const leaders = readLeaders();
        const lIdx = leaders.findIndex((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
        if (lIdx !== -1) {
          if (displayName !== undefined) leaders[lIdx].displayName = displayName.trim();
          if (photoURL !== undefined) leaders[lIdx].avatar = photoURL;
          
          writeLeaders(leaders);
          
          updatedUser = {
            uid: leaders[lIdx].uid,
            email: leaders[lIdx].email,
            displayName: leaders[lIdx].displayName,
            photoURL: leaders[lIdx].avatar || null
          };
        } else {
          return res.status(404).json({ error: "Không tìm thấy tài khoản Thủ quỹ." });
        }
      }

      // 2. Đồng bộ hóa xuống các nhóm có thành viên trùng email này
      let allCandidateGroups: Group[] = [];
      if (supabaseDb) {
        const ownerGroups = await supabaseGetGroupsByOwnerOrEmail(cleanEmail, cleanEmail);
        const memberGroups = await supabaseGetGroupsByOwnerOrEmail("", cleanEmail);
        const map = new Map<string, Group>();
        [...ownerGroups, ...memberGroups].forEach(g => map.set(g.id, g));
        allCandidateGroups = Array.from(map.values());
      } else {
        allCandidateGroups = readDb();
      }

      const savePromises = [];
      let dbGroups: Group[] = [];
      if (!supabaseDb) {
        dbGroups = readDb();
      }

      const updatedGroupsList: Group[] = [];

      for (const g of allCandidateGroups) {
        let changed = false;
        const newMembers = g.members.map((m: any) => {
          if (m.email && m.email.trim().toLowerCase() === cleanEmail) {
            changed = true;
            return {
              ...m,
              name: displayName !== undefined ? displayName.trim() : m.name,
              avatar: photoURL !== undefined ? photoURL : m.avatar
            };
          }
          return m;
        });

        if (changed) {
          g.members = newMembers;
          updatedGroupsList.push(g);
          if (supabaseDb) {
            savePromises.push(supabaseSaveGroup(g));
          } else {
            const idx = dbGroups.findIndex((d: Group) => d.id === g.id);
            if (idx !== -1) {
              dbGroups[idx] = g;
            }
          }
        }
      }

      if (supabaseDb && savePromises.length > 0) {
        await Promise.all(savePromises);
      } else if (!supabaseDb && updatedGroupsList.length > 0) {
        writeDb(dbGroups);
      }

      return res.json({ success: true, user: updatedUser, updatedGroups: updatedGroupsList });
    } catch (err: any) {
      console.error("Lỗi cập nhật hồ sơ Thủ quỹ:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Xóa tài khoản vĩnh viễn và các nhóm liên quan
  app.post("/api/user/delete-account", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Thiếu email để thực hiện xóa tài khoản." });

      const cleanEmail = email.trim().toLowerCase();

      // 1. Tìm các nhóm thuộc quyền sở hữu của Thủ quỹ này
      let groupsToDelete: Group[] = [];
      if (supabaseDb) {
        const ownerGroups = await supabaseGetGroupsByOwnerOrEmail(cleanEmail, "");
        groupsToDelete = ownerGroups.filter(g => g.ownerId && g.ownerId.toLowerCase() === cleanEmail);
      } else {
        groupsToDelete = readDb().filter(g => g.ownerId && g.ownerId.toLowerCase() === cleanEmail);
      }

      // 2. Xóa các nhóm này
      if (supabaseDb) {
        for (const g of groupsToDelete) {
          await supabaseDeleteGroup(g.id);
        }

        // 2b. Giải phóng Email khỏi các thành viên trong những nhóm còn lại mà tài khoản này từng liên kết
        const memberGroups = await supabaseGetGroupsByOwnerOrEmail("", cleanEmail);
        for (const grp of memberGroups) {
          if (grp.ownerId && grp.ownerId.toLowerCase() === cleanEmail) continue; // Đã xóa ở trên
          let hasChange = false;
          const updatedMembers = (grp.members || []).map((m: any) => {
            if (m.email && m.email.toLowerCase() === cleanEmail) {
              hasChange = true;
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let genCode = "";
              for (let i = 0; i < 6; i++) {
                genCode += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              const newCode = (m.accessCode && m.accessCode.trim().length >= 4) ? m.accessCode.trim().toUpperCase() : genCode;
              const { email, emailVerified, ...rest } = m;
              return {
                ...rest,
                accessCode: newCode
              };
            }
            return m;
          });
          if (hasChange) {
            grp.members = updatedMembers;
            grp.memberAccessCodes = grp.members.map((m: any) => m.accessCode || "").filter(Boolean);
            await supabaseSaveGroup(grp);
          }
        }
      } else {
        const dbGroups = readDb();
        const remainingGroups = dbGroups.filter(g => !(g.ownerId && g.ownerId.toLowerCase() === cleanEmail));
        
        let hasChange = false;
        remainingGroups.forEach((grp) => {
          (grp.members || []).forEach((m: any) => {
            if (m.email && m.email.toLowerCase() === cleanEmail) {
              delete m.email;
              delete m.emailVerified;
              if (!m.accessCode || m.accessCode.trim().length < 4) {
                const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                let genCode = "";
                for (let i = 0; i < 6; i++) {
                  genCode += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                m.accessCode = genCode;
              } else {
                m.accessCode = m.accessCode.trim().toUpperCase();
              }
              hasChange = true;
            }
          });
          if (hasChange) {
            grp.memberAccessCodes = (grp.members || []).map((m: any) => m.accessCode || "").filter(Boolean);
          }
        });
        writeDb(remainingGroups);
      }

      // 3. Xóa Thủ quỹ khỏi bảng leaders
      if (supabaseDb) {
        const { error } = await supabaseDb
          .from("leaders")
          .delete()
          .eq("email", cleanEmail);
        if (error) {
          console.error("Lỗi xóa leader khỏi Supabase:", error);
          throw error;
        }
      } else {
        const leaders = readLeaders();
        const remainingLeaders = leaders.filter(l => !(l.email && l.email.toLowerCase() === cleanEmail));
        writeLeaders(remainingLeaders);
      }

      console.log(`[DELETE ACCOUNT] Đã xóa vĩnh viễn tài khoản và các nhóm của: ${cleanEmail}`);
      return res.json({ success: true, message: "Đã xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan thành công." });
    } catch (err: any) {
      console.error("Lỗi xóa tài khoản vĩnh viễn:", err);
      return res.status(500).json({ error: err.message || "Không thể thực hiện xóa tài khoản vĩnh viễn." });
    }
  });


  // Cập nhật thông tin ngân hàng cá nhân
  app.post("/api/user/bank-info", async (req, res) => {
    try {
      const { email, bankAccount, bankCode, bankAccountName, fundType } = req.body;
      if (!email) return res.status(400).json({ error: "Thiếu email." });

      const cleanEmail = email.trim().toLowerCase();
      let user = null;
      if (supabaseDb) {
        user = await supabaseGetLeader(cleanEmail);
        if (!user) return res.status(404).json({ error: "Không tìm thấy user." });
        
        user.bankAccount = bankAccount;
        user.bankCode = bankCode;
        user.bankAccountName = bankAccountName;
        user.fundType = fundType;
        await supabaseSaveLeader(user);
      } else {
         const leaders = readLeaders();
         const lIdx = leaders.findIndex((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
         if (lIdx !== -1) {
            leaders[lIdx].bankAccount = bankAccount;
            leaders[lIdx].bankCode = bankCode;
            leaders[lIdx].bankAccountName = bankAccountName;
            leaders[lIdx].fundType = fundType;
            writeLeaders(leaders);
            user = leaders[lIdx];
         } else {
            return res.status(404).json({ error: "Không tìm thấy user." });
         }
      }
      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  app.get("/api/user/bank-info", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email || typeof email !== 'string') return res.status(400).json({ error: "Thiếu email." });

      const cleanEmail = email.trim().toLowerCase();
      let user = null;
      if (supabaseDb) {
        user = await supabaseGetLeader(cleanEmail);
      } else {
         const leaders = readLeaders();
         user = leaders.find((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
      }
      if (!user) return res.status(404).json({ error: "Không tìm thấy user." });
      
      return res.json({ 
        success: true, 
        bankAccount: user.bankAccount || "",
        bankCode: user.bankCode || "VCB",
        bankAccountName: user.bankAccountName || "",
        fundType: user.fundType || "bank"
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Global Error Handler


  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[GLOBAL ERROR]", err);
    res.status(500).json({ 
      error: "Máy chủ gặp sự cố xử lý yêu cầu.",
      message: err.message || String(err),
      isVercel: !!process.env.VERCEL
    });
  });

  async function startServer() {
    // ONLY run this if NOT on Vercel
    if (process.env.VERCEL) {
      console.log("Vercel environment detected. Skipping startServer().");
      return;
    }

    // Serve static assets or mount Vite middleware
    if (process.env.NODE_ENV !== "production") {
      console.log("Khởi chạy Vite Middleware trong chế độ phát triển (Development)...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Đang phục vụ tệp tĩnh trong chế độ vận hành (Production)...");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  }

// ONLY call startServer() if NOT running in a serverless environment (Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export { app };
