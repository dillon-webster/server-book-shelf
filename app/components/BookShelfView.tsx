'use client';

import { useState } from 'react';
import Link from 'next/link';

type BookEntry = {
  id: number;
  bookId: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  spineImageData: string | null;
  currentPage: number;
  currentPercent: number | null;
  pageCount: number | null;
};

type ShelfData = {
  status: string;
  label: string;
  accentColor: string;
  emptyMessage: string;
  entries: BookEntry[];
};

type Props = {
  shelves: ShelfData[];
  totalBooks: number;
};

const SPINE_COLORS = [
  '#5c2d1e',
  '#1e3a5c',
  '#1e5c3a',
  '#5c1e3a',
  '#3a2d1e',
  '#2d1e5c',
  '#5c3a1e',
];

function spineColor(bookId: number): string {
  return SPINE_COLORS[bookId % SPINE_COLORS.length];
}

function progressLabel(
  currentPage: number,
  pageCount: number | null,
  currentPercent: number | null,
): string | null {
  if (pageCount) {
    return `${currentPage} / ${pageCount} pages`;
  }
  if (currentPercent !== null) {
    return `${currentPercent}%`;
  }
  return currentPage > 0 ? `${currentPage} pages read` : null;
}

function progressPercent(
  currentPage: number,
  pageCount: number | null,
  currentPercent: number | null,
): number | null {
  if (pageCount && pageCount > 0) {
    return Math.min(100, Math.round((currentPage / pageCount) * 100));
  }
  if (currentPercent !== null) {
    return Math.min(100, currentPercent);
  }
  return null;
}

// ─── Ghost spine placeholder for empty shelves ───────────────────────────────

function GhostSpines() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        padding: '0 12px',
      }}
    >
      {[90, 104, 88, 96, 100].map((h, i) => (
        <div
          key={i}
          style={{
            width: '28px',
            height: `${h}px`,
            borderRadius: '2px 2px 0 0',
            background: 'rgba(180,140,80,0.06)',
            border: '1px solid rgba(180,140,80,0.10)',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Individual book spine ────────────────────────────────────────────────────

function BookSpine({
  entry,
  isSelected,
  accentColor,
  onClick,
}: {
  entry: BookEntry;
  isSelected: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const bg = spineColor(entry.bookId);
  const spineImg = entry.spineImageData || entry.coverUrl;

  if (isSelected) {
    return (
      <button
        onClick={onClick}
        title={entry.title}
        style={{
          width: '80px',
          height: '120px',
          borderRadius: '3px 3px 0 0',
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 12px ${accentColor}55, 0 6px 20px rgba(0,0,0,0.6)`,
          transform: 'translateY(-14px)',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          cursor: 'pointer',
          flexShrink: 0,
          overflow: 'hidden',
          background: bg,
          position: 'relative',
          padding: 0,
        }}
      >
        {entry.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={entry.coverUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
        ) : spineImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={spineImg}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.65)',
              padding: '6px 4px',
              display: 'block',
              overflow: 'hidden',
              maxHeight: '100%',
              lineHeight: 1.2,
              fontFamily: 'var(--font-serif), Georgia, serif',
            }}
          >
            {entry.title}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title={entry.title}
      style={{
        width: '32px',
        height: '100px',
        borderRadius: '2px 2px 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        transform: 'translateY(0)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        flexShrink: 0,
        overflow: 'hidden',
        background: bg,
        position: 'relative',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}
    >
      {spineImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={spineImg}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            opacity: entry.spineImageData ? 1 : 0.75,
          }}
        />
      ) : (
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '8px',
            color: 'rgba(255,255,255,0.55)',
            padding: '5px 3px',
            display: 'block',
            overflow: 'hidden',
            maxHeight: '100%',
            lineHeight: 1.2,
            fontFamily: 'var(--font-serif), Georgia, serif',
          }}
        >
          {entry.title}
        </span>
      )}
    </button>
  );
}

// ─── Drawer that slides out below the shelf ───────────────────────────────────

function BookDrawer({
  entry,
  accentColor,
  open,
}: {
  entry: BookEntry;
  accentColor: string;
  open: boolean;
}) {
  const label = progressLabel(entry.currentPage, entry.pageCount, entry.currentPercent);
  const pct = progressPercent(entry.currentPage, entry.pageCount, entry.currentPercent);

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: open ? '240px' : '0px',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          borderTop: `2px solid ${accentColor}66`,
          background: 'linear-gradient(to bottom, #1a1208 0%, #120e06 100%)',
          padding: '14px 16px 16px',
        }}
      >
        {/* Title */}
        <p
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {entry.title}
        </p>

        {/* Author */}
        {entry.author ? (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              margin: '3px 0 0',
            }}
          >
            {entry.author}
          </p>
        ) : null}

        {/* Ornament divider */}
        <p
          style={{
            fontSize: '0.65rem',
            color: `${accentColor}88`,
            margin: '8px 0',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}
        >
          ◆ ─── ◆
        </p>

        {/* Progress */}
        {label ? (
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--muted)',
              margin: '0 0 5px',
            }}
          >
            {label}
          </p>
        ) : null}

        {pct !== null ? (
          <div
            style={{
              height: '4px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: accentColor,
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '12px' }} />
        )}

        {/* View details link */}
        <Link
          href={`/books/${entry.bookId}`}
          style={{
            display: 'inline-block',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: accentColor,
            border: `1px solid ${accentColor}66`,
            borderRadius: '4px',
            padding: '4px 10px',
            letterSpacing: '0.04em',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = `${accentColor}22`;
            (e.currentTarget as HTMLAnchorElement).style.borderColor = accentColor;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}66`;
          }}
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── Single cabinet (one shelf status) ───────────────────────────────────────

function Cabinet({
  shelf,
  selectedEntryId,
  onSelect,
}: {
  shelf: ShelfData;
  selectedEntryId: number | undefined;
  onSelect: (entryId: number | undefined) => void;
}) {
  const { accentColor, label, entries, emptyMessage } = shelf;

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) ?? null;

  return (
    <div
      style={{
        background: 'linear-gradient(175deg, #2e1f0a 0%, #1c1208 50%, #140d06 100%)',
        border: '2px solid #6b4c28',
        borderRadius: '12px 12px 6px 6px',
        boxShadow:
          'inset 0 1px 0 rgba(180,130,60,0.15), 0 4px 24px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nameplate */}
      <div
        style={{
          padding: '10px 14px 8px',
          textAlign: 'center',
          background: `${accentColor}12`,
          borderBottom: `1px solid ${accentColor}33`,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: accentColor,
            margin: 0,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '0.65rem',
            color: `${accentColor}99`,
            margin: '2px 0 0',
          }}
        >
          {entries.length} {entries.length === 1 ? 'book' : 'books'}
        </p>
      </div>

      {/* Shelf zone */}
      <div
        style={{
          minHeight: '200px',
          background:
            'linear-gradient(to bottom, #1a1008 0%, #231508 60%, #3a2210 100%)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Books or ghost placeholders */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '12px 12px 0',
            minHeight: '140px',
          }}
        >
          {entries.length === 0 ? (
            <GhostSpines />
          ) : (
            entries.map((entry) => (
              <BookSpine
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedEntryId}
                accentColor={accentColor}
                onClick={() => {
                  onSelect(entry.id === selectedEntryId ? undefined : entry.id);
                }}
              />
            ))
          )}
        </div>

        {/* Empty shelf flavor message */}
        {entries.length === 0 ? (
          <p
            style={{
              fontSize: '0.7rem',
              color: `${accentColor}55`,
              textAlign: 'center',
              padding: '6px 12px 4px',
              whiteSpace: 'pre-line',
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            {emptyMessage}
          </p>
        ) : null}

        {/* Shelf surface strip */}
        <div
          style={{
            height: '14px',
            background:
              'linear-gradient(to bottom, #6b4c28 0%, #4a3318 50%, #3a2810 100%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Drawer */}
      {selectedEntry ? (
        <BookDrawer
          entry={selectedEntry}
          accentColor={accentColor}
          open={!!selectedEntryId}
        />
      ) : (
        // Keep a closed drawer shell so the collapse animation fires
        // when a previously open drawer unmounts — we handle this via
        // rendering null since there's nothing to animate out.
        null
      )}
    </div>
  );
}

// ─── Currently Reading featured card ─────────────────────────────────────────

function CurrentlyReadingCard({ shelf }: { shelf: ShelfData }) {
  const { accentColor, entries } = shelf;
  const book = entries[0] ?? null;

  if (!book) {
    return (
      <div
        style={{
          background: 'linear-gradient(175deg, #2e1f0a 0%, #1c1208 50%, #140d06 100%)',
          border: '2px solid #6b4c28',
          borderRadius: '10px',
          boxShadow: 'inset 0 1px 0 rgba(180,130,60,0.15), 0 4px 24px rgba(0,0,0,0.5)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '76px',
            borderRadius: '3px',
            background: 'rgba(180,140,80,0.06)',
            border: '1px solid rgba(180,140,80,0.10)',
            flexShrink: 0,
          }}
        />
        <p style={{ fontSize: '0.75rem', color: `${accentColor}66`, fontStyle: 'italic', margin: 0 }}>
          {shelf.emptyMessage}
        </p>
      </div>
    );
  }

  const label = progressLabel(book.currentPage, book.pageCount, book.currentPercent);
  const pct = progressPercent(book.currentPage, book.pageCount, book.currentPercent);

  return (
    <div
      style={{
        background: 'linear-gradient(175deg, #2e1f0a 0%, #1c1208 50%, #140d06 100%)',
        border: `2px solid ${accentColor}55`,
        borderRadius: '10px',
        boxShadow: `inset 0 1px 0 rgba(180,130,60,0.15), 0 0 20px ${accentColor}18, 0 4px 24px rgba(0,0,0,0.5)`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Cover */}
      <div
        style={{
          width: '52px',
          height: '76px',
          borderRadius: '3px',
          overflow: 'hidden',
          flexShrink: 0,
          background: spineColor(book.bookId),
          border: `1px solid ${accentColor}44`,
        }}
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={book.coverUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
        ) : book.spineImageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={book.spineImageData}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : null}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            margin: 0,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {book.title}
        </p>
        {book.author && (
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '2px 0 8px' }}>
            {book.author}
          </p>
        )}

        {label && (
          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', margin: '0 0 4px' }}>
            {label}
          </p>
        )}
        {pct !== null && (
          <div
            style={{
              height: '3px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: accentColor,
                borderRadius: '2px',
              }}
            />
          </div>
        )}

        <Link
          href={`/books/${book.bookId}`}
          style={{
            display: 'inline-block',
            fontSize: '0.68rem',
            fontWeight: 600,
            color: accentColor,
            border: `1px solid ${accentColor}66`,
            borderRadius: '4px',
            padding: '3px 8px',
            letterSpacing: '0.04em',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = `${accentColor}22`;
            (e.currentTarget as HTMLAnchorElement).style.borderColor = accentColor;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}66`;
          }}
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function BookShelfView({ shelves, totalBooks }: Props) {
  const [selected, setSelected] = useState<Partial<Record<string, number>>>({});

  const readingShelf = shelves.find((s) => s.status === 'READING');
  const otherShelves = shelves.filter((s) => s.status !== 'READING');

  return (
    <div>
      {/* Header */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: '1.875rem',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Reading Tracker
          </h1>
          <p
            style={{
              marginTop: '4px',
              fontSize: '0.875rem',
              color: 'var(--muted)',
            }}
          >
            Manual shelves and progress for your books.
          </p>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
          {totalBooks} {totalBooks === 1 ? 'book' : 'books'} tracked
        </p>
      </section>

      {/* Currently Reading */}
      {readingShelf && (
        <div style={{ marginBottom: '28px' }}>
          <p
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: readingShelf.accentColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Currently Reading
          </p>
          <CurrentlyReadingCard shelf={readingShelf} />
        </div>
      )}

      {/* Cabinets grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {otherShelves.map((shelf) => (
          <Cabinet
            key={shelf.status}
            shelf={shelf}
            selectedEntryId={selected[shelf.status]}
            onSelect={(entryId) =>
              setSelected((prev) => ({ ...prev, [shelf.status]: entryId }))
            }
          />
        ))}
      </div>
    </div>
  );
}
