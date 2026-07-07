import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authorizeDeveloperBootstrap } from "@/server/auth/developer-bootstrap";
import {
  getDeveloperBootstrapConfig,
  getDiscordOAuthConfig,
  isDiscordOAuthConfigured,
} from "@/server/auth/runtime-config";
import { linkDiscordOAuthIdentity } from "@/server/discord/identity";
import { prisma } from "@/server/database/client";

type DiscordProfile = {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
};

function getDiscordDisplayName(profile: DiscordProfile) {
  return profile.global_name?.trim() || profile.username?.trim() || null;
}

function getDiscordAvatarUrl(profile: DiscordProfile) {
  if (!profile.id || !profile.avatar) {
    return null;
  }

  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
}

const discordOAuthConfigured = isDiscordOAuthConfigured();
const discordOAuthConfig = getDiscordOAuthConfig();
const developerBootstrapConfig = getDeveloperBootstrapConfig();
const providers = [];

if (discordOAuthConfigured) {
  providers.push(
    Discord({
      authorization: {
        params: {
          scope: "identify email",
        },
      },
      clientId: discordOAuthConfig.clientId,
      clientSecret: discordOAuthConfig.clientSecret,
    }),
  );
}

if (developerBootstrapConfig.enabled) {
  providers.push(
    Credentials({
      credentials: {
        secret: {
          label: "Bootstrap secret",
          type: "password",
        },
      },
      name: "Developer Bootstrap",
      async authorize(credentials, request) {
        return authorizeDeveloperBootstrap(credentials, request);
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/login",
  },
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user?.id && account?.provider === "discord") {
        const discordProfile = (profile ?? {}) as DiscordProfile;
        const avatarUrl = getDiscordAvatarUrl(discordProfile);
        const linkedUser = await linkDiscordOAuthIdentity({
          avatarUrl: avatarUrl ?? user.image ?? null,
          discordUserId: account.providerAccountId,
          displayName: getDiscordDisplayName(discordProfile),
          email: user.email ?? null,
          transientUserId: user.id,
          username: user.name ?? discordProfile.username ?? null,
        });

        token.sub = linkedUser.id;
        token.discordId = account.providerAccountId;

        return token;
      }

      if (user?.id) {
        token.sub = user.id;
      }

      if (typeof user?.discordId !== "undefined") {
        token.discordId = user.discordId;
      }

      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token.sub ?? user?.id ?? "";
        session.user.discordId =
          typeof token.discordId === "string"
            ? token.discordId
            : user?.discordId ?? null;
      }

      return session;
    },
  },
});
