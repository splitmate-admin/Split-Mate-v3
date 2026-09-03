import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// Define the 'leaders' table for custom credentials
export const leaders = pgTable("leaders", {
  email: text("email").primaryKey(),
  uid: text("uid").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the 'groups' table for tracking groups, members, and expenses
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: text("created_at").notNull(),
  members: jsonb("members").notNull().$type<any[]>(),
  expenses: jsonb("expenses").notNull().$type<any[]>(),
  pendingReceipts: jsonb("pending_receipts").$type<any[]>(),
  fundType: text("fund_type"),
  fundPhone: text("fund_phone"),
  momoPhone: text("momo_phone"),
  momoQrImage: text("momo_qr_image"),
  bankAccount: text("bank_account"),
  bankCode: text("bank_code"),
  bankAccountName: text("bank_account_name"),
  bankQrImage: text("bank_qr_image"),
  imageUrl: text("image_url"),
  memberAccessCodes: jsonb("member_access_codes").$type<string[]>(),
});

// Define the 'invitations' table for group invitations
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  email: text("email").notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
});
