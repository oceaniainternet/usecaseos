import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CLIENT"]);
export const useCaseStatusEnum = pgEnum("use_case_status", ["Proposed", "Approved", "Building", "Live", "Optimising", "Paused"]);
export const riskRatingEnum = pgEnum("risk_rating", ["None", "Low", "Medium", "High"]);
export const dataFlowEnum = pgEnum("data_flow", ["LocalOnly", "VendorTools", "CloudLLM"]);
export const humanInLoopEnum = pgEnum("human_in_loop", ["Required", "Optional", "None"]);
export const useCaseGoalEnum = pgEnum("use_case_goal", ["Leads", "Fewer Phone Calls", "Education", "Cost Savings", "Customer Retention", "Efficiency", "Compliance", "Revenue Growth", "Other"]);

// Users table for username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industryVertical: text("industry_vertical").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User-to-client mapping (for client access and role assignment)
export const userClients = pgTable("user_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id").notNull(),
  role: userRoleEnum("role").notNull().default("CLIENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_clients_user_idx").on(table.userId),
  index("user_clients_client_idx").on(table.clientId),
]);

// Use cases table
export const useCases = pgTable("use_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  title: text("title").notNull(),
  goal: useCaseGoalEnum("goal").default("Efficiency"),
  industryVertical: text("industry_vertical").notNull(),
  department: text("department").notNull(),
  level: integer("level").notNull().default(1),
  status: useCaseStatusEnum("status").notNull().default("Proposed"),
  riskRating: riskRatingEnum("risk_rating").notNull().default("None"),
  piiFlag: boolean("pii_flag").notNull().default(false),
  dataFlow: dataFlowEnum("data_flow").notNull().default("LocalOnly"),
  humanInLoop: humanInLoopEnum("human_in_loop").notNull().default("Required"),
  storyToday: text("story_today"),
  storyFuture: text("story_future"),
  controls: jsonb("controls").$type<string[]>().default([]),
  tools: jsonb("tools").$type<string[]>().default([]),
  baselineMinutesPerRun: integer("baseline_minutes_per_run").default(0),
  frequencyPerWeek: integer("frequency_per_week").default(0),
  roiTimeSavedMinutesPerWeek: integer("roi_time_saved_minutes_per_week").default(0),
  roiDollarsPerMonth: integer("roi_dollars_per_month").default(0),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  priorityOrder: integer("priority_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("use_cases_client_idx").on(table.clientId),
  index("use_cases_priority_idx").on(table.priorityOrder),
]);

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  useCases: many(useCases),
  userClients: many(userClients),
}));

export const useCasesRelations = relations(useCases, ({ one }) => ({
  client: one(clients, {
    fields: [useCases.clientId],
    references: [clients.id],
  }),
}));

export const userClientsRelations = relations(userClients, ({ one }) => ({
  client: one(clients, {
    fields: [userClients.clientId],
    references: [clients.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertUserClientSchema = createInsertSchema(userClients).omit({
  id: true,
  createdAt: true,
});

export const insertUseCaseSchema = createInsertSchema(useCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type UserClient = typeof userClients.$inferSelect;
export type InsertUserClient = z.infer<typeof insertUserClientSchema>;

export type UseCase = typeof useCases.$inferSelect;
export type InsertUseCase = z.infer<typeof insertUseCaseSchema>;

// Level labels
export const levelLabels: Record<number, string> = {
  1: "Tool-assisted (manual)",
  2: "No-code automation (connected tools)",
  3: "AI embedded workflow (agentic/decisioning)",
};

// Story generator input schema
export const storyGeneratorInputSchema = z.object({
  industryVertical: z.string(),
  department: z.string(),
  taskSummary: z.string(),
  tools: z.array(z.string()),
  piiFlag: z.boolean(),
  riskRating: z.enum(["None", "Low", "Medium", "High"]),
  level: z.number().min(1).max(3),
});

export type StoryGeneratorInput = z.infer<typeof storyGeneratorInputSchema>;

export type StoryGeneratorOutput = {
  storyToday: string;
  storyFuture: string;
  controls: string[];
};
