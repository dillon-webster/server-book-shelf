# Bookshelf MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted single-user bookshelf app with shelves, Open Library search, manual progress updates, ratings, notes, Prisma/Postgres persistence, and Docker deployment.

**Architecture:** A Next.js App Router project owns the UI, route handlers, and server actions. Prisma models `Book`, `ShelfEntry`, and `ProgressLog` persist the reading tracker state in Postgres. Small library modules normalize Open Library data and contain progress/status logic so core behavior can be tested outside React.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Node test runner via `tsx --test`, Docker Compose.

---

## File Structure

- Create `package.json`: scripts and dependencies for Next, Prisma, TypeScript, Tailwind, tests, and production.
- Create `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`: project configuration.
- Create `app/layout.tsx`, `app/page.tsx`, `app/add/page.tsx`, `app/books/[id]/page.tsx`, `app/globals.css`: App Router pages and global styling.
- Create `app/api/search/route.ts`: Open Library search endpoint.
- Create `app/actions/books.ts`: server actions for adding books and updating shelf/progress.
- Create `lib/prisma.ts`: Prisma client singleton.
- Create `lib/open-library.ts`: Open Library response normalization and fetch helper.
- Create `lib/progress.ts`: page clamping and next status/date helper logic.
- Create `lib/shelves.ts`: shelf labels and display ordering.
- Create `lib/open-library.test.ts`, `lib/progress.test.ts`: focused unit tests.
- Create `prisma/schema.prisma`: Postgres data model.
- Create `Dockerfile`, `docker-compose.yml`: home-server deployment.

---

### Task 1: Scaffold Project Configuration

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create package scripts and dependencies**

Create `package.json`:

```json
{
  "name": "book-shelf",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx --test lib/*.test.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@prisma/client": "^6.10.1",
    "next": "^15.3.4",
    "prisma": "^6.10.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@tailwindcss/postcss": "^4.1.10",
    "@types/node": "^20.19.1",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "eslint": "^9.29.0",
    "eslint-config-next": "^15.3.4",
    "tailwindcss": "^4.1.10",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Add TypeScript and Next config**

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Add CSS, lint, env, and git ignore config**

Create `postcss.config.mjs`:

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

Create `eslint.config.mjs`:

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

Create `.gitignore`:

```gitignore
node_modules
.next
out
build
dist
.env
.env.local
.env.*.local
npm-debug.log*
.DS_Store
```

Create `.env.example`:

```dotenv
DATABASE_URL="postgresql://bookshelf:bookshelf@localhost:5432/bookshelf?schema=public"
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 5: Commit scaffold config**

Run:

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs .gitignore .env.example
git commit -m "chore: scaffold bookshelf app config"
```

Expected: commit succeeds.

---

### Task 2: Add Prisma Data Model

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ShelfStatus {
  READING
  WANT_TO_READ
  FINISHED
  DNF
}

model Book {
  id         Int          @id @default(autoincrement())
  title      String
  author     String?
  coverUrl   String?
  pageCount  Int?
  externalId String?      @unique
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  shelfEntry ShelfEntry?
}

model ShelfEntry {
  id           Int           @id @default(autoincrement())
  bookId       Int           @unique
  status       ShelfStatus   @default(WANT_TO_READ)
  currentPage  Int           @default(0)
  startedAt    DateTime?
  finishedAt   DateTime?
  rating       Int?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  book         Book          @relation(fields: [bookId], references: [id], onDelete: Cascade)
  progressLogs ProgressLog[]
}

model ProgressLog {
  id           Int        @id @default(autoincrement())
  shelfEntryId Int
  currentPage  Int
  createdAt    DateTime   @default(now())
  shelfEntry   ShelfEntry @relation(fields: [shelfEntryId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Add Prisma client singleton**

Create `lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generates without schema errors.

- [ ] **Step 4: Commit Prisma model**

Run:

```bash
git add prisma/schema.prisma lib/prisma.ts
git commit -m "feat: add bookshelf prisma model"
```

Expected: commit succeeds.

---

### Task 3: Add Tested Open Library Normalization

**Files:**
- Create: `lib/open-library.ts`
- Create: `lib/open-library.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Create `lib/open-library.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpenLibrarySearch } from "./open-library";

test("normalizes Open Library docs into app search results", () => {
  const results = normalizeOpenLibrarySearch({
    docs: [
      {
        key: "/works/OL82563W",
        title: "The Left Hand of Darkness",
        author_name: ["Ursula K. Le Guin"],
        cover_i: 8739161,
        number_of_pages_median: 304,
      },
    ],
  });

  assert.deepEqual(results, [
    {
      externalId: "OL82563W",
      title: "The Left Hand of Darkness",
      author: "Ursula K. Le Guin",
      coverUrl: "https://covers.openlibrary.org/b/id/8739161-L.jpg",
      pageCount: 304,
    },
  ]);
});

test("keeps partial Open Library records usable", () => {
  const results = normalizeOpenLibrarySearch({
    docs: [{ key: "/works/OL1W", title: "Untitled" }],
  });

  assert.deepEqual(results, [
    {
      externalId: "OL1W",
      title: "Untitled",
      author: null,
      coverUrl: null,
      pageCount: null,
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `lib/open-library.ts` does not exist.

- [ ] **Step 3: Implement Open Library helper**

Create `lib/open-library.ts`:

```ts
export type BookSearchResult = {
  externalId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDoc[];
};

export function normalizeOpenLibrarySearch(
  payload: OpenLibrarySearchResponse,
): BookSearchResult[] {
  return (payload.docs ?? [])
    .filter((doc) => doc.key && doc.title)
    .slice(0, 12)
    .map((doc) => {
      const externalId = doc.key?.split("/").pop() ?? doc.key ?? "";

      return {
        externalId,
        title: doc.title ?? "Untitled",
        author: doc.author_name?.[0] ?? null,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null,
        pageCount: doc.number_of_pages_median ?? null,
      };
    });
}

export async function searchOpenLibrary(
  query: string,
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    fields: "key,title,author_name,cover_i,number_of_pages_median",
    limit: "12",
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Open Library search failed");
  }

  return normalizeOpenLibrarySearch(await response.json());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test
```

Expected: PASS for both Open Library tests.

- [ ] **Step 5: Commit Open Library helper**

Run:

```bash
git add lib/open-library.ts lib/open-library.test.ts
git commit -m "feat: add open library search normalization"
```

Expected: commit succeeds.

---

### Task 4: Add Tested Progress Helpers

**Files:**
- Create: `lib/progress.ts`
- Create: `lib/progress.test.ts`

- [ ] **Step 1: Write failing progress tests**

Create `lib/progress.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { clampCurrentPage, deriveStatusDates } from "./progress";

test("clamps current page between zero and page count", () => {
  assert.equal(clampCurrentPage(-4, 300), 0);
  assert.equal(clampCurrentPage(120, 300), 120);
  assert.equal(clampCurrentPage(450, 300), 300);
});

test("allows current page above unknown page count", () => {
  assert.equal(clampCurrentPage(450, null), 450);
});

test("sets finished date when marking finished", () => {
  const result = deriveStatusDates({
    nextStatus: "FINISHED",
    previousFinishedAt: null,
    previousStartedAt: null,
    now: new Date("2026-06-22T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    startedAt: null,
    finishedAt: new Date("2026-06-22T12:00:00.000Z"),
  });
});

test("sets started date when moving to reading", () => {
  const result = deriveStatusDates({
    nextStatus: "READING",
    previousFinishedAt: null,
    previousStartedAt: null,
    now: new Date("2026-06-22T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    startedAt: new Date("2026-06-22T12:00:00.000Z"),
    finishedAt: null,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `lib/progress.ts` does not exist.

- [ ] **Step 3: Implement progress helpers**

Create `lib/progress.ts`:

```ts
export type ShelfStatusValue = "READING" | "WANT_TO_READ" | "FINISHED" | "DNF";

export function clampCurrentPage(
  requestedPage: number,
  pageCount: number | null,
): number {
  const safePage = Math.max(0, Math.floor(requestedPage));

  if (!pageCount || pageCount < 1) {
    return safePage;
  }

  return Math.min(safePage, pageCount);
}

export function deriveStatusDates({
  nextStatus,
  previousStartedAt,
  previousFinishedAt,
  now,
}: {
  nextStatus: ShelfStatusValue;
  previousStartedAt: Date | null;
  previousFinishedAt: Date | null;
  now: Date;
}): { startedAt: Date | null; finishedAt: Date | null } {
  if (nextStatus === "FINISHED") {
    return {
      startedAt: previousStartedAt,
      finishedAt: previousFinishedAt ?? now,
    };
  }

  if (nextStatus === "READING") {
    return {
      startedAt: previousStartedAt ?? now,
      finishedAt: previousFinishedAt,
    };
  }

  return {
    startedAt: previousStartedAt,
    finishedAt: previousFinishedAt,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test
```

Expected: PASS for Open Library and progress tests.

- [ ] **Step 5: Commit progress helpers**

Run:

```bash
git add lib/progress.ts lib/progress.test.ts
git commit -m "feat: add progress helpers"
```

Expected: commit succeeds.

---

### Task 5: Add Routes, Actions, and Shelf Metadata

**Files:**
- Create: `lib/shelves.ts`
- Create: `app/api/search/route.ts`
- Create: `app/actions/books.ts`

- [ ] **Step 1: Add shelf labels**

Create `lib/shelves.ts`:

```ts
import type { ShelfStatus } from "@prisma/client";

export const shelfOrder: ShelfStatus[] = [
  "READING",
  "WANT_TO_READ",
  "FINISHED",
  "DNF",
];

export const shelfLabels: Record<ShelfStatus, string> = {
  READING: "Currently Reading",
  WANT_TO_READ: "Want to Read",
  FINISHED: "Finished",
  DNF: "DNF",
};
```

- [ ] **Step 2: Add search API route**

Create `app/api/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { searchOpenLibrary } from "@/lib/open-library";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchOpenLibrary(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Book search is unavailable right now.", results: [] },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 3: Add server actions**

Create `app/actions/books.ts`:

```ts
"use server";

import type { ShelfStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clampCurrentPage, deriveStatusDates } from "@/lib/progress";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return new Date(`${value}T12:00:00.000Z`);
}

function parseStatus(value: FormDataEntryValue | null): ShelfStatus {
  if (
    value === "READING" ||
    value === "WANT_TO_READ" ||
    value === "FINISHED" ||
    value === "DNF"
  ) {
    return value;
  }

  return "WANT_TO_READ";
}

export async function addBook(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const externalId = String(formData.get("externalId") ?? "").trim();

  if (!title || !externalId) {
    throw new Error("A title and external ID are required.");
  }

  const author = String(formData.get("author") ?? "").trim() || null;
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;
  const pageCount = parseOptionalInt(formData.get("pageCount"));
  const status = parseStatus(formData.get("status"));
  const now = new Date();
  const dates = deriveStatusDates({
    nextStatus: status,
    previousStartedAt: null,
    previousFinishedAt: null,
    now,
  });

  const book = await prisma.book.upsert({
    where: { externalId },
    update: { title, author, coverUrl, pageCount },
    create: { title, author, coverUrl, pageCount, externalId },
  });

  await prisma.shelfEntry.upsert({
    where: { bookId: book.id },
    update: { status },
    create: {
      bookId: book.id,
      status,
      startedAt: dates.startedAt,
      finishedAt: dates.finishedAt,
    },
  });

  revalidatePath("/");
  redirect(`/books/${book.id}`);
}

export async function updateShelfEntry(bookId: number, formData: FormData) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({
    where: { bookId },
    include: { book: true },
  });
  const status = parseStatus(formData.get("status"));
  const currentPage = clampCurrentPage(
    parseOptionalInt(formData.get("currentPage")) ?? 0,
    entry.book.pageCount,
  );
  const dates = deriveStatusDates({
    nextStatus: status,
    previousStartedAt:
      parseOptionalDate(formData.get("startedAt")) ?? entry.startedAt,
    previousFinishedAt:
      parseOptionalDate(formData.get("finishedAt")) ?? entry.finishedAt,
    now: new Date(),
  });
  const rating = parseOptionalInt(formData.get("rating"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.$transaction([
    prisma.shelfEntry.update({
      where: { id: entry.id },
      data: {
        status,
        currentPage,
        startedAt: dates.startedAt,
        finishedAt: dates.finishedAt,
        rating,
        notes,
      },
    }),
    prisma.progressLog.create({
      data: { shelfEntryId: entry.id, currentPage },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
}

export async function addTenPages(bookId: number) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({
    where: { bookId },
    include: { book: true },
  });
  const currentPage = clampCurrentPage(entry.currentPage + 10, entry.book.pageCount);

  await prisma.$transaction([
    prisma.shelfEntry.update({
      where: { id: entry.id },
      data: { currentPage },
    }),
    prisma.progressLog.create({
      data: { shelfEntryId: entry.id, currentPage },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
}
```

- [ ] **Step 4: Run lint and tests**

Run:

```bash
npm test && npm run lint
```

Expected: tests pass and lint reports no errors.

- [ ] **Step 5: Commit data routes and actions**

Run:

```bash
git add lib/shelves.ts app/api/search/route.ts app/actions/books.ts
git commit -m "feat: add bookshelf routes and actions"
```

Expected: commit succeeds.

---

### Task 6: Build Core UI

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/add/page.tsx`
- Create: `app/books/[id]/page.tsx`

- [ ] **Step 1: Add global styles**

Create `app/globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: #f7f5f0;
  --foreground: #1f2933;
  --muted: #6b7280;
  --line: #d7d0c4;
  --surface: #ffffff;
  --accent: #2563eb;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 2: Add app shell**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book Shelf",
  description: "A private reading tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link className="text-xl font-semibold" href="/">
              Book Shelf
            </Link>
            <Link
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
              href="/add"
            >
              Add Book
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Add shelf dashboard**

Create `app/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";

export const dynamic = "force-dynamic";

function progressLabel(currentPage: number, pageCount: number | null) {
  if (!pageCount) {
    return `${currentPage} pages`;
  }

  return `${currentPage}/${pageCount} pages`;
}

export default async function Home() {
  const entries = await prisma.shelfEntry.findMany({
    include: { book: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Reading Tracker</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manual shelves and progress for your books.
          </p>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {entries.length} {entries.length === 1 ? "book" : "books"} tracked
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {shelfOrder.map((status) => {
          const shelfEntries = entries.filter((entry) => entry.status === status);

          return (
            <section
              className="min-h-64 rounded-md border border-[var(--line)] bg-white"
              key={status}
            >
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="font-semibold">{shelfLabels[status]}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {shelfEntries.length} books
                </p>
              </div>
              <div className="space-y-3 p-3">
                {shelfEntries.map((entry) => (
                  <Link
                    className="grid grid-cols-[48px_1fr] gap-3 rounded-md border border-[var(--line)] p-2 transition hover:border-[var(--accent)]"
                    href={`/books/${entry.book.id}`}
                    key={entry.id}
                  >
                    <div className="h-16 overflow-hidden rounded-sm bg-slate-200">
                      {entry.book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={entry.book.coverUrl}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {entry.book.title}
                      </h3>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {entry.book.author ?? "Unknown author"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {progressLabel(entry.currentPage, entry.book.pageCount)}
                      </p>
                    </div>
                  </Link>
                ))}
                {shelfEntries.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                    No books yet.
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add book search and add page**

Create `app/add/page.tsx`:

```tsx
import { addBook } from "@/app/actions/books";
import { shelfLabels, shelfOrder } from "@/lib/shelves";
import { searchOpenLibrary } from "@/lib/open-library";

export const dynamic = "force-dynamic";

export default async function AddBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await searchOpenLibrary(query).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Add Book</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search Open Library and add a result to your shelves.
        </p>
      </div>

      <form className="flex max-w-2xl gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2"
          defaultValue={query}
          name="q"
          placeholder="Title, author, or ISBN"
          type="search"
        />
        <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          Search
        </button>
      </form>

      <div className="grid gap-3">
        {results.map((book) => (
          <article
            className="grid gap-4 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-[72px_1fr]"
            key={book.externalId}
          >
            <div className="h-28 overflow-hidden rounded-sm bg-slate-200">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={book.coverUrl}
                />
              ) : null}
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold">{book.title}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {book.author ?? "Unknown author"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {book.pageCount ? `${book.pageCount} pages` : "Page count unknown"}
                </p>
              </div>
              <form action={addBook} className="flex flex-wrap gap-2">
                <input name="externalId" type="hidden" value={book.externalId} />
                <input name="title" type="hidden" value={book.title} />
                <input name="author" type="hidden" value={book.author ?? ""} />
                <input name="coverUrl" type="hidden" value={book.coverUrl ?? ""} />
                <input name="pageCount" type="hidden" value={book.pageCount ?? ""} />
                <select
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
                  name="status"
                >
                  {shelfOrder.map((status) => (
                    <option key={status} value={status}>
                      {shelfLabels[status]}
                    </option>
                  ))}
                </select>
                <button className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white">
                  Add
                </button>
              </form>
            </div>
          </article>
        ))}
        {query && results.length === 0 ? (
          <p className="rounded-md border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
            No results found, or Open Library is unavailable.
          </p>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add book detail page**

Create `app/books/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { addTenPages, updateShelfEntry } from "@/app/actions/books";
import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";

export const dynamic = "force-dynamic";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookId = Number.parseInt(id, 10);

  if (!Number.isFinite(bookId)) {
    notFound();
  }

  const entry = await prisma.shelfEntry.findUnique({
    where: { bookId },
    include: { book: true, progressLogs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  if (!entry) {
    notFound();
  }

  const updateAction = updateShelfEntry.bind(null, bookId);
  const addTenAction = addTenPages.bind(null, bookId);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4">
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
          <div className="aspect-[2/3] bg-slate-200">
            {entry.book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={entry.book.coverUrl}
              />
            ) : null}
          </div>
        </div>
        <form action={addTenAction}>
          <button className="w-full rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white">
            +10 pages
          </button>
        </form>
      </aside>

      <section className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">{entry.book.title}</h1>
          <p className="text-[var(--muted)]">
            {entry.book.author ?? "Unknown author"}
          </p>
        </div>

        <form
          action={updateAction}
          className="grid gap-4 rounded-md border border-[var(--line)] bg-white p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Shelf
              <select
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.status}
                name="status"
              >
                {shelfOrder.map((status) => (
                  <option key={status} value={status}>
                    {shelfLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Current page
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.currentPage}
                min="0"
                name="currentPage"
                type="number"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Started
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={dateInputValue(entry.startedAt)}
                name="startedAt"
                type="date"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Finished
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={dateInputValue(entry.finishedAt)}
                name="finishedAt"
                type="date"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Rating
              <select
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.rating ?? ""}
                name="rating"
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Notes
            <textarea
              className="min-h-32 rounded-md border border-[var(--line)] px-3 py-2"
              defaultValue={entry.notes ?? ""}
              name="notes"
            />
          </label>

          <button className="w-fit rounded-md bg-[var(--foreground)] px-4 py-2 font-medium text-white">
            Save
          </button>
        </form>

        <section className="rounded-md border border-[var(--line)] bg-white p-4">
          <h2 className="font-semibold">Recent Progress</h2>
          <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {entry.progressLogs.map((log) => (
              <p key={log.id}>
                Page {log.currentPage} on {log.createdAt.toLocaleDateString()}
              </p>
            ))}
            {entry.progressLogs.length === 0 ? <p>No progress updates yet.</p> : null}
          </div>
        </section>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Run lint and build**

Run:

```bash
npm run lint && npm run build
```

Expected: lint passes. Build may require a valid `DATABASE_URL`; if no local Postgres is running, use Task 7 Docker database before re-running build.

- [ ] **Step 7: Commit UI**

Run:

```bash
git add app/globals.css app/layout.tsx app/page.tsx app/add/page.tsx app/books/[id]/page.tsx
git commit -m "feat: build bookshelf ui"
```

Expected: commit succeeds.

---

### Task 7: Add Docker Deployment

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```Dockerfile
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

- [ ] **Step 2: Create docker compose file**

Create `docker-compose.yml`:

```yaml
services:
  bookshelf-db:
    image: postgres:16-alpine
    container_name: bookshelf-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: bookshelf
      POSTGRES_PASSWORD: bookshelf
      POSTGRES_DB: bookshelf
    volumes:
      - bookshelf-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookshelf -d bookshelf"]
      interval: 5s
      timeout: 5s
      retries: 10

  bookshelf:
    build: .
    container_name: bookshelf
    restart: unless-stopped
    depends_on:
      bookshelf-db:
        condition: service_healthy
    ports:
      - "3003:3000"
    environment:
      DATABASE_URL: postgresql://bookshelf:bookshelf@bookshelf-db:5432/bookshelf?schema=public

volumes:
  bookshelf-postgres:
```

- [ ] **Step 3: Commit Docker setup**

Run:

```bash
git add Dockerfile docker-compose.yml
git commit -m "chore: add docker deployment"
```

Expected: commit succeeds.

---

### Task 8: Verify End To End

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm test
```

Expected: Open Library and progress tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: lint passes with no errors.

- [ ] **Step 3: Run Prisma generate**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generates successfully.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next build succeeds. If it fails because no database exists during static analysis, keep `dynamic = "force-dynamic"` on DB-backed pages and rerun.

- [ ] **Step 5: Start local database and app**

Run:

```bash
docker compose up -d bookshelf-db
DATABASE_URL="postgresql://bookshelf:bookshelf@localhost:5432/bookshelf?schema=public" npm run prisma:migrate
DATABASE_URL="postgresql://bookshelf:bookshelf@localhost:5432/bookshelf?schema=public" npm run dev
```

Expected: dev server starts on `http://localhost:3000`.

- [ ] **Step 6: Browser smoke test**

Open `http://localhost:3000`, confirm:

- Dashboard renders four shelves.
- Add Book page loads.
- Searching for `left hand of darkness` returns Open Library results.
- Adding a book redirects to its detail page.
- `+10 pages` updates current progress.
- Saving notes/rating persists after reload.

- [ ] **Step 7: Commit verification fixes**

If verification required changes, run:

```bash
git add .
git commit -m "fix: complete bookshelf verification"
```

Expected: commit succeeds only if there were verification fixes.

---

## Self-Review

Spec coverage:

- Shelves are implemented in Tasks 5 and 6.
- Open Library add flow is implemented in Tasks 3, 5, and 6.
- Stored metadata is implemented in Task 2 and written in Task 5.
- Manual progress and `+10 pages` are implemented in Tasks 4, 5, and 6.
- Detail editing for status, dates, rating, and notes is implemented in Tasks 5 and 6.
- Prisma/Postgres is implemented in Task 2.
- Docker deployment is implemented in Task 7.
- Verification is implemented in Task 8.

Placeholder scan:

- The plan contains concrete file paths, commands, and code blocks for implementation steps.

Type consistency:

- Shelf statuses use `READING`, `WANT_TO_READ`, `FINISHED`, and `DNF` consistently.
- Open Library result fields match `addBook` hidden form fields.
- Progress helpers use the same status strings as Prisma's enum.
