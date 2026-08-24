import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import "remixicon/fonts/remixicon.css";


const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "StressLens",
  description: "Anonymous student stress monitoring platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
