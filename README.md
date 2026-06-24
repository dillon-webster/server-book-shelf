# Book Shelf

A personal reading tracker with a bookshelf UI. Track what you're reading, what's on your list, and what you've finished.

## Features

- **Currently Reading** — compact card showing your active book with progress
- **Want to Read / Finished / DNF** — shelf cabinets with spine-style book display
- Search and add books via the Open Library API
- Track reading progress by page or percentage
- AI-generated book spine art (Google Gemini)
- Book detail pages with progress logging

## Stack

- **Next.js 15** (App Router)
- **PostgreSQL** + **Prisma**
- **Google Gemini** for spine image generation

## Running locally

```bash
# Start the database
docker compose up bookshelf-db -d

# Install dependencies
npm install

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

Requires a `DATABASE_URL` env var (set automatically by Docker Compose in production).  
Requires a `GEMINI_API_KEY` env var for spine image generation.

## Running with Docker

```bash
docker compose up --build
```

App runs at `http://localhost:3003`.

EPUB uploads are stored in `./uploads` by default. On a server, point them at a mounted drive:

```bash
HOST_EPUB_UPLOADS_DIR=/path/to/5tb-drive/bookshelf-uploads docker compose up --build -d
```

## Database

```bash
npm run prisma:migrate   # create a new migration
npm run prisma:deploy    # apply migrations (used in production)
```
