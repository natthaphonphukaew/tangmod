import type { Metadata, Viewport } from "next";
import { Anuphan, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// เนื้อหา: Anuphan (Cadson Demak, OFL) — ไทยไม่มีหัว อ่านง่ายบนจอ
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  weight: "variable",
});

// หัวข้อ: LINE Seed Sans TH (LY Corporation, OFL 1.1) self-host จาก seed.line.me — สัญญาอนุญาตอยู่ที่ app/fonts/OFL.txt
const lineSeed = localFont({
  variable: "--font-line-seed",
  // ใช้ตัว Bold ไฟล์เดียวครอบน้ำหนัก 400–700: ตัว Regular บางเกินไปสำหรับหัวข้อ และไม่ต้องโหลดสองไฟล์
  src: [{ path: "./fonts/LINESeedSansTH_W_Bd.woff2", weight: "400 700", style: "normal" }],
  display: "swap",
  // ระหว่างโหลดใช้ Anuphan (โหลดมาแล้วสำหรับเนื้อหา) แทน ฟอนต์จะไม่กระโดดมาก
  fallback: ["var(--font-anuphan)", "sans-serif"],
});

// รหัสตึก (N11, S4)
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "ทางมด — แคมปัสบางมดที่คุยได้",
  description:
    "ถามเรื่องสาขา ค่าเทอม การสมัคร ของกิน และที่อ่านหนังสือใน มจธ. บางมด แล้วดูคำตอบบนแผนที่ (โปรเจกต์นักศึกษา ไม่ใช่ช่องทางทางการของมหาวิทยาลัย)",
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${anuphan.variable} ${lineSeed.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
