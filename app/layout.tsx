import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intramural",
  description: "A vertical slice MVP for intramural team management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
