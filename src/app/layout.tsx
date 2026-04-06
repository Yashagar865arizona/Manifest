import type { Metadata } from "next";
import { Geist, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Radar — Stop being the last to know.",
  description:
    "Radar reads your team's work signals — GitHub, Slack, Jira — to surface quiet risks before they become surprises. No surveys. No check-ins. No behavior change required.",
  openGraph: {
    title: "Radar — Management Intelligence",
    description:
      "Stop being the last to know. Radar surfaces quiet risks before they become surprises.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${syne.variable} h-full antialiased`} style={{ colorScheme: "dark" }}>
      <body style={{ minHeight: "100%", background: "#050505", color: "#F7F7F8" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
