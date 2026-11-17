import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { REPO_OWNER, editorLogins } from "./config";

export const authConfigured = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "missing",
      clientSecret: process.env.GITHUB_SECRET || "missing",
      // Visitors only grant read access to their public profile. Commits are made server-side.
      authorization: { params: { scope: "read:user" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as { login?: string; id?: number | string };
        token.login = p.login;
        token.ghid = p.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Viewer).login = (token.login as string) || "";
        (session.user as Viewer).id = token.ghid as string | number | undefined;
      }
      return session;
    },
  },
};

export interface Viewer {
  name?: string | null;
  image?: string | null;
  login: string;
  id?: string | number;
  isOwner: boolean;
  isEditor: boolean;
}

/** The signed-in GitHub user, with permissions computed fresh on every request. */
export async function getViewer(): Promise<Viewer | null> {
  if (!authConfigured) return null;
  const session = await getServerSession(authOptions);
  const u = session?.user as (Viewer & { name?: string; image?: string }) | undefined;
  if (!u?.login) return null;
  const login = u.login.toLowerCase();
  return {
    name: u.name,
    image: u.image,
    login: u.login,
    id: u.id,
    isOwner: login === REPO_OWNER.toLowerCase(),
    isEditor: editorLogins().includes(login),
  };
}
