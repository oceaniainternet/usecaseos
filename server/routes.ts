import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertClientSchema, insertUseCaseSchema, storyGeneratorInputSchema, type StoryGeneratorOutput } from "@shared/schema";
import { z } from "zod";

// Story generator templates (deterministic, no LLM)
function generateStory(input: z.infer<typeof storyGeneratorInputSchema>): StoryGeneratorOutput {
  const { industryVertical, department, taskSummary, tools, piiFlag, riskRating, level } = input;
  
  const isHealthcare = industryVertical.toLowerCase().includes("podiatry") || 
                       industryVertical.toLowerCase().includes("health") ||
                       industryVertical.toLowerCase().includes("medical");

  // Generate current workflow story
  let storyToday = `Currently, the ${department} team manually handles "${taskSummary}". `;
  storyToday += `This involves multiple steps including data gathering, processing, and reporting. `;
  storyToday += `Staff spend significant time on repetitive tasks that could be automated. `;
  if (piiFlag) {
    storyToday += `This process involves handling personal data which requires careful attention to privacy.`;
  }

  // Generate future workflow story based on level
  let storyFuture = "";
  if (level === 1) {
    storyFuture = `1. Staff uses ${tools.length > 0 ? tools[0] : "the tool"} to assist with the task
2. System provides templates and suggestions
3. Staff reviews and makes final decisions
4. Results are saved and tracked for reporting`;
  } else if (level === 2) {
    storyFuture = `1. Trigger event starts the automation (schedule or action)
2. ${tools.length > 0 ? tools.join(" and ") : "Connected tools"} sync data automatically
3. Workflow processes and transforms data
4. Results are delivered to the appropriate destination
5. Staff is notified of completion for review`;
  } else {
    storyFuture = `1. AI monitors for trigger conditions
2. System analyzes context and determines optimal approach
3. ${tools.length > 0 ? tools.join(", ") : "AI-powered tools"} execute the workflow
4. AI makes decisions within defined guardrails
5. Human review is triggered for edge cases
6. Results are delivered and performance is logged`;
  }

  // Generate controls/guardrails
  const controls: string[] = [];
  
  if (isHealthcare) {
    controls.push("No medical diagnosis or clinical recommendations");
    controls.push("Escalate to healthcare professional for clinical questions");
    controls.push("Maintain HIPAA-compliant data handling");
  }
  
  if (piiFlag) {
    controls.push("Redact or anonymize PII before external processing");
    controls.push("Log all data access for audit trail");
  }
  
  if (riskRating === "High" || riskRating === "Medium") {
    controls.push("Human review required before final action");
    controls.push("Implement rollback capability for errors");
  }
  
  if (level === 3) {
    controls.push("AI decisions limited to predefined action set");
    controls.push("Confidence threshold required for automated actions");
  }

  // Default controls
  if (controls.length === 0) {
    controls.push("Standard quality checks on output");
    controls.push("Error notification to team lead");
  }

  return { storyToday, storyFuture, controls };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Clients API
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const clientsList = await storage.getClients();
      res.json(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid client data", errors: parsed.error.errors });
      }
      const client = await storage.createClient(parsed.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Use Cases API
  app.get("/api/use-cases", isAuthenticated, async (req, res) => {
    try {
      const useCasesList = await storage.getUseCases();
      res.json(useCasesList);
    } catch (error) {
      console.error("Error fetching use cases:", error);
      res.status(500).json({ message: "Failed to fetch use cases" });
    }
  });

  app.get("/api/use-cases/:id", isAuthenticated, async (req, res) => {
    try {
      const useCase = await storage.getUseCase(req.params.id);
      if (!useCase) {
        return res.status(404).json({ message: "Use case not found" });
      }
      res.json(useCase);
    } catch (error) {
      console.error("Error fetching use case:", error);
      res.status(500).json({ message: "Failed to fetch use case" });
    }
  });

  app.post("/api/use-cases", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertUseCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid use case data", errors: parsed.error.errors });
      }
      const useCase = await storage.createUseCase(parsed.data);
      res.status(201).json(useCase);
    } catch (error) {
      console.error("Error creating use case:", error);
      res.status(500).json({ message: "Failed to create use case" });
    }
  });

  app.patch("/api/use-cases/:id", isAuthenticated, async (req, res) => {
    try {
      const useCase = await storage.updateUseCase(req.params.id, req.body);
      if (!useCase) {
        return res.status(404).json({ message: "Use case not found" });
      }
      res.json(useCase);
    } catch (error) {
      console.error("Error updating use case:", error);
      res.status(500).json({ message: "Failed to update use case" });
    }
  });

  app.delete("/api/use-cases/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUseCase(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting use case:", error);
      res.status(500).json({ message: "Failed to delete use case" });
    }
  });

  // Priority reordering
  app.post("/api/use-cases/reorder", isAuthenticated, async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid updates array" });
      }
      await storage.updateUseCasePriorities(updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering use cases:", error);
      res.status(500).json({ message: "Failed to reorder use cases" });
    }
  });

  // Story Generator
  app.post("/api/story-generate", isAuthenticated, async (req, res) => {
    try {
      const parsed = storyGeneratorInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }
      const result = generateStory(parsed.data);
      res.json(result);
    } catch (error) {
      console.error("Error generating story:", error);
      res.status(500).json({ message: "Failed to generate story" });
    }
  });

  return httpServer;
}
