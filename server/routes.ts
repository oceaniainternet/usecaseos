import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertClientSchema, insertUseCaseSchema, storyGeneratorInputSchema, cloneMarketplaceUseCaseSchema, rateMarketplaceUseCaseSchema, createClientInvitationSchema, acceptInvitationSchema, updateClientApprovalSchema, type StoryGeneratorOutput } from "@shared/schema";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import bcrypt from "bcrypt";
import { sendEmail, generateInvitationEmail, generateApprovalEmail } from "./email";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Podiatry-specific persona names and scenarios
const podiatryPersonas = {
  practitioner: ["Dr. Sarah Mitchell", "Dr. James Chen", "Dr. Emily Watson", "Dr. Michael Torres"],
  practiceManager: ["Karen", "Lisa", "Amanda", "Rachel"],
  receptionist: ["Megan", "Sophie", "Emma", "Nicole"],
  patient: ["Mrs. Henderson", "Mr. Patel", "Mrs. O'Brien", "Mr. Thompson", "Mrs. Garcia"],
};

const podiatryTerms = {
  conditions: ["diabetic foot assessment", "ingrown toenail treatment", "custom orthotics fitting", "heel pain consultation", "wound care management", "nail fungus treatment"],
  procedures: ["biomechanical assessment", "gait analysis", "diabetic foot screening", "orthotic adjustment", "nail surgery", "wound debridement"],
  equipment: ["3D foot scanner", "pressure plate", "doppler ultrasound", "sterilization unit", "orthotic casting materials"],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Story generator templates (deterministic, no LLM)
function generateStory(input: z.infer<typeof storyGeneratorInputSchema>): StoryGeneratorOutput {
  const { industryVertical, department, taskSummary, tools, piiFlag, riskRating, level } = input;
  
  const isPodiatry = industryVertical.toLowerCase().includes("podiatry");
  const isHealthcare = isPodiatry || 
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

  // Generate persona-based narrative story
  let personaStory = "";
  
  if (isPodiatry) {
    const practitioner = getRandomElement(podiatryPersonas.practitioner);
    const manager = getRandomElement(podiatryPersonas.practiceManager);
    const receptionist = getRandomElement(podiatryPersonas.receptionist);
    const patient = getRandomElement(podiatryPersonas.patient);
    const condition = getRandomElement(podiatryTerms.conditions);
    const toolsUsed = tools.length > 0 ? tools.join(" and ") : "practice management software";

    if (level === 1) {
      personaStory = `Meet ${manager}, Practice Manager at a busy podiatry clinic.

Every week, ${manager} struggled with "${taskSummary}". The process was manual, time-consuming, and prone to errors. ${receptionist} at the front desk would often spend hours on this task instead of focusing on patient care.

"I was spending my entire Monday morning just on this," ${manager} recalls. "It was frustrating because I knew there had to be a better way."

Now, with ${toolsUsed} as an assistive tool, ${manager}'s workflow has transformed. The system provides smart templates and suggestions, while ${manager} maintains full control over final decisions.

${practitioner} noticed the difference immediately. "Our ${department} team is more efficient, and ${manager} can focus on what really matters - ensuring ${patient} and other patients receive the best possible care for their ${condition}."

The result? What once took hours now takes minutes, with better accuracy and a happier team.`;
    } else if (level === 2) {
      personaStory = `It's 6:00 AM at the clinic, and something remarkable is happening - ${taskSummary} is running automatically, without anyone lifting a finger.

${manager}, the Practice Manager, used to dread this task. "Before automation, I'd come in early just to handle this manually," she explains. "Now ${toolsUsed} handles the heavy lifting while I'm still having my morning coffee."

The no-code automation triggers on schedule, syncs data across systems, and delivers results to the right place. ${receptionist} gets a notification when it's complete, ready for a quick review.

${practitioner} appreciates the clinical impact: "Our ${department} runs smoother now. When ${patient} comes in for their ${condition}, we're not scrambling with paperwork. The system has already prepared everything we need."

${manager} smiles when she thinks about the transformation. "We've saved hours every week. More importantly, we've reduced errors and our team is less stressed. That translates directly to better patient care."`;
    } else {
      personaStory = `"I never thought AI could help with something as nuanced as ${taskSummary}," admits ${practitioner}, lead podiatrist at the clinic. "I was skeptical at first."

That skepticism faded quickly. The AI-embedded workflow now monitors for trigger conditions, analyzes context intelligently, and executes tasks within carefully defined guardrails - all while ${practitioner} focuses on treating patients like ${patient} for their ${condition}.

${manager} in ${department} oversees the system. "The AI doesn't make decisions in a vacuum," she clarifies. "It's trained on our workflows, respects our clinical protocols, and always flags edge cases for human review. ${piiFlag ? "Patient privacy is paramount - all PII is handled securely and logged for compliance." : ""}"

${receptionist} at the front desk loves it too. "Patients notice the difference. We're more responsive, more organized. When ${patient} called about her appointment, I had all the information at my fingertips."

${practitioner} sums it up: "It's not about replacing human judgment - it's about augmenting it. ${riskRating === 'High' || riskRating === 'Medium' ? "For high-stakes decisions, a human always reviews before action. That's non-negotiable." : ""} The AI handles the routine so we can focus on the complex cases that truly need our expertise."`;
    }
  } else if (isHealthcare) {
    // Generic healthcare narrative
    personaStory = `In a busy healthcare practice, the ${department} team faced a common challenge: "${taskSummary}" was consuming valuable time that could be spent on patient care.

The Practice Manager knew something had to change. "Our staff was overwhelmed with administrative tasks. We needed a solution that would streamline operations without compromising on care quality or compliance."

${level === 1 ? `Now, with tool-assisted workflows, the team has the best of both worlds - smart technology that suggests and assists, while experienced staff make the final calls.` : level === 2 ? `The no-code automation solution transformed their daily routine. Tasks that once required manual intervention now run automatically, freeing up the team to focus on what matters most - their patients.` : `The AI-embedded system brought a new level of intelligence to their operations. By analyzing patterns and making smart decisions within defined guardrails, the technology handles routine cases while flagging anything that needs human expertise.`}

${piiFlag ? `Patient privacy remains paramount. All personal health information is handled according to HIPAA guidelines, with full audit trails for compliance.` : ""}

${riskRating === 'High' || riskRating === 'Medium' ? `For decisions that carry clinical weight, human review is always required. Technology assists, but healthcare professionals remain in control.` : ""}

The result? A practice that runs more efficiently, a team that's less stressed, and patients who receive better, more attentive care.`;
  } else {
    // Generic business narrative
    personaStory = `The ${department} team had a problem that will sound familiar to many: "${taskSummary}" was eating up hours every week.

"We knew we needed to modernize," the team lead explained. "But we also needed a solution that our team could actually use without a steep learning curve."

${level === 1 ? `They found their answer in a tool-assisted approach. The new system provides intelligent suggestions and templates, but keeps humans in the driver's seat for final decisions. It's the best of both worlds - technology that enhances human judgment rather than replacing it.` : level === 2 ? `A no-code automation platform became the solution. Once configured, the workflow runs on schedule, syncing data across ${tools.length > 0 ? tools.join(" and ") : "connected systems"} and delivering results without manual intervention. The team receives notifications when everything's complete, ready for a quick review.` : `An AI-powered system now handles the complexity. It monitors for triggers, analyzes context, and makes smart decisions within predefined guardrails. For edge cases or high-stakes decisions, it knows when to pause and involve a human.`}

The transformation was immediate. "What used to take us half a day now happens in minutes," the team lead reports. "And the accuracy has improved because we've eliminated the human error that comes with repetitive manual tasks."

More importantly, the team can now focus on strategic work that actually moves the needle, rather than getting bogged down in routine operations.`;
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

  return { storyToday, storyFuture, personaStory, controls };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (username/password auth with passport)
  setupAuth(app);

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

  // Use Case Notes - client-admin collaboration
  app.get("/api/use-cases/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getUseCaseNotes(id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/use-cases/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const note = await storage.createUseCaseNote(id, userId, content.trim());
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.patch("/api/use-case-notes/:noteId", isAuthenticated, async (req, res) => {
    try {
      const { noteId } = req.params;
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const note = await storage.updateUseCaseNote(noteId, content.trim());
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/use-case-notes/:noteId", isAuthenticated, async (req, res) => {
    try {
      const { noteId } = req.params;
      await storage.deleteUseCaseNote(noteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Story Generator - Claude AI powered
  app.post("/api/story-generate", isAuthenticated, async (req, res) => {
    try {
      const parsed = storyGeneratorInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }
      
      const { industryVertical, department, taskSummary, tools, piiFlag, riskRating, level, customerFrustrations, storyTodayIsManual, existingStoryToday } = parsed.data;
      
      // Determine level description
      const levelDescriptions: Record<number, string> = {
        1: "Tool-assisted (staff uses digital tools but maintains control)",
        2: "No-code automation (workflow runs automatically with triggers)",
        3: "AI-embedded (intelligent automation with decision-making within guardrails)"
      };

      // Build frustrations context if provided
      const frustrationContext = customerFrustrations && customerFrustrations.trim() 
        ? `\nCustomer Frustrations/Quotes: "${customerFrustrations}"\n(IMPORTANT: Incorporate these real customer frustrations into the narrative - use similar language and emotional tone)`
        : "";

      // Build storyToday instruction based on manual mode
      const storyTodayInstruction = storyTodayIsManual && existingStoryToday?.trim()
        ? `"storyToday": "IMPORTANT: The user has manually written the current workflow. Take their exact content and ONLY improve the grammar, spelling, and punctuation while preserving their meaning and voice. Here is their content to enhance: '${existingStoryToday.replace(/'/g, "\\'")}'"` 
        : `"storyToday": "A paragraph describing the current manual workflow and pain points (2-3 sentences)"`;

      const prompt = `You are a business consultant writing compelling use case stories for healthcare/medical practices. Generate a story for the following automation use case:

Industry: ${industryVertical}
Department: ${department}
Task: ${taskSummary}
Tools Used: ${tools.length > 0 ? tools.join(", ") : "Not specified"}
Automation Level: Level ${level} - ${levelDescriptions[level]}
Contains Personal Data (PII): ${piiFlag ? "Yes" : "No"}
Risk Rating: ${riskRating}${frustrationContext}

Please generate the following in JSON format:
{
  ${storyTodayInstruction},
  "storyFuture": "Numbered steps (1. 2. 3. etc.) describing the automated workflow (4-6 steps)",
  "personaStory": "A compelling narrative story (4-5 paragraphs) featuring:
    - Real persona names (use healthcare-appropriate names like Dr. Sarah Mitchell, Karen the Practice Manager, patients like Mrs. Henderson)
    - Industry-specific terminology${industryVertical.toLowerCase().includes('podiatry') ? " (diabetic foot assessment, orthotics, wound care, biomechanical assessment)" : ""}
    - Emotional before/after transformation
    - Quotes from the personas about the change
    - ${piiFlag ? "Mention of privacy/compliance considerations" : ""}
    - ${riskRating === 'High' || riskRating === 'Medium' ? "Emphasis on human oversight and guardrails" : ""}",
  "controls": ["Array of 3-5 relevant controls/guardrails for this use case${piiFlag ? " including PII protection measures" : ""}"]
}

Make the story authentic, warm, and compelling - suitable for presenting to clients. Use natural healthcare language and real-world scenarios.`;

      console.log("Starting Claude story generation for:", parsed.data.taskSummary);
      const startTime = Date.now();
      
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      
      console.log(`Claude story generation completed in ${(Date.now() - startTime) / 1000}s`);

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to template-based generation if Claude fails to return JSON
        const result = generateStory(parsed.data);
        return res.json(result);
      }

      const aiResult = JSON.parse(jsonMatch[0]) as StoryGeneratorOutput;
      res.json(aiResult);
    } catch (error) {
      console.error("Error generating story with Claude:", error);
      // Fallback to template-based generation
      try {
        const parsed = storyGeneratorInputSchema.safeParse(req.body);
        if (parsed.success) {
          const result = generateStory(parsed.data);
          return res.json(result);
        }
      } catch (fallbackError) {
        console.error("Fallback generation also failed:", fallbackError);
      }
      res.status(500).json({ message: "Failed to generate story" });
    }
  });

  // Marketplace API
  app.get("/api/marketplace", isAuthenticated, async (req, res) => {
    try {
      const industry = req.query.industry as string | undefined;
      const scope = req.query.scope as string | undefined;
      const userId = (req.user as any)?.id;
      const marketplaceCases = await storage.getMarketplaceUseCases(
        industry && industry !== "all" ? industry : undefined,
        scope && scope !== "all" ? scope : undefined,
        userId
      );
      res.json(marketplaceCases);
    } catch (error) {
      console.error("Error fetching marketplace use cases:", error);
      res.status(500).json({ message: "Failed to fetch marketplace use cases" });
    }
  });

  app.get("/api/marketplace/industries", isAuthenticated, async (req, res) => {
    try {
      const allCases = await storage.getMarketplaceUseCases();
      const industries = Array.from(new Set(allCases.map(c => c.industryVertical))).sort();
      res.json(industries);
    } catch (error) {
      console.error("Error fetching industries:", error);
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  app.get("/api/marketplace/scopes", isAuthenticated, async (req, res) => {
    try {
      const scopes = await storage.getMarketplaceScopes();
      res.json(scopes);
    } catch (error) {
      console.error("Error fetching scopes:", error);
      res.status(500).json({ message: "Failed to fetch scopes" });
    }
  });

  app.get("/api/marketplace/:id", isAuthenticated, async (req, res) => {
    try {
      const useCase = await storage.getMarketplaceUseCase(req.params.id);
      if (!useCase) {
        return res.status(404).json({ message: "Marketplace use case not found" });
      }
      res.json(useCase);
    } catch (error) {
      console.error("Error fetching marketplace use case:", error);
      res.status(500).json({ message: "Failed to fetch marketplace use case" });
    }
  });

  app.post("/api/marketplace/:id/clone", isAuthenticated, async (req, res) => {
    try {
      const parsed = cloneMarketplaceUseCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }
      const clonedUseCase = await storage.cloneMarketplaceUseCase(req.params.id, parsed.data.clientId);
      res.status(201).json(clonedUseCase);
    } catch (error) {
      console.error("Error cloning marketplace use case:", error);
      res.status(500).json({ message: "Failed to clone marketplace use case" });
    }
  });

  app.post("/api/marketplace/:id/rate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const parsed = rateMarketplaceUseCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid rating", errors: parsed.error.errors });
      }
      
      const ratingResult = await storage.rateMarketplaceUseCase(req.params.id, userId, parsed.data.rating);
      res.json(ratingResult);
    } catch (error) {
      console.error("Error rating marketplace use case:", error);
      res.status(500).json({ message: "Failed to rate marketplace use case" });
    }
  });

  // Client Favorites API (marketplace roadmap for admins)
  app.get("/api/client-favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const favorites = await storage.getClientFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching client favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/client-favorites/by-client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is an admin (not a client user) or is associated with this client
      const userClients = await storage.getUserClients(userId);
      const isClientUser = userClients.length > 0;
      const isAssociatedWithClient = userClients.some(uc => uc.clientId === req.params.clientId);

      // Only allow access if: user is admin (not a client user) OR user is associated with the requested client
      if (isClientUser && !isAssociatedWithClient) {
        return res.status(403).json({ message: "Access denied" });
      }

      const favorites = await storage.getClientFavoritesByClient(req.params.clientId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching client favorites by client:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/marketplace/:id/favorite", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user's client association
      const userClients = await storage.getUserClients(userId);
      if (userClients.length === 0) {
        return res.status(403).json({ message: "No client association found" });
      }

      const clientId = userClients[0].clientId;
      const favorite = await storage.addClientFavorite(req.params.id, userId, clientId);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/marketplace/:id/favorite", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.removeClientFavorite(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/marketplace/:id/favorite", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const isFavorite = await storage.isClientFavorite(req.params.id, userId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Client Invitation API
  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const invitations = await storage.getAllClientInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get("/api/invitations/client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const invitations = await storage.getClientInvitationsByClient(req.params.clientId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching client invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const parsed = createClientInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }

      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invitation = await storage.createClientInvitation(
        parsed.data.email,
        parsed.data.clientId,
        userId
      );

      // Get client name for the email
      const client = await storage.getClient(parsed.data.clientId);
      const clientName = client?.name || 'your organization';

      // Generate the full invite link - use production domain in production
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://solvity.ai'
        : `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
      const inviteLink = `${baseUrl}/accept-invite?token=${invitation.token}`;

      // Send invitation email
      const { subject, htmlBody, textBody } = generateInvitationEmail(clientName, inviteLink);
      const emailSent = await sendEmail({
        to: parsed.data.email,
        subject,
        htmlBody,
        textBody,
      });

      res.status(201).json({
        ...invitation,
        inviteLink: `/accept-invite?token=${invitation.token}`,
        emailSent,
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.delete("/api/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClientInvitation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // Public endpoint - verify invitation token
  app.get("/api/invitations/verify/:token", async (req, res) => {
    try {
      const invitation = await storage.getClientInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      const client = await storage.getClient(invitation.clientId);
      res.json({
        email: invitation.email,
        clientName: client?.name || "Unknown",
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error("Error verifying invitation:", error);
      res.status(500).json({ message: "Failed to verify invitation" });
    }
  });

  // Public endpoint - accept invitation and create account
  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const parsed = acceptInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }

      const { token, password, firstName, lastName } = parsed.data;

      // Get the invitation
      const invitation = await storage.getClientInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invitation.email);
      if (existingUser) {
        // Link existing user to client
        await storage.acceptClientInvitation(token, existingUser.id);
        return res.json({ message: "Account linked to client successfully", redirect: "/client-login" });
      }

      // Hash password and create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        email: invitation.email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      // Accept invitation (links user to client)
      await storage.acceptClientInvitation(token, newUser.id);

      res.status(201).json({ message: "Account created successfully", redirect: "/client-login" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Client login (separate from admin)
  app.post("/api/client-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is linked to at least one client
      const userClients = await storage.getUserClients(user.id);
      if (userClients.length === 0) {
        return res.status(403).json({ message: "You don't have access to any client accounts" });
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          isClient: true 
        });
      });
    } catch (error) {
      console.error("Error in client login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get use cases for client portal (only their assigned clients' use cases)
  app.get("/api/client-portal/use-cases", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userClients = await storage.getUserClients(userId);
      const clientIds = userClients.map(uc => uc.clientId);

      if (clientIds.length === 0) {
        return res.json([]);
      }

      const allUseCases = [];
      for (const clientId of clientIds) {
        const useCases = await storage.getUseCasesByClient(clientId);
        const client = await storage.getClient(clientId);
        allUseCases.push(...useCases.map(uc => ({ ...uc, clientName: client?.name })));
      }

      res.json(allUseCases);
    } catch (error) {
      console.error("Error fetching client portal use cases:", error);
      res.status(500).json({ message: "Failed to fetch use cases" });
    }
  });

  // Get clients linked to the current user (for client portal)
  app.get("/api/client-portal/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userClients = await storage.getUserClients(userId);
      const clients = await Promise.all(
        userClients.map(async (uc) => {
          const client = await storage.getClient(uc.clientId);
          return client;
        })
      );

      res.json(clients.filter(Boolean));
    } catch (error) {
      console.error("Error fetching client portal clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Client approval endpoint - update approval status and send email notification
  app.post("/api/client-portal/use-cases/:id/approval", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const useCaseId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsed = updateClientApprovalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid approval status", errors: parsed.error.errors });
      }

      const { status } = parsed.data;

      // Verify user is a client user (not admin/consultant) and has access to this use case
      const userClients = await storage.getUserClients(userId);
      const useCase = await storage.getUseCase(useCaseId);
      
      if (!useCase) {
        return res.status(404).json({ message: "Use case not found" });
      }

      // Check user has CLIENT role association with the use case's client
      const clientAssociation = userClients.find(uc => uc.clientId === useCase.clientId);
      if (!clientAssociation) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only CLIENT role users can submit approvals (not ADMIN/consultants)
      if (clientAssociation.role !== "CLIENT") {
        return res.status(403).json({ message: "Only client users can submit approvals" });
      }

      // Get client and user info for the email
      const client = await storage.getClient(useCase.clientId);
      const user = await storage.getUser(userId);

      if (!client || !user) {
        return res.status(404).json({ message: "Client or user not found" });
      }

      // Update the use case with approval status
      const updatedUseCase = await storage.updateUseCase(useCaseId, {
        clientApprovalStatus: status,
        clientApprovalAt: new Date(),
        clientApprovalUserId: userId,
      });

      // Get approver's display name
      const approverName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.email;

      // Send email notification to hello@solvity.ai
      const emailContent = generateApprovalEmail(
        useCase.title,
        client.name,
        status,
        approverName,
        user.email
      );

      await sendEmail({
        to: "hello@solvity.ai",
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        textBody: emailContent.textBody,
      });

      res.json({ 
        message: "Approval status updated successfully",
        useCase: updatedUseCase,
      });
    } catch (error) {
      console.error("Error updating client approval:", error);
      res.status(500).json({ message: "Failed to update approval status" });
    }
  });

  // Admin endpoint to seed marketplace templates (for production environment)
  app.post("/api/admin/seed-marketplace", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only allow admin/consultant users to seed marketplace
      // Admin/consultants have NO client associations - they manage the system
      // Any user with a client association (CLIENT or VIEWER role) is a client user
      const userClients = await storage.getUserClients(user.id);
      if (userClients.length > 0) {
        return res.status(403).json({ message: "Only consultants can seed marketplace data" });
      }

      // Check if marketplace already has templates
      const existingTemplates = await storage.getMarketplaceUseCases();
      if (existingTemplates.length > 0) {
        return res.json({ 
          message: "Marketplace already has templates",
          count: existingTemplates.length,
          skipped: true
        });
      }

      // Marketplace templates to seed
      const marketplaceTemplates = [
        {
          title: "Automated Appointment Reminders",
          description: "Send automated SMS/email reminders to patients 24-48 hours before appointments to reduce no-shows.",
          industryVertical: "Healthcare",
          scope: "Communications",
          department: "Admin",
          level: 2,
          goals: ["Efficiency", "Customer Retention", "Fewer Phone Calls"],
          riskRating: "Medium" as const,
          piiFlag: true,
          dataFlow: "VendorTools" as const,
          humanInLoop: "Optional" as const,
          storyToday: "Staff manually calls each patient the day before their appointment, spending hours on the phone leaving voicemails.",
          storyFuture: "1. System automatically pulls next-day appointments\n2. Personalized reminder messages are generated\n3. SMS/Email sent to patients automatically\n4. Confirmations and cancellations logged\n5. Staff notified of any issues",
          controls: ["HIPAA-compliant messaging", "Opt-out option included", "No sensitive details in messages", "Audit trail maintained"],
          tools: ["Twilio", "Practice Management System"],
          baselineMinutesPerRun: 120,
          frequencyPerWeek: 5,
          roiTimeSavedMinutesPerWeek: 500,
          roiDollarsPerMonth: 2500,
        },
        {
          title: "Social Media Content Scheduler",
          description: "Automatically generate and schedule engaging social media posts to maintain consistent online presence.",
          industryVertical: "Healthcare",
          scope: "Social",
          department: "Marketing",
          level: 2,
          goals: ["Leads", "Education", "Revenue Growth"],
          riskRating: "Low" as const,
          piiFlag: false,
          dataFlow: "VendorTools" as const,
          humanInLoop: "Optional" as const,
          storyToday: "Marketing team spends hours each week creating, designing, and scheduling social media content manually.",
          storyFuture: "1. Content calendar auto-generated from templates\n2. Stock images and graphics selected\n3. Posts scheduled for optimal times\n4. Staff reviews before publishing\n5. Analytics tracked automatically",
          controls: ["Brand guidelines enforced", "No medical advice", "Staff approval queue", "Content moderation"],
          tools: ["Buffer", "Canva", "Meta Business Suite"],
          baselineMinutesPerRun: 90,
          frequencyPerWeek: 2,
          roiTimeSavedMinutesPerWeek: 150,
          roiDollarsPerMonth: 750,
        },
        {
          title: "Invoice Processing Automation",
          description: "Automatically extract, validate, and process invoices from suppliers with minimal manual intervention.",
          industryVertical: "Finance",
          scope: "Operations",
          department: "Accounts Payable",
          level: 3,
          goals: ["Cost Savings", "Efficiency", "Compliance"],
          riskRating: "Medium" as const,
          piiFlag: false,
          dataFlow: "CloudLLM" as const,
          humanInLoop: "Required" as const,
          storyToday: "Staff manually enters invoice data, matches to POs, and routes for approval - prone to errors and delays.",
          storyFuture: "1. AI extracts data from invoice PDFs\n2. Automatic PO matching\n3. Discrepancies flagged for review\n4. Approval routing based on amount\n5. Integration with accounting system",
          controls: ["Human review for amounts over threshold", "Duplicate detection", "Audit trail", "Vendor verification"],
          tools: ["OCR Software", "Accounting System", "Approval Workflow"],
          baselineMinutesPerRun: 20,
          frequencyPerWeek: 50,
          roiTimeSavedMinutesPerWeek: 800,
          roiDollarsPerMonth: 4000,
        },
        {
          title: "Customer Inquiry Email Responder",
          description: "AI-powered email triage and response drafting for common customer inquiries.",
          industryVertical: "Retail",
          scope: "Email Marketing",
          department: "Customer Service",
          level: 3,
          goals: ["Efficiency", "Customer Retention", "Cost Savings"],
          riskRating: "Low" as const,
          piiFlag: true,
          dataFlow: "CloudLLM" as const,
          humanInLoop: "Required" as const,
          storyToday: "Customer service reps manually read, categorize, and respond to each email - often with repetitive answers.",
          storyFuture: "1. AI categorizes incoming emails\n2. Draft responses generated for common queries\n3. Staff reviews and personalizes responses\n4. Complex issues escalated to specialists\n5. Response templates continuously improved",
          controls: ["Human approval before sending", "Sentiment analysis for escalation", "PII protection", "Response quality monitoring"],
          tools: ["Gmail/Outlook", "ChatGPT API", "CRM System"],
          baselineMinutesPerRun: 10,
          frequencyPerWeek: 100,
          roiTimeSavedMinutesPerWeek: 600,
          roiDollarsPerMonth: 3000,
        },
        {
          title: "Patient Intake Form Digitization",
          description: "Convert paper-based patient intake to digital forms with automatic data entry into practice systems.",
          industryVertical: "Podiatry",
          scope: "Operations",
          department: "Front Desk",
          level: 1,
          goals: ["Efficiency", "Compliance", "Cost Savings"],
          riskRating: "High" as const,
          piiFlag: true,
          dataFlow: "LocalOnly" as const,
          humanInLoop: "Required" as const,
          storyToday: "Patients fill paper forms in waiting room. Staff manually enters data into systems, taking 15 minutes per patient.",
          storyFuture: "1. Patient receives digital form link before visit\n2. Form completed online with validation\n3. Staff reviews for accuracy\n4. Approved data syncs to PMS\n5. Digital consent signatures captured",
          controls: ["HIPAA-compliant storage", "Data encryption", "Staff verification", "Consent tracking", "Audit logs"],
          tools: ["JotForm", "Practice Management System"],
          baselineMinutesPerRun: 15,
          frequencyPerWeek: 20,
          roiTimeSavedMinutesPerWeek: 240,
          roiDollarsPerMonth: 1200,
        },
        {
          title: "Inventory Reorder Alerts",
          description: "Automated monitoring and alerts when inventory levels fall below reorder thresholds.",
          industryVertical: "Retail",
          scope: "Operations",
          department: "Operations",
          level: 2,
          goals: ["Efficiency", "Cost Savings", "Revenue Growth"],
          riskRating: "Low" as const,
          piiFlag: false,
          dataFlow: "VendorTools" as const,
          humanInLoop: "Optional" as const,
          storyToday: "Staff manually checks inventory levels weekly and creates purchase orders, often missing low-stock items.",
          storyFuture: "1. System monitors inventory in real-time\n2. Low stock triggers alerts\n3. Reorder recommendations generated\n4. Staff approves or adjusts orders\n5. POs sent to suppliers automatically",
          controls: ["Budget limits", "Preferred vendor rules", "Approval thresholds", "Historical demand analysis"],
          tools: ["Inventory System", "Slack/Email", "Supplier Portal"],
          baselineMinutesPerRun: 60,
          frequencyPerWeek: 3,
          roiTimeSavedMinutesPerWeek: 150,
          roiDollarsPerMonth: 750,
        },
        {
          title: "Meeting Notes and Action Items",
          description: "AI-powered transcription and extraction of action items from team meetings.",
          industryVertical: "Professional Services",
          scope: "Communications",
          department: "All Teams",
          level: 3,
          goals: ["Efficiency", "Compliance", "Education"],
          riskRating: "Medium" as const,
          piiFlag: false,
          dataFlow: "CloudLLM" as const,
          humanInLoop: "Optional" as const,
          storyToday: "Someone takes manual notes during meetings. Action items often get lost. No searchable record of decisions.",
          storyFuture: "1. Meeting recorded and transcribed\n2. AI extracts key decisions and action items\n3. Summary distributed to attendees\n4. Action items assigned with due dates\n5. Follow-up reminders sent automatically",
          controls: ["Recording consent required", "Confidential meeting handling", "Retention policies", "Access controls"],
          tools: ["Zoom/Teams", "Otter.ai", "Slack", "Task Manager"],
          baselineMinutesPerRun: 30,
          frequencyPerWeek: 10,
          roiTimeSavedMinutesPerWeek: 200,
          roiDollarsPerMonth: 1000,
        },
        {
          title: "Lead Qualification Chatbot",
          description: "Conversational AI to qualify website leads 24/7 and route hot prospects to sales.",
          industryVertical: "B2B Services",
          scope: "Social",
          department: "Sales",
          level: 3,
          goals: ["Leads", "Revenue Growth", "Efficiency"],
          riskRating: "Low" as const,
          piiFlag: true,
          dataFlow: "CloudLLM" as const,
          humanInLoop: "Required" as const,
          storyToday: "Website visitors fill contact forms. Sales reps manually qualify leads, many go cold before follow-up.",
          storyFuture: "1. Chatbot engages visitors in conversation\n2. Qualifying questions asked naturally\n3. Hot leads get instant meeting booking\n4. Warm leads added to nurture sequence\n5. Sales notified of high-priority prospects",
          controls: ["Human handoff for complex questions", "Data privacy notices", "Bot disclosure", "CRM integration"],
          tools: ["Intercom/Drift", "ChatGPT", "Calendly", "CRM"],
          baselineMinutesPerRun: 15,
          frequencyPerWeek: 30,
          roiTimeSavedMinutesPerWeek: 360,
          roiDollarsPerMonth: 1800,
        },
      ];

      // Insert each template
      let insertedCount = 0;
      for (const template of marketplaceTemplates) {
        await storage.createMarketplaceUseCase(template);
        insertedCount++;
      }

      res.json({ 
        message: "Marketplace templates seeded successfully",
        count: insertedCount 
      });
    } catch (error) {
      console.error("Error seeding marketplace:", error);
      res.status(500).json({ message: "Failed to seed marketplace templates" });
    }
  });

  return httpServer;
}
