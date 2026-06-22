import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Book Shelf",
  description: "A private reading tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <header className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
            <Link
              className="[font-family:var(--font-serif)] text-xl font-semibold leading-none tracking-wide text-[var(--accent)]"
              href="/"
            >
              Book Shelf
            </Link>
            <Link
              className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]"
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
