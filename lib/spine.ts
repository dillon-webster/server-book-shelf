import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

interface SpineColors {
  bg: string;
  text: string;
  accent: string;
}

const DEFAULTS: SpineColors = { bg: "#3a1e0a", text: "#f5e6c8", accent: "#c8923a" };

async function extractColors(coverUrl: string, ai: GoogleGenAI): Promise<SpineColors> {
  const res = await fetch(coverUrl);
  if (!res.ok) return DEFAULTS;
  const buf = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: 'Analyze this book cover and return ONLY a JSON object, no explanation: {"bg":"#xxxxxx","text":"#xxxxxx","accent":"#xxxxxx"} — bg is the dominant spine/background color, text is a high-contrast color for reading on bg (usually white or cream for dark bg, dark for light bg), accent is the most prominent decorative color (gold, silver, etc). Return only valid JSON.',
          },
          { inlineData: { mimeType, data: Buffer.from(buf).toString("base64") } },
        ],
      },
    ],
  });

  const raw = result.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? "";
  const match = raw.match(/\{[^}]+\}/);
  if (!match) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(match[0]) } as SpineColors;
  } catch {
    return DEFAULTS;
  }
}

function buildSpineSVG(title: string, c: SpineColors): string {
  const W = 60;
  const H = 300;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const titleFontSize = title.length > 22 ? 10 : title.length > 14 ? 12 : 14;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="t" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0,4 L4,0" stroke="#000" stroke-width="0.6" opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#t)"/>
  <rect width="${W}" height="7" fill="${c.accent}" opacity="0.65"/>
  <rect y="7" width="${W}" height="1" fill="${c.text}" opacity="0.15"/>
  <rect y="${H - 8}" width="${W}" height="1" fill="${c.text}" opacity="0.15"/>
  <rect y="${H - 7}" width="${W}" height="7" fill="${c.accent}" opacity="0.65"/>
  <g transform="translate(${W / 2},${H / 2}) rotate(-90)">
    <text text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${titleFontSize}" font-weight="bold" fill="${c.text}" letter-spacing="2.5">${esc(title.toUpperCase())}</text>
  </g>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${c.accent}" opacity="0.85">◆</text>
</svg>`;
}

export async function generateSpine(bookId: number): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.spineImageData) return;

  const ai = new GoogleGenAI({ apiKey });

  try {
    let colors = DEFAULTS;
    if (book.coverUrl) {
      colors = await extractColors(book.coverUrl, ai).catch(() => DEFAULTS);
    }

    const svg = buildSpineSVG(book.title, colors);
    const spineImageData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    await prisma.book.update({ where: { id: bookId }, data: { spineImageData } });
  } catch (e) {
    console.error(`[spine] failed for book ${bookId}:`, e);
  }
}
