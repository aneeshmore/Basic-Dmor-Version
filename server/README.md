# Morex Technologies ERP - Server

A production-ready Express.js backend API for the Morex Technologies ERP system, built with TypeScript and following MVC architecture patterns.

## ��� Features

- **RESTful API Architecture** - Clean, organized endpoints following REST principles
- **TypeScript** - Full type safety and better developer experience
- **MVC Pattern** - Separation of concerns with Controllers, Services, and Models
- **Security** - Helmet.js for security headers, CORS configured
- **Performance** - Response compression and optimized middleware
- **Logging** - Morgan for HTTP request logging
- **Error Handling** - Centralized error handling middleware
- **Environment Configuration** - Easy configuration via `.env` files

## ��� Project Structure

\`\`\`
server/
├── src/
│ ├── config/
│ │ └── index.ts # Configuration management
│ ├── controllers/ # HTTP request handlers
│ │ ├── DepartmentController.ts
│ │ ├── EmployeeController.ts
│ │ ├── ProductController.ts
│ │ └── ProductionController.ts
│ ├── services/ # Business logic layer
│ │ ├── DepartmentService.ts
│ │ ├── EmployeeService.ts
│ │ ├── ProductService.ts
│ │ └── ProductionService.ts
│ ├── routes/ # API route definitions
│ │ ├── departments.ts
│ │ ├── employees.ts
│ │ ├── products.ts
│ │ └── production.ts
│ ├── middleware/ # Custom middleware
│ │ ├── errorHandler.ts # Global error handler
│ │ └── logger.ts # Custom logging
│ ├── models/
│ │ └── data.ts # In-memory data store (singleton)
│ ├── types/
│ │ └── index.ts # TypeScript type definitions
│ └── index.ts # Application entry point
├── .env.example # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## ���️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **Security**: Helmet, CORS
- **Compression**: Compression middleware
- **Logging**: Morgan
- **Dev Tools**: nodemon, ts-node

## ��� Prerequisites

- Node.js >= 16.x
- npm or yarn or pnpm

## ⚙️ Installation

1. **Install dependencies**
   \`\`\`bash
   npm install

   # or

   pnpm install
   \`\`\`

2. **Configure environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

   Edit \`.env\` file:
   \`\`\`env
   PORT=5000
   NODE_ENV=development
   API_VERSION=v1
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   LOG_LEVEL=dev
   \`\`\`

3. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## ��� Available Scripts

\`\`\`bash

# Development with auto-reload

npm run dev

# Build for production

npm run build

# Start production server

npm start

# Type checking

npx tsc --noEmit
\`\`\`

## ��� API Endpoints

### Base URL

\`\`\`
http://localhost:5000/api/v1
\`\`\`

### Departments

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| GET    | \`/departments\`     | Get all departments   |
| GET    | \`/departments/:id\` | Get department by ID  |
| POST   | \`/departments\`     | Create new department |
| PUT    | \`/departments/:id\` | Update department     |
| DELETE | \`/departments/:id\` | Delete department     |

**Department Schema**:
\`\`\`typescript
{
id: number;
name: string;
description?: string;
}
\`\`\`

### Employees

| Method | Endpoint           | Description         |
| ------ | ------------------ | ------------------- |
| GET    | \`/employees\`     | Get all employees   |
| GET    | \`/employees/:id\` | Get employee by ID  |
| POST   | \`/employees\`     | Create new employee |
| PUT    | \`/employees/:id\` | Update employee     |
| DELETE | \`/employees/:id\` | Delete employee     |

**Employee Schema**:
\`\`\`typescript
{
id: number;
name: string;
departmentId: number;
role: string;
email?: string;
phone?: string;
}
\`\`\`

### Products

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| GET    | \`/products\`     | Get all products   |
| GET    | \`/products/:id\` | Get product by ID  |
| POST   | \`/products\`     | Create new product |
| PUT    | \`/products/:id\` | Update product     |
| DELETE | \`/products/:id\` | Delete product     |

**Product Schema**:
\`\`\`typescript
{
id: number;
name: string;
code: string;
unitId: number; // 1=Nos, 2=ml, 3=Ltr, 4=Kg, 5=gm
price: number;
stock: number;
description?: string;
}
\`\`\`

### Production Batches

| Method | Endpoint            | Description                |
| ------ | ------------------- | -------------------------- |
| GET    | \`/production\`     | Get all production batches |
| GET    | \`/production/:id\` | Get batch by ID            |
| POST   | \`/production\`     | Create new batch           |
| PUT    | \`/production/:id\` | Update batch               |
| DELETE | \`/production/:id\` | Delete batch               |

**Production Batch Schema**:
\`\`\`typescript
{
id: number;
productId: number;
batchNumber: string;
quantity: number;
status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
startDate: string; // ISO 8601 date
endDate?: string; // ISO 8601 date
}
\`\`\`

### Response Format

All endpoints return data in a consistent format:

**Success Response**:
\`\`\`json
{
"success": true,
"data": { ... },
"message": "Operation successful"
}
\`\`\`

**Error Response**:
\`\`\`json
{
"success": false,
"error": "Error message",
"details": "Additional error details"
}
\`\`\`

## ��️ Architecture

### MVC Pattern

\`\`\`
Request → Router → Controller → Service → Model → Database
↓
Response ← Controller ← Service ←─┘
\`\`\`

1. **Routes** - Define API endpoints and map to controllers
2. **Controllers** - Handle HTTP requests/responses, validate input
3. **Services** - Business logic, data processing
4. **Models** - Data access layer (currently in-memory, ready for DB integration)

### Error Handling

Centralized error handling ensures consistent error responses:

\`\`\`typescript
try {
// Controller logic
const result = await service.getSomething();
res.json({ success: true, data: result });
} catch (error) {
next(error); // Passed to error handler middleware
}
\`\`\`

### Configuration

Environment-based configuration in \`src/config/index.ts\`:

\`\`\`typescript
export const config = {
env: process.env.NODE_ENV || 'development',
port: parseInt(process.env.PORT || '5000', 10),
apiVersion: process.env.API_VERSION || 'v1',
allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
logLevel: process.env.LOG_LEVEL || 'dev',
};
\`\`\`

## ��� Security Features

- **Helmet.js** - Sets security headers
- **CORS** - Configurable cross-origin resource sharing
- **Input Validation** - Type checking via TypeScript
- **Error Sanitization** - Production errors don't leak sensitive data

## ��� Deployment

### Docker Deployment

The server includes Docker support. See the root \`docker-compose.yml\`:

\`\`\`bash

# Build and run with Docker Compose

docker-compose up server

# Server will be available at http://localhost:5000

\`\`\`

### Manual Deployment

1. **Build the application**
   \`\`\`bash
   npm run build
   \`\`\`

2. **Set production environment variables**
   \`\`\`env
   NODE_ENV=production
   PORT=5000
   ALLOWED_ORIGINS=https://yourdomain.com
   \`\`\`

3. **Start the server**
   \`\`\`bash
   npm start
   \`\`\`

### Environment Variables for Production

\`\`\`env
NODE_ENV=production
PORT=5000
API_VERSION=v1
ALLOWED_ORIGINS=https://your-frontend-domain.com
LOG_LEVEL=combined
\`\`\`

## ���️ Database Integration

Currently using in-memory storage. To integrate a real database:

1. **Install database client**
   \`\`\`bash
   npm install pg # PostgreSQL

   # or

   npm install mysql2 # MySQL

   # or

   npm install mongodb # MongoDB
   \`\`\`

2. **Update \`src/models/data.ts\`** to use actual database connection

3. **Add database configuration** to \`.env\`:
   \`\`\`env
   DATABASE_URL=postgresql://user:password@localhost:5432/dmor_paints
   \`\`\`

4. **Implement connection pooling** in \`src/config/database.ts\`

## �� Logging

Morgan middleware provides HTTP request logging:

- **Development**: Detailed colored logs
- **Production**: Combined Apache-style logs

Custom logging can be added in \`src/middleware/logger.ts\`

## ��� Testing

### Adding Tests

Install testing framework:
\`\`\`bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
\`\`\`

Create test configuration (\`jest.config.js\`):
\`\`\`javascript
module.exports = {
preset: 'ts-jest',
testEnvironment: 'node',
roots: ['<rootDir>/src'],
testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
};
\`\`\`

Example test (\`src/controllers/**tests**/DepartmentController.test.ts\`):
\`\`\`typescript
import request from 'supertest';
import app from '../../index';

describe('Department API', () => {
it('should get all departments', async () => {
const res = await request(app).get('/api/v1/departments');
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
});
});
\`\`\`

## ��� Contributing

1. Follow the existing code structure (MVC pattern)
2. Use TypeScript strict mode
3. Add proper error handling
4. Document new endpoints in this README
5. Ensure all services are properly typed

## ��� API Examples

### Create Department

\`\`\`bash
curl -X POST http://localhost:5000/api/v1/departments \
 -H "Content-Type: application/json" \
 -d '{
"name": "Quality Control",
"description": "Quality assurance department"
}'
\`\`\`

### Get All Employees

\`\`\`bash
curl http://localhost:5000/api/v1/employees
\`\`\`

### Update Product

\`\`\`bash
curl -X PUT http://localhost:5000/api/v1/products/1 \
 -H "Content-Type: application/json" \
 -d '{
"name": "Premium Paint - Red",
"price": 299.99,
"stock": 150
}'
\`\`\`

## ��� Troubleshooting

### Port already in use

\`\`\`bash

# Kill process on port 5000

npx kill-port 5000
\`\`\`

### CORS issues

Ensure your frontend URL is in \`ALLOWED_ORIGINS\` in \`.env\`

### TypeScript errors

\`\`\`bash

# Check for type errors

npx tsc --noEmit
\`\`\`

## ��� Support

For issues and questions, please refer to the main project README or create an issue in the repository.

## ��� License

This project is part of the Morex Technologies ERP system.
