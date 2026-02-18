# Requirements: Riphah Connect

**Defined:** 2026-02-18
**Core Value:** Students can connect, collaborate, and stay informed through a polished, social-media-style university platform

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### UI Primitives

- [ ] **UI-01**: Reusable Card component with consistent shadow, border-radius, padding across all pages
- [ ] **UI-02**: Reusable Button component with primary, secondary, and danger variants
- [ ] **UI-03**: Reusable Badge component for post types, match strength, and status indicators
- [ ] **UI-04**: Reusable Input and Textarea components with consistent sizing and labels
- [ ] **UI-05**: Reusable Modal component for create/edit forms and confirmations
- [ ] **UI-06**: Reusable Avatar component with gradient fallback for users without photos

### Layout & Navigation

- [ ] **LAY-01**: Sidebar widened to w-64 with clear active state highlighting and flex-shrink-0
- [ ] **LAY-02**: Sidebar collapses to mobile drawer with hamburger toggle on small screens
- [ ] **LAY-03**: Page layout structure: sidebar (left) + scrollable content area (center) + optional right panel
- [ ] **LAY-04**: All overflow/overlap bugs fixed — no text going outside containers on any page
- [ ] **LAY-05**: Consistent spacing and padding across all page layouts

### Feed Page

- [ ] **FEED-01**: Post cards redesigned with social media card layout (avatar, name, department, timestamp, content, action bar)
- [ ] **FEED-02**: Post type badge visible on each card (General, Question, Resource, Announcement) with color coding
- [ ] **FEED-03**: Post type selector in create-post form (segmented button or dropdown)
- [ ] **FEED-04**: Feed filter tabs to filter by post type (All, Questions, Resources, Announcements)
- [ ] **FEED-05**: Like button with smooth animation and count
- [ ] **FEED-06**: Styled comment section with proper nesting and spacing
- [ ] **FEED-07**: Create post form properly contained within its card/modal

### Profile Page

- [ ] **PROF-01**: Profile page redesigned with header section (avatar, name, department, semester, bio)
- [ ] **PROF-02**: Skills and interests displayed as styled tag badges
- [ ] **PROF-03**: Course management — user can add and remove enrolled courses in edit mode
- [ ] **PROF-04**: User's posts listed below profile info with same card style as feed
- [ ] **PROF-05**: Profile completeness indicator when courses/skills/interests are missing

### Study Groups Page

- [ ] **GRP-01**: Group cards redesigned with consistent card layout and proper spacing
- [ ] **GRP-02**: Search bar and filter options properly laid out without overlapping
- [ ] **GRP-03**: Group detail page with member list, group posts, and join/leave actions properly spaced
- [ ] **GRP-04**: Create group form contained within modal or properly constrained section

### Events Page

- [ ] **EVT-01**: Event cards redesigned with date highlight, title, description, RSVP count
- [ ] **EVT-02**: Create event form properly constrained (not overflowing sections)
- [ ] **EVT-03**: RSVP buttons (Going, Interested, Not Going) styled as segmented control
- [ ] **EVT-04**: Event filtering and sorting options properly aligned

### Lost & Found Page

- [ ] **LF-01**: Item cards redesigned with category badge, status indicator, and image preview
- [ ] **LF-02**: Filter controls (status, category, search) properly laid out
- [ ] **LF-03**: Create item form contained and responsive
- [ ] **LF-04**: Resolve button clearly visible on own items

### Messaging Page

- [ ] **MSG-01**: Conversation list with proper spacing and active conversation highlight
- [ ] **MSG-02**: Message bubbles with proper alignment (own vs other) and timestamps
- [ ] **MSG-03**: Chat input area fixed at bottom, not overlapping messages
- [ ] **MSG-04**: New conversation creation flow clean and accessible

### AI Recommendations

- [ ] **REC-01**: Recommendation API endpoint returns top study partner matches with scores and explanations
- [ ] **REC-02**: Weighted scoring algorithm using department, semester, courses, skills, interests, shared groups, and activity
- [ ] **REC-03**: Server-side caching of recommendation results (15min TTL, invalidate on profile update)
- [ ] **REC-04**: Recommendations section/page showing suggested study partners as cards
- [ ] **REC-05**: Each recommendation shows explanation tags ("Same department", "3 shared courses", "Both interested in Python")
- [ ] **REC-06**: Match strength badge on recommendations (Strong Match, Good Match, Possible Match)
- [ ] **REC-07**: Quick actions on recommendation cards (View Profile, Send Message)
- [ ] **REC-08**: Profile completeness prompt when profile data insufficient for matching

### Responsive Design

- [ ] **RESP-01**: All pages functional at 320px mobile width
- [ ] **RESP-02**: Forms switch to single-column on mobile
- [ ] **RESP-03**: Cards stack vertically on mobile, grid on desktop
- [ ] **RESP-04**: Modals fit within mobile viewport

## v2 Requirements

Deferred to future release.

### Enhancements
- **V2-01**: Framer-motion page transitions and list animations
- **V2-02**: Infinite scroll with virtual rendering on feed
- **V2-03**: Recommendation score visualization (radar/bar chart)
- **V2-04**: Suggested study groups based on enrolled courses
- **V2-05**: Post bookmarking/saving
- **V2-06**: Resource link preview cards
- **V2-07**: Dark mode

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend API changes | All existing endpoints working — don't touch |
| Database schema changes | Schema sufficient for all v1 features |
| External AI/LLM API calls | Cost, latency, overkill for weighted scoring |
| Follower/following system | High complexity, not academic-focused |
| Real-time notifications | Beyond FYP scope |
| File/image upload system | multer/S3 not configured, scope risk |
| OAuth/social login | Email/password sufficient |
| Admin dashboard | Not required for FYP |
| Dark mode | Doubles CSS effort |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 to UI-06 | Phase 1 | Pending |
| LAY-01 to LAY-05 | Phase 2 | Pending |
| FEED-01 to FEED-07 | Phase 3 | Pending |
| PROF-01 to PROF-05 | Phase 4 | Pending |
| GRP-01 to GRP-04 | Phase 5 | Pending |
| EVT-01 to EVT-04 | Phase 5 | Pending |
| LF-01 to LF-04 | Phase 5 | Pending |
| MSG-01 to MSG-04 | Phase 5 | Pending |
| REC-01 to REC-08 | Phase 6 | Pending |
| RESP-01 to RESP-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after initial definition*
