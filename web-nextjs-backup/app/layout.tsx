import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Your digital second brain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} dark h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
