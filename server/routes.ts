import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertClientSchema, insertUseCaseSchema, storyGeneratorInputSchema, type StoryGeneratorOutput } from "@shared/schema";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

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

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

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

  return httpServer;
}
