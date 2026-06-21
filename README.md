# Jointify Web

Financial clarity for couples — a Next.js web app.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (radix-nova)
- **Icons**: lucide-react
- **Data fetching**: TanStack Query v5
- **HTTP client**: Axios
- **Auth**: Cookie-based JWT (`js-cookie`)
- **Theme**: next-themes (dark by default)
- **Forms**: react-hook-form + zod

## How It Works

### Routing

The app uses Next.js route groups to separate concerns:

```
/                   → redirects to /login
/(auth)
  /login
  /register
  /forgot-password
/(dashboard)
  /dashboard
```

### Auth Flow

1. On login, a JWT token is stored in a cookie (7-day expiry).
2. `AuthProvider` reads the cookie on mount, calls `/me` to hydrate the user, and exposes `user`, `loading`, `logout`, and `setUser` via context.
3. On any `401` response, Axios automatically clears the cookie and redirects to `/login`.

### Providers

Wrapped in `RootLayout` in this order:

```
ThemeProvider → QueryProvider → AuthProvider → page
```

- `ThemeProvider` — manages dark/light mode via the `dark` class on `<html>`
- `QueryProvider` — TanStack Query client (5 min stale time, 1 retry)
- `AuthProvider` — global user session state

### Theme

Default is **dark mode**. System preference is ignored (`enableSystem={false}`).  
To toggle theme in any client component:

```ts
import { useTheme } from 'next-themes';

const { setTheme } = useTheme();
setTheme('light'); // or 'dark'
```

### API Client

`src/lib/api.ts` exports a pre-configured Axios instance that:
- Sets `baseURL` from `NEXT_PUBLIC_API_URL`
- Attaches `Authorization: Bearer <token>` on every request
- Redirects to `/login` on `401`

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.local.example .env.local
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

### Running

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start

# Lint
pnpm lint
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
