'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Location, Rendition } from 'epubjs';
import { deriveEpubLocationPercentage } from '@/lib/progress';

function getCurrentLocation(rendition: Rendition) {
  return rendition.currentLocation() as unknown as Location | undefined;
}

function sameLocation(a?: Location, b?: Location) {
  return !!a && !!b && a.start?.cfi === b.start?.cfi && a.end?.cfi === b.end?.cfi;
}

type ReadingProgress = {
  epubCfi: string;
  percentage: number;
};

function getSpineLength(rendition: Rendition) {
  return (
    rendition.book as unknown as { spine?: { spineItems?: unknown[] } }
  ).spine?.spineItems?.length ?? 0;
}

export default function EpubReader({
  bookId,
  backHref,
  initialCfi,
}: {
  bookId: number;
  backHref: string;
  initialCfi: string | null;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const navigatingRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const pendingProgressRef = useRef<ReadingProgress | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [showUi, setShowUi] = useState(false);

  const flushProgressSave = useCallback(async () => {
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    try {
      while (pendingProgressRef.current) {
        const progress = pendingProgressRef.current;
        pendingProgressRef.current = null;

        const res = await fetch(`/api/books/${bookId}/reading-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progress),
          keepalive: true,
        });

        if (!res.ok) throw new Error('Failed to save reading progress');
      }
    } catch {
      // Autosave is best-effort; keep reading smooth and try again on the next page turn.
    } finally {
      saveInFlightRef.current = false;
    }
  }, [bookId]);

  const queueProgressSave = useCallback((progress: ReadingProgress) => {
    pendingProgressRef.current = progress;
    void flushProgressSave();
  }, [flushProgressSave]);

  useEffect(() => {
    let book: import('epubjs').Book;
    let cancelled = false;

    function disableIframePointerEvents() {
      viewerRef.current?.querySelectorAll('iframe').forEach((frame) => {
        frame.style.pointerEvents = 'none';
      });
    }

    async function init() {
      const ePub = (await import('epubjs')).default;
      const res = await fetch(`/api/books/${bookId}/epub`);
      const buffer = await res.arrayBuffer();
      if (cancelled) return;
      book = ePub(buffer);

      const container = viewerRef.current!;
      const rendition = book.renderTo(container, {
        manager: 'continuous',
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'none',
        snap: true,
      });
      renditionRef.current = rendition;

      rendition.themes.default({
        body: {
          background: '#140d06 !important',
          color: '#f5e6c8 !important',
          'font-family': "Georgia, 'Times New Roman', serif !important",
          'font-size': '18px !important',
          'line-height': '1.8 !important',
          padding: '0 8px !important',
        },
        a: { color: '#c8923a !important' },
      });

      const saveLocation = (location: Location) => {
        if (!location.start?.cfi) return;
        const percentage = deriveEpubLocationPercentage({
          generatedPercentage: location.start.percentage,
          spineIndex: location.start.index,
          spineLength: getSpineLength(rendition),
          displayedPage: location.start.displayed.page,
          displayedTotal: location.start.displayed.total,
        });
        queueProgressSave({
          epubCfi: location.start.cfi,
          percentage,
        });
      };

      rendition.on('rendered', disableIframePointerEvents);
      rendition.on('relocated', saveLocation);

      try {
        await rendition.display(initialCfi ?? undefined);
      } catch {
        await rendition.display();
      }
      disableIframePointerEvents();

      void book.locations.generate(1600).then(() => {
        if (!cancelled) void rendition.reportLocation();
      });

      const resize = () => {
        const rect = container.getBoundingClientRect();
        rendition.resize(Math.floor(rect.width), Math.floor(rect.height));
      };
      window.addEventListener('resize', resize);

      const navItems = await book.loaded.navigation;
      if (cancelled) return;
      setToc(navItems.toc.map((item) => ({ label: item.label.trim(), href: item.href })));

      return () => window.removeEventListener('resize', resize);
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => { cleanup = fn; });

    return () => {
      cancelled = true;
      cleanup?.();
      renditionRef.current?.destroy();
      renditionRef.current = null;
      book?.destroy();
    };
  }, [bookId, initialCfi, queueProgressSave]);

  const navigate = useCallback(async (direction: 'prev' | 'next') => {
    const rendition = renditionRef.current;
    if (!rendition || navigatingRef.current) return;

    navigatingRef.current = true;
    try {
      const before = getCurrentLocation(rendition);
      await rendition[direction]();
      const after = getCurrentLocation(rendition);

      if (direction === 'next' && sameLocation(before, after) && before?.end?.cfi) {
        await rendition.display(before.end.cfi);
      } else if (direction === 'prev' && sameLocation(before, after) && before?.start?.cfi) {
        await rendition.display(before.start.cfi);
      }
    } finally {
      navigatingRef.current = false;
    }
  }, []);

  const prev = useCallback(() => { void navigate('prev'); }, [navigate]);
  const next = useCallback(() => { void navigate('next'); }, [navigate]);
  const goTo = useCallback((href: string) => {
    void renditionRef.current?.display(href);
    setShowUi(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setShowUi(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== e.pointerId) return;
    pointerStartRef.current = null;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prev(); else next();
      return;
    }

    if (dt < 300 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) prev();
      else if (x > third * 2) next();
      else setShowUi((v) => !v);
    }
  }, [next, prev]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#140d06', zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      <div
        ref={viewerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
      />

      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ position: 'absolute', inset: 0, zIndex: 10, touchAction: 'none' }}
      />

      <style>{`
        @media (max-width: 768px), (pointer: coarse) {
          .epub-reader-bottom-nav {
            display: none !important;
          }
        }
      `}</style>

      <div className="epub-reader-bottom-nav" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(to top, rgba(20,13,6,0.97) 80%, transparent)' }}>
        <button onClick={prev} style={navBtn}>← Prev</button>
        <button onClick={() => setShowUi((v) => !v)} style={{ ...navBtn, color: '#c8923a' }}>Menu</button>
        <button onClick={next} style={navBtn}>Next →</button>
      </div>

      {/* Slide-down toolbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(20,13,6,0.97) 80%, transparent)',
        padding: '12px 16px 24px',
        transform: showUi ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.25s ease',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <Link
          href={backHref}
          style={{ fontSize: '13px', color: '#c8923a', padding: '6px 12px', border: '1px solid #6b4c28', borderRadius: '6px', background: '#1c1208', flexShrink: 0 }}
        >
          ← Back
        </Link>
        {toc.length > 0 && (
          <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: '6px' }}>
            {toc.map((item) => (
              <button
                key={item.href}
                onClick={() => goTo(item.href)}
                style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#f5e6c8', padding: '6px 10px', border: '1px solid #6b4c28', borderRadius: '6px', background: '#1c1208', cursor: 'pointer', flexShrink: 0 }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowUi(false)}
          style={{ fontSize: '18px', color: '#f5e6c8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '6px',
  border: '1px solid #6b4c28',
  background: '#1c1208',
  color: '#f5e6c8',
  fontSize: '13px',
  cursor: 'pointer',
};
