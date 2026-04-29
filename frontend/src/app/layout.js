/**
 * frontend/src/app/layout.js
 * Root layout — wraps everything in SessionProvider so
 * useSession() works in all child components.
 */

import { getServerSession } from "next-auth";
import SessionWrapper from "@/components/SessionWrapper";
import "./globals.css";

export const metadata = {
  title: "SimPortal — Local Deployment Platform",
  description: "Import, build and preview GitHub projects locally",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap" 
          rel="stylesheet" 
        />
        <style>{`
          :root {
            --sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --mono: 'JetBrains Mono', monospace;
          }
          body {
            font-family: var(--sans);
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </head>
      <body>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
