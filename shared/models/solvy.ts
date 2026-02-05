import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, relations } from "drizzle-orm";

export const solvyChatModeEnum = pgEnum("solvy_chat_mode", ["draft_brief", "explore_ideas", "query_data"]);
export const solvyVisibilityEnum = pgEnum("solvy_visibility", ["private", "workspace"]);
export const auditActionEnum = pgEnum("audit_action", [
  "invite_created", 
  "invite_accepted", 
  "source_uploaded", 
  "source_deleted",
  "chat_created", 
  "brief_created", 
  "brief_shared",
  "brief_unshared"
]);
export const dataSourceStatusEnum = pgEnum("data_source_status", ["processing", "ready", "error"]);

export const solvyConversations = pgTable("solvy_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull().default("New Chat"),
  mode: solvyChatModeEnum("mode").notNull().default("explore_ideas"),
  visibility: solvyVisibilityEnum("visibility").notNull().default("private"),
  linkedBriefId: varchar("linked_brief_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("solvy_conversations_client_idx").on(table.clientId),
  index("solvy_conversations_user_idx").on(table.userId),
  index("solvy_conversations_mode_idx").on(table.mode),
]);

export const solvyMessages = pgTable("solvy_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Citation[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("solvy_messages_conversation_idx").on(table.conversationId),
]);

export const solvyBriefs = pgTable("solvy_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  visibility: solvyVisibilityEnum("visibility").notNull().default("private"),
  conversationId: varchar("conversation_id"),
  context: text("context"),
  problem: text("problem"),
  stakeholders: text("stakeholders"),
  options: text("options"),
  recommendation: text("recommendation"),
  risks: text("risks"),
  assumptions: text("assumptions"),
  nextSteps: text("next_steps"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("solvy_briefs_client_idx").on(table.clientId),
  index("solvy_briefs_user_idx").on(table.userId),
]);

export const dataSources = pgTable("data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: dataSourceStatusEnum("status").notNull().default("processing"),
  chunkCount: integer("chunk_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("data_sources_client_idx").on(table.clientId),
]);

export const dataSourceChunks = pgTable("data_source_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull(),
  clientId: varchar("client_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<ChunkMetadata>().default({}),
  searchVector: text("search_vector"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("data_source_chunks_source_idx").on(table.sourceId),
  index("data_source_chunks_client_idx").on(table.clientId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  userId: varchar("user_id").notNull(),
  action: auditActionEnum("action").notNull(),
  targetType: text("target_type"),
  targetId: varchar("target_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_client_idx").on(table.clientId),
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_idx").on(table.createdAt),
]);

export const solvyMessagesRelations = relations(solvyMessages, ({ one }) => ({
  conversation: one(solvyConversations, {
    fields: [solvyMessages.conversationId],
    references: [solvyConversations.id],
  }),
}));

export const solvyConversationsRelations = relations(solvyConversations, ({ many }) => ({
  messages: many(solvyMessages),
}));

export const dataSourceChunksRelations = relations(dataSourceChunks, ({ one }) => ({
  source: one(dataSources, {
    fields: [dataSourceChunks.sourceId],
    references: [dataSources.id],
  }),
}));

export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  chunks: many(dataSourceChunks),
}));

export interface Citation {
  sourceName: string;
  sourceId: string;
  chunkId: string;
  chunkIndex: number;
  excerpt: string;
}

export interface ChunkMetadata {
  pageNumber?: number;
  section?: string;
  startChar?: number;
  endChar?: number;
}

export const insertSolvyConversationSchema = createInsertSchema(solvyConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSolvyMessageSchema = createInsertSchema(solvyMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSolvyBriefSchema = createInsertSchema(solvyBriefs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  status: true,
  chunkCount: true,
  errorMessage: true,
});

export const insertDataSourceChunkSchema = createInsertSchema(dataSourceChunks).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const createSolvyChatSchema = z.object({
  clientId: z.string().min(1),
  mode: z.enum(["draft_brief", "explore_ideas", "query_data"]),
  title: z.string().optional(),
});

export const sendSolvyMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

export const updateBriefVisibilitySchema = z.object({
  visibility: z.enum(["private", "workspace"]),
});

export const createBriefFromChatSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().min(1),
});

export const updateBriefSchema = z.object({
  title: z.string().optional(),
  context: z.string().optional(),
  problem: z.string().optional(),
  stakeholders: z.string().optional(),
  options: z.string().optional(),
  recommendation: z.string().optional(),
  risks: z.string().optional(),
  assumptions: z.string().optional(),
  nextSteps: z.string().optional(),
});

export type SolvyConversation = typeof solvyConversations.$inferSelect;
export type InsertSolvyConversation = z.infer<typeof insertSolvyConversationSchema>;
export type SolvyMessage = typeof solvyMessages.$inferSelect;
export type InsertSolvyMessage = z.infer<typeof insertSolvyMessageSchema>;
export type SolvyBrief = typeof solvyBriefs.$inferSelect;
export type InsertSolvyBrief = z.infer<typeof insertSolvyBriefSchema>;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSourceChunk = typeof dataSourceChunks.$inferSelect;
export type InsertDataSourceChunk = z.infer<typeof insertDataSourceChunkSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type SolvyConversationWithMessages = SolvyConversation & {
  messages: SolvyMessage[];
};

export type SolvyBriefWithUser = SolvyBrief & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export type DataSourceWithChunks = DataSource & {
  chunks: DataSourceChunk[];
};

export const CHAT_MODE_LABELS: Record<string, string> = {
  draft_brief: "Draft Solution Brief",
  explore_ideas: "Explore Ideas",
  query_data: "Query Company Data",
};

export const CHAT_MODE_DESCRIPTIONS: Record<string, string> = {
  draft_brief: "Create a structured solution brief with context, problem, stakeholders, options, and recommendations",
  explore_ideas: "Brainstorm and explore ideas freely with Solvy",
  query_data: "Search and query your workspace knowledge base with source citations",
};
