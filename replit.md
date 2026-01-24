# UseCaseOS

## Overview
UseCaseOS is a SaaS web application that helps consultants create and manage "Use Case Story Cards" for their clients. The app tracks automation levels, risk assessments, ROI metrics, and workflow transformations across different industry verticals (e.g., Podiatry, Healthcare).

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
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
- controls (guardrails array)
- tools (tools used array)
- ROI metrics: baselineMinutesPerRun, frequencyPerWeek, roiTimeSavedMinutesPerWeek, roiDollarsPerMonth
- priorityOrder (for drag-and-drop ordering)

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
- `POST /api/story-generate` - Generate story content (template-based)

## Authentication
Uses Replit Auth with OIDC. Routes:
- `/api/login` - Begin login flow
- `/api/logout` - Begin logout flow
- `/api/auth/user` - Get current user (protected)

All API endpoints (except auth) require authentication via `isAuthenticated` middleware.

## Features

### Dashboard (/dashboard)
- Grid of use case cards with key metrics
- Filters: Level, Status, Risk Rating, PII Only
- Stats: Total use cases, Live count, Time saved, Monthly ROI
- Cards show: Title, Level badge, Status badge, Risk badge, PII indicator, ROI summary

### Use Case Detail (/use-cases/:id)
Four tabs:
1. **Overview**: Details, level, status, department, tools
2. **Story Mode**: Current workflow vs Future automated workflow
3. **Risk & Trust**: Risk rating, PII flag, data flow, human-in-loop, controls
4. **ROI**: Baseline time, time saved, estimated monthly value

### Admin Panel (/admin)
- **Clients Tab**: Create/view clients
- **Use Cases Tab**: Create/view use cases with story generator

### Story Generator
Template-based generation (no LLM required) for:
- Current workflow description
- Future automated workflow steps
- Controls/guardrails (with healthcare-specific safeguards)

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
