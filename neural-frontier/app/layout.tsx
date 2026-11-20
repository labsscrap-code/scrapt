import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "eth-orchestrator // live telemetry",
  description:
    "Real-time telemetry and orchestration HUD for an ETH trading bot.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mono.variable} data-accent="blue" suppressHydrationWarning>
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
