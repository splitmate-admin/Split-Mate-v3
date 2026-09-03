import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

console.log("==================================================");
console.log("  CÔNG CỤ DI CHUYỂN DỮ LIỆU: FIRESTORE -> SUPABASE");
console.log("==================================================");

// 1. Setup Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ lỗi: Vui lòng cấu hình SUPABASE_URL và SUPABASE_ANON_KEY trong file .env hoặc biến môi trường.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log("✅ Đã khởi tạo Supabase Client.");

// 2. Setup Firebase Admin App
let firestoreDb = null;
try {
  let serviceAccount = null;

  // Try checking separate env variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID.trim(),
      client_email: process.env.FIREBASE_CLIENT_EMAIL.trim(),
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, '').trim()
    };
    console.log("ℹ️ Sử dụng thông tin Firebase Admin từ các biến môi trường phân tách.");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // Decode base64 if needed
    if (!raw.startsWith("{") && !raw.startsWith('"')) {
      try {
        raw = Buffer.from(raw, 'base64').toString('utf8');
      } catch (e) {}
    }
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = JSON.parse(raw);
    }
    serviceAccount = typeof raw === "string" ? JSON.parse(raw) : raw;
    console.log("ℹ️ Sử dụng thông tin Firebase Admin từ biến FIREBASE_SERVICE_ACCOUNT JSON.");
  } else {
    // Attempt to look for a local service account file or local config
    const localSvcPath = path.join(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(localSvcPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(localSvcPath, "utf-8"));
      console.log("ℹ️ Tìm thấy file firebase-service-account.json cục bộ.");
    }
  }

  if (serviceAccount) {
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    const adminApp = getApps().length === 0 ? initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    }) : getApps()[0];
    firestoreDb = getFirestore(adminApp);
    console.log(`✅ Khởi tạo Firestore Admin thành công (Dự án: ${serviceAccount.project_id}).`);
  } else {
    console.error("❌ Lỗi: Không tìm thấy Service Account của Firebase.");
    console.log("   Vui lòng tải file Private Key Service Account JSON từ Firebase Console");
    console.log("   và lưu vào thư mục dự án với tên 'firebase-service-account.json' hoặc gán biến môi trường.");
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Lỗi khởi tạo Firebase Admin:", err.message || err);
  process.exit(1);
}

// Utility to remove undefined fields recursively to prevent errors
function removeUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (typeof obj === 'object') {
    const clean = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        clean[key] = removeUndefined(obj[key]);
      }
    }
    return clean;
  }
  return obj;
}

// 3. Migration logic
async function runMigration() {
  try {
    console.log("\n--------------------------------------------------");
    console.log("🔄 Bắt đầu sao chép bộ sưu tập 'leaders'...");
    
    const leadersSnapshot = await firestoreDb.collection("leaders").get();
    console.log(`📊 Tìm thấy ${leadersSnapshot.size} tài khoản thủ quỹ trong Firestore.`);
    
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

      const { error } = await supabase
        .from("leaders")
        .upsert(cleanLeader);
        
      if (error) {
        console.error(`❌ Lỗi lưu thủ quỹ [${cleanEmail}] lên Supabase:`, error.message);
      } else {
        leadersMigrated++;
        console.log(`   👉 Đã di chuyển Thủ quỹ: ${cleanEmail}`);
      }
    }
    console.log(`➡️ Hoàn tất di chuyển ${leadersMigrated}/${leadersSnapshot.size} tài khoản thủ quỹ.`);

    console.log("\n--------------------------------------------------");
    console.log("🔄 Bắt đầu sao chép bộ sưu tập 'groups'...");
    
    const groupsSnapshot = await firestoreDb.collection("groups").get();
    console.log(`📊 Tìm thấy ${groupsSnapshot.size} nhóm chi tiêu trong Firestore.`);
    
    let groupsMigrated = 0;
    for (const doc of groupsSnapshot.docs) {
      const groupData = doc.data();
      const groupId = groupData.id || doc.id;
      
      const cleanGroup = removeUndefined(groupData);
      
      const { error } = await supabase
        .from("groups")
        .upsert({
          id: groupId,
          ownerId: cleanGroup.ownerId || "",
          name: cleanGroup.name || "Nhóm không tên",
          memberAccessCodes: cleanGroup.memberAccessCodes || [],
          data: cleanGroup,
          createdAt: cleanGroup.createdAt || new Date().toISOString()
        });
        
      if (error) {
        console.error(`❌ Lỗi lưu nhóm [${groupId} - ${cleanGroup.name}] lên Supabase:`, error.message);
      } else {
        groupsMigrated++;
        console.log(`   👉 Đã di chuyển Nhóm: "${cleanGroup.name}" (${groupId})`);
      }
    }
    console.log(`➡️ Hoàn tất di chuyển ${groupsMigrated}/${groupsSnapshot.size} nhóm chi tiêu.`);
    
    console.log("\n==================================================");
    console.log("🎉 QUÁ TRÌNH DI CHUYỂN DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG!");
    console.log(`   - Thủ quỹ: ${leadersMigrated} bản ghi.`);
    console.log(`   - Nhóm chi tiêu: ${groupsMigrated} bản ghi.`);
    console.log("==================================================");

  } catch (err) {
    console.error("\n❌ Đã xảy ra lỗi nghiêm trọng trong lúc di chuyển dữ liệu:", err.message || err);
  }
}

runMigration();
