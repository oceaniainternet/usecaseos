# Solvity

## Overview
Solvity.ai is an invite-only SaaS web application exclusively for Galaxis Consulting clients. The platform helps consultants create and manage "Use Case Story Cards" for their clients, tracking automation levels, risk assessments, ROI metrics, and workflow transformations across different industry verticals (e.g., Podiatry, Healthcare).

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Username/password with Passport.js local strategy
- **State Management**: TanStack React Query

## Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── routes.ts           # API endpoint definitions
│   ├── storage.ts          # Database operations
│   ├── db.ts               # Database connection
│   ├── seed.ts             # Database seeding script
│   └── replit_integrations/# Auth integration
├── shared/                 # Shared types and schemas
│   ├── schema.ts           # Drizzle schema & types
│   └── models/             # Auth models
└── migrations/             # Database migrations
```

## Data Model

### Clients
- id, name, industryVertical, createdAt

### Use Cases
- id, clientId, title, industryVertical, department
- level (1-3): Tool-assisted / No-code automation / AI embedded
- status: Proposed, Approved, Building, Live, Optimising, Paused
- riskRating: None, Low, Medium, High
- piiFlag: boolean (contains personal data)
- dataFlow: LocalOnly, VendorTools, CloudLLM
- humanInLoop: Required, Optional, None
- storyToday, storyFuture (workflow descriptions)
- personaStory (auto-generated narrative with real-world personas)
- controls (guardrails array)
- tools (tools used array)
- ROI metrics: baselineMinutesPerRun, frequencyPerWeek, roiTimeSavedMinutesPerWeek, roiDollarsPerMonth
- priorityOrder (for drag-and-drop ordering)

### Use Case Notes
- id, useCaseId, userId, content, createdAt, updatedAt
- Enables collaboration between clients and consultants on each use case

## API Endpoints
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create a client
- `GET /api/clients/:id` - Get single client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/use-cases` - List all use cases
- `POST /api/use-cases` - Create a use case
- `GET /api/use-cases/:id` - Get single use case
- `PATCH /api/use-cases/:id` - Update use case
- `DELETE /api/use-cases/:id` - Delete use case
- `POST /api/use-cases/reorder` - Update priority order
- `GET /api/use-cases/:id/notes` - Get notes for a use case
- `POST /api/use-cases/:id/notes` - Create a note (body: {content})
- `PATCH /api/use-case-notes/:noteId` - Update a note
- `DELETE /api/use-case-notes/:noteId` - Delete a note
- `POST /api/story-generate` - Generate story content (template-based)

## Authentication
Uses username/password authentication with Passport.js local strategy. Routes:
- `POST /api/register` - Create new account (body: {email, password, firstName?, lastName?})
- `POST /api/login` - Login (body: {email, password})
- `POST /api/logout` - Logout current session
- `GET /api/user` - Get current authenticated user
- `POST /api/forgot-password` - Request password reset email (body: {email})
- `POST /api/reset-password` - Complete password reset (body: {token, password})

All API endpoints (except auth) require authentication via `isAuthenticated` middleware.

Test user: phillipb@oceaniainternet.com.au / 123abcd (consultant)
Test user: phillip@onelane.com.au / 123abcd (client)

## Features

### Dashboard (/dashboard)
- Grid of use case cards with key metrics
- Filters: Level, Status, Risk Rating, PII Only
- Stats: Total use cases, Live count, Time saved, Monthly ROI
- Cards show: Title, Level badge, Status badge, Risk badge, PII indicator, ROI summary
- **Score Badge**: Each card displays a prominent score (0-100) in a circle in the upper right corner

### Use Case Score Calculation
The score is calculated based on five criteria (max 100 points):
- **ROI/Savings** (0-30 points): $1000+/mo = 30pts, $500+ = 22pts, $100+ = 12pts
- **Ease of Implementation** (0-20 points): Level 1 = 20pts, Level 2 = 12pts, Level 3 = 5pts
- **Risk Level** (0-15 points): None = 15pts, Low = 12pts, Medium = 6pts, High = 2pts
- **Time Savings** (0-15 points): 120+ min/wk = 15pts, 60+ = 12pts, 30+ = 8pts
- **Goals** (0-20 points): 4+ goals = 20pts, 3 goals = 15pts, 2 goals = 10pts, 1 goal = 5pts

Score colors: Green (80+), Emerald (60-79), Amber (40-59), Orange (20-39), Red (<20)

### Use Case Goals (Multi-Select)
Goals help categorize what each use case aims to achieve:
- Leads, Fewer Phone Calls, Education, Cost Savings, Customer Retention, Efficiency, Compliance, Revenue Growth, Other

### Use Case Detail (/use-cases/:id)
Five tabs:
1. **Overview**: Details, level, status, department, tools + **Value Wheel**
2. **Story Mode**: Persona story narrative + Current workflow vs Future automated workflow
3. **Risk & Trust**: Risk rating, PII flag, data flow, human-in-loop, controls
4. **ROI**: Baseline time, time saved, estimated monthly value
5. **Notes**: Collaboration notes between clients and consultants (add, view, delete notes)

### Client Approval (Client Portal)
Located on client use case detail pages, allows clients to communicate their decision:
- **Approve** (green) - Client wants to proceed with the use case
- **Needs Discussion** (amber) - Client has questions and wants to discuss further
- **Not Now** (gray) - Client wants to defer this use case for later

When a client clicks any approval button:
- Use case is updated with clientApprovalStatus, timestamp, and user ID
- Email notification is sent to hello@solvity.ai with use case details and client decision
- Only CLIENT role users can submit approvals (not admins/consultants)

### Value Wheel (Interactive Business Value Visualization)
Located on the Overview tab, the Value Wheel shows how the use case drives business outcomes:
- **Time Savings**: Minutes/hours saved weekly based on ROI metrics
- **Cost Reduction**: Monthly dollar savings and annual projections
- **Consistency**: Quality improvements based on automation level
- **Risk Mitigation**: Active controls and human oversight status
- **Compliance**: PII handling and data flow compliance posture
- **Scalability**: Volume capacity based on frequency metrics

Interactive features:
- Hover over nodes to see quick value summaries
- Click nodes to pin the detail panel open
- Detail panel shows contextual explanations derived from use case data

### Marketplace (/marketplace)
Discover and clone proven use case templates to your dashboard:
- **Template Library**: 8+ pre-built use case examples across industries
- **Industry Filter**: Filter by Healthcare, Finance, Retail, B2B Services, etc.
- **Star Ratings**: Rate use cases (1-5 stars) - ratings are cross-account
- **Clone to Dashboard**: Add any template to your account with one click
- **Usage Stats**: See how many times each template has been cloned

Cloned use cases:
- Appear in your Dashboard with status "Proposed"
- Are fully editable - customize for your specific needs
- Maintain all ROI metrics and workflow details from template

### Admin Panel (/admin)
- **Clients Tab**: Create/view clients
- **Use Cases Tab**: Create/view/edit use cases with story generator

### Story Generator
**Claude AI-powered generation** (Claude Sonnet 4.5 via Replit AI Integrations) for:
- **Persona Story**: Rich narrative using real-world names and industry-specific language
  - Podiatry pilot: Uses personas like Dr. Sarah Mitchell, Karen (Practice Manager), Mrs. Henderson (patient)
  - Includes podiatry terminology: diabetic foot assessment, orthotics, wound care
  - Adapts narrative style based on automation level (1, 2, or 3)
- Current workflow description (storyToday)
- Future automated workflow steps (storyFuture)
- Controls/guardrails (with healthcare-specific safeguards)

**Customer Frustrations Context** (collapsible field near Generate Story button):
- Add real customer quotes/pain points (e.g., "This is a huge distraction when we get an Instagram message")
- Claude incorporates these frustrations into the narrative with matching language and emotional tone
- Makes stories more authentic and relatable for client presentations

**Manual Input Mode** (checkbox above Current Workflow field):
- Check "Manual input (AI will enhance grammar only)" to preserve your own workflow description
- When checked: AI only fixes spelling, grammar, and punctuation while preserving your meaning
- When unchecked (default): AI generates the Current Workflow description from scratch
- Useful for capturing the exact current state as described by the client

Falls back to template-based generation if AI is unavailable.

## Seed Data
Includes 5 podiatry use case examples:
1. Upload email list into Mailchimp (Level 1, Live)
2. Generate and schedule FB posts (Level 2, Building)
3. Instagram DM auto-responder (Level 3, High Risk, Proposed)
4. Patient appointment reminder calls (Level 2, Live)
5. Patient intake form digitization (Level 1, High Risk, Approved)

## Healthcare Disclaimer
The application includes guardrails and disclaimers for healthcare verticals:
- No medical diagnosis or clinical recommendations
- Human oversight required for clinical questions
- HIPAA-compliant data handling controls

## Running the Project
```bash
# Start development server
npm run dev

# Push database schema
npm run db:push

# Seed database
npx tsx server/seed.ts
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit app ID (auto-provided)
- `ISSUER_URL` - OIDC issuer URL (auto-provided)
