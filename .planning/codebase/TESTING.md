# Testing Patterns

**Analysis Date:** 2026-02-14

## Test Framework

**Runner:**
- Not configured
- No test framework detected in project dependencies

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
# No test commands configured
# package.json scripts do not include test commands
```

## Current State

**Test Coverage:**
- Zero test files in codebase
- No test directories (`__tests__`, `tests/`, etc.)
- No `*.test.*` or `*.spec.*` files in `client/src/` or `server/src/`

**Testing Infrastructure:**
- No Jest, Vitest, or Mocha configuration files
- No testing libraries in dependencies (client or server `package.json`)
- No test coverage tools configured
- No CI/CD test automation setup

## Recommendations for Testing Setup

### Server-Side Testing (Recommended: Jest + Supertest)

**Suggested Setup:**
```bash
npm install --save-dev jest supertest @types/jest
```

**Suggested Config (`server/jest.config.js`):**
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
  ],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
};
```

**Suggested Test Structure:**
```
server/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── __tests__/
│   │       └── authController.test.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   └── __tests__/
│   │       └── authenticate.test.js
│   └── routes/
│       ├── authRoutes.js
│       └── __tests__/
│           └── authRoutes.test.js
```

**Suggested Test Pattern (Controller Tests):**
```javascript
const { register, login } = require('../authController');
const prisma = require('../../config/db');
const bcrypt = require('bcrypt');

jest.mock('../../config/db');
jest.mock('bcrypt');

describe('authController', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const req = {
        body: {
          email: 'test@riphah.edu.pk',
          password: 'password123',
          name: 'Test User',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      prisma.user.findUnique.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({
        id: '1',
        email: 'test@riphah.edu.pk',
        name: 'Test User',
      });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Registration successful! You can now log in.',
        user: expect.objectContaining({ email: 'test@riphah.edu.pk' }),
      });
    });

    it('should return 409 if user already exists', async () => {
      const req = {
        body: { email: 'existing@riphah.edu.pk', password: 'pass', name: 'User' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'existing@riphah.edu.pk' });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'An account with this email already exists.',
      });
    });
  });
});
```

**Suggested Test Pattern (Integration Tests with Supertest):**
```javascript
const request = require('supertest');
const { app } = require('../../app');
const prisma = require('../../config/db');

jest.mock('../../config/db');

describe('POST /api/auth/register', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: '1',
      email: 'newuser@riphah.edu.pk',
      name: 'New User',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@riphah.edu.pk',
        password: 'password123',
        name: 'New User',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('Registration successful');
  });

  it('should validate email domain', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@gmail.com',
        password: 'password123',
        name: 'User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});
```

### Client-Side Testing (Recommended: Vitest + React Testing Library)

**Suggested Setup:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Suggested Config (`client/vitest.config.js`):**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Suggested Test Structure:**
```
client/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   └── __tests__/
│   │       └── LoginPage.test.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── __tests__/
│   │   │       └── Sidebar.test.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── __tests__/
│   │       └── AuthContext.test.jsx
│   └── test/
│       └── setup.js
```

**Suggested Test Pattern (Component Tests):**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { AuthProvider } from '../../context/AuthContext';

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: '' }); // Icon button
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
```

**Suggested Test Pattern (Context Tests):**
```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authAPI } from '../../services/api';

jest.mock('../../services/api');

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide initial null user when no token', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should login user and store token', async () => {
    const mockUser = { id: '1', email: 'test@riphah.edu.pk', name: 'Test' };
    authAPI.login.mockResolvedValue({
      data: { token: 'mockToken', user: mockUser },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await result.current.login('test@riphah.edu.pk', 'password123');

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(localStorage.getItem('token')).toBe('mockToken');
    });
  });
});
```

### What to Test (Priority Order)

**High Priority:**
1. Authentication flow (`server/src/controllers/authController.js`)
2. Protected route middleware (`server/src/middleware/authenticate.js`)
3. Validation logic (`server/src/middleware/validate.js`)
4. Auth context (`client/src/context/AuthContext.jsx`)
5. Login/Register pages (`client/src/pages/LoginPage.jsx`, `RegisterPage.jsx`)

**Medium Priority:**
6. Post CRUD operations (`server/src/controllers/postController.js`)
7. Study group operations (`server/src/controllers/studyGroupController.js`)
8. API integration (`client/src/services/api.js`)
9. Protected route component (`client/src/components/ProtectedRoute.jsx`)

**Low Priority:**
10. Utility functions (`client/src/utils/brand.js`, `server/src/utils/helpers.js`)
11. UI components (`client/src/components/layout/Sidebar.jsx`)

### Mocking Strategy

**What to Mock:**
- Prisma Client (`prisma` in all server tests)
- External services (`nodemailer` for email)
- JWT generation (`jsonwebtoken`)
- Bcrypt hashing (`bcrypt`)
- Axios HTTP calls (client-side)
- Socket.io connections

**What NOT to Mock:**
- Pure utility functions (test actual implementation)
- Express middleware chaining (use Supertest for integration tests)
- React Hook Form validation (test actual form behavior)

**Mock Pattern:**
```javascript
// Mock at top of test file
jest.mock('../../config/db');

// Use in test
prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@riphah.edu.pk' });
prisma.post.create.mockResolvedValue({ id: 'post1', content: 'Test post' });
```

### Test Data Patterns

**Suggested Fixture Structure:**
```javascript
// server/src/__tests__/fixtures/users.js
module.exports = {
  validUser: {
    id: 'user1',
    email: 'student@riphah.edu.pk',
    name: 'Test Student',
    password: '$2b$12$hashedPassword',
    department: 'Computer Science',
    semester: 5,
    role: 'STUDENT',
    isVerified: true,
  },
  adminUser: {
    id: 'admin1',
    email: 'admin@riphah.edu.pk',
    name: 'Admin User',
    role: 'ADMIN',
    isVerified: true,
  },
};
```

**Suggested Factory Pattern:**
```javascript
// client/src/test/factories.js
export const createMockUser = (overrides = {}) => ({
  id: 'user1',
  email: 'test@riphah.edu.pk',
  name: 'Test User',
  department: 'Computer Science',
  semester: 5,
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  id: 'post1',
  content: 'Test post content',
  type: 'GENERAL',
  authorId: 'user1',
  author: createMockUser(),
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});
```

## Coverage Expectations

**Suggested Targets:**
- Controllers: 80%+ coverage (critical business logic)
- Middleware: 90%+ coverage (security-critical)
- API routes: 70%+ coverage (integration tests)
- React components: 60%+ coverage (UI behavior)
- Utilities: 90%+ coverage (pure functions)

**View Coverage (once configured):**
```bash
# Server
cd server && npm test -- --coverage

# Client
cd client && npm test -- --coverage
```

## Testing Gaps (Current State)

**Critical Gaps:**
- No authentication flow tests (registration, login, password reset)
- No authorization tests (ownership checks, role-based access)
- No validation tests (email domain, password requirements)
- No API integration tests (route handlers with actual validation)
- No form validation tests (React Hook Form behavior)
- No protected route tests (redirect logic)

**Impact:**
- Changes to auth logic could break security without detection
- Email validation bypass could allow non-Riphah emails
- Password reset flow vulnerable to undetected regressions
- Form UX issues (validation, error messages) not caught early

**Recommended First Tests to Write:**
1. `server/src/controllers/__tests__/authController.test.js` - Test registration, login, password reset
2. `server/src/middleware/__tests__/authenticate.test.js` - Test JWT validation, expired tokens
3. `server/src/routes/__tests__/authRoutes.test.js` - Integration tests for auth endpoints
4. `client/src/context/__tests__/AuthContext.test.jsx` - Test login/logout state management
5. `client/src/pages/__tests__/LoginPage.test.jsx` - Test form validation and submission

---

*Testing analysis: 2026-02-14*
