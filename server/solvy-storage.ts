import { db } from "./db";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";
import {
  solvyConversations,
  solvyMessages,
  solvyBriefs,
  dataSources,
  dataSourceChunks,
  auditLogs,
  type SolvyConversation,
  type InsertSolvyConversation,
  type SolvyMessage,
  type InsertSolvyMessage,
  type SolvyBrief,
  type InsertSolvyBrief,
  type DataSource,
  type InsertDataSource,
  type DataSourceChunk,
  type InsertDataSourceChunk,
  type AuditLog,
  type InsertAuditLog,
  type SolvyConversationWithMessages,
  type SolvyBriefWithUser,
  type Citation,
} from "@shared/schema";
import { users } from "@shared/schema";

export interface ISolvyStorage {
  createConversation(data: InsertSolvyConversation): Promise<SolvyConversation>;
  getConversation(id: string): Promise<SolvyConversation | null>;
  getConversationWithMessages(id: string): Promise<SolvyConversationWithMessages | null>;
  getUserConversations(userId: string, clientId: string): Promise<SolvyConversation[]>;
  getWorkspaceConversations(clientId: string): Promise<SolvyConversation[]>;
  updateConversation(id: string, data: Partial<SolvyConversation>): Promise<SolvyConversation | null>;
  deleteConversation(id: string): Promise<void>;
  
  createMessage(data: InsertSolvyMessage): Promise<SolvyMessage>;
  getConversationMessages(conversationId: string): Promise<SolvyMessage[]>;
  
  createBrief(data: InsertSolvyBrief): Promise<SolvyBrief>;
  getBrief(id: string): Promise<SolvyBrief | null>;
  getBriefWithUser(id: string): Promise<SolvyBriefWithUser | null>;
  getUserBriefs(userId: string, clientId: string): Promise<SolvyBrief[]>;
  getWorkspaceBriefs(clientId: string): Promise<SolvyBriefWithUser[]>;
  updateBrief(id: string, data: Partial<SolvyBrief>): Promise<SolvyBrief | null>;
  deleteBrief(id: string): Promise<void>;
  
  createDataSource(data: InsertDataSource): Promise<DataSource>;
  getDataSource(id: string): Promise<DataSource | null>;
  getWorkspaceDataSources(clientId: string): Promise<DataSource[]>;
  updateDataSource(id: string, data: Partial<DataSource>): Promise<DataSource | null>;
  deleteDataSource(id: string): Promise<void>;
  
  createChunk(data: InsertDataSourceChunk): Promise<DataSourceChunk>;
  createChunks(chunks: InsertDataSourceChunk[]): Promise<DataSourceChunk[]>;
  getSourceChunks(sourceId: string): Promise<DataSourceChunk[]>;
  searchChunks(clientId: string, query: string, limit?: number): Promise<(DataSourceChunk & { sourceName: string })[]>;
  deleteSourceChunks(sourceId: string): Promise<void>;
  
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getClientAuditLogs(clientId: string, limit?: number): Promise<AuditLog[]>;
}

export const solvyStorage: ISolvyStorage = {
  async createConversation(data: InsertSolvyConversation): Promise<SolvyConversation> {
    const [conversation] = await db.insert(solvyConversations).values(data).returning();
    return conversation;
  },

  async getConversation(id: string): Promise<SolvyConversation | null> {
    const [conversation] = await db.select().from(solvyConversations).where(eq(solvyConversations.id, id));
    return conversation || null;
  },

  async getConversationWithMessages(id: string): Promise<SolvyConversationWithMessages | null> {
    const [conversation] = await db.select().from(solvyConversations).where(eq(solvyConversations.id, id));
    if (!conversation) return null;
    
    const messages = await db.select().from(solvyMessages)
      .where(eq(solvyMessages.conversationId, id))
      .orderBy(solvyMessages.createdAt);
    
    return { ...conversation, messages };
  },

  async getUserConversations(userId: string, clientId: string): Promise<SolvyConversation[]> {
    return db.select().from(solvyConversations)
      .where(and(
        eq(solvyConversations.userId, userId),
        eq(solvyConversations.clientId, clientId)
      ))
      .orderBy(desc(solvyConversations.updatedAt));
  },

  async getWorkspaceConversations(clientId: string): Promise<SolvyConversation[]> {
    return db.select().from(solvyConversations)
      .where(and(
        eq(solvyConversations.clientId, clientId),
        eq(solvyConversations.visibility, "workspace")
      ))
      .orderBy(desc(solvyConversations.updatedAt));
  },

  async updateConversation(id: string, data: Partial<SolvyConversation>): Promise<SolvyConversation | null> {
    const [updated] = await db.update(solvyConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(solvyConversations.id, id))
      .returning();
    return updated || null;
  },

  async deleteConversation(id: string): Promise<void> {
    await db.delete(solvyMessages).where(eq(solvyMessages.conversationId, id));
    await db.delete(solvyConversations).where(eq(solvyConversations.id, id));
  },

  async createMessage(data: InsertSolvyMessage): Promise<SolvyMessage> {
    const [message] = await db.insert(solvyMessages).values(data).returning();
    await db.update(solvyConversations)
      .set({ updatedAt: new Date() })
      .where(eq(solvyConversations.id, data.conversationId));
    return message;
  },

  async getConversationMessages(conversationId: string): Promise<SolvyMessage[]> {
    return db.select().from(solvyMessages)
      .where(eq(solvyMessages.conversationId, conversationId))
      .orderBy(solvyMessages.createdAt);
  },

  async createBrief(data: InsertSolvyBrief): Promise<SolvyBrief> {
    const [brief] = await db.insert(solvyBriefs).values(data).returning();
    return brief;
  },

  async getBrief(id: string): Promise<SolvyBrief | null> {
    const [brief] = await db.select().from(solvyBriefs).where(eq(solvyBriefs.id, id));
    return brief || null;
  },

  async getBriefWithUser(id: string): Promise<SolvyBriefWithUser | null> {
    const result = await db.select({
      brief: solvyBriefs,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(solvyBriefs)
    .leftJoin(users, eq(solvyBriefs.userId, users.id))
    .where(eq(solvyBriefs.id, id));
    
    if (!result[0] || !result[0].user) return null;
    return { ...result[0].brief, user: result[0].user };
  },

  async getUserBriefs(userId: string, clientId: string): Promise<SolvyBrief[]> {
    return db.select().from(solvyBriefs)
      .where(and(
        eq(solvyBriefs.userId, userId),
        eq(solvyBriefs.clientId, clientId)
      ))
      .orderBy(desc(solvyBriefs.updatedAt));
  },

  async getWorkspaceBriefs(clientId: string): Promise<SolvyBriefWithUser[]> {
    const results = await db.select({
      brief: solvyBriefs,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(solvyBriefs)
    .leftJoin(users, eq(solvyBriefs.userId, users.id))
    .where(eq(solvyBriefs.clientId, clientId))
    .orderBy(desc(solvyBriefs.updatedAt));
    
    return results
      .filter(r => r.user !== null)
      .map(r => ({ ...r.brief, user: r.user! }));
  },

  async updateBrief(id: string, data: Partial<SolvyBrief>): Promise<SolvyBrief | null> {
    const [updated] = await db.update(solvyBriefs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(solvyBriefs.id, id))
      .returning();
    return updated || null;
  },

  async deleteBrief(id: string): Promise<void> {
    await db.delete(solvyBriefs).where(eq(solvyBriefs.id, id));
  },

  async createDataSource(data: InsertDataSource): Promise<DataSource> {
    const [source] = await db.insert(dataSources).values(data).returning();
    return source;
  },

  async getDataSource(id: string): Promise<DataSource | null> {
    const [source] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return source || null;
  },

  async getWorkspaceDataSources(clientId: string): Promise<DataSource[]> {
    return db.select().from(dataSources)
      .where(eq(dataSources.clientId, clientId))
      .orderBy(desc(dataSources.createdAt));
  },

  async updateDataSource(id: string, data: Partial<DataSource>): Promise<DataSource | null> {
    const [updated] = await db.update(dataSources)
      .set(data)
      .where(eq(dataSources.id, id))
      .returning();
    return updated || null;
  },

  async deleteDataSource(id: string): Promise<void> {
    await db.delete(dataSourceChunks).where(eq(dataSourceChunks.sourceId, id));
    await db.delete(dataSources).where(eq(dataSources.id, id));
  },

  async createChunk(data: InsertDataSourceChunk): Promise<DataSourceChunk> {
    const [chunk] = await db.insert(dataSourceChunks).values(data).returning();
    return chunk;
  },

  async createChunks(chunks: InsertDataSourceChunk[]): Promise<DataSourceChunk[]> {
    if (chunks.length === 0) return [];
    return db.insert(dataSourceChunks).values(chunks).returning();
  },

  async getSourceChunks(sourceId: string): Promise<DataSourceChunk[]> {
    return db.select().from(dataSourceChunks)
      .where(eq(dataSourceChunks.sourceId, sourceId))
      .orderBy(dataSourceChunks.chunkIndex);
  },

  async searchChunks(clientId: string, query: string, limit: number = 5): Promise<(DataSourceChunk & { sourceName: string })[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (searchTerms.length === 0) return [];
    
    const results = await db.select({
      chunk: dataSourceChunks,
      sourceName: dataSources.originalFilename
    })
    .from(dataSourceChunks)
    .innerJoin(dataSources, eq(dataSourceChunks.sourceId, dataSources.id))
    .where(and(
      eq(dataSourceChunks.clientId, clientId),
      eq(dataSources.status, "ready"),
      or(
        ...searchTerms.map(term => 
          ilike(dataSourceChunks.content, `%${term}%`)
        )
      )
    ))
    .limit(limit);
    
    return results.map(r => ({ ...r.chunk, sourceName: r.sourceName }));
  },

  async deleteSourceChunks(sourceId: string): Promise<void> {
    await db.delete(dataSourceChunks).where(eq(dataSourceChunks.sourceId, sourceId));
  },

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  },

  async getClientAuditLogs(clientId: string, limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.clientId, clientId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  },
};

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
    
    if (start < 0) start = 0;
  }
  
  return chunks.filter(c => c.length > 0);
}

export function formatCitation(citation: Citation): string {
  return `[${citation.sourceName}, chunk ${citation.chunkIndex + 1}]`;
}
