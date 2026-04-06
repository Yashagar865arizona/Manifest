import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} style={{ colorScheme: "dark" }}>
      <body style={{ minHeight: "100%", background: "#020817", color: "#F1F5F9" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
