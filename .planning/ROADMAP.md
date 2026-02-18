# Roadmap: Riphah Connect

## Overview

This is a UI overhaul of an existing, fully functional university collaboration platform. All backend APIs are complete. The work transforms broken, overflowing layouts into a polished, card-based social media experience — then adds one new feature (AI study partner recommendations). The roadmap moves from shared primitives outward to full pages, building the AI feature once its profile data foundation exists, and finishing with a responsive design pass across the whole app.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: UI Primitives** - Build the reusable component library that every page depends on
- [ ] **Phase 2: Layout & Navigation** - Fix the page shell: sidebar, content area, overflow bugs
- [ ] **Phase 3: Feed Page** - Redesign the most visible page with social media card layout
- [ ] **Phase 4: Profile Page** - Overhaul profile and add course management for AI matching
- [ ] **Phase 5: Secondary Pages** - Fix Groups, Events, Lost & Found, and Messaging pages
- [ ] **Phase 6: AI Recommendations** - Build the study partner matching backend and frontend
- [ ] **Phase 7: Responsive Design** - Final responsive pass across all pages at mobile widths

## Phase Details

### Phase 1: UI Primitives
**Goal**: A shared component library exists that any page can import — eliminating redundant inline styles and making the whole app visually consistent
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. A Card component renders with consistent shadow, border-radius, and padding anywhere it is used
  2. Button renders in primary, secondary, and danger variants with visible style differences
  3. Badge renders with appropriate color for post types, match strength, and status indicators
  4. Input and Textarea components render with consistent sizing, labels, and focus states
  5. Modal renders centered with proper z-index, overlay, and close behavior on all pages
**Plans**: TBD

Plans:
- [ ] 01-01: Build Card, Button, Badge primitives
- [ ] 01-02: Build Input, Textarea, Modal, Avatar primitives

---

### Phase 2: Layout & Navigation
**Goal**: The app shell is correct — sidebar is wide and navigable, content areas don't overflow, and the three-column structure is in place on every page
**Depends on**: Phase 1
**Requirements**: LAY-01, LAY-02, LAY-03, LAY-04, LAY-05
**Success Criteria** (what must be TRUE):
  1. Sidebar is visibly wider (w-64), highlights the active page, and does not collapse content
  2. On small screens, sidebar collapses and a hamburger button opens it as a drawer
  3. Every page follows the sidebar + scrollable center + optional right panel structure
  4. No text overflows its container or overlaps other elements on any page
**Plans**: TBD

Plans:
- [ ] 02-01: Redesign sidebar (width, active states, flex-shrink-0)
- [ ] 02-02: Implement responsive layout shell and fix overflow bugs across all pages

---

### Phase 3: Feed Page
**Goal**: The feed page looks and feels like a social media app — posts are scannable cards with clear authorship, type, and actions
**Depends on**: Phase 2
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, FEED-06, FEED-07
**Success Criteria** (what must be TRUE):
  1. Each post renders as a card with avatar, name, department, timestamp, content, and an action bar
  2. Post type (General, Question, Resource, Announcement) is visibly badged with distinct colors
  3. User can filter the feed by post type using tab controls that update the visible list
  4. Like button animates on click and shows the current count
  5. Create post form is fully contained within its card and does not overflow the page
**Plans**: TBD

Plans:
- [ ] 03-01: Redesign post cards (avatar, metadata, badges, action bar)
- [ ] 03-02: Build create-post form, filter tabs, and comment section

---

### Phase 4: Profile Page
**Goal**: The profile page clearly presents a user's academic identity and lets them manage the course data the AI recommendation system requires
**Depends on**: Phase 3
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):
  1. Profile header shows avatar, name, department, semester, and bio in a clean layout
  2. Skills and interests are displayed as styled tag badges (not plain text)
  3. User can add and remove enrolled courses from their profile in edit mode
  4. User's posts appear below their profile info using the same card style as the feed
  5. When profile data is sparse (no courses, skills, or interests), a completeness prompt is visible
**Plans**: TBD

Plans:
- [ ] 04-01: Redesign profile header, skills/interests badges, completeness prompt
- [ ] 04-02: Build course management (add/remove courses in edit mode) and user post list

---

### Phase 5: Secondary Pages
**Goal**: Groups, Events, Lost & Found, and Messaging pages all use the card layout with working, non-overflowing forms and controls
**Depends on**: Phase 2
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, EVT-01, EVT-02, EVT-03, EVT-04, LF-01, LF-02, LF-03, LF-04, MSG-01, MSG-02, MSG-03, MSG-04
**Success Criteria** (what must be TRUE):
  1. Study Groups: group cards are consistent, search and filter controls do not overlap, group detail page is legible
  2. Events: event cards show a date highlight, RSVP controls are a styled segmented button, create event form does not overflow
  3. Lost & Found: item cards show a category badge and status indicator, filter controls are properly aligned
  4. Messaging: conversation list is readable, message bubbles are correctly aligned for own vs. other, chat input is fixed at the bottom without overlapping messages
**Plans**: TBD

Plans:
- [ ] 05-01: Redesign Study Groups page (cards, search, detail view, create form)
- [ ] 05-02: Redesign Events page (cards, RSVP controls, create form)
- [ ] 05-03: Redesign Lost & Found page (cards, filters, create form, resolve button)
- [ ] 05-04: Redesign Messaging page (conversation list, bubbles, fixed input, new conversation flow)

---

### Phase 6: AI Recommendations
**Goal**: Users can discover suggested study partners based on their academic profile, with transparent explanations of why each match was suggested
**Depends on**: Phase 4
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08
**Success Criteria** (what must be TRUE):
  1. The recommendations API returns ranked study partner matches with scores and explanation data
  2. Recommended partners appear as cards showing match strength badge and explanation tags (e.g., "Same department", "3 shared courses")
  3. Recommendation results for a user are cached and served quickly on repeat visits without re-computing
  4. User can click View Profile or Send Message directly from a recommendation card
  5. When profile data is insufficient for matching, user sees a prompt to complete their profile instead of an empty or broken state
**Plans**: TBD

Plans:
- [ ] 06-01: Build recommendation backend (controller, route, weighted scoring, node-cache)
- [ ] 06-02: Build recommendation frontend (partner cards, match badges, explanation tags, quick actions, completeness prompt)

---

### Phase 7: Responsive Design
**Goal**: Every page is fully functional and readable on a 320px mobile screen without horizontal scroll or broken layouts
**Depends on**: Phase 5, Phase 6
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04
**Success Criteria** (what must be TRUE):
  1. All pages display without horizontal overflow at 320px viewport width
  2. All forms switch to single-column layout on mobile
  3. Card grids stack vertically on mobile and display as a grid on desktop
  4. Modals fit within the mobile viewport without clipping or scrolling off screen
**Plans**: TBD

Plans:
- [ ] 07-01: Responsive pass — all pages at 320px (overflow, single-column forms, card stacking, modal sizing)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7
(Note: Phase 5 depends on Phase 2 but can begin after Phase 2 completes, in parallel with Phases 3-4 if desired)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Primitives | 0/2 | Not started | - |
| 2. Layout & Navigation | 0/2 | Not started | - |
| 3. Feed Page | 0/2 | Not started | - |
| 4. Profile Page | 0/2 | Not started | - |
| 5. Secondary Pages | 0/4 | Not started | - |
| 6. AI Recommendations | 0/2 | Not started | - |
| 7. Responsive Design | 0/1 | Not started | - |
