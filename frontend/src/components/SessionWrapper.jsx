"use client";
/**
 * components/SessionWrapper.jsx
 * Client component that wraps app with NextAuth SessionProvider.
 */
import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
