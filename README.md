# SiteChat

SiteChat is a full-stack SaaS that lets users paste a website URL and generate an AI chatbot trained on website content.

## Stack

- Next.js App Router
- Node.js API routes
- OpenAI API
- Supabase (Auth + Postgres + pgvector)
- Tailwind CSS

## Features

- Landing page with CTA
- Magic-link auth via Supabase
- User dashboard for creating bots from website URLs
- Website crawler and text extraction
- Embeddings training pipeline (`text-embedding-3-small`)
- Chat API for web app and embeddable widget
- Embeddable script (`/embed.js`) with `data-bot`
- Pricing limits:
  - Free: 1 bot, 500 messages/month
  - Pro: unlimited bots/messages
- Admin dashboard for users, bots, and message usage

## Project Structure

- `app/` - pages and API routes
- `components/` - UI components
- `lib/` - scraper, training, chat, auth, env, pricing
- `supabase/schema.sql` - database schema + RLS + vector function

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS` (comma-separated)

## Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication, configure email sign-in and magic links.
4. Add your app URL + callback URL in auth redirect settings:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain/auth/callback`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Push repository to GitHub.
2. Import project into Vercel.
3. Add all environment variables in Vercel project settings.
4. Deploy.

## Embed Script

Each bot gets an embed snippet from bot detail page:

```html
<script src="https://sitechat.ai/embed.js" data-bot="BOT_ID"></script>
```

For local testing:

```html
<script src="http://localhost:3000/embed.js" data-bot="BOT_ID"></script>
```

## Notes

- `app/api/chat/route.ts` is CORS-enabled for external widget usage.
- Widget script renders a floating launcher and chat panel on any site.
- Plan enforcement is checked server-side in bot creation and chat APIs.
