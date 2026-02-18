# Architecture Research

**Domain:** University Collaboration Platform — AI Recommendations + UI Overhaul
**Researched:** 2026-02-18

## Existing Architecture

Three-tier monorepo: React SPA → Express REST API → Supabase PostgreSQL via Prisma.

### Current Layers
- **Client** (`client/src/`): Pages, components, services, context, hooks
- **Server** (`server/src/`): Routes → Controllers → Prisma → DB
- **Data** (`prisma/schema.prisma`): 14 models with relationships
- **Real-time** (Socket.io): Messaging only

### Current Data Flow
1. Client → Axios (with JWT interceptor) → Express route
2. Route middleware (rate limit, helmet, CORS, validation, auth)
3. Controller → Prisma Client → PostgreSQL
4. Response → Client → React Query cache

## Recommendation System Integration

### New Components

**Backend:**
- `server/src/controllers/recommendationController.js` — scoring logic
- `server/src/routes/recommendationRoutes.js` — API endpoints
- `server/src/utils/scoring.js` — Jaccard similarity + weighted scoring functions
- In-memory cache layer (node-cache) for computed scores

**Frontend:**
- `client/src/pages/RecommendationsPage.jsx` OR sidebar widget
- `client/src/components/recommendations/` — PartnerCard, ScoreBreakdown, MatchBadge

### Recommendation Data Flow
1. `GET /api/recommendations/study-partners`
2. Check node-cache (TTL 15min)
3. If miss: Query all users with skills, interests, courses, groups
4. Compute weighted Jaccard scores against requesting user
5. Sort by score, return top 10-20 with explanation data
6. Cache result
7. Client renders partner cards with match explanations

### Key Decision: Server-Side Scoring
- Score computation in Express controller, NOT client-side
- Prisma `include` loads related data in one query batch
- ~50-80 lines of scoring logic, no external ML library
- Returns pre-computed scores + explanation tags to client

## UI Architecture for Overhaul

### Component Structure
```
client/src/components/
├── ui/                    # Reusable primitives (Card, Button, Badge, Input, Modal)
├── layout/                # Sidebar (existing), PageLayout, ContentArea
├── feed/                  # PostCard, PostForm, FeedFilters, PostTypeBadge
├── recommendations/       # PartnerCard, ScoreBreakdown, MatchBadge
├── groups/                # GroupCard, GroupForm, MemberList
├── events/                # EventCard, EventForm, RSVPButton
├── messaging/             # ConversationList, MessageBubble, ChatInput
├── profile/               # ProfileHeader, CourseManager, SkillsTags
└── shared/                # EmptyState, LoadMore, Avatar, SearchBar
```

### Layout Pattern
All authenticated pages share: Sidebar (left) + Content Area (center) + Optional Right Panel.
- Feed: posts center, recommendations right panel
- Groups/Events/LostFound: list/grid center
- Messages: conversation list left, chat center
- Profile: full width center

### State Management
- **Server state**: TanStack Query (already used) — add `useInfiniteQuery` for feeds
- **Auth state**: AuthContext (existing)
- **UI state**: Local component state (no global UI store needed)
- **Recommendation state**: TanStack Query with 15min staleTime matching server cache

## Build Order (Dependencies)

1. **UI primitives** (Card, Button, Badge, Input, Modal) — no dependencies
2. **Layout system** (Sidebar fix, PageLayout) — depends on #1
3. **Feed page overhaul** (PostCard, filters) — depends on #1, #2
4. **Profile page + Course CRUD** — depends on #1, #2
5. **Recommendation backend** (scoring, API) — depends on #4 (needs course data)
6. **Recommendation frontend** — depends on #1, #5
7. **Other pages** (Groups, Events, LostFound, Messages) — depends on #1, #2
