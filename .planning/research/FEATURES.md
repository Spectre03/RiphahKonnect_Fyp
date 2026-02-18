# Feature Landscape

**Domain:** University Academic Collaboration Platform
**Researched:** 2026-02-18
**Scope:** AI Study Partner Matching + Comprehensive UI Overhaul

## Already Built (Preserve, Don't Rebuild)

| Module | Status |
|--------|--------|
| Auth (register, login, JWT, password reset) | DONE |
| Posts feed (create, like, comment, delete) | DONE |
| Study groups (CRUD, join/leave, group posts) | DONE |
| Events (CRUD, RSVP) | DONE |
| Lost & Found (CRUD, resolve) | DONE |
| Messaging (conversations, Socket.io) | DONE |
| User profiles (edit, skills, interests, courses) | DONE |
| Sidebar navigation | DONE |

DB schema has: `User.skills[]`, `User.interests[]`, `User.department`, `User.semester`, `UserCourse`, `GroupMember` — all signals for matching.

## Table Stakes — UI

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Card-based post layout (avatar, name, dept, time, content, actions) | Low | PostCard exists — needs visual polish |
| Post type visual badges (Question/Resource/General/Announcement) | Low | PostType enum in DB, unused in UI |
| Infinite scroll or styled Load More | Low | Load More exists — style it |
| Timestamp with hover-to-full-date | Low | timeAgo exists — add title attribute |
| Like animation + count | Low | Already implemented — polish |
| Author avatar linking to profile | Low | Already done |
| Empty states with illustrations | Low | Basic empty state exists — upgrade |
| Sidebar with clear active state | Low | Exists — needs better visual treatment |
| Mobile-responsive sidebar | Medium | mobileOpen state exists — verify |
| Toast notifications standardized | Low | react-hot-toast used — standardize |
| Consistent brand color (teal-600) | Low | Already using teal |

## Table Stakes — AI Recommendations

| Feature | Complexity | Notes |
|---------|-----------|-------|
| "Suggested Study Partners" section | Low | Needs a surface — sidebar or dedicated page |
| Explanation for each match | Low | Score breakdown as tags ("Shares 3 courses") |
| Match strength badge (Strong/Good/Possible) | Low | Derive from score thresholds |
| Quick actions (Message, View Profile) | Low | Reuse existing components |
| Dismiss/refresh recommendations | Low | Hide for session |
| Profile completeness prompt | Low | Show when courses/department missing |
| Course management in profile edit | Low | UserCourse model exists — add CRUD UI |

## Differentiators

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Multi-signal weighted scoring algorithm | Medium | All signals in DB — implement in Node.js |
| Group-overlap signal in matching | Low | GroupMember table joinable |
| Activity-based signal (recent users ranked higher) | Low | Use updatedAt as proxy |
| Mutual interest/skill highlight | Low | Set intersection on arrays |
| Post type selector in create-post form | Low | PostType enum ready |
| Feed filter tabs (All/Questions/Resources) | Low | Pass type query param |
| Match strength on other users' profiles | Low | Reuse scoring |

## Anti-Features (Do NOT Build)

| Anti-Feature | Why |
|-------------|-----|
| External LLM/GPT API calls | Cost, latency, overkill for structured matching |
| Follower/following social graph | High complexity, not academic-focused |
| Real-time notification for recommendations | Not time-sensitive |
| ML feedback loop/embeddings | Beyond FYP scope |
| Ranked/algorithmic feed | Chronological + filter tabs sufficient |
| Dark mode | Doubles CSS testing effort for FYP |
| File uploads in posts/chat | multer/S3 not configured, scope risk |

## Feature Dependencies

```
Course CRUD on profile → AI matching → Suggested Partners section → Match badges on profiles
Post type selector → Feed filter tabs → "Answer" CTA on questions
Profile completeness prompt → Links to profile edit
```
