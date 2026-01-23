# Next.js Frontend Starter with Clerk Auth

A production-ready Next.js frontend starter with Clerk authentication and a modern dashboard interface.

## Features

- ✅ Next.js 16 with App Router
- ✅ TypeScript
- ✅ Clerk Authentication
- ✅ shadcn/ui Components
- ✅ Tailwind CSS v4
- ✅ Axios with JWT interceptors
- ✅ Dark/Light mode
- ✅ Responsive dashboard layout
- ✅ Protected routes with middleware

## Getting Started

### 1. Install Dependencies

Dependencies are automatically installed from imports. No manual installation needed.

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Add your Clerk keys from [https://clerk.com](https://clerk.com):

\`\`\`env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
\`\`\`

### 3. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Login page with Clerk
│   │   └── register/page.tsx      # Register page with Clerk
│   ├── dashboard/
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home
│   │   ├── profile/page.tsx       # User profile page
│   │   └── settings/page.tsx      # Settings page
│   ├── layout.tsx                 # Root layout with Clerk provider
│   └── page.tsx                   # Landing page
├── components/
│   ├── dashboard-header.tsx       # Dashboard top navbar
│   ├── dashboard-sidebar.tsx      # Sidebar navigation
│   ├── theme-provider.tsx         # Dark mode provider
│   └── user-nav.tsx               # User dropdown menu
├── hooks/
│   └── use-auth.ts                # Auth helper hook
├── lib/
│   ├── axios.ts                   # Axios instance (server-side)
│   └── axios-client.ts            # Axios instance (client-side)
└── middleware.ts                  # Route protection
\`\`\`

## Backend Integration

### Axios Configuration

Two Axios instances are provided:

1. **Server-side** (`lib/axios.ts`): For API routes and server components
2. **Client-side** (`lib/axios-client.ts`): For client components

Both automatically:
- Attach Clerk JWT to requests
- Redirect to `/login` on 401 errors

### Example API Call

\`\`\`tsx
import axiosClient from '@/lib/axios-client'

// GET request
const { data } = await axiosClient.get('/user/profile')

// POST request
await axiosClient.post('/user/profile', { name: 'John Doe' })
\`\`\`

### Backend Expected Format

Your backend should:
1. Verify the JWT from `Authorization: Bearer <token>`
2. Map `clerk_user_id` to your internal user record
3. Return user data in standard JSON format

## Authentication Flow

1. User signs in via Clerk at `/login`
2. Clerk manages the session
3. Middleware protects `/dashboard` routes
4. Axios automatically sends JWT to backend
5. Backend verifies token and returns user data

## Customization

### Updating Colors

Edit `app/globals.css` to change the color scheme:

\`\`\`css
:root {
  --primary: oklch(0.42 0.19 264);  /* Adjust these values */
  --sidebar: oklch(0.15 0 0);
  /* ... */
}
\`\`\`

### Adding Routes

1. Create new page in `app/dashboard/`
2. Add menu item to `components/dashboard-sidebar.tsx`
3. Routes are automatically protected by middleware

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
