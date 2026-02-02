# Habit Tracker

A modern habit tracking web application built with Next.js, TypeScript, and Tailwind CSS.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React** - UI library
- **API Routes** - Built-in backend endpoints (no separate server needed!)

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

The page will auto-reload as you edit files!

## Project Structure

```
habit/
├── app/                    # Next.js App Router directory
│   ├── api/               # API routes (backend endpoints)
│   │   └── hello/         # Example API endpoint
│   │       └── route.ts   # GET /api/hello
│   ├── layout.tsx         # Root layout (wraps all pages)
│   ├── page.tsx           # Home page (/)
│   └── globals.css        # Global styles
├── public/                # Static assets (images, etc.)
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## How It Works

### Pages

- Create a new file in `app/` to create a new route
- `app/page.tsx` → `/` (home page)
- `app/about/page.tsx` → `/about`
- Supports nested routes and layouts

### API Routes

- Create API endpoints in `app/api/`
- `app/api/hello/route.ts` → `/api/hello`
- Supports GET, POST, PUT, DELETE, etc.
- No separate backend server needed!

Example API route:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello!' });
}
```

### Styling

- Uses Tailwind CSS utility classes
- Add custom styles in `app/globals.css`
- Supports dark mode out of the box

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production server
npm run lint     # Run ESLint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## Next Steps

Some ideas for building out your habit tracker:

1. Add a database (SQLite, PostgreSQL, or MongoDB)
2. Create API routes for CRUD operations
3. Build forms for adding/editing habits
4. Add user authentication
5. Create data visualization for tracking progress
6. Deploy to Vercel, Netlify, or another platform

Happy coding! 🚀
