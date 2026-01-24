import { db } from "./db";
import { clients, useCases } from "@shared/schema";

const seedData = async () => {
  console.log("Seeding database...");

  // Create a sample podiatry client
  const [podiatryClient] = await db.insert(clients).values({
    name: "Sunshine Podiatry Clinic",
    industryVertical: "Podiatry",
  }).returning();

  console.log("Created client:", podiatryClient.name);

  // Create podiatry use cases
  const podiatryUseCases = [
    {
      clientId: podiatryClient.id,
      title: "Upload email list into Mailchimp",
      industryVertical: "Podiatry",
      department: "Marketing",
      level: 1,
      status: "Live" as const,
      riskRating: "Low" as const,
      piiFlag: true,
      dataFlow: "VendorTools" as const,
      humanInLoop: "Required" as const,
      storyToday: "Currently, the marketing assistant manually exports patient email addresses from the practice management system, removes duplicates in Excel, and uploads them to Mailchimp. This takes about 30 minutes each week and is prone to formatting errors.",
      storyFuture: "1. Staff triggers the sync from practice management system\n2. Tool exports and formats email addresses\n3. Duplicates are automatically removed\n4. Clean list is uploaded to Mailchimp\n5. Staff reviews the upload confirmation",
      controls: ["Redact patient health information", "Only email addresses exported", "Staff approval before upload", "Audit log maintained"],
      tools: ["Mailchimp", "Excel", "Zapier"],
      baselineMinutesPerRun: 30,
      frequencyPerWeek: 1,
      roiTimeSavedMinutesPerWeek: 25,
      roiDollarsPerMonth: 125,
      priorityOrder: 1,
    },
    {
      clientId: podiatryClient.id,
      title: "Generate and schedule Facebook posts",
      industryVertical: "Podiatry",
      department: "Marketing",
      level: 2,
      status: "Building" as const,
      riskRating: "Low" as const,
      piiFlag: false,
      dataFlow: "VendorTools" as const,
      humanInLoop: "Optional" as const,
      storyToday: "The office manager spends 2 hours weekly creating social media posts, finding stock images, and scheduling them on Facebook. Content often focuses on foot health tips and clinic promotions.",
      storyFuture: "1. Weekly content calendar is auto-generated based on templates\n2. Relevant stock images are selected automatically\n3. Posts are scheduled for optimal engagement times\n4. Staff receives preview notification for approval\n5. Posts go live after approval timeout",
      controls: ["No medical advice in posts", "Brand guidelines enforced", "Review queue for staff oversight", "No patient photos without consent"],
      tools: ["Meta Business Suite", "Canva", "Buffer"],
      baselineMinutesPerRun: 120,
      frequencyPerWeek: 1,
      roiTimeSavedMinutesPerWeek: 100,
      roiDollarsPerMonth: 500,
      priorityOrder: 2,
    },
    {
      clientId: podiatryClient.id,
      title: "Instagram DM auto-responder",
      industryVertical: "Podiatry",
      department: "Front Desk",
      level: 3,
      status: "Proposed" as const,
      riskRating: "High" as const,
      piiFlag: true,
      dataFlow: "CloudLLM" as const,
      humanInLoop: "Required" as const,
      storyToday: "Front desk staff manually responds to Instagram DMs during business hours. Many messages are simple appointment inquiries or location questions. Staff spends 45 minutes daily on these messages.",
      storyFuture: "1. AI monitors incoming Instagram DMs\n2. Message intent is classified automatically\n3. Simple queries (hours, location, services) get instant responses\n4. Appointment requests are routed to booking system\n5. Medical questions are escalated to human with disclaimer\n6. All conversations logged for audit",
      controls: ["No diagnosis or medical advice", "Immediate escalation for health questions", "Human review for appointment confirmations", "Clear bot disclosure in messages", "PII redacted before LLM processing", "Response templates pre-approved by clinic"],
      tools: ["Instagram API", "ChatGPT", "Zapier", "Practice Management System"],
      baselineMinutesPerRun: 45,
      frequencyPerWeek: 5,
      roiTimeSavedMinutesPerWeek: 180,
      roiDollarsPerMonth: 900,
      priorityOrder: 3,
    },
    {
      clientId: podiatryClient.id,
      title: "Patient appointment reminder calls",
      industryVertical: "Podiatry",
      department: "Admin",
      level: 2,
      status: "Live" as const,
      riskRating: "Medium" as const,
      piiFlag: true,
      dataFlow: "VendorTools" as const,
      humanInLoop: "None" as const,
      storyToday: "Admin staff manually calls patients 24 hours before their appointment to confirm. This takes about 3 hours per day and many calls go to voicemail.",
      storyFuture: "1. System pulls next-day appointments automatically\n2. Personalized reminder messages are generated\n3. Automated calls/SMS sent to patients\n4. Responses are logged and synced to calendar\n5. No-confirms are flagged for staff follow-up",
      controls: ["HIPAA-compliant messaging", "Opt-out respected", "No appointment details in voicemail", "Staff notified of cancellations"],
      tools: ["Twilio", "Practice Management System", "Google Calendar"],
      baselineMinutesPerRun: 180,
      frequencyPerWeek: 5,
      roiTimeSavedMinutesPerWeek: 750,
      roiDollarsPerMonth: 3750,
      priorityOrder: 4,
    },
    {
      clientId: podiatryClient.id,
      title: "Patient intake form digitization",
      industryVertical: "Podiatry",
      department: "Admin",
      level: 1,
      status: "Approved" as const,
      riskRating: "High" as const,
      piiFlag: true,
      dataFlow: "LocalOnly" as const,
      humanInLoop: "Required" as const,
      storyToday: "New patients fill out paper forms in the waiting room. Staff then manually enters this information into the practice management system, which takes 15 minutes per patient.",
      storyFuture: "1. Patient receives digital form link before appointment\n2. Form is completed online with validation\n3. Data is reviewed by staff for accuracy\n4. Approved data syncs to practice management system\n5. Patient signs consent digitally",
      controls: ["HIPAA-compliant storage", "Data encryption at rest", "Staff verification required", "Audit trail for all access", "Patient consent obtained"],
      tools: ["JotForm", "Practice Management System"],
      baselineMinutesPerRun: 15,
      frequencyPerWeek: 20,
      roiTimeSavedMinutesPerWeek: 200,
      roiDollarsPerMonth: 1000,
      priorityOrder: 5,
    },
  ];

  for (const useCase of podiatryUseCases) {
    await db.insert(useCases).values(useCase);
    console.log("Created use case:", useCase.title);
  }

  console.log("Seeding complete!");
};

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
