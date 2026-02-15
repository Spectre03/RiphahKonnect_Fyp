# Technology Stack

**Analysis Date:** 2026-02-14

## Languages

**Primary:**
- JavaScript (ES2020+) - Full-stack application (client and server)

**Secondary:**
- SQL - PostgreSQL database schema via Prisma

## Runtime

**Environment:**
- Node.js v24.11.1

**Package Manager:**
- npm (package-lock.json present in root, client, and server)
- Lockfile: present (maintains dependency consistency)

## Frameworks

**Core:**
- React 19.2.0 - Frontend UI framework
- Express.js 4.21.2 - Backend REST API server
- Vite 7.3.1 - Frontend build tool and dev server
- TailwindCSS 4.1.0 - Utility-first CSS framework

**Testing:**
- Not detected - No test framework currently configured

**Build/Dev:**
- Vite 7.3.1 - Frontend bundler with HMR
- Nodemon 3.1.9 - Backend auto-reload on file changes
- Concurrently 9.2.1 - Run client and server simultaneously
- ESLint 9.39.1 - JavaScript linting (client only)

## Key Dependencies

**Critical:**
- @prisma/client 6.19.2 - Database ORM client (used by both root and server)
- react-router-dom 7.5.0 - Frontend routing
- axios 1.7.9 - HTTP client for API calls
- socket.io 4.8.1 / socket.io-client 4.8.1 - Real-time bidirectional communication for messaging
- jsonwebtoken 9.0.2 - JWT authentication tokens
- bcrypt 5.1.1 - Password hashing (12 rounds)

**Infrastructure:**
- @tanstack/react-query 5.66.0 - Server state management and data fetching
- react-hook-form 7.54.2 - Form validation and management
- react-hot-toast 2.5.2 - Toast notifications
- express-validator 7.2.1 - Request validation middleware
- express-rate-limit 7.5.0 - API rate limiting (100 requests per 15 minutes)
- helmet 8.0.0 - Security headers middleware
- cors 2.8.5 - Cross-origin resource sharing
- nodemailer 6.9.16 - Email sending service
- dotenv 16.4.7 - Environment variable management
- lucide-react 0.474.0 - Icon library
- clsx 2.1.1 / tailwind-merge 3.0.2 - CSS class utilities

## Configuration

**Environment:**
- `.env` file required (gitignored, not committed to repository)
- Client uses Vite env vars (VITE_API_URL for API endpoint)
- Server requires: DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CLIENT_URL, PORT
- Vite proxy forwards `/api` requests to `http://localhost:5000` in development

**Build:**
- Client: `vite.config.js` at `client/vite.config.js`
  - Port: 5173
  - Path alias: `@` → `./src`
  - Plugins: @vitejs/plugin-react, @tailwindcss/vite
- Server: No build config (runs directly via Node.js)
- Prisma: `prisma/schema.prisma` - Database schema and client generation
- ESLint: `client/eslint.config.js` (ES2020, React hooks, React refresh)

## Platform Requirements

**Development:**
- Node.js 24.x (tested with v24.11.1)
- npm
- PostgreSQL database (via Supabase)
- SMTP server for email sending

**Production:**
- Node.js runtime environment
- PostgreSQL database connection
- Static file hosting for client build (dist/)
- Environment variables configured for production endpoints

---

*Stack analysis: 2026-02-14*
