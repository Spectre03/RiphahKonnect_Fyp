# Research Summary

**Project:** Riphah Connect — AI Study Partner Recommendations + UI Overhaul
**Date:** 2026-02-18

## Key Findings

### Stack
- Keep existing React 19 + Vite 7 + TailwindCSS v4 + Express + Prisma stack
- AI recommendations: pure JavaScript weighted Jaccard scoring (no ML library needed)
- Server caching: node-cache for recommendation results (15min TTL)
- Do NOT add shadcn/ui (v3→v4 compatibility issues with CSS-first config)
- Build custom UI components with existing clsx + tailwind-merge

### Table Stakes
- Card-based social feed layout with post type badges
- Match explanation tags on recommendations ("3 shared courses", "Same department")
- Profile completeness prompt for AI to work
- Course CRUD on profile (foundation for all matching)
- Responsive layouts fixing current overflow/overlap bugs
- Wider sidebar with clear active states

### Architecture
- Recommendation: new controller + route following existing Express pattern
- Pre-filter by department, score top candidates, cache results
- UI components: reusable primitives in `components/ui/`, then page-specific
- Build order: primitives → layout → feed → profile+courses → recommendation backend → recommendation frontend → other pages

### Watch Out For
- **Overflow/overlap bugs** (current): missing overflow-hidden, fixed widths, no min-w-0 on flex children
- **Cold start**: users with empty profiles get no recommendations — need fallback + prompt
- **Scope creep**: fix layout across all pages first, then polish one at a time
- **TailwindCSS v4**: CSS-first config, don't use v3 plugins/tools
- **Form layout bugs**: events/posts forms overflowing — constrain with max-w, space-y

## Recommendations for Roadmap

1. Start with UI primitives (Card, Button, Badge, Input, Modal)
2. Fix core layout (sidebar, page structure, responsive grid)
3. Overhaul feed page first (most visible, social media feel)
4. Profile page + course management (enables AI matching)
5. Build recommendation backend (scoring API + caching)
6. Build recommendation frontend (partner cards, explanations)
7. Polish remaining pages (groups, events, lost & found, messages)
