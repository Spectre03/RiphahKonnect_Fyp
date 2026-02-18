# Riphah Connect

## What This Is

A university-specific academic collaboration platform for Riphah International University students and faculty. It combines a social feed, study groups, campus events, lost & found, and real-time messaging into one app — restricted to Riphah email domains. Built as a Final Year Project (FYP).

## Core Value

Students can connect, collaborate, and stay informed about campus life through a single, well-designed platform that feels like a social media app.

## Requirements

### Validated

- ✓ User authentication with Riphah email restriction — existing
- ✓ Password reset flow — existing
- ✓ Academic feed with posts, likes, comments — existing
- ✓ Study groups with join/leave, group posts — existing
- ✓ Campus events with RSVP system — existing
- ✓ Lost & Found with categories and status — existing
- ✓ Real-time messaging via Socket.io — existing
- ✓ User profiles with search and discovery — existing
- ✓ Protected routes and JWT auth — existing
- ✓ Sidebar navigation — existing
- ✓ REST API with validation, rate limiting, error handling — existing

### Active

- [ ] Fix overlapping text and overflowing input fields across all pages
- [ ] Redesign UI with social media card-based layout (Facebook/LinkedIn feel)
- [ ] Fix messaging page layout issues
- [ ] Fix study groups page — search and options overlapping
- [ ] Fix events page — add event form overflowing sections
- [ ] Widen and improve sidebar design
- [ ] Ensure responsive layouts across all pages
- [ ] Polish all forms, modals, and interactive elements
- [ ] Consistent spacing, typography, and component sizing
- [ ] AI-based study partner recommendation system

### Out of Scope

- Mobile native app — web-only for FYP
- Email verification flow — auto-verified on registration
- OAuth/social login — email/password sufficient
- Admin dashboard — not required for FYP submission
- AI-powered recommendations — UserCourse model exists but feature deferred
- Deployment/hosting — focus on local development for now

## Context

- This is a **brownfield** project — all backend APIs and frontend pages exist but the UI has significant layout issues
- Backend is **complete and functional** — 7 route modules, 7 controllers, full middleware stack
- Frontend has **all 13 pages** built but with broken layouts: overlapping text, overflowing inputs, cramped sidebar
- Tech stack: React 19 + Vite 7 + TailwindCSS 4 (frontend), Express.js + Prisma + Supabase PostgreSQL (backend)
- Real-time messaging works via Socket.io
- The primary work ahead is a **comprehensive UI overhaul** to make everything look polished and professional
- Target aesthetic: social media feel with card-based layouts, clean spacing, proper form design

## Constraints

- **Tech stack**: Must keep React + Vite + TailwindCSS + Express.js — no framework changes
- **Timeline**: FYP project, needs to look polished for presentation
- **Email domains**: Only @riphah.edu.pk and @students.riphah.edu.pk allowed
- **Backend**: No backend changes needed — API is complete
- **Styling**: TailwindCSS only — no additional CSS frameworks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Social media card-based UI | Familiar UX for university students, matches platform purpose | — Pending |
| UI-only focus for remaining work | All features functional, presentation is the gap | — Pending |
| Keep existing component structure | Rebuild layouts in-place rather than restructuring | — Pending |
| TailwindCSS for all styling | Already in use, utility-first approach is fast for UI fixes | ✓ Good |

---
*Last updated: 2026-02-18 after initialization*
