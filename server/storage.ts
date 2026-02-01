import { 
  clients, 
  useCases, 
  userClients,
  users,
  marketplaceUseCases,
  marketplaceRatings,
  clientInvitations,
  clientFavorites,
  useCaseNotes,
  passwordResetTokens,
  type Client, 
  type InsertClient, 
  type UseCase, 
  type InsertUseCase,
  type UserClient,
  type InsertUserClient,
  type User,
  type InsertUser,
  type MarketplaceUseCase,
  type InsertMarketplaceUseCase,
  type MarketplaceRating,
  type InsertMarketplaceRating,
  type MarketplaceUseCaseWithRating,
  type ClientInvitation,
  type InsertClientInvitation,
  type ClientFavorite,
  type InsertClientFavorite,
  type UseCaseNote,
  type InsertUseCaseNote,
  type UseCaseNoteWithUser,
  type PasswordResetToken
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, sql, avg, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session store
  sessionStore: session.Store;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Use Cases
  getUseCases(): Promise<UseCase[]>;
  getUseCasesByClient(clientId: string): Promise<UseCase[]>;
  getUseCase(id: string): Promise<UseCase | undefined>;
  createUseCase(useCase: InsertUseCase): Promise<UseCase>;
  updateUseCase(id: string, useCase: Partial<InsertUseCase>): Promise<UseCase | undefined>;
  deleteUseCase(id: string): Promise<boolean>;
  updateUseCasePriorities(updates: { id: string; priorityOrder: number }[]): Promise<void>;

  // User-Client mappings
  getUserClients(userId: string): Promise<UserClient[]>;
  addUserToClient(mapping: InsertUserClient): Promise<UserClient>;
  removeUserFromClient(userId: string, clientId: string): Promise<boolean>;

  // Marketplace
  getMarketplaceUseCases(industryFilter?: string, scopeFilter?: string, userId?: string): Promise<MarketplaceUseCaseWithRating[]>;
  getMarketplaceUseCase(id: string): Promise<MarketplaceUseCase | undefined>;
  createMarketplaceUseCase(useCase: InsertMarketplaceUseCase): Promise<MarketplaceUseCase>;
  cloneMarketplaceUseCase(marketplaceUseCaseId: string, clientId: string): Promise<UseCase>;
  rateMarketplaceUseCase(marketplaceUseCaseId: string, userId: string, rating: number): Promise<MarketplaceRating>;
  getUserRatingForMarketplaceUseCase(marketplaceUseCaseId: string, userId: string): Promise<MarketplaceRating | undefined>;
  getMarketplaceScopes(): Promise<string[]>;

  // Client Invitations
  createClientInvitation(email: string, clientId: string, invitedByUserId: string, clientTeamRole?: string): Promise<ClientInvitation>;
  getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
  getClientInvitationsByClient(clientId: string): Promise<ClientInvitation[]>;
  getAllClientInvitations(): Promise<ClientInvitation[]>;
  acceptClientInvitation(token: string, userId: string): Promise<ClientInvitation>;
  deleteClientInvitation(id: string): Promise<boolean>;
  getClientTeamMembers(clientId: string): Promise<Array<{ user: User; userClient: UserClient }>>;
  updateUserClientRole(userId: string, clientId: string, clientTeamRole: string): Promise<UserClient>;

  // Client Favorites (marketplace roadmap)
  addClientFavorite(marketplaceUseCaseId: string, userId: string, clientId: string): Promise<ClientFavorite>;
  removeClientFavorite(marketplaceUseCaseId: string, userId: string): Promise<boolean>;
  getClientFavorites(userId: string): Promise<ClientFavorite[]>;
  getClientFavoritesByClient(clientId: string): Promise<(ClientFavorite & { marketplaceUseCase: MarketplaceUseCase; user: User })[]>;
  isClientFavorite(marketplaceUseCaseId: string, userId: string): Promise<boolean>;

  // Use Case Notes (client-admin collaboration)
  getUseCaseNotes(useCaseId: string): Promise<UseCaseNoteWithUser[]>;
  createUseCaseNote(useCaseId: string, userId: string, content: string): Promise<UseCaseNote>;
  updateUseCaseNote(noteId: string, content: string): Promise<UseCaseNote | undefined>;
  deleteUseCaseNote(noteId: string): Promise<boolean>;

  // Password Reset
  createPasswordResetToken(userId: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: false,
      tableName: 'sessions'
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(asc(clients.name));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  // Use Cases
  async getUseCases(): Promise<UseCase[]> {
    return await db.select().from(useCases).orderBy(asc(useCases.priorityOrder));
  }

  async getUseCasesByClient(clientId: string): Promise<UseCase[]> {
    return await db.select().from(useCases)
      .where(eq(useCases.clientId, clientId))
      .orderBy(asc(useCases.priorityOrder));
  }

  async getUseCase(id: string): Promise<UseCase | undefined> {
    const [useCase] = await db.select().from(useCases).where(eq(useCases.id, id));
    return useCase;
  }

  async createUseCase(useCase: InsertUseCase): Promise<UseCase> {
    // Get max priority order to add at the end
    const existing = await db.select().from(useCases).orderBy(desc(useCases.priorityOrder));
    const maxPriority = existing[0]?.priorityOrder || 0;
    
    const [newUseCase] = await db.insert(useCases).values({
      ...useCase,
      priorityOrder: maxPriority + 1,
    }).returning();
    return newUseCase;
  }

  async updateUseCase(id: string, useCase: Partial<InsertUseCase>): Promise<UseCase | undefined> {
    const [updated] = await db.update(useCases)
      .set({ ...useCase, updatedAt: new Date() })
      .where(eq(useCases.id, id))
      .returning();
    return updated;
  }

  async deleteUseCase(id: string): Promise<boolean> {
    await db.delete(useCases).where(eq(useCases.id, id));
    return true;
  }

  async updateUseCasePriorities(updates: { id: string; priorityOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db.update(useCases)
        .set({ priorityOrder: update.priorityOrder, updatedAt: new Date() })
        .where(eq(useCases.id, update.id));
    }
  }

  // User-Client mappings
  async getUserClients(userId: string): Promise<UserClient[]> {
    return await db.select().from(userClients).where(eq(userClients.userId, userId));
  }

  async addUserToClient(mapping: InsertUserClient): Promise<UserClient> {
    const [newMapping] = await db.insert(userClients).values(mapping).returning();
    return newMapping;
  }

  async removeUserFromClient(userId: string, clientId: string): Promise<boolean> {
    await db.delete(userClients)
      .where(and(eq(userClients.userId, userId), eq(userClients.clientId, clientId)));
    return true;
  }

  // Marketplace
  async getMarketplaceUseCases(industryFilter?: string, scopeFilter?: string, userId?: string): Promise<MarketplaceUseCaseWithRating[]> {
    const conditions = [];
    if (industryFilter) {
      conditions.push(eq(marketplaceUseCases.industryVertical, industryFilter));
    }
    if (scopeFilter) {
      conditions.push(eq(marketplaceUseCases.scope, scopeFilter));
    }
    
    const allCases = conditions.length > 0
      ? await db.select().from(marketplaceUseCases).where(and(...conditions)).orderBy(desc(marketplaceUseCases.cloneCount))
      : await db.select().from(marketplaceUseCases).orderBy(desc(marketplaceUseCases.cloneCount));

    const result: MarketplaceUseCaseWithRating[] = [];
    for (const useCase of allCases) {
      const ratings = await db.select({
        avgRating: avg(marketplaceRatings.rating),
        count: count(marketplaceRatings.id)
      }).from(marketplaceRatings).where(eq(marketplaceRatings.marketplaceUseCaseId, useCase.id));
      
      let userRating: number | undefined;
      if (userId) {
        const [userRatingResult] = await db.select().from(marketplaceRatings)
          .where(and(
            eq(marketplaceRatings.marketplaceUseCaseId, useCase.id),
            eq(marketplaceRatings.userId, userId)
          ));
        userRating = userRatingResult?.rating;
      }

      result.push({
        ...useCase,
        averageRating: ratings[0]?.avgRating ? Number(ratings[0].avgRating) : 0,
        ratingCount: Number(ratings[0]?.count || 0),
        userRating,
      });
    }
    return result;
  }

  async getMarketplaceUseCase(id: string): Promise<MarketplaceUseCase | undefined> {
    const [useCase] = await db.select().from(marketplaceUseCases).where(eq(marketplaceUseCases.id, id));
    return useCase;
  }

  async createMarketplaceUseCase(useCase: InsertMarketplaceUseCase): Promise<MarketplaceUseCase> {
    const [newUseCase] = await db.insert(marketplaceUseCases).values(useCase).returning();
    return newUseCase;
  }

  async cloneMarketplaceUseCase(marketplaceUseCaseId: string, clientId: string): Promise<UseCase> {
    const template = await this.getMarketplaceUseCase(marketplaceUseCaseId);
    if (!template) {
      throw new Error("Marketplace use case not found");
    }

    const existing = await db.select().from(useCases).orderBy(desc(useCases.priorityOrder));
    const maxPriority = existing[0]?.priorityOrder || 0;

    const [clonedUseCase] = await db.insert(useCases).values({
      clientId,
      title: template.title,
      industryVertical: template.industryVertical,
      department: template.department,
      level: template.level,
      goals: template.goals,
      status: "Proposed",
      riskRating: template.riskRating,
      piiFlag: template.piiFlag,
      dataFlow: template.dataFlow,
      humanInLoop: template.humanInLoop,
      storyToday: template.storyToday,
      storyFuture: template.storyFuture,
      personaStory: template.personaStory,
      controls: template.controls,
      tools: template.tools,
      baselineMinutesPerRun: template.baselineMinutesPerRun,
      frequencyPerWeek: template.frequencyPerWeek,
      roiTimeSavedMinutesPerWeek: template.roiTimeSavedMinutesPerWeek,
      roiDollarsPerMonth: template.roiDollarsPerMonth,
      priorityOrder: maxPriority + 1,
    }).returning();

    await db.update(marketplaceUseCases)
      .set({ cloneCount: sql`${marketplaceUseCases.cloneCount} + 1` })
      .where(eq(marketplaceUseCases.id, marketplaceUseCaseId));

    return clonedUseCase;
  }

  async rateMarketplaceUseCase(marketplaceUseCaseId: string, userId: string, rating: number): Promise<MarketplaceRating> {
    const existing = await this.getUserRatingForMarketplaceUseCase(marketplaceUseCaseId, userId);
    
    if (existing) {
      const [updated] = await db.update(marketplaceRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(marketplaceRatings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newRating] = await db.insert(marketplaceRatings).values({
        marketplaceUseCaseId,
        userId,
        rating,
      }).returning();
      return newRating;
    }
  }

  async getUserRatingForMarketplaceUseCase(marketplaceUseCaseId: string, userId: string): Promise<MarketplaceRating | undefined> {
    const [rating] = await db.select().from(marketplaceRatings)
      .where(and(
        eq(marketplaceRatings.marketplaceUseCaseId, marketplaceUseCaseId),
        eq(marketplaceRatings.userId, userId)
      ));
    return rating;
  }

  async getMarketplaceScopes(): Promise<string[]> {
    const results = await db.selectDistinct({ scope: marketplaceUseCases.scope }).from(marketplaceUseCases).orderBy(marketplaceUseCases.scope);
    return results.map(r => r.scope);
  }

  // Client Invitations
  async createClientInvitation(email: string, clientId: string, invitedByUserId: string, clientTeamRole?: string): Promise<ClientInvitation> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const [invitation] = await db.insert(clientInvitations).values({
      email,
      clientId,
      token,
      invitedByUserId,
      expiresAt,
      clientTeamRole: clientTeamRole as any || "Admin",
    }).returning();
    return invitation;
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    const [invitation] = await db.select().from(clientInvitations).where(eq(clientInvitations.token, token));
    return invitation;
  }

  async getClientInvitationsByClient(clientId: string): Promise<ClientInvitation[]> {
    return await db.select().from(clientInvitations).where(eq(clientInvitations.clientId, clientId)).orderBy(desc(clientInvitations.createdAt));
  }

  async getAllClientInvitations(): Promise<ClientInvitation[]> {
    return await db.select().from(clientInvitations).orderBy(desc(clientInvitations.createdAt));
  }

  async acceptClientInvitation(token: string, userId: string): Promise<ClientInvitation> {
    const invitation = await this.getClientInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used or expired");
    }
    if (new Date() > invitation.expiresAt) {
      await db.update(clientInvitations)
        .set({ status: "expired" })
        .where(eq(clientInvitations.id, invitation.id));
      throw new Error("Invitation has expired");
    }

    // Link user to client with the team role from the invitation
    await this.addUserToClient({
      userId,
      clientId: invitation.clientId,
      role: "CLIENT",
      clientTeamRole: invitation.clientTeamRole as any || "Admin",
    });

    // Mark invitation as accepted
    const [updated] = await db.update(clientInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(clientInvitations.id, invitation.id))
      .returning();
    
    return updated;
  }

  async deleteClientInvitation(id: string): Promise<boolean> {
    await db.delete(clientInvitations).where(eq(clientInvitations.id, id));
    return true;
  }

  async getClientTeamMembers(clientId: string): Promise<Array<{ user: User; userClient: UserClient }>> {
    const results = await db
      .select({
        user: users,
        userClient: userClients,
      })
      .from(userClients)
      .innerJoin(users, eq(userClients.userId, users.id))
      .where(eq(userClients.clientId, clientId))
      .orderBy(userClients.createdAt);
    
    return results;
  }

  async updateUserClientRole(userId: string, clientId: string, clientTeamRole: string): Promise<UserClient> {
    const [updated] = await db
      .update(userClients)
      .set({ clientTeamRole: clientTeamRole as any })
      .where(and(eq(userClients.userId, userId), eq(userClients.clientId, clientId)))
      .returning();
    return updated;
  }

  // Client Favorites
  async addClientFavorite(marketplaceUseCaseId: string, userId: string, clientId: string): Promise<ClientFavorite> {
    const existing = await db.select().from(clientFavorites)
      .where(and(
        eq(clientFavorites.marketplaceUseCaseId, marketplaceUseCaseId),
        eq(clientFavorites.userId, userId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [favorite] = await db.insert(clientFavorites).values({
      marketplaceUseCaseId,
      userId,
      clientId,
    }).returning();
    return favorite;
  }

  async removeClientFavorite(marketplaceUseCaseId: string, userId: string): Promise<boolean> {
    await db.delete(clientFavorites)
      .where(and(
        eq(clientFavorites.marketplaceUseCaseId, marketplaceUseCaseId),
        eq(clientFavorites.userId, userId)
      ));
    return true;
  }

  async getClientFavorites(userId: string): Promise<ClientFavorite[]> {
    return await db.select().from(clientFavorites)
      .where(eq(clientFavorites.userId, userId))
      .orderBy(desc(clientFavorites.createdAt));
  }

  async getClientFavoritesByClient(clientId: string): Promise<(ClientFavorite & { marketplaceUseCase: MarketplaceUseCase; user: User })[]> {
    const favorites = await db.select().from(clientFavorites)
      .where(eq(clientFavorites.clientId, clientId))
      .orderBy(desc(clientFavorites.createdAt));
    
    const result: (ClientFavorite & { marketplaceUseCase: MarketplaceUseCase; user: User })[] = [];
    for (const fav of favorites) {
      const [marketplaceUseCase] = await db.select().from(marketplaceUseCases)
        .where(eq(marketplaceUseCases.id, fav.marketplaceUseCaseId));
      const [user] = await db.select().from(users)
        .where(eq(users.id, fav.userId));
      
      if (marketplaceUseCase && user) {
        result.push({
          ...fav,
          marketplaceUseCase,
          user,
        });
      }
    }
    return result;
  }

  async isClientFavorite(marketplaceUseCaseId: string, userId: string): Promise<boolean> {
    const [favorite] = await db.select().from(clientFavorites)
      .where(and(
        eq(clientFavorites.marketplaceUseCaseId, marketplaceUseCaseId),
        eq(clientFavorites.userId, userId)
      ));
    return !!favorite;
  }

  // Use Case Notes
  async getUseCaseNotes(useCaseId: string): Promise<UseCaseNoteWithUser[]> {
    const notes = await db.select({
      id: useCaseNotes.id,
      useCaseId: useCaseNotes.useCaseId,
      userId: useCaseNotes.userId,
      content: useCaseNotes.content,
      createdAt: useCaseNotes.createdAt,
      updatedAt: useCaseNotes.updatedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      }
    })
      .from(useCaseNotes)
      .leftJoin(users, eq(useCaseNotes.userId, users.id))
      .where(eq(useCaseNotes.useCaseId, useCaseId))
      .orderBy(desc(useCaseNotes.createdAt));
    
    return notes.map(note => ({
      ...note,
      user: note.user || {
        id: note.userId,
        firstName: null,
        lastName: null,
        email: 'Unknown',
        profileImageUrl: null,
      }
    }));
  }

  async createUseCaseNote(useCaseId: string, userId: string, content: string): Promise<UseCaseNote> {
    const [note] = await db.insert(useCaseNotes)
      .values({ useCaseId, userId, content })
      .returning();
    return note;
  }

  async updateUseCaseNote(noteId: string, content: string): Promise<UseCaseNote | undefined> {
    const [note] = await db.update(useCaseNotes)
      .set({ content, updatedAt: new Date() })
      .where(eq(useCaseNotes.id, noteId))
      .returning();
    return note;
  }

  async deleteUseCaseNote(noteId: string): Promise<boolean> {
    const result = await db.delete(useCaseNotes)
      .where(eq(useCaseNotes.id, noteId));
    return true;
  }

  // Password Reset
  async createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const [resetToken] = await db.insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
