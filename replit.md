# Solvity

## Overview
Solvity.ai is an invite-only SaaS web application for Galaxis Consulting clients. It enables consultants to create, manage, and track "Use Case Story Cards" across various industry verticals. The platform facilitates the assessment of automation levels, risk, ROI, and workflow transformations for client projects. Solvity aims to streamline the consulting process by providing structured tools for use case definition, collaboration, and client approval, enhancing efficiency and communication in automation solution development.

## User Preferences
I prefer iterative development with a focus on delivering core features first. When making changes, please explain the reasoning and potential impact. Ask before making major architectural changes or introducing new dependencies. I prefer clear and concise communication.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Tailwind CSS, and shadcn/ui for a modern and responsive user interface. Key UI elements include a dashboard with use case cards, a Kanban board for status management, and an interactive Value Wheel for visualizing business outcomes. Color schemes for scores and approval statuses are used to convey information quickly (Green, Emerald, Amber, Orange, Red).

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, TanStack React Query.
- **Backend**: Express.js, Node.js.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema management and migrations.
- **Authentication**: Passport.js local strategy for username/password authentication, including account registration, login, logout, and password reset functionalities. All sensitive operations are secured with `isAuthenticated` middleware.
- **Data Model**: Core entities include Clients, Use Cases (with detailed metrics like automation level, risk, ROI, PII flags, workflow stories), Use Case Notes for collaboration, User Clients for team membership, and Client Invitations for onboarding.
- **Features**:
    - **Dashboard**: Displays use case cards with key metrics, filters, and overall project statistics.
    - **Use Case Scoring**: A calculated score (0-100) based on ROI, ease of implementation, risk, time savings, and goal achievement, with corresponding color indicators.
    - **Use Case Detail**: Comprehensive view across five tabs: Overview (including Value Wheel), Story Mode, Risk & Trust, ROI, and Notes.
    - **Client Approval**: A client portal feature allowing clients to approve, discuss, or defer use cases, triggering email notifications.
    - **Kanban Board**: Integrated into the client dashboard for visual, drag-and-drop management of use case statuses with real-time updates.
    - **Value Wheel**: An interactive visualization on the use case overview to demonstrate business value across multiple dimensions (time savings, cost reduction, consistency, risk mitigation, compliance, scalability).
    - **Marketplace**: A library of clonable use case templates with industry filters and star ratings.
    - **Team Management**: Admin-controlled invitation and role management for client organizations, defining access levels (Admin, Adoption Lead, Use Case Owner, Pilot User, Observer).
    - **Admin Panel**: Provides an interface for consultants to manage clients and use cases.
    - **Story Generator**: Utilizes Claude AI (via Replit AI Integrations) to generate rich persona stories, current/future workflow descriptions, and guardrails. It incorporates "customer frustrations" for authenticity and supports manual input with AI grammar enhancement.
    - **Solvy AI Assistant**: A multi-tenant, workspace-scoped AI assistant with role-based permissions. It offers three chat modes: "Draft Solution Brief," "Explore Ideas," and "Query Company Data" (RAG with source citations from uploaded documents). It generates structured solution briefs and manages data sources.

### System Design Choices
- **Modular Architecture**: Project is divided into `client`, `server`, and `shared` directories for clear separation of concerns.
- **API-driven**: A comprehensive set of RESTful API endpoints for managing all data entities and functionalities, secured with authentication middleware.
- **Real-time Updates**: Kanban board uses secure API calls for immediate status synchronization.
- **AI Integration**: Strategic use of Claude AI for content generation (stories, workflows) and Solvy AI for assistant functionalities, enhancing automation and insight generation.
- **Security**: Implemented rate limiting, workspace-scoped queries with role checks, and audit logging for Solvy AI. Privacy-by-default for Solvy chats and briefs.

## External Dependencies
- **PostgreSQL**: Relational database for all application data.
- **Claude AI**: Used for AI-powered story and workflow generation within the Story Generator feature (via Replit AI Integrations).
- **@hello-pangea/dnd**: Library used for drag-and-drop functionality in the Kanban board.
- **Replit AI Integrations**: Platform for integrating AI models like Claude.