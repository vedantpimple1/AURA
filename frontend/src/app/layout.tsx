import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura",
  description: "The team gamification platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
