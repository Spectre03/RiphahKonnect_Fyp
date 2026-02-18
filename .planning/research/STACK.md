# Technology Stack Research

**Project:** Riphah Connect — AI Study Partner Recommendations + UI Overhaul
**Researched:** 2026-02-18

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| React | 19.2.0 | UI framework |
| Vite | 7.3.1 | Build tool |
| TailwindCSS | 4.1.0 (CSS-first via @tailwindcss/vite) | Styling |
| Express.js | 4.21.2 | API server |
| Prisma | 6.4.1 | ORM |
| Supabase PostgreSQL | hosted | Database |
| Socket.io | 4.8.1 | Real-time messaging |
| TanStack Query | 5.66.0 | Server state/caching |
| react-router-dom | 7.5.0 | Routing |
| react-hook-form | 7.54.2 | Form state |
| lucide-react | 0.474.0 | Icons |
| clsx + tailwind-merge | 2.1.1 / 3.0.2 | Class utilities |

**Critical:** TailwindCSS v4 uses CSS-first config (`@import "tailwindcss"` in index.css). NOT compatible with v3 `tailwind.config.js`-based tools.

## Recommended Additions

### AI Recommendation — Server Side

**Custom JS algorithm (no external ML library)**
- Schema already has all signals: `department`, `semester`, `skills[]`, `interests[]`, `UserCourse`, `GroupMember`
- Weighted Jaccard similarity — 50-80 lines of JS, runs in milliseconds
- Algorithm: department_match(30) + semester_proximity(20) + skill_overlap(25) + interest_overlap(15) + shared_groups(5) + activity(5)
- Confidence: HIGH

**Caching: `node-cache` ^5.x** (server)
- In-process TTL cache, zero dependencies
- Cache recommendations per user for 15 minutes
- Why not Redis: overkill for single-instance FYP

### UI — Frontend

**Custom component library (NOT shadcn/ui)**
- shadcn/ui has v3→v4 migration issues with CSS-first config
- Project already has clsx + tailwind-merge (same primitives)
- Build components in `client/src/components/ui/`
- Confidence: MEDIUM

**Optional additions:**
- `framer-motion` ^11.x — page transitions, list animations, AnimatePresence
- `date-fns` ^4.x — tree-shakeable date formatting (replace custom timeAgo)
- `recharts` ^2.x — radar/bar chart for recommendation score visualization (optional)

### Backend — No New Frameworks

- New `recommendationController.js` + `recommendationRoutes.js` following existing Express pattern
- No Python microservice needed

## Rejected Alternatives

| Recommended | Rejected | Why |
|-------------|----------|-----|
| Custom JS algorithm | Python FastAPI + scikit-learn | Two-process architecture, overkill |
| Custom JS algorithm | OpenAI embeddings API | Cost, latency, external dependency |
| Custom TW v4 components | shadcn/ui | v3→v4 migration friction |
| Custom TW v4 components | Chakra UI / MUI | CSS-in-JS conflicts with TailwindCSS |
| node-cache | Redis | Requires separate server |
