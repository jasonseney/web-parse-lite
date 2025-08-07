import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  parseUrl: text("parse_url").notNull(),
  selector: text("selector").notNull(),
  method: text("method").notNull(), // 'text', 'html', 'attribute'
  extra: text("extra"), // for attribute extraction
  success: boolean("success").notNull(),
  responseLength: integer("response_length"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertRequestLogSchema = createInsertSchema(requestLogs).omit({
  id: true,
  timestamp: true,
});

export const parseRequestSchema = z.object({
  parseURL: z.string().url("Invalid URL format"),
  selector: z.string().min(1, "CSS selector is required"),
  method: z.enum(["text", "html", "attribute"], {
    errorMap: () => ({ message: "Method must be 'text', 'html', or 'attribute'" })
  }),
  extra: z.string().optional(),
}).refine((data) => {
  if (data.method === "attribute" && !data.extra) {
    return false;
  }
  return true;
}, {
  message: "Extra parameter is required when method is 'attribute'",
  path: ["extra"]
});

export type InsertRequestLog = z.infer<typeof insertRequestLogSchema>;
export type RequestLog = typeof requestLogs.$inferSelect;
export type ParseRequest = z.infer<typeof parseRequestSchema>;
