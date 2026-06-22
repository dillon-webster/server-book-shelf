# Bookshelf MVP Design

## Purpose

Build a self-hosted, single-user reading tracker for logging books, tracking manual reading progress, and organizing books by shelf. The first version should make the core reading workflow useful before adding richer analytics.

## Scope

Included in the MVP:

- Shelf dashboard for `Currently Reading`, `Want to Read`, `Finished`, and `DNF`.
- Book search and add flow backed by Open Library metadata.
- Stored book metadata: title, author, cover URL, page count, and external source ID.
- Manual progress tracking by current page.
- Quick progress action for adding 10 pages.
- Book detail/edit flow for shelf status, current page, dates, rating, and notes.
- Prisma schema for Postgres.
- Docker setup for app plus Postgres deployment.

Out of scope for this pass:

- Kindle sync.
- Goodreads API integration.
- Multi-user accounts or social features.
- Stats dashboard.
- Complex review history.

## Architecture

The app will be a new Next.js project using TypeScript, Tailwind, Prisma, and PostgreSQL. It will follow the sibling crossword app's general pattern: Next handles UI and server-side mutations, Prisma owns database access, and Postgres stores durable app data.

The app will be single-user by design. There will be no user table or login flow in the MVP. If auth is needed later, it can be added around the existing book and shelf models without changing the primary reading data model.

## Data Model

`Book` stores canonical metadata:

- `id`
- `title`
- `author`
- `coverUrl`
- `pageCount`
- `externalId`
- timestamps

`ShelfEntry` stores the user's relationship to a book:

- `id`
- `bookId`
- `status`: `READING`, `WANT_TO_READ`, `FINISHED`, or `DNF`
- `currentPage`
- `startedAt`
- `finishedAt`
- `rating`
- `notes`
- timestamps

`ProgressLog` stores progress snapshots:

- `id`
- `shelfEntryId`
- `currentPage`
- `createdAt`

The current page lives on `ShelfEntry` for fast dashboard reads. `ProgressLog` records manual updates for future stats.

## UI

The dashboard will group books by shelf. Each book item should show cover, title, author, progress, and key dates where relevant. The layout should be compact and practical rather than marketing-style.

The add-book page will provide a search box, show Open Library results, and allow adding one result to a selected shelf. If metadata is incomplete, the app should still allow adding the book with available fields.

The book detail page will expose status, current page, quick `+10 pages`, started date, finished date, rating, and notes. Status changes should keep dates sensible: marking finished can set `finishedAt` when absent, and moving back to reading should not destroy notes or history.

## Data Flow

Open Library search runs through an app route so the UI does not depend directly on third-party response shape. The route normalizes search results into a small internal shape.

Database writes use server actions or route handlers with Prisma. Mutations should revalidate the dashboard/detail pages after updates.

## Error Handling

Open Library failures should show a useful inline error and keep the search page usable. Missing cover, author, or page count should fall back to clear placeholder UI and nullable fields.

Database errors should fail the submitted action cleanly and avoid partially updating multiple records when a progress log and shelf entry update should be atomic.

## Testing And Verification

The MVP should verify:

- Prisma schema generates successfully.
- The app builds successfully.
- Book search route normalizes representative Open Library responses.
- Core progress helper logic clamps page updates to valid ranges.
- Local dev server renders the dashboard without runtime errors.

