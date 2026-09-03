import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invitations",
  description: "Cinematic wedding invitations, shareable as a link.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
