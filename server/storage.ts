import { 
  clients, 
  useCases, 
  userClients,
  users,
  type Client, 
  type InsertClient, 
  type UseCase, 
  type InsertUseCase,
  type UserClient,
  type InsertUserClient,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc } from "drizzle-orm";
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
    const { and } = await import("drizzle-orm");
    await db.delete(userClients)
      .where(and(eq(userClients.userId, userId), eq(userClients.clientId, clientId)));
    return true;
  }
}

export const storage = new DatabaseStorage();
