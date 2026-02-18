# Pitfalls Research

**Domain:** UI Overhaul + AI Recommendations for University Platform
**Researched:** 2026-02-18

## UI Overhaul Pitfalls

### 1. Breaking Existing Functionality During Redesign
**Risk:** HIGH
**Warning signs:** Features that worked before the overhaul stop working after
**Prevention:**
- Test each page after redesign before moving to next
- Keep API calls and data flow untouched — only change JSX/CSS
- Don't restructure component state while changing layout
**Phase:** All UI phases

### 2. TailwindCSS v4 CSS-First Gotchas
**Risk:** MEDIUM
**Warning signs:** Styles not applying, custom classes breaking, @apply not working
**Prevention:**
- v4 uses `@import "tailwindcss"` not `tailwind.config.js`
- Custom utilities defined in CSS (`@utility`), not config
- Existing `rc-card`, `rc-glass` classes in index.css are custom — preserve them
- Don't install v3-era TailwindCSS plugins
**Phase:** All UI phases

### 3. Overlapping/Overflow Issues (Current Problem)
**Risk:** HIGH — This is the existing bug
**Warning signs:** Text overlapping, inputs overflowing containers, content going off-screen
**Root causes found in codebase:**
- Missing `overflow-hidden` on card containers
- Fixed widths instead of responsive (`w-[400px]` vs `w-full max-w-md`)
- Missing `min-w-0` on flex children (flex items don't shrink below content)
- Absolute positioned elements without proper containment
**Prevention:**
- Use `overflow-hidden` on all card/container components
- Use `min-w-0` on all flex children that contain text
- Use `truncate` or `line-clamp-*` for text that might overflow
- Test at 320px, 768px, 1024px, 1440px widths
**Phase:** Phase 1 (core layout fixes)

### 4. Sidebar Width Issues
**Risk:** MEDIUM
**Warning signs:** Sidebar too narrow, text truncated, icons misaligned
**Prevention:**
- Set explicit min-width on sidebar (w-64 = 256px is standard)
- Use `flex-shrink-0` on sidebar to prevent compression
- Content area gets `flex-1 min-w-0` to fill remaining space
**Phase:** Phase 1 (layout)

### 5. Mobile Responsive Breakage
**Risk:** MEDIUM
**Warning signs:** Layout looks fine on desktop, broken on mobile
**Prevention:**
- Design mobile-first (base classes = mobile, add `md:` for desktop)
- Sidebar must collapse to drawer on mobile (mobileOpen state exists)
- Test hamburger menu toggle works
- Forms must be single-column on mobile
**Phase:** All phases

## AI Recommendation Pitfalls

### 6. Cold Start Problem (Empty Profiles)
**Risk:** HIGH
**Warning signs:** Recommendations return 0 matches or irrelevant matches
**Root cause:** Users haven't filled in courses, skills, or interests
**Prevention:**
- Show profile completeness prompt before recommendations
- Fallback to department + semester matching when profile data sparse
- Don't show recommendations section if user has <2 profile signals
- Show "Add your courses to get better matches" instead of empty state
**Phase:** Recommendation phase

### 7. Scoring All Users is Expensive
**Risk:** MEDIUM
**Warning signs:** Recommendation API takes >2 seconds with 500+ users
**Prevention:**
- Pre-filter by department first (WHERE department = user.department)
- Only score users active in last 90 days
- Cache results for 15 minutes (node-cache)
- Limit to top 20 results
**Phase:** Recommendation backend

### 8. Recommendation Staleness
**Risk:** LOW
**Warning signs:** Same recommendations shown for weeks
**Prevention:**
- Invalidate cache on profile update (courses, skills, interests change)
- Add small random factor to break ties
- Show "last updated" timestamp on recommendations
**Phase:** Recommendation backend

### 9. Non-Explainable Matches Kill Trust
**Risk:** HIGH
**Warning signs:** Users see recommendations but don't understand why
**Prevention:**
- Always show explanation tags: "Same department", "3 shared courses", "Both interested in Python"
- Show score breakdown (percentage or bar)
- Link each explanation to the shared attribute
**Phase:** Recommendation frontend

## General Development Pitfalls

### 10. Scope Creep During UI Polish
**Risk:** HIGH
**Warning signs:** "While I'm here, let me also add..." leading to unfinished pages
**Prevention:**
- Fix layout/overflow first across ALL pages
- Then polish one page at a time
- Don't add new features while fixing UI (except recommendations which is planned)
**Phase:** All phases

### 11. Inconsistent Design Language
**Risk:** MEDIUM
**Warning signs:** Different card styles, button sizes, spacing on different pages
**Prevention:**
- Build reusable UI primitives first (Card, Button, Badge, Input)
- All pages import from `components/ui/`
- Define spacing/color tokens once in CSS
**Phase:** Phase 1 (primitives)

### 12. Form Layout Bugs (Events, Posts, Groups)
**Risk:** HIGH — user reported events form overflowing
**Warning signs:** Form inputs extending beyond container, labels misaligned
**Prevention:**
- All forms use `max-w-2xl mx-auto` for centered constraint
- Input groups use `space-y-4` for consistent vertical spacing
- Labels above inputs (not inline) for mobile compatibility
- Textareas use `resize-none` to prevent user-caused overflow
**Phase:** Per-page UI overhaul
