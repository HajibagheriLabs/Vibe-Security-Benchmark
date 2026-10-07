// lib/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  key: text("key").notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});