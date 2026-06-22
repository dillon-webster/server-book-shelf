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
        <header className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
            <Link className="text-xl font-semibold leading-none" href="/">
              Book Shelf
            </Link>
            <Link
              className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
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
