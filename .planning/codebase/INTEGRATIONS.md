# External Integrations

**Analysis Date:** 2026-02-14

## APIs & External Services

**Email Service (SMTP):**
- Nodemailer - Transactional email sending
  - SDK/Client: nodemailer 6.9.16
  - Auth: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
  - Usage: Email verification, password reset emails
  - Implementation: `server/src/services/emailService.js`
  - Currently configured for auto-verification (emails sent but isVerified: true on register)

## Data Storage

**Databases:**
- PostgreSQL (hosted on Supabase)
  - Connection: DATABASE_URL env var
  - Client: Prisma ORM 6.19.2
  - Schema: `prisma/schema.prisma`
  - Migrations: Applied (20260210220417_init, 20260211060137_add_profile_fields)
  - Access: `server/src/config/db.js` exports PrismaClient instance

**File Storage:**
- Not yet implemented - Image URLs stored as strings (avatarUrl, imageUrl fields in schema)
  - User avatars: User.avatarUrl field
  - Post images: Post.imageUrl field
  - Event images: Event.imageUrl field
  - Lost & Found images: LostFoundItem.imageUrl field
  - Study group avatars: StudyGroup.avatarUrl field

**Caching:**
- None - Direct database queries via Prisma

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `server/src/middleware/authenticate.js`
  - Token generation: `server/src/utils/helpers.js` - generateToken()
  - Algorithm: jsonwebtoken 9.0.2
  - Expiry: 7 days (JWT_EXPIRES_IN env var)
  - Secret: JWT_SECRET env var
  - Password hashing: bcrypt with 12 rounds
  - Email restriction: Only @riphah.edu.pk and @students.riphah.edu.pk domains allowed
  - Client storage: localStorage (token and user object)
  - Token attachment: Axios interceptor in `client/src/services/api.js`
  - Auto-logout: 401 responses clear localStorage and redirect to login

## Monitoring & Observability

**Error Tracking:**
- None - Server-side error handler only (`server/src/middleware/errorHandler.js`)

**Logs:**
- Console logging only
  - Socket.io connection logs in `server/src/app.js`
  - No structured logging service

## CI/CD & Deployment

**Hosting:**
- Not yet deployed - Development environment only

**CI Pipeline:**
- None detected - No GitHub Actions, CircleCI, or other CI config files

## Environment Configuration

**Required env vars:**

Server (`server/.env`):
- DATABASE_URL - Supabase PostgreSQL connection string
- JWT_SECRET - Secret key for signing JWTs
- JWT_EXPIRES_IN - Token expiry (default: "7d")
- SMTP_HOST - Email server host
- SMTP_PORT - Email server port
- SMTP_USER - SMTP username
- SMTP_PASS - SMTP password
- CLIENT_URL - Frontend URL for CORS and email links
- PORT - Server port (default: 5000)

Client (`client/.env`):
- VITE_API_URL - Backend API URL (defaults to "/api" which proxies to localhost:5000 in dev)

**Secrets location:**
- `.env` files (gitignored, not committed)
- No secrets management service

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints detected

**Outgoing:**
- None - No outbound webhook calls detected

## Real-time Communication

**WebSockets:**
- Socket.io 4.8.1 - Real-time messaging
  - Server: `server/src/app.js` (lines 20-79)
  - Client: socket.io-client 4.8.1 imported but not yet implemented in client code
  - Events: joinConversation, leaveConversation, disconnect
  - Rooms: conversation:{conversationId} pattern
  - CORS: Configured to accept connections from CLIENT_URL
  - Transport: HTTP + WebSocket upgrade
  - Usage: Real-time chat messages (not yet fully implemented on client)

---

*Integration audit: 2026-02-14*
