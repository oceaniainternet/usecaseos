import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Re-export chat models
export * from "./models/chat";

// Re-export Solvy AI assistant models
export * from "./models/solvy";

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "CLIENT"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired"]);
export const useCaseStatusEnum = pgEnum("use_case_status", ["Proposed", "Approved", "Building", "Live", "Optimising", "Paused"]);
export const riskRatingEnum = pgEnum("risk_rating", ["None", "Low", "Medium", "High"]);
export const dataFlowEnum = pgEnum("data_flow", ["LocalOnly", "VendorTools", "CloudLLM"]);
export const humanInLoopEnum = pgEnum("human_in_loop", ["Required", "Optional", "None"]);
export const useCaseGoalEnum = pgEnum("use_case_goal", ["Leads", "Fewer Phone Calls", "Education", "Cost Savings", "Customer Retention", "Efficiency", "Compliance", "Revenue Growth", "Other"]);
export const clientApprovalStatusEnum = pgEnum("client_approval_status", ["Pending", "Approved", "Needs Discussion", "Not Now"]);
export const clientTeamRoleEnum = pgEnum("client_team_role", ["Admin", "Adoption Lead", "Use Case Owner", "Pilot User", "Observer"]);

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
  clientTeamRole: clientTeamRoleEnum("client_team_role").default("Observer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_clients_user_idx").on(table.userId),
  index("user_clients_client_idx").on(table.clientId),
]);

// Client invitations for email-based onboarding
export const clientInvitations = pgTable("client_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  clientId: varchar("client_id").notNull(),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  invitedByUserId: varchar("invited_by_user_id").notNull(),
  clientTeamRole: clientTeamRoleEnum("client_team_role").default("Observer"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("client_invitations_email_idx").on(table.email),
  index("client_invitations_token_idx").on(table.token),
  index("client_invitations_client_idx").on(table.clientId),
]);

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("password_reset_tokens_token_idx").on(table.token),
  index("password_reset_tokens_user_idx").on(table.userId),
]);

// Use cases table
export const useCases = pgTable("use_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  title: text("title").notNull(),
  goals: jsonb("goals").$type<string[]>().default([]),
  industryVertical: text("industry_vertical").notNull(),
  department: text("department").notNull(),
  level: integer("level").notNull().default(1),
  status: useCaseStatusEnum("status").notNull().default("Proposed"),
  riskRating: riskRatingEnum("risk_rating").notNull().default("None"),
  piiFlag: boolean("pii_flag").notNull().default(false),
  dataFlow: dataFlowEnum("data_flow").notNull().default("LocalOnly"),
  humanInLoop: humanInLoopEnum("human_in_loop").notNull().default("Required"),
  customerFrustrations: text("customer_frustrations"),
  storyTodayIsManual: boolean("story_today_is_manual").notNull().default(false),
  storyToday: text("story_today"),
  storyFuture: text("story_future"),
  personaStoryIsManual: boolean("persona_story_is_manual").notNull().default(false),
  personaStory: text("persona_story"),
  controls: jsonb("controls").$type<string[]>().default([]),
  tools: jsonb("tools").$type<string[]>().default([]),
  baselineMinutesPerRun: integer("baseline_minutes_per_run").default(0),
  frequencyPerWeek: integer("frequency_per_week").default(0),
  roiTimeSavedMinutesPerWeek: integer("roi_time_saved_minutes_per_week").default(0),
  roiDollarsPerMonth: integer("roi_dollars_per_month").default(0),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  priorityOrder: integer("priority_order").notNull().default(0),
  clientApprovalStatus: clientApprovalStatusEnum("client_approval_status").default("Pending"),
  clientApprovalAt: timestamp("client_approval_at"),
  clientApprovalUserId: varchar("client_approval_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("use_cases_client_idx").on(table.clientId),
  index("use_cases_priority_idx").on(table.priorityOrder),
]);

// Marketplace use cases (template library)
export const marketplaceUseCases = pgTable("marketplace_use_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  industryVertical: text("industry_vertical").notNull(),
  scope: text("scope").notNull().default("General"),
  department: text("department").notNull(),
  level: integer("level").notNull().default(1),
  goals: jsonb("goals").$type<string[]>().default([]),
  riskRating: riskRatingEnum("risk_rating").notNull().default("None"),
  piiFlag: boolean("pii_flag").notNull().default(false),
  dataFlow: dataFlowEnum("data_flow").notNull().default("LocalOnly"),
  humanInLoop: humanInLoopEnum("human_in_loop").notNull().default("Required"),
  storyToday: text("story_today"),
  storyFuture: text("story_future"),
  personaStory: text("persona_story"),
  controls: jsonb("controls").$type<string[]>().default([]),
  tools: jsonb("tools").$type<string[]>().default([]),
  baselineMinutesPerRun: integer("baseline_minutes_per_run").default(0),
  frequencyPerWeek: integer("frequency_per_week").default(0),
  roiTimeSavedMinutesPerWeek: integer("roi_time_saved_minutes_per_week").default(0),
  roiDollarsPerMonth: integer("roi_dollars_per_month").default(0),
  cloneCount: integer("clone_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("marketplace_use_cases_industry_idx").on(table.industryVertical),
]);

// Marketplace ratings (one rating per user per marketplace use case)
export const marketplaceRatings = pgTable("marketplace_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceUseCaseId: varchar("marketplace_use_case_id").notNull(),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("marketplace_ratings_use_case_idx").on(table.marketplaceUseCaseId),
  index("marketplace_ratings_user_idx").on(table.userId),
]);

// Use case notes for client-admin collaboration
export const useCaseNotes = pgTable("use_case_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  useCaseId: varchar("use_case_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("use_case_notes_use_case_idx").on(table.useCaseId),
  index("use_case_notes_user_idx").on(table.userId),
]);

// Client favorites for marketplace use cases (roadmap for admins)
export const clientFavorites = pgTable("client_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplaceUseCaseId: varchar("marketplace_use_case_id").notNull(),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("client_favorites_use_case_idx").on(table.marketplaceUseCaseId),
  index("client_favorites_user_idx").on(table.userId),
  index("client_favorites_client_idx").on(table.clientId),
  unique("client_favorites_unique").on(table.userId, table.clientId, table.marketplaceUseCaseId),
]);

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  useCases: many(useCases),
  userClients: many(userClients),
}));

export const marketplaceUseCasesRelations = relations(marketplaceUseCases, ({ many }) => ({
  ratings: many(marketplaceRatings),
}));

export const marketplaceRatingsRelations = relations(marketplaceRatings, ({ one }) => ({
  marketplaceUseCase: one(marketplaceUseCases, {
    fields: [marketplaceRatings.marketplaceUseCaseId],
    references: [marketplaceUseCases.id],
  }),
  user: one(users, {
    fields: [marketplaceRatings.userId],
    references: [users.id],
  }),
}));

export const clientFavoritesRelations = relations(clientFavorites, ({ one }) => ({
  marketplaceUseCase: one(marketplaceUseCases, {
    fields: [clientFavorites.marketplaceUseCaseId],
    references: [marketplaceUseCases.id],
  }),
  user: one(users, {
    fields: [clientFavorites.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [clientFavorites.clientId],
    references: [clients.id],
  }),
}));

export const useCaseNotesRelations = relations(useCaseNotes, ({ one }) => ({
  useCase: one(useCases, {
    fields: [useCaseNotes.useCaseId],
    references: [useCases.id],
  }),
  user: one(users, {
    fields: [useCaseNotes.userId],
    references: [users.id],
  }),
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

export const insertMarketplaceUseCaseSchema = createInsertSchema(marketplaceUseCases).omit({
  id: true,
  createdAt: true,
  cloneCount: true,
});

export const insertMarketplaceRatingSchema = createInsertSchema(marketplaceRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientFavoriteSchema = createInsertSchema(clientFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertUseCaseNoteSchema = createInsertSchema(useCaseNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientInvitationSchema = createInsertSchema(clientInvitations).omit({
  id: true,
  createdAt: true,
  token: true,
  status: true,
  acceptedAt: true,
});

export const cloneMarketplaceUseCaseSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
});

export const createClientInvitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  clientId: z.string().min(1, "Client ID is required"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const rateMarketplaceUseCaseSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const updateClientApprovalSchema = z.object({
  status: z.enum(["Approved", "Needs Discussion", "Not Now"]),
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

export type MarketplaceUseCase = typeof marketplaceUseCases.$inferSelect;
export type InsertMarketplaceUseCase = z.infer<typeof insertMarketplaceUseCaseSchema>;

export type MarketplaceRating = typeof marketplaceRatings.$inferSelect;
export type InsertMarketplaceRating = z.infer<typeof insertMarketplaceRatingSchema>;

export type ClientFavorite = typeof clientFavorites.$inferSelect;
export type InsertClientFavorite = z.infer<typeof insertClientFavoriteSchema>;

export type UseCaseNote = typeof useCaseNotes.$inferSelect;
export type InsertUseCaseNote = z.infer<typeof insertUseCaseNoteSchema>;

export type UseCaseNoteWithUser = UseCaseNote & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
};

export type ClientInvitation = typeof clientInvitations.$inferSelect;
export type InsertClientInvitation = z.infer<typeof insertClientInvitationSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Forgot password schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type MarketplaceUseCaseWithRating = MarketplaceUseCase & {
  averageRating: number;
  ratingCount: number;
  userRating?: number;
};

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
  customerFrustrations: z.string().optional(),
  storyTodayIsManual: z.boolean().optional(),
  existingStoryToday: z.string().optional(),
});

export type StoryGeneratorInput = z.infer<typeof storyGeneratorInputSchema>;

export type StoryGeneratorOutput = {
  storyToday: string;
  storyFuture: string;
  personaStory: string;
  controls: string[];
};
