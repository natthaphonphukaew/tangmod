import type { Metadata, Viewport } from "next";
import { Anuphan, IBM_Plex_Mono, Mitr } from "next/font/google";
import "./globals.css";

// เนื้อหา: Anuphan (Cadson Demak, OFL) — ไทยไม่มีหัว อ่านง่ายบนจอ
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  weight: "variable",
});

// หัวข้อ/ชื่อ persona: Mitr (OFL) — รอสลับเป็น LINE Seed Sans TH แบบ self-host
const mitr = Mitr({
  variable: "--font-mitr",
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
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
      className={`${anuphan.variable} ${mitr.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
