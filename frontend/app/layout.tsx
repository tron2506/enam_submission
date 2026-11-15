import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FINN — Know what matters.",
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
