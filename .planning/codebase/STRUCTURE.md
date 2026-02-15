# Codebase Structure

**Analysis Date:** 2026-02-14

## Directory Layout

```
riphah-connect/
├── client/                 # React frontend (Vite)
│   ├── public/             # Static assets
│   ├── src/                # Source code
│   │   ├── assets/         # Images, icons
│   │   ├── components/     # Reusable React components
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom React hooks (currently empty)
│   │   ├── lib/            # Utility libraries
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API client
│   │   ├── utils/          # Constants and helpers
│   │   ├── App.jsx         # Root component with routing
│   │   ├── main.jsx        # Application entry point
│   │   └── index.css       # Global styles (Tailwind)
│   ├── vite.config.js      # Vite configuration
│   ├── eslint.config.js    # ESLint configuration
│   └── package.json        # Client dependencies
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Configuration (database client)
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # Route definitions
│   │   ├── services/       # Business services (email)
│   │   ├── utils/          # Helper functions
│   │   └── app.js          # Server entry point
│   └── package.json        # Server dependencies
├── prisma/                 # Database schema and migrations
│   ├── migrations/         # SQL migration files
│   └── schema.prisma       # Prisma schema
├── .planning/              # GSD planning documents
│   └── codebase/           # Codebase analysis documents
├── package.json            # Root workspace scripts
└── .gitignore              # Git ignore rules
```

## Directory Purposes

**`client/src/pages/`:**
- Purpose: Top-level route components
- Contains: One file per route (LoginPage.jsx, FeedPage.jsx, etc.)
- Key files:
  - `LoginPage.jsx`, `RegisterPage.jsx`: Authentication flows (complete)
  - `HomePage.jsx`: Landing page (placeholder)
  - `FeedPage.jsx`, `GroupsPage.jsx`, `EventsPage.jsx`, `LostFoundPage.jsx`, `MessagingPage.jsx`: Feature pages (need implementation)
  - `ProfilePage.jsx`: User profile view

**`client/src/components/`:**
- Purpose: Reusable UI components
- Contains: Subdirectories for layout and UI components
- Key files:
  - `layout/Sidebar.jsx`: Main navigation sidebar
  - `ProtectedRoute.jsx`: Route guard for authenticated users
  - `ui/`: Reusable UI primitives (buttons, inputs, etc.)

**`client/src/context/`:**
- Purpose: Global state management via React Context
- Contains: Context provider components
- Key files:
  - `AuthContext.jsx`: User authentication state and methods (login, register, logout)

**`client/src/services/`:**
- Purpose: API communication layer
- Contains: Axios instance and API method groupings
- Key files:
  - `api.js`: Central API client with interceptors, exports `authAPI`, `postsAPI`, `groupsAPI`, `eventsAPI`, `lostFoundAPI`, `conversationsAPI`, `usersAPI`

**`client/src/utils/`:**
- Purpose: Constants and utility functions
- Contains: Application-wide constants
- Key files:
  - `constants.js`: `API_URL`, `DEPARTMENTS`, `SEMESTERS`
  - `brand.js`: Branding constants

**`client/src/lib/`:**
- Purpose: Third-party utility wrappers
- Contains: Helper libraries
- Key files:
  - `utils.js`: `cn()` function for Tailwind class merging (clsx + tailwind-merge)

**`server/src/routes/`:**
- Purpose: Express route definitions with validation rules
- Contains: Route files matching API endpoints
- Key files:
  - `authRoutes.js`: `/api/auth` - register, login, verify, reset password
  - `postRoutes.js`: `/api/posts` - feed, CRUD, likes, comments
  - `studyGroupRoutes.js`: `/api/study-groups` - groups CRUD, join/leave
  - `eventRoutes.js`: `/api/events` - events CRUD, RSVP
  - `lostFoundRoutes.js`: `/api/lost-found` - lost & found items
  - `messageRoutes.js`: `/api/conversations` - messaging
  - `userRoutes.js`: `/api/users` - user profiles, search

**`server/src/controllers/`:**
- Purpose: Business logic and request handling
- Contains: Controller files matching routes (one controller per resource)
- Key files:
  - `authController.js`: Authentication handlers (register, login, password reset)
  - `postController.js`: Post CRUD, likes, comments
  - `studyGroupController.js`: Group management, memberships
  - `eventController.js`: Event management, RSVPs
  - `lostFoundController.js`: Lost & found item management
  - `messageController.js`: Conversations and messaging
  - `userController.js`: User profiles and search

**`server/src/middleware/`:**
- Purpose: Request processing and validation
- Contains: Reusable middleware functions
- Key files:
  - `authenticate.js`: JWT verification, loads `req.user`
  - `authorize.js`: Role-based access control
  - `validate.js`: Wrapper for express-validator errors
  - `errorHandler.js`: Global error handler

**`server/src/config/`:**
- Purpose: Application configuration
- Contains: Configuration modules
- Key files:
  - `db.js`: Prisma Client singleton instance

**`server/src/services/`:**
- Purpose: External service integrations
- Contains: Service modules
- Key files:
  - `emailService.js`: Nodemailer email sending (verification, password reset)

**`server/src/utils/`:**
- Purpose: Utility functions
- Contains: Helper functions
- Key files:
  - `helpers.js`: JWT token generation, verification token generation

**`prisma/`:**
- Purpose: Database schema and migration history
- Contains: Prisma schema file and migration folders
- Key files:
  - `schema.prisma`: Database models (User, Post, Comment, Like, StudyGroup, Event, LostFoundItem, Conversation, Message, etc.)
  - `migrations/`: SQL migration history

## Key File Locations

**Entry Points:**
- `client/src/main.jsx`: Client application bootstrap
- `client/src/App.jsx`: Client routing and provider setup
- `server/src/app.js`: Server initialization, middleware, Socket.io setup

**Configuration:**
- `client/vite.config.js`: Vite config with Tailwind plugin, path alias `@/`, proxy `/api` to `localhost:5000`
- `server/.env`: Environment variables (DATABASE_URL, JWT_SECRET, etc.) - not committed
- `prisma/schema.prisma`: Database schema

**Core Logic:**
- `client/src/services/api.js`: All API methods for client-server communication
- `client/src/context/AuthContext.jsx`: Authentication state management
- `server/src/controllers/*.js`: Business logic for each resource
- `server/src/middleware/authenticate.js`: JWT authentication logic

**Testing:**
- No test files present yet

## Naming Conventions

**Files:**
- React components: PascalCase with `.jsx` extension (`LoginPage.jsx`, `Sidebar.jsx`)
- JavaScript modules: camelCase with `.js` extension (`api.js`, `helpers.js`)
- Route files: camelCase ending with `Routes.js` (`authRoutes.js`, `postRoutes.js`)
- Controller files: camelCase ending with `Controller.js` (`authController.js`)

**Directories:**
- Lowercase with hyphens for multi-word project name (`riphah-connect`)
- camelCase for source directories (`studyGroups` in routes/controllers)
- kebab-case for feature directories (`lost-found` routes)

## Where to Add New Code

**New Feature Page:**
- Primary code: `client/src/pages/FeaturePage.jsx`
- Add route in `client/src/App.jsx` under `<Route element={<AppLayout />}>`
- Create API methods in `client/src/services/api.js` (e.g., `export const featureAPI = { ... }`)
- Tests: Not yet established

**New API Endpoint:**
- Route definition: `server/src/routes/featureRoutes.js`
- Controller: `server/src/controllers/featureController.js`
- Register route in `server/src/app.js`: `app.use('/api/feature', featureRoutes)`
- Add corresponding API methods in `client/src/services/api.js`

**New React Component:**
- Reusable UI component: `client/src/components/ui/ComponentName.jsx`
- Layout component: `client/src/components/layout/ComponentName.jsx`
- Feature-specific component: Create in `client/src/components/feature/` (new directory)

**New Database Model:**
- Add model to `prisma/schema.prisma`
- Run migration: `npm run prisma:migrate` from root
- Prisma Client auto-updates after generation

**Utilities:**
- Client shared helpers: `client/src/utils/` (new file with descriptive name)
- Client library wrappers: `client/src/lib/`
- Server helpers: `server/src/utils/` (new file)

**Middleware:**
- Server request middleware: `server/src/middleware/` (new file)
- Apply globally in `server/src/app.js` or route-specific in `server/src/routes/*.js`

**Services:**
- External integrations: `server/src/services/` (e.g., `paymentService.js`, `storageService.js`)

## Special Directories

**`node_modules/`:**
- Purpose: Dependencies (three instances: root, client, server)
- Generated: Yes (via npm install)
- Committed: No

**`client/dist/`:**
- Purpose: Production build output
- Generated: Yes (via `npm run build` in client)
- Committed: No

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD commands
- Committed: Yes

**`prisma/migrations/`:**
- Purpose: Database migration history
- Generated: By Prisma Migrate
- Committed: Yes

**`.git/`:**
- Purpose: Git repository metadata
- Generated: By git
- Committed: No

---

*Structure analysis: 2026-02-14*
