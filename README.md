# Morex Technologies - Modern ERP System

[![Production Ready](https://img.shields.io/badge/status-production--ready-green)]()
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-blue)]()
[![Neon PostgreSQL](https://img.shields.io/badge/database-Neon-purple)]()

> **Production-ready paint manufacturing ERP with modular feature-based architecture**

## 🎯 What's New

This workspace has been reorganized into a **production-ready architecture** with:

- ✅ **Modular Feature-Based Structure**: Clean separation by business domain
- ✅ **Drizzle ORM Integration**: Type-safe database access optimized for Neon
- ✅ **Connection Pooling**: Serverless-optimized Neon connections
- ✅ **Zod Validation**: Runtime type safety for all API inputs
- ✅ **No Dummy Data**: All features connect to real database
- ✅ **Migration Ready**: Database versioning with Drizzle Kit

## 📁 Workspace Structure

```
dmor-paints-modern-dashboard/
├── client/              # React + TypeScript frontend
│   └── src/
│       ├── features/    # Feature modules (orders, inventory, production, etc.)
│       ├── components/  # Shared components
│       └── services/    # API clients
│
├── server/              # Node.js + Express backend
│   └── src/
│       ├── modules/     # Feature modules (orders, inventory, production, etc.)
│       ├── db/          # Drizzle ORM setup & schema
│       ├── config/      # Configuration
│       └── middleware/  # Express middleware
│
├── ARCHITECTURE.md      # 📚 Detailed architecture documentation
└── setup.sh            # 🚀 Quick setup script
```

## 🚀 Quick Start

### Option 1: Automated Setup

```bash
# Make script executable (Unix/Mac)
chmod +x setup.sh
./setup.sh

# Or run directly (Windows Git Bash)
bash setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
cd server && pnpm install
cd ../client && pnpm install

# 2. Configure environment
cd server
cp .env.example .env
# Edit .env with your Neon DATABASE_URL

# 3. Sync database schema
pnpm db:push

# 4. Start development
# Terminal 1
cd server && pnpm dev

# Terminal 2
cd client && pnpm dev
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture guide
  - Module structure & patterns
  - API endpoints reference
  - Development guidelines
  - Deployment checklist

## 🏗️ Architecture Highlights

### Server Modules

Each feature follows the same pattern:

```
modules/<feature>/
├── controller.js    # HTTP handlers
├── service.js       # Business logic
├── repository.js    # Database queries (Drizzle)
├── schema.js        # Zod validation
├── dto.js          # Data transformation
├── routes.js       # Route definitions
└── index.js        # Module exports
```

**Available Modules:**

- `orders` - Order management
- `inventory` - Product & stock management
- `production` - Production batch tracking
- `employees` - Employee management
- `bom` - Bill of materials

### Client Features

Each feature mirrors server structure:

```
features/<feature>/
├── api/            # API client
├── hooks/          # React hooks
├── components/     # Feature components
├── pages/          # Feature pages
└── types.ts        # TypeScript types
```

pnpm lint:fix

# Format all files

pnpm format

# Check formatting

pnpm format:check

````

### Testing

```bash
# Run tests in all packages
pnpm test
````

## Git Hooks

Husky and lint-staged are configured to:

- Run ESLint and Prettier on staged files before commit
- Block commits with linting errors

## Code Quality Tools

- **ESLint**: Configured with separate rules for client (React) and server (Node.js)
- **Prettier**: Consistent code formatting across the workspace
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters only on staged files
