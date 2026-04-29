/**
 * frontend/src/app/api/auth/[...nextauth]/route.js
 * 
 * NextAuth.js configuration with GitHub OAuth provider.
 * The accessToken is stored in the session so we can
 * call GitHub API from frontend components.
 */

import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      // Request repo access so we can list repos
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],

  callbacks: {
    // Store GitHub access token in the JWT
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },

    // Expose access token to the client session
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },

  pages: {
    signIn: "/",   // Redirect unauthenticated users to homepage
  },
});

export { handler as GET, handler as POST };
