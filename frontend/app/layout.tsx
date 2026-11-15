import type { Metadata } from "next";
import "./globals.css";
import "./desk.css";
export const metadata: Metadata = {
  title: "FINN — Investor desk",
  description:
    "A source-backed intelligence workspace for Indian equity investors.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
