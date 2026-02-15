# Coding Conventions

**Analysis Date:** 2026-02-14

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `LoginPage.jsx`, `Sidebar.jsx`)
- JavaScript utilities: camelCase with `.js` extension (e.g., `utils.js`, `helpers.js`, `api.js`)
- Server files: camelCase with `.js` extension (e.g., `authController.js`, `authRoutes.js`)
- Test files: Not detected (no test files in codebase)
- Component organization: Feature-based pages in `client/src/pages/`, layout components in `client/src/components/layout/`

**Functions:**
- Controllers: camelCase verbs describing action (e.g., `register`, `login`, `getPosts`, `createPost`, `toggleLike`)
- React components: PascalCase (e.g., `LoginPage`, `Sidebar`, `AuthProvider`)
- Helper/utility functions: camelCase (e.g., `generateToken`, `getAvatarGradient`, `timeAgo`)
- API methods: camelCase object with methods (e.g., `authAPI.login()`, `postsAPI.create()`)

**Variables:**
- camelCase for all variables (e.g., `user`, `isSubmitting`, `showPassword`, `existingUser`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_URL`, `DEPARTMENTS`, `NAV_ITEMS`, `AVATAR_GRADIENTS`)
- React state: descriptive camelCase (e.g., `mobileOpen`, `loading`, `user`)

**Types:**
- Prisma models: PascalCase (e.g., `User`, `Post`, `StudyGroup`, `Event`)
- Enums: PascalCase for type name, UPPER_SNAKE_CASE for values (e.g., `Role.STUDENT`, `PostType.GENERAL`)
- Database IDs: `cuid()` format

## Code Style

**Formatting:**
- ESLint configured for client (`client/eslint.config.js`)
- Flat config format with `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- No Prettier config detected - relying on ESLint auto-formatting
- ECMAScript 2020+ (using modern syntax)
- 2-space indentation (visible in source files)

**Linting:**
- Tool: ESLint v9.39.1
- Key rules enforced:
  - `no-unused-vars: ['error', { varsIgnorePattern: '^[A-Z_]' }]` - allows unused constants
  - React Hooks rules (via `eslint-plugin-react-hooks`)
  - React Refresh rules (via `eslint-plugin-react-refresh`)

**Module System:**
- Client: ES modules (`import`/`export`, `type: "module"` in `package.json`)
- Server: CommonJS (`require`/`module.exports`)

## Import Organization

**Order:**
1. External libraries (React, third-party packages)
2. Internal utilities/services
3. Context/hooks
4. Components
5. Assets/styles

**Example from `client/src/pages/LoginPage.jsx`:**
```javascript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
```

**Example from server `server/src/app.js`:**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// ... other third-party
const authRoutes = require('./routes/authRoutes');
// ... other local imports
const errorHandler = require('./middleware/errorHandler');
```

**Path Aliases:**
- Client uses `@` alias for `./src` (configured in `client/vite.config.js`)
- Usage: `import { useAuth } from '@/context/AuthContext'` (though codebase uses relative paths)

## Error Handling

**Patterns:**

**Server-side (Express):**
- All async route handlers use try-catch with `next(err)` to pass errors to centralized handler
- Centralized error handler in `server/src/middleware/errorHandler.js`
- Specific Prisma error codes handled:
  - `P2002`: Unique constraint violation → 409 Conflict
  - `P2025`: Record not found → 404 Not Found
- JWT errors handled in middleware:
  - `TokenExpiredError` → 401 with message "Token expired."
  - Invalid token → 401 with message "Invalid token."
- Validation errors → 400 with structured details
- Default: 500 Internal Server Error

**Example from `server/src/controllers/authController.js`:**
```javascript
const register = async (req, res, next) => {
  try {
    // ... business logic
  } catch (err) {
    next(err);
  }
};
```

**Client-side (React):**
- Axios interceptors handle 401 globally (clear token from localStorage)
- Component-level try-catch for async operations
- React Hook Form for validation errors
- Toast notifications for user-facing errors

**Example from `client/src/pages/LoginPage.jsx`:**
```javascript
const onSubmit = async (data) => {
  try {
    await login(data.email, data.password);
    toast.success('Welcome back!');
    navigate('/');
  } catch (err) {
    toast.error(err.response?.data?.error || 'Login failed.');
  }
};
```

## Logging

**Framework:** `console` (built-in)

**Patterns:**
- Server: `console.log()` for connection events, `console.error()` for errors
- Error stack traces logged in error handler: `console.error(err.stack)`
- Socket.io events logged: `console.log('User connected:', socket.id)`
- Email failures logged: `console.error('Failed to send password reset email:', emailErr.message)`
- No structured logging library in use

**Example from `server/src/middleware/errorHandler.js`:**
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  // ... error response logic
};
```

## Comments

**When to Comment:**
- Business logic explanations (e.g., "Don't reveal whether user exists")
- TODOs for future work (e.g., `// TODO: enable email verification later`)
- Section dividers in configuration files
- HTML email template structure

**JSDoc/TSDoc:**
- Not used in codebase
- No type annotations (JavaScript, not TypeScript)

**Example from `server/src/controllers/authController.js`:**
```javascript
// POST /api/auth/register
const register = async (req, res, next) => {
  // ...
  // Create user (auto-verified for now — TODO: enable email verification later)
  const user = await prisma.user.create({ /* ... */ });
  // ...
};

// Don't reveal whether user exists
return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
```

## Function Design

**Size:**
- Controllers: 20-70 lines per function (single responsibility)
- Utilities: 5-30 lines (focused helpers)
- React components: 50-200 lines (full page components with JSX)

**Parameters:**
- Express handlers: Standard `(req, res, next)` signature
- React hooks: Destructured from hook return (e.g., `const { user, login, logout } = useAuth()`)
- Utility functions: 1-2 parameters max (e.g., `generateToken(userId)`, `getAvatarGradient(name)`)

**Return Values:**
- Server: JSON responses via `res.json()`, errors via `next(err)`
- Client API: Axios promises (caller handles `.then()/.catch()`)
- React components: JSX
- Utilities: Direct values (strings, objects, etc.)

## Validation

**Server:**
- `express-validator` for input validation
- Validation rules defined inline in route files
- Centralized validation middleware in `server/src/middleware/validate.js`
- Email validation includes Riphah domain check: `matches(/@(students\.)?riphah\.edu\.pk$/i)`
- Password requirements: min 8 chars, must contain number

**Example from `server/src/routes/authRoutes.js`:**
```javascript
router.post(
  '/register',
  validate([
    body('email')
      .isEmail().withMessage('Please provide a valid email.')
      .matches(/@(students\.)?riphah\.edu\.pk$/i).withMessage('Only @riphah.edu.pk or @students.riphah.edu.pk emails are allowed.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/\d/).withMessage('Password must contain at least one number.'),
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters.'),
  ]),
  register
);
```

**Client:**
- React Hook Form for form validation
- Inline validation rules with custom messages
- Pattern-based validation (e.g., email regex)

**Example from `client/src/pages/LoginPage.jsx`:**
```javascript
<input
  type="email"
  {...register('email', {
    required: 'Email is required.',
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' },
  })}
/>
```

## Authentication & Authorization

**Pattern:**
- JWT-based authentication with 7-day expiry
- Tokens stored in localStorage (client-side)
- Bearer token in `Authorization` header
- Middleware: `server/src/middleware/authenticate.js` extracts user from JWT

**Authorization:**
- `server/src/middleware/authorize.js` exists but not shown in explored files
- Role-based checks in controllers (e.g., `req.user.role !== 'ADMIN'`)
- Ownership checks (e.g., `post.authorId !== req.user.id`)

**Example from `server/src/middleware/authenticate.js`:**
```javascript
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    // ...
    req.user = user;
    next();
  } catch (err) {
    // ...
  }
};
```

## React Patterns

**State Management:**
- Context API for global auth state (`client/src/context/AuthContext.jsx`)
- React Query for server state caching (`@tanstack/react-query`)
- Local component state with `useState` for UI state

**Hooks Usage:**
- Custom hooks: `useAuth()` for accessing auth context
- Form handling: `react-hook-form` with `useForm()` hook
- Navigation: `react-router-dom` with `useNavigate()`, `useLocation()`

**Component Structure:**
- Functional components only (no class components)
- Hooks at top of component
- Event handlers as arrow functions
- JSX returned at end

**Example from `client/src/context/AuthContext.jsx`:**
```javascript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... token check
  }, []);

  const login = async (email, password) => {
    // ... API call, set state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Database Patterns

**ORM:** Prisma Client

**Query Patterns:**
- Always use Prisma Client methods (no raw SQL)
- Include related data with `include` option
- Select specific fields with `select` option for security
- Aggregate counts with `_count` (e.g., `_count: { select: { comments: true, likes: true } }`)
- Transactions for multi-step operations with `prisma.$transaction([])`

**Example from `server/src/controllers/postController.js`:**
```javascript
const posts = await prisma.post.findMany({
  where: { groupId: null },
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
  include: {
    author: {
      select: { id: true, name: true, avatarUrl: true, department: true },
    },
    _count: { select: { comments: true, likes: true } },
    likes: {
      where: { userId: req.user.id },
      select: { id: true },
    },
  },
});
```

## API Response Format

**Success:**
```javascript
// Single resource
res.json({ user: { id, email, name } });

// Collection
res.json({
  posts: [...],
  pagination: { page, limit, total, totalPages }
});

// Action confirmation
res.json({ message: 'Post deleted.' });
```

**Error:**
```javascript
// Simple error
res.status(404).json({ error: 'Post not found.' });

// Validation error
res.status(400).json({
  error: 'Validation failed',
  details: [
    { field: 'email', message: 'Please provide a valid email.' }
  ]
});
```

## File Organization

**Server:**
- `app.js`: Entry point, middleware, routes, Socket.io setup
- `controllers/`: Business logic handlers
- `routes/`: Route definitions with validation
- `middleware/`: Reusable middleware (auth, validation, error handling)
- `services/`: External integrations (email service)
- `utils/`: Helper functions (token generation)
- `config/`: Configuration (database client)

**Client:**
- `main.jsx`: Entry point
- `App.jsx`: Router setup, providers, global components
- `pages/`: Page components (one per route)
- `components/`: Reusable components (organized by type: `layout/`)
- `context/`: React Context providers
- `services/`: API integration (Axios instance and API methods)
- `utils/`: Helper functions (brand utilities, constants)
- `lib/`: Third-party library wrappers (Tailwind merge utility)

---

*Convention analysis: 2026-02-14*
