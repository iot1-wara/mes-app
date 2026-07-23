# MES Production Control System – AGENTS Guide

## Workspace Structure

```
mes-app/
├── src/                    # Backend (NestJS + TypeScript .ts)
│   ├── auth/               # JWT authentication
│   ├── alarms/             # Alarm management module
│   ├── machines/           # Machine management module
│   ├── orders/             # Production orders module
│   ├── traces/             # Process trace data module
│   ├── data-collection/    # Time-series data collection
│   ├── opcua/              # OPC UA + MQTT gateway
│   └── main.ts             # Entry point
├── frontend/               # Frontend (React 19 + Vite 7 + TypeScript .tsx)
│   ├── src/pages/          # Page components (.tsx)
│   ├── src/components/     # Shared components (.tsx)
│   ├── src/hooks/          # Custom hooks (.tsx)
│   ├── src/api/            # API client & auth helpers (.tsx)
│   └── dist/               # Production build output
├── docs/                   # Architecture, roadmap, deploy guides
├── test/                   # E2E tests (.spec.ts)
└── docker-compose.yml      # PostgreSQL service
```

## Important Conventions

### TypeScript Everywhere
- Backend files: `.ts` extension (NestJS/TypeScript 5.9)
- Frontend files: **.tsx** extension only (React components + hooks use TSX)
- No `.js` or `.jsx` files in source code — all JS was migrated to TS/TSX
- Vite resolves import extensions automatically, so use **extensionless imports** in frontend

### API Client Pattern
All protected API calls must go through the authenticated client:
```typescript
import { api } from "../api/client";
// Correct:
const data = await api.get("/machines");
await api.post("/orders", { name: "test" });
await api.del("/alarms/" + id);

// WRONG — raw fetch won't include token in Authorization header:
// fetch("/api/machines") → 401 Unauthorized
```

### Running the Project (No Timeout)
The Vite dev server runs indefinitely and does not time out. To start both backend + frontend:

```bash
# Terminal 1 — Backend (NestJS watch mode)
npm run start:dev

# Terminal 2 — Frontend (Vite hot-reload dev server)
cd frontend
npm run dev
```

Or use the NestJS auto-serve static files approach (backend embeds frontend):
```bash
# Builds frontend then starts backend with embedded static files
npm run build:frontend   # in workspace root or frontend directory
npm run start             # production, serves both
```

### Login Credentials (Development)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mes.com | admin123 |
| Operator | operator@mes.com | operator123 |

Tokens are stored in `localStorage.token` after login and automatically sent with every API request.

### Build Commands
```bash
# Full build (frontend + backend)
npm run build:frontend  # frontend/package.json: vite build
npm run build           # nest build

# TypeScript check only
npx tsc --noEmit
```
