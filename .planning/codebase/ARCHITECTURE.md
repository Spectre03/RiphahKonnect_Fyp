# Architecture

**Analysis Date:** 2026-02-14

## Pattern Overview

**Overall:** Three-tier monorepo with Client-Server-Database separation

**Key Characteristics:**
- Monorepo structure with separate `client/` (React SPA) and `server/` (Express REST API)
- RESTful API with JWT authentication
- Real-time messaging via Socket.io
- PostgreSQL database accessed through Prisma ORM
- Single shared Prisma schema at root level

## Layers

**Presentation Layer (Client):**
- Purpose: User interface and client-side state management
- Location: `client/src/`
- Contains: React components, pages, context providers, routing logic
- Depends on: Server REST API (`/api/*`), Socket.io for real-time features
- Used by: End users via browser

**API Layer (Server):**
- Purpose: Business logic, data validation, authentication, authorization
- Location: `server/src/`
- Contains: Express routes, controllers, middleware, services
- Depends on: Prisma Client for database access
- Used by: Client application via HTTP/WebSocket

**Data Access Layer:**
- Purpose: Database abstraction and query execution
- Location: `prisma/schema.prisma` (schema), `server/src/config/db.js` (client instance)
- Contains: Prisma schema definitions, migrations
- Depends on: PostgreSQL database (Supabase hosted)
- Used by: Server controllers via Prisma Client

**Real-time Communication:**
- Purpose: Live messaging and notifications
- Location: `server/src/app.js` (Socket.io server), client Socket.io integration
- Contains: WebSocket event handlers for conversations
- Depends on: HTTP server instance
- Used by: Messaging feature

## Data Flow

**Standard Request Flow:**

1. Client makes HTTP request via `client/src/services/api.js` (axios instance)
2. Request interceptor attaches JWT token from localStorage
3. Server middleware chain processes request:
   - Rate limiting (`express-rate-limit`)
   - Security headers (`helmet`)
   - CORS validation
   - Route-specific validation (`express-validator`)
   - Authentication (`middleware/authenticate.js` - decodes JWT, loads user)
   - Authorization (role-based in some controllers)
4. Controller function executes business logic using Prisma Client
5. Response sent back to client
6. Client response interceptor handles 401 errors (token cleanup)

**Real-time Messaging Flow:**

1. User connects to Socket.io server
2. Client joins conversation room via `socket.on('joinConversation', conversationId)`
3. User sends message via REST API `POST /api/conversations/:id/messages`
4. Controller creates message in database
5. Controller emits Socket.io event to conversation room via `io.to('conversation:${id}').emit('newMessage', data)`
6. All participants in room receive real-time update

**State Management:**
- Client: React Context (`AuthContext`) for global user state, React Query for server state caching
- Server: Stateless (JWT-based auth), Socket.io rooms for real-time state

## Key Abstractions

**User Entity:**
- Purpose: Central identity model for authentication and content ownership
- Examples: `prisma/schema.prisma` (User model), `server/src/controllers/authController.js`
- Pattern: User owns Posts, Comments, Likes, GroupMemberships, Events, Messages, etc.

**Resource Controllers:**
- Purpose: CRUD operations for domain entities (Posts, Groups, Events, etc.)
- Examples: `server/src/controllers/postController.js`, `server/src/controllers/studyGroupController.js`
- Pattern: Controller → Prisma → Database, with standardized response format `{ data, pagination }`

**Middleware Chain:**
- Purpose: Cross-cutting concerns (auth, validation, errors)
- Examples: `server/src/middleware/authenticate.js`, `server/src/middleware/validate.js`, `server/src/middleware/errorHandler.js`
- Pattern: Express middleware pipeline with `next()` for flow control

**API Service Layer:**
- Purpose: Centralized HTTP client with token management
- Examples: `client/src/services/api.js`
- Pattern: Axios instance with request/response interceptors, domain-grouped API functions (`authAPI`, `postsAPI`, etc.)

## Entry Points

**Client Application:**
- Location: `client/src/main.jsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Mount React app, render `<App />` component

**Client Router:**
- Location: `client/src/App.jsx`
- Triggers: React app initialization
- Responsibilities: Setup providers (QueryClient, AuthProvider), define routes, render layout with `<Sidebar />` for protected routes

**Server Application:**
- Location: `server/src/app.js`
- Triggers: Node process starts via `npm run dev` (nodemon) or `npm start`
- Responsibilities: Initialize Express app, mount middleware, register routes, setup Socket.io, start HTTP server on port 5000

**API Routes:**
- Location: `server/src/routes/*.js`
- Triggers: Incoming HTTP requests to `/api/*`
- Responsibilities: Define route handlers, attach validation rules, delegate to controllers

## Error Handling

**Strategy:** Centralized error handler with custom error responses

**Patterns:**
- Server: All route handlers use `try/catch` and pass errors to `next(err)`
- Global error handler at `server/src/middleware/errorHandler.js` catches all errors
- Prisma error codes translated to HTTP status codes (P2002 → 409 Conflict, P2025 → 404 Not Found)
- Validation errors from `express-validator` return 400 with field details
- JWT errors (expired, invalid) return 401 Unauthorized
- Client: Axios interceptors handle 401 by clearing localStorage and redirecting to login
- Client: `react-hot-toast` displays user-friendly error messages

## Cross-Cutting Concerns

**Logging:** Console.log statements in controllers and Socket.io events (no structured logging framework)

**Validation:** `express-validator` middleware at route level in `server/src/routes/*.js`, validated by `middleware/validate.js` wrapper

**Authentication:** JWT tokens generated on login (`utils/helpers.js`), verified by `middleware/authenticate.js` on protected routes, stored in client localStorage

**Authorization:** Role-based checks in controllers (e.g., ADMIN can delete any post, OWNER/ADMIN can manage groups)

**Rate Limiting:** Global rate limiter (100 requests per 15 minutes) on `/api/*` routes via `express-rate-limit`

**CORS:** Configured to allow `CLIENT_URL` origin (default: `http://localhost:5173`) with credentials

**Security:** Helmet.js for security headers, bcrypt (12 rounds) for password hashing, JWT secret from environment

---

*Architecture analysis: 2026-02-14*
