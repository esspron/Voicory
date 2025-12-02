<p align="center">
  <a href="https://voicory.com">
    <img src="https://voicory.com/logo.png" width="80" alt="Voicory Logo" />
  </a>
</p>

<h1 align="center">Voicory Dashboard</h1>

<p align="center">
  <strong>Enterprise-grade AI Voice Assistant Platform</strong>
  <br />
  Build, deploy, and manage intelligent voice agents at scale
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#development">Development</a> •
  <a href="#testing">Testing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-6.2-646cff?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Supabase-2.84-3fcf8e?style=flat-square&logo=supabase" />
</p>

---

## Features

- 🤖 **AI Assistant Builder** - Create and configure intelligent voice agents with custom prompts
- 📞 **Voice Calls** - Inbound/outbound call handling with real-time transcription
- 💬 **WhatsApp Integration** - Connect AI assistants to WhatsApp Business
- 📚 **Knowledge Base** - Upload documents for RAG-powered responses
- 📊 **Analytics Dashboard** - Track call metrics, costs, and performance
- 🔐 **Enterprise Security** - RLS-enabled database, API key management
- 💳 **Billing Integration** - Stripe & Razorpay payment processing
- 🎨 **Premium UI** - Glassmorphism design with OKLCH P3 colors

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Environment variables (see `.env.local.example`)

### Installation

```bash
# Clone the repository
git clone https://github.com/voicory/dashboard.git
cd dashboard/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build** | Vite 6.2 |
| **Styling** | Tailwind CSS 4.1 (CSS-first config) |
| **Components** | HeadlessUI, Framer Motion, CVA |
| **Icons** | Phosphor Icons |
| **State** | React Context + Custom Hooks |
| **Backend** | Supabase (Auth, Database, RLS) |
| **Payments** | Stripe, Razorpay |
| **Testing** | Vitest + Testing Library |
| **Quality** | ESLint, Prettier, Husky |

## Project Structure

```
frontend/
├── components/
│   ├── ui/                 # Atom components (Button, Input, Badge, etc.)
│   ├── assistant-editor/   # Editor tab components
│   ├── billing/            # Payment modals
│   └── *.tsx               # Shared components
├── pages/                  # Route pages
├── hooks/                  # Custom React hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useAsync.ts
│   └── ...
├── contexts/               # React Context providers
├── services/               # API clients & data fetching
├── lib/                    # Utilities & constants
├── types/                  # TypeScript definitions & Zod schemas
└── __tests__/              # Test files
```

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Open Vitest UI
```

### Code Style

This project uses:
- **ESLint** with TypeScript rules
- **Prettier** with Tailwind plugin for class sorting
- **Husky** pre-commit hooks for automatic formatting
- **Strict TypeScript** configuration

### Component Patterns

```tsx
// Use CVA for variant-based components
import { Button } from '@/components/ui/Button';

<Button variant="default" size="lg" loading={isSubmitting}>
  Create Assistant
</Button>

// Use custom hooks for common patterns
import { useDebounce, useAsync } from '@/hooks';

const debouncedSearch = useDebounce(searchTerm, 300);
const { data, isLoading, execute } = useAsync(fetchAssistants);
```

## Testing

```bash
# Run all tests
npm run test:run

# Run specific test file
npm run test -- Button.test.tsx

# Watch mode for development
npm run test
```

### Test Structure

- `__tests__/` - Component tests
- `hooks/__tests__/` - Hook tests
- Tests follow AAA pattern (Arrange, Act, Assert)

## Environment Variables

```env
# Required
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_BACKEND_URL=https://your-backend.railway.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

Proprietary - All rights reserved.

---

<p align="center">
  Built with ❤️ by the <a href="https://voicory.com">Voicory</a> team
</p>
