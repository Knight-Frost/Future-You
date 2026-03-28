# FutureYou — Setup Guide

## Production Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router | Full-stack, SSR, server components, edge functions |
| Language | TypeScript | Type-safe financial math, no runtime surprises |
| Styling | Tailwind CSS + CSS Variables | Semantic design system, consistent everywhere |
| Auth | NextAuth.js v5 | JWT sessions, credentials + future OAuth |
| Database | PostgreSQL (Supabase/Railway) | Relational, reliable, scalable |
| ORM | Prisma | Type-safe queries, auto-generated client |
| Client state | Zustand | Lightweight, persistent, reactive |
| AI | Anthropic Claude Haiku | Server-side only (key never in browser) |

---

## Quick Start (Local Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` with your actual values.

### 3. Database setup

**Option A: Supabase (recommended)**
- Create project at supabase.com
- Copy the "Connection string (URI)" from Project Settings > Database
- Paste into `DATABASE_URL` in `.env.local`

**Option B: Local PostgreSQL**
```bash
createdb futureyou
# Set DATABASE_URL="postgresql://localhost:5432/futureyou"
```

### 4. Run migrations & seed
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed demo data
```

### 5. Start development server
```bash
npm run dev
```

Visit `http://localhost:3000`

Demo login: `demo@futureyou.app` / `demo123456`

---

## Production Deployment (Vercel + Supabase)

### Database
1. Create a Supabase project
2. Go to Project Settings > Database > Connection string (URI mode)
3. Copy the connection string

### Deploy to Vercel
```bash
npx vercel
```

Set environment variables in Vercel dashboard:
- `DATABASE_URL` — Supabase connection string
- `AUTH_SECRET` — Random 32-byte secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — Your Vercel deployment URL
- `ANTHROPIC_API_KEY` — Your Anthropic API key

### Post-deploy
```bash
# Run migrations against production
DATABASE_URL="your-prod-url" npx prisma migrate deploy
```

---

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Login + Register pages
│   ├── (onboarding)/     # 4-step onboarding wizard
│   ├── (app)/            # Protected app pages
│   │   ├── dashboard/    # Status overview + next steps
│   │   ├── plan/         # Full financial picture
│   │   ├── debt/         # Debt strategy + optimization
│   │   ├── goals/        # Goal management + tracking
│   │   ├── simulator/    # Interactive what-if modeling
│   │   ├── insights/     # AI coach + rule-based analysis
│   │   ├── history/      # Saved scenarios + snapshots
│   │   └── settings/     # Financial profile settings
│   └── api/              # Backend API routes
├── engine/
│   ├── calculator.ts     # Pure financial math
│   ├── optimizer.ts      # Strategy generation
│   └── insights.ts       # Rule engine + AI prompts
├── stores/
│   └── useFinancialStore.ts  # Zustand client state
├── components/
│   ├── layout/           # AppShell + Sidebar
│   └── ui/               # Design system components
└── lib/
    ├── prisma.ts          # Database client
    ├── auth.ts            # NextAuth configuration
    └── utils.ts           # Formatters + helpers
```

---

## Key Product Decisions

**Why Next.js over Vite + Express?**
One framework for frontend and backend eliminates CORS, simplifies deployment, and gives server components for fast initial renders.

**Why Zustand over Context API?**
Context API re-renders the entire tree on every change. Zustand uses selective subscriptions — only the component that uses `projection.debtPayoffMonths` re-renders when that value changes.

**Why server-side AI calls?**
The Anthropic API key is only in environment variables on the server. It's never sent to the browser. This prevents credential theft and API abuse.

**Why snapshots on every profile update?**
Users return to see progress. Snapshots let us show "you were 3 months behind in January, now you're on track" — which is the most motivating thing we can show.

---

## Financial Engine

The engine is pure functions with zero side effects:

- `calculateProjection(inputs, sliders)` → Full projection in <5ms
- `generateStrategies(inputs)` → 3 ranked debt/savings strategies
- `evaluateRules(inputs, projection)` → Instant rule-based insight
- `buildAIPrompt(request)` → Structured Claude prompt

All calculations are deterministic — same inputs always produce same outputs.
