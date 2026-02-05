import type { Express, Request, Response, NextFunction } from "express";
import { isAuthenticated } from "./auth";
import { storage } from "./storage";
import { solvyStorage, chunkText, formatCitation } from "./solvy-storage";
import { 
  createSolvyChatSchema, 
  sendSolvyMessageSchema, 
  updateBriefVisibilitySchema, 
  createBriefFromChatSchema,
  updateBriefSchema,
  CHAT_MODE_LABELS,
  CHAT_MODE_DESCRIPTIONS,
  type Citation,
  type SolvyConversation,
  type InsertSolvyBrief,
} from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please wait before sending more messages." });
  }
  
  userLimit.count++;
  next();
}

async function checkWorkspaceAccess(userId: string, clientId: string): Promise<{ hasAccess: boolean; isAdmin: boolean; isViewer: boolean; canWrite: boolean; role: string | null }> {
  const userClient = await storage.getUserClientRole(userId, clientId);
  
  if (!userClient) {
    const allUserClients = await storage.getUserClients(userId);
    if (allUserClients.length === 0) {
      return { hasAccess: true, isAdmin: true, isViewer: false, canWrite: true, role: "Consultant" };
    }
    return { hasAccess: false, isAdmin: false, isViewer: false, canWrite: false, role: null };
  }
  
  const isAdmin = userClient.role === "ADMIN" || 
    userClient.clientTeamRole === "Admin" || 
    userClient.clientTeamRole === "Adoption Lead";
  
  const isViewer = userClient.clientTeamRole === "Observer";
  
  const canWrite = !isViewer;
  
  return { hasAccess: true, isAdmin, isViewer, canWrite, role: userClient.clientTeamRole };
}

function getSystemPrompt(mode: string, workspaceName: string): string {
  const basePrompt = `You are Solvy, an intelligent AI assistant for ${workspaceName} on the Solvity.ai platform. You are helpful, professional, and focused on providing actionable insights.`;
  
  switch (mode) {
    case "draft_brief":
      return `${basePrompt}

Your role is to help create structured Solution Briefs. Guide the user through creating a comprehensive brief with these sections:
1. Context - Background and current situation
2. Problem - Clear statement of the problem to solve
3. Stakeholders - Who is affected and involved
4. Options - Possible solutions or approaches
5. Recommendation - Your suggested approach with rationale
6. Risks & Mitigations - Potential issues and how to address them
7. Assumptions - Key assumptions being made
8. Next Steps - Concrete action items

Ask clarifying questions to ensure each section is well-defined. When you have enough information, offer to generate the complete brief.`;

    case "explore_ideas":
      return `${basePrompt}

Your role is to help brainstorm and explore ideas freely. Be creative, ask thought-provoking questions, and help the user think through possibilities. Challenge assumptions constructively and offer different perspectives. Focus on innovation and helping the user discover new approaches to their challenges.`;

    case "query_data":
      return `${basePrompt}

Your role is to answer questions based on the workspace's uploaded documents and knowledge base. 

CRITICAL RULES:
1. ONLY answer based on the provided source documents
2. If no relevant information is found, clearly state: "I don't have information about this in the current knowledge base."
3. NEVER make up or hallucinate information
4. ALWAYS cite your sources using the format [SourceName, chunk X]
5. If you're uncertain, express uncertainty rather than guessing

When sources are provided, synthesize the information and cite each claim.`;

    default:
      return basePrompt;
  }
}

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".txt", ".md", ".markdown"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and Markdown files are allowed"));
    }
  },
});

export function registerSolvyRoutes(app: Express) {
  app.get("/api/solvy/conversations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = req.query.clientId as string;
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      const conversations = await solvyStorage.getUserConversations(user.id, clientId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/solvy/conversations", isAuthenticated, rateLimit, async (req, res) => {
    try {
      const user = req.user as any;
      const parsed = createSolvyChatSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const { clientId, mode, title } = parsed.data;
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      if (access.role === "Observer") {
        return res.status(403).json({ error: "Viewers cannot create chats" });
      }
      
      const conversation = await solvyStorage.createConversation({
        clientId,
        userId: user.id,
        mode,
        title: title || CHAT_MODE_LABELS[mode] || "New Chat",
        visibility: "private",
      });
      
      await solvyStorage.createAuditLog({
        clientId,
        userId: user.id,
        action: "chat_created",
        targetType: "conversation",
        targetId: conversation.id,
        metadata: { mode },
        ipAddress: req.ip || null,
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/solvy/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const conversationId = req.params.id;
      
      const conversation = await solvyStorage.getConversationWithMessages(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, conversation.clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (conversation.visibility === "private" && conversation.userId !== user.id) {
        return res.status(403).json({ error: "This is a private conversation" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.patch("/api/solvy/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const conversationId = req.params.id;
      
      const conversation = await solvyStorage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "You can only edit your own conversations" });
      }
      
      const { visibility, title } = req.body;
      const updates: any = {};
      
      if (visibility && (visibility === "private" || visibility === "workspace")) {
        updates.visibility = visibility;
      }
      
      if (title) {
        updates.title = title;
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      
      const updated = await solvyStorage.updateConversation(conversationId, updates);
      
      if (visibility) {
        const action = visibility === "workspace" ? "chat_shared" : "chat_unshared";
        await solvyStorage.createAuditLog({
          clientId: conversation.clientId,
          userId: user.id,
          action,
          targetType: "conversation",
          targetId: conversationId,
          metadata: { visibility },
          ipAddress: req.ip || null,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/solvy/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const conversationId = req.params.id;
      
      const conversation = await solvyStorage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own conversations" });
      }
      
      await solvyStorage.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/solvy/conversations/:id/messages", isAuthenticated, rateLimit, async (req, res) => {
    try {
      const user = req.user as any;
      const conversationId = req.params.id as string;
      const parsed = sendSolvyMessageSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const conversation = await solvyStorage.getConversationWithMessages(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, conversation.clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (access.role === "Observer") {
        return res.status(403).json({ error: "Viewers cannot send messages" });
      }
      
      await solvyStorage.createMessage({
        conversationId,
        role: "user",
        content: parsed.data.content,
        citations: [],
      });
      
      const client = await storage.getClient(conversation.clientId);
      const workspaceName = client?.name || "your workspace";
      
      let contextInfo = "";
      let citations: Citation[] = [];
      
      if (conversation.mode === "query_data") {
        const chunks = await solvyStorage.searchChunks(conversation.clientId, parsed.data.content, 5);
        
        if (chunks.length > 0) {
          contextInfo = "\n\nRelevant documents from the knowledge base:\n\n";
          chunks.forEach((chunk, idx) => {
            contextInfo += `--- Source: ${chunk.sourceName} (chunk ${chunk.chunkIndex + 1}) ---\n${chunk.content}\n\n`;
            citations.push({
              sourceName: chunk.sourceName,
              sourceId: chunk.sourceId,
              chunkId: chunk.id,
              chunkIndex: chunk.chunkIndex,
              excerpt: chunk.content.slice(0, 200),
            });
          });
        } else {
          contextInfo = "\n\nNo relevant documents found in the knowledge base for this query.";
        }
      }
      
      const systemPrompt = getSystemPrompt(conversation.mode, workspaceName) + contextInfo;
      
      const messages: { role: "user" | "assistant"; content: string }[] = conversation.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      messages.push({ role: "user", content: parsed.data.content });
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      let fullResponse = "";
      
      try {
        const stream = await anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        });
        
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            res.write(`data: ${JSON.stringify({ type: "delta", content: event.delta.text })}\n\n`);
          }
        }
        
        const assistantMessage = await solvyStorage.createMessage({
          conversationId,
          role: "assistant",
          content: fullResponse,
          citations: conversation.mode === "query_data" ? citations : [],
        });
        
        if (conversation.messages.length === 0) {
          const titlePrompt = `Based on this conversation, generate a very short title (max 6 words): "${parsed.data.content}"`;
          try {
            const titleResponse = await anthropic.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 50,
              messages: [{ role: "user", content: titlePrompt }],
            });
            const newTitle = (titleResponse.content[0] as any).text?.slice(0, 100) || "New Chat";
            await solvyStorage.updateConversation(conversationId, { title: newTitle });
          } catch (e) {
            console.error("Error generating title:", e);
          }
        }
        
        res.write(`data: ${JSON.stringify({ type: "done", messageId: assistantMessage.id, citations })}\n\n`);
        res.end();
      } catch (streamError: any) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ type: "error", error: streamError.message || "AI response failed" })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  app.get("/api/solvy/briefs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = req.query.clientId as string;
      const showAll = req.query.showAll === "true";
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      if (showAll && access.isAdmin) {
        const briefs = await solvyStorage.getWorkspaceBriefs(clientId);
        return res.json(briefs);
      }
      
      const allBriefs = await solvyStorage.getWorkspaceBriefs(clientId);
      const filtered = allBriefs.filter(b => 
        b.userId === user.id || b.visibility === "workspace"
      );
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching briefs:", error);
      res.status(500).json({ error: "Failed to fetch briefs" });
    }
  });

  app.post("/api/solvy/briefs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const parsed = createBriefFromChatSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const conversation = await solvyStorage.getConversationWithMessages(parsed.data.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, conversation.clientId);
      if (!access.hasAccess || access.role === "Observer") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const briefData: InsertSolvyBrief = {
        clientId: conversation.clientId,
        userId: user.id,
        title: parsed.data.title,
        conversationId: conversation.id,
        visibility: "private",
      };
      
      const brief = await solvyStorage.createBrief(briefData);
      
      await solvyStorage.updateConversation(conversation.id, { linkedBriefId: brief.id });
      
      await solvyStorage.createAuditLog({
        clientId: conversation.clientId,
        userId: user.id,
        action: "brief_created",
        targetType: "brief",
        targetId: brief.id,
        metadata: { title: brief.title, fromConversation: conversation.id },
        ipAddress: req.ip || null,
      });
      
      res.json(brief);
    } catch (error) {
      console.error("Error creating brief:", error);
      res.status(500).json({ error: "Failed to create brief" });
    }
  });

  app.get("/api/solvy/briefs/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const briefId = req.params.id;
      
      const brief = await solvyStorage.getBriefWithUser(briefId);
      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, brief.clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (brief.visibility === "private" && brief.userId !== user.id && !access.isAdmin) {
        return res.status(403).json({ error: "This is a private brief" });
      }
      
      res.json(brief);
    } catch (error) {
      console.error("Error fetching brief:", error);
      res.status(500).json({ error: "Failed to fetch brief" });
    }
  });

  app.patch("/api/solvy/briefs/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const briefId = req.params.id;
      
      const brief = await solvyStorage.getBrief(briefId);
      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }
      
      if (brief.userId !== user.id) {
        return res.status(403).json({ error: "You can only edit your own briefs" });
      }
      
      const parsed = updateBriefSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const updated = await solvyStorage.updateBrief(briefId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating brief:", error);
      res.status(500).json({ error: "Failed to update brief" });
    }
  });

  app.patch("/api/solvy/briefs/:id/visibility", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const briefId = req.params.id;
      
      const brief = await solvyStorage.getBrief(briefId);
      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }
      
      if (brief.userId !== user.id) {
        return res.status(403).json({ error: "You can only change visibility of your own briefs" });
      }
      
      const parsed = updateBriefVisibilitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      
      const oldVisibility = brief.visibility;
      const updated = await solvyStorage.updateBrief(briefId, { visibility: parsed.data.visibility });
      
      const action = parsed.data.visibility === "workspace" ? "brief_shared" : "brief_unshared";
      await solvyStorage.createAuditLog({
        clientId: brief.clientId,
        userId: user.id,
        action,
        targetType: "brief",
        targetId: briefId,
        metadata: { oldVisibility, newVisibility: parsed.data.visibility },
        ipAddress: req.ip || null,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating brief visibility:", error);
      res.status(500).json({ error: "Failed to update brief visibility" });
    }
  });

  app.delete("/api/solvy/briefs/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const briefId = req.params.id;
      
      const brief = await solvyStorage.getBrief(briefId);
      if (!brief) {
        return res.status(404).json({ error: "Brief not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, brief.clientId);
      if (brief.userId !== user.id && !access.isAdmin) {
        return res.status(403).json({ error: "You can only delete your own briefs" });
      }
      
      await solvyStorage.deleteBrief(briefId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brief:", error);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });

  app.get("/api/solvy/sources", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = req.query.clientId as string;
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: "Access denied to this workspace" });
      }
      
      const sources = await solvyStorage.getWorkspaceDataSources(clientId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/solvy/sources", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = req.body.clientId;
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess || !access.isAdmin) {
        return res.status(403).json({ error: "Only admins can upload data sources" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const source = await solvyStorage.createDataSource({
        clientId,
        uploadedByUserId: user.id,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      });
      
      processFileAsync(source.id, req.file.path, clientId);
      
      await solvyStorage.createAuditLog({
        clientId,
        userId: user.id,
        action: "source_uploaded",
        targetType: "data_source",
        targetId: source.id,
        metadata: { filename: req.file.originalname, size: req.file.size },
        ipAddress: req.ip || null,
      });
      
      res.json(source);
    } catch (error) {
      console.error("Error uploading source:", error);
      res.status(500).json({ error: "Failed to upload source" });
    }
  });

  app.get("/api/solvy/sources/:id/chunks", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const sourceId = req.params.id;
      
      const source = await solvyStorage.getDataSource(sourceId);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, source.clientId);
      if (!access.hasAccess || !access.isAdmin) {
        return res.status(403).json({ error: "Only admins can view chunks" });
      }
      
      const chunks = await solvyStorage.getSourceChunks(sourceId);
      res.json(chunks);
    } catch (error) {
      console.error("Error fetching chunks:", error);
      res.status(500).json({ error: "Failed to fetch chunks" });
    }
  });

  app.delete("/api/solvy/sources/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const sourceId = req.params.id;
      
      const source = await solvyStorage.getDataSource(sourceId);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      const access = await checkWorkspaceAccess(user.id, source.clientId);
      if (!access.hasAccess || !access.isAdmin) {
        return res.status(403).json({ error: "Only admins can delete sources" });
      }
      
      try {
        await fs.unlink(path.join(uploadDir, source.filename));
      } catch (e) {
      }
      
      await solvyStorage.deleteDataSource(sourceId);
      
      await solvyStorage.createAuditLog({
        clientId: source.clientId,
        userId: user.id,
        action: "source_deleted",
        targetType: "data_source",
        targetId: sourceId,
        metadata: { filename: source.originalFilename },
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting source:", error);
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  app.get("/api/solvy/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = req.query.clientId as string;
      const limit = parseInt(req.query.limit as string) || 100;
      
      if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
      }
      
      const access = await checkWorkspaceAccess(user.id, clientId);
      if (!access.hasAccess || !access.isAdmin) {
        return res.status(403).json({ error: "Only admins can view audit logs" });
      }
      
      const logs = await solvyStorage.getClientAuditLogs(clientId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/solvy/chat-modes", isAuthenticated, (req, res) => {
    res.json({
      modes: Object.entries(CHAT_MODE_LABELS).map(([key, label]) => ({
        value: key,
        label,
        description: CHAT_MODE_DESCRIPTIONS[key],
      })),
    });
  });
}

async function processFileAsync(sourceId: string, filePath: string, clientId: string) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const chunks = chunkText(content, 1000, 100);
    
    const chunkData = chunks.map((chunk, index) => ({
      sourceId,
      clientId,
      chunkIndex: index,
      content: chunk,
      metadata: null,
      searchVector: chunk.toLowerCase(),
    }));
    
    await solvyStorage.createChunks(chunkData);
    
    await solvyStorage.updateDataSource(sourceId, {
      status: "ready",
      chunkCount: chunks.length,
    });
  } catch (error: any) {
    console.error("Error processing file:", error);
    await solvyStorage.updateDataSource(sourceId, {
      status: "error",
      errorMessage: error.message || "Failed to process file",
    });
  }
}
