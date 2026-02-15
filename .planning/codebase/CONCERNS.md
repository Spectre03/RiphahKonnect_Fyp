# Codebase Concerns

**Analysis Date:** 2026-02-14

## Tech Debt

**Email Verification Disabled:**
- Issue: Email verification is bypassed at registration - users are auto-verified (isVerified: true) without email confirmation
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/authController.js:20-28`
- Impact: Security risk - anyone can register with any @riphah.edu.pk email without proof of ownership. Bypasses the entire verification token system that's already built.
- Fix approach: Remove `isVerified: true` hardcode, uncomment email sending logic in register endpoint, enforce verification check at login

**Console Logging Instead of Structured Logging:**
- Issue: No structured logging framework - only console.log/error throughout codebase
- Files:
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/app.js:65,77,83`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/middleware/errorHandler.js:2`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/authController.js:165`
- Impact: Difficult to debug production issues, no log levels/filtering, stack traces dumped to console
- Fix approach: Integrate winston or pino for structured logging with log levels, request IDs, and proper formatting

**No Environment Variable Validation:**
- Issue: No startup check for required env vars - server starts even if JWT_SECRET, DATABASE_URL missing
- Files:
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/utils/helpers.js:5-6`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/middleware/authenticate.js:12`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/services/emailService.js:4-9`
- Impact: Server crashes at runtime instead of startup, cryptic errors instead of clear validation messages
- Fix approach: Add env validation at startup using joi or zod to validate all required vars before server starts

**Inconsistent Error Response Format:**
- Issue: Error responses vary between `{error: string}` and `{error: string, details: array}` with no clear pattern
- Files:
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/middleware/errorHandler.js:4-25`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/middleware/validate.js:12-18`
- Impact: Frontend must handle multiple error formats, inconsistent UX
- Fix approach: Standardize to single error response shape across all endpoints

**Socket.io Authentication Missing:**
- Issue: Socket.io connections have no authentication - anyone can join conversation rooms
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/app.js:64-78`
- Impact: Major security hole - users can eavesdrop on any conversation by guessing conversation IDs
- Fix approach: Add socket.io middleware to verify JWT token, validate user has access to conversation before joining room

## Known Bugs

**Password Reset Email Failures Silent:**
- Symptoms: Password reset email errors are caught and logged but user still sees success message
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/authController.js:162-166`
- Trigger: SMTP misconfiguration or network issues during password reset request
- Workaround: User never receives email but thinks they did - must retry

**Race Condition in Like Toggle:**
- Symptoms: Rapid clicking like button can create duplicate likes or incorrect counts
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/postController.js:148-168`
- Trigger: Multiple rapid POST requests to `/api/posts/:id/like` from same user
- Workaround: Client-side debouncing (not currently implemented)

**Conversation List Not Updated After Sending Message:**
- Symptoms: New messages don't move conversation to top of list without page refresh
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/client/src/pages/MessagingPage.jsx:64-68`
- Trigger: Send message in active conversation
- Workaround: Local state update exists but conversation sort order not recalculated

## Security Considerations

**No Rate Limiting on Auth Endpoints:**
- Risk: Brute force attacks on login/register endpoints possible
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/app.js:36-41`
- Current mitigation: Global rate limit of 100 req/15min applies to ALL `/api/*` routes
- Recommendations: Add stricter per-endpoint rate limits - 5 login attempts/15min, 3 register/hour per IP

**JWT Secret Not Enforced:**
- Risk: If JWT_SECRET is weak or default, tokens can be forged
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/utils/helpers.js:5`
- Current mitigation: None - relies on developer setting strong secret
- Recommendations: Validate JWT_SECRET length (min 32 chars) at startup, generate secure default if missing

**No Input Sanitization:**
- Risk: XSS attacks possible via post content, comments, group descriptions
- Files:
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/postController.js:50-71`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/studyGroupController.js:52-74`
- Current mitigation: Express-validator validates format but doesn't sanitize HTML
- Recommendations: Use DOMPurify or sanitize-html to strip malicious content

**Verification Tokens Never Expire (Functionally):**
- Risk: Email verification and password reset tokens in DB have expiresAt but no cleanup job
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/prisma/schema.prisma:86-98`
- Current mitigation: Checked at use time but never deleted from DB
- Recommendations: Add cron job to delete expired tokens, or use Redis with TTL instead

**CORS Configuration Allows Credentials:**
- Risk: CORS set to single origin but credentials: true could be problematic if CLIENT_URL misconfigured
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/app.js:29-32`
- Current mitigation: Origin validated against CLIENT_URL env var
- Recommendations: Ensure CLIENT_URL is never set to wildcard in production

## Performance Bottlenecks

**N+1 Query in Feed Loading:**
- Problem: Getting posts with likes count requires join but checking "isLiked" per user creates extra queries
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/postController.js:10-28`
- Cause: Prisma include for user-specific likes inline with feed query
- Improvement path: Acceptable for now (uses single query), but may need dataloader pattern if feed grows large

**No Pagination on Comments:**
- Problem: All comments loaded at once when expanding post comments section
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/postController.js:170-194`
- Cause: No limit/skip params on comments query
- Improvement path: Add pagination or "load more" when comment count exceeds threshold (e.g., 20)

**Messages Loaded in Reverse Order:**
- Problem: Messages fetched descending then reversed in client
- Files:
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/controllers/messageController.js:127-138`
  - `D:/Obaid/Projects/FYP PROJECT/riphah-connect/client/src/pages/MessagingPage.jsx:47`
- Cause: Pattern mismatch - should fetch ascending from DB
- Improvement path: Change orderBy to 'asc' in query, remove .reverse() in client

## Fragile Areas

**AuthContext Token Refresh Missing:**
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/client/src/context/AuthContext.jsx:10-24`
- Why fragile: JWT expires after 7 days with no refresh mechanism - users logged out abruptly
- Safe modification: Don't change token expiry without adding refresh token flow
- Test coverage: No tests for auth flow

**Socket.io Instance Sharing:**
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/app.js:60-61,178-180`
- Why fragile: Socket.io instance attached to Express app via app.set() - awkward pattern prone to race conditions
- Safe modification: Always get io via req.app.get('io') and check if exists before emitting
- Test coverage: No socket tests

**Client API Error Handling:**
- Files: `D:/Obaid/Projects/FYP PROJECT/riphah-connect/client/src/services/api.js:21-33`
- Why fragile: 401 interceptor clears tokens globally - can break auth routes that expect 401 (like invalid login)
- Safe modification: Check isAuthRoute before clearing tokens, but pattern is confusing
- Test coverage: No interceptor tests

## Scaling Limits

**Database Connection Pooling:**
- Current capacity: Prisma default pool size (unlimited connections in dev, ~10 in serverless)
- Limit: Supabase free tier = 60 concurrent connections, will hit limit with multiple server instances
- Scaling path: Configure explicit connection pool in Prisma schema, use connection pooling proxy (pgBouncer)

**In-Memory Socket Rooms:**
- Current capacity: Socket.io rooms stored in memory, single server instance
- Limit: Horizontal scaling breaks real-time messaging - users on different servers can't communicate
- Scaling path: Add Redis adapter for socket.io to share rooms across instances

**File Upload Not Implemented:**
- Current capacity: Image URLs only (imageUrl fields in schema) - assumes external hosting
- Limit: No actual file upload mechanism, relies on client uploading to external service
- Scaling path: Add S3/Cloudinary integration or multipart upload endpoints

## Dependencies at Risk

**React 19 (Latest):**
- Risk: Using React 19.2.0 which just released - potential unstable APIs
- Impact: Breaking changes possible in patch releases
- Migration plan: Pin to exact version, watch changelog before updating

**Prisma Client:**
- Risk: @prisma/client 6.4.1 - using v6 which has different migration patterns than v5
- Impact: Schema changes require careful migration planning
- Migration plan: Always test migrations in dev, never run prisma db push in production

## Missing Critical Features

**Email Service Not Configured:**
- Problem: Email service exists but SMTP credentials likely not set in .env
- Blocks: Email verification, password reset functionality
- Priority: High - core auth features broken without it

**Image Upload Endpoints:**
- Problem: Posts, events, groups, profiles all have imageUrl fields but no upload API
- Blocks: Users can't upload images, must use external URLs
- Priority: Medium - workaround exists (external hosting) but poor UX

**Real-time Updates (Socket.io Only Half-Done):**
- Problem: Socket.io configured for messaging only, no real-time post likes/comments
- Blocks: Feed feels stale, requires manual refresh to see new activity
- Priority: Low - not blocking but expected in modern social apps

**Search Functionality Primitive:**
- Problem: Study groups search uses basic LIKE query, no full-text search
- Blocks: Can't find groups/users effectively as data grows
- Priority: Medium - will become painful at scale

## Test Coverage Gaps

**Zero Backend Tests:**
- What's not tested: All controllers, middleware, services
- Files: No test files exist in `D:/Obaid/Projects/FYP PROJECT/riphah-connect/server/src/`
- Risk: Breaking changes go undetected, refactoring dangerous
- Priority: High - critical for production confidence

**Zero Frontend Tests:**
- What's not tested: All pages, components, API service layer
- Files: No test files in `D:/Obaid/Projects/FYP PROJECT/riphah-connect/client/src/`
- Risk: UI regressions, broken user flows undetected
- Priority: High - at minimum need integration tests for auth flow

**No E2E Tests:**
- What's not tested: Complete user journeys (register → login → post → comment)
- Risk: Integration between frontend and backend can break silently
- Priority: Medium - would catch API contract mismatches

---

*Concerns audit: 2026-02-14*
