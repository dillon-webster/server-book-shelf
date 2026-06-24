'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

export default function EpubReader({ bookId, backHref }: { bookId: number; backHref: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<import('epubjs').Rendition | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [showUi, setShowUi] = useState(false);

  useEffect(() => {
    let book: import('epubjs').Book;

    async function init() {
      const ePub = (await import('epubjs')).default;
      const res = await fetch(`/api/books/${bookId}/epub`);
      const buffer = await res.arrayBuffer();
      book = ePub(buffer);

      const container = viewerRef.current!;
      const rendition = book.renderTo(container, {
        width: window.innerWidth,
        height: window.innerHeight,
        flow: 'paginated',
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

      rendition.on('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') rendition.prev();
        if (e.key === 'ArrowRight') rendition.next();
      });

      await rendition.display();

      // Disable pointer events on the iframe so our overlay receives them
      container.querySelectorAll('iframe').forEach((f) => {
        f.style.pointerEvents = 'none';
      });

      const navItems = await book.loaded.navigation;
      setToc(navItems.toc.map((item) => ({ label: item.label.trim(), href: item.href })));
    }

    init();
    return () => { renditionRef.current?.destroy(); book?.destroy(); };
  }, [bookId]);

  function prev() { renditionRef.current?.prev(); }
  function next() { renditionRef.current?.next(); }
  function goTo(href: string) { renditionRef.current?.display(href); setShowUi(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setShowUi(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#140d06', zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      {/* epub.js renders here — pointer-events disabled so overlay receives all events */}
      <div
        ref={viewerRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Navigation overlay — on top of viewer */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ position: 'absolute', inset: 0, zIndex: 10, touchAction: 'none' }}
      />

      {/* Always-visible bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(to top, rgba(20,13,6,0.97) 80%, transparent)' }}>
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
