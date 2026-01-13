Modern React application for Morex Technologies ERP system built with TypeScript, Vite, and Tailwind CSS.

## Features

- ✅ React 19 with TypeScript
- ✅ Vite for fast development
- ✅ Modular component architecture
- ✅ Custom hooks for state management
- ✅ API integration with Axios
- ✅ Theme customization support
- ✅ Responsive design
- ✅ Production-ready build

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── common/      # Reusable components
│   │   ├── layout/      # Layout components (Header, Sidebar)
│   │   └── pages/       # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/
│   │   └── api/         # API client & endpoints
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # App constants
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### Installation

```bash
cd client
npm install
# or
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## API Integration

The client connects to the backend API at `http://localhost:5000/api/v1` by default.

Configure the API URL in `.env`:

```
VITE_API_URL=http://localhost:5000/api/v1
```

## Features

### Theme Customization

- Real-time theme editor
- Persistent theme settings
- JSON-based color configuration

### Master Data Management

- Departments
- Employees
- Products

### Operations

- Production batch management
- Stock reporting

## Tech Stack

- React 19
- TypeScript
- Vite
- Axios
- Lucide React (icons)
- Tailwind CSS
