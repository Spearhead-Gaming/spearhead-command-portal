import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPortalSession } from "@/server/auth/get-portal-session";
import {
  loginWithDeveloperBootstrap,
  loginWithDiscord,
  logoutFromPortal,
} from "@/server/auth/actions";
import {
  isDeveloperBootstrapEnabled,
  isDiscordOAuthConfigured,
} from "@/server/auth/runtime-config";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getLoginErrorCopy(errorCode: string) {
  switch (errorCode) {
    case "bootstrap-disabled":
      return "Developer bootstrap login is disabled in this environment.";
    case "database-unavailable":
      return "Developer bootstrap login cannot complete because the MariaDB database is not reachable. Start the database first, then try again.";
    case "discord-not-configured":
      return "Discord OAuth is not configured in this environment yet. Add the Discord client credentials before using the primary login flow.";
    case "invalid-credentials":
      return "Developer bootstrap access was denied. Check the environment gate, secret, and local role seed before trying again.";
    case "system-role-missing":
      return "Developer bootstrap login is enabled, but the System Administrator starter role is missing. Run the Prisma seed, then try again.";
    default:
      return null;
  }
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <StatusBadge label="Authenticated command portal" tone="warning" />
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
              Spearhead Command Portal
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[0.01em] text-foreground sm:text-5xl lg:text-6xl">
              Operations workspace with authentication and permission scaffolding in place.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Discord OAuth, protected portal routes, and permission-key lookups are ready.
              Feature modules, bot commands, and production workflows remain intentionally
              placeholder-only.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Discord OAuth via Auth.js",
              "Prisma-backed role and permission lookup",
              "Auth-ready shell and guarded app routes",
            ].map((item) => (
              <Card key={item} className="bg-card/70">
                <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>{item}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <section className="flex justify-center">{children}</section>
      </div>
    </div>
  );
}

function AuthCard({
  badge,
  title,
  description,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="space-y-4">
        <StatusBadge label={badge} tone="info" />
        <div className="space-y-2">
          <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
          <CardDescription className="text-base leading-7">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export async function LandingPage() {
  const session = await getPortalSession();

  return (
    <PublicShell>
      <AuthCard
        badge={session.mode === "authenticated" ? "Authenticated" : "Milestone 4"}
        description={
          session.mode === "authenticated"
            ? "You already have an active portal session. Head into the protected shell or review the sign-out scaffold."
            : "Use Discord OAuth to enter the protected shell. Public routes stay accessible while app routes now require authentication."
        }
        title={session.mode === "authenticated" ? "Session active." : "Authentication scaffold is live."}
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          {session.mode === "authenticated" ? (
            <>
              <Button asChild className="sm:flex-1">
                <Link href="/dashboard">
                  Open Command Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="sm:flex-1" variant="outline">
                <Link href="/logout">Sign Out</Link>
              </Button>
            </>
          ) : (
            <>
              <form action={loginWithDiscord} className="sm:flex-1">
                <Button className="w-full" type="submit">
                  Continue with Discord
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <Button asChild className="sm:flex-1" variant="outline">
                <Link href="/login">Open Login Route</Link>
              </Button>
            </>
          )}
        </div>
      </AuthCard>
    </PublicShell>
  );
}

export async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const session = await getPortalSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const errorCode = getSearchParamValue(resolvedSearchParams, "error");
  const loginError = getLoginErrorCopy(errorCode);
  const discordOAuthConfigured = isDiscordOAuthConfigured();

  if (session.mode === "authenticated") {
    redirect("/dashboard");
  }

  return (
    <PublicShell>
      <AuthCard
        badge="Discord OAuth"
        description="Sign in with Discord to create or resume a portal session. Users without a linked member profile can still authenticate, and profile-linking stays a future workflow."
        title="Login to the command portal"
      >
        <div className="flex flex-col gap-4">
          {loginError ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
              {loginError}
            </div>
          ) : null}
          <form action={loginWithDiscord}>
            <Button className="w-full" disabled={!discordOAuthConfigured} type="submit">
              Continue with Discord
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          {!discordOAuthConfigured ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Discord OAuth is the primary login path, but this environment is still missing
              `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              If your account is authenticated but not yet linked to a member profile, the
              protected shell will show a clear follow-up state instead of blocking login.
            </p>
          )}
          <Button asChild variant="outline">
            <Link href="/">Back to Overview</Link>
          </Button>
        </div>
      </AuthCard>
    </PublicShell>
  );
}

export async function DeveloperBootstrapPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const session = await getPortalSession();

  if (session.mode === "authenticated") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const errorCode = getSearchParamValue(resolvedSearchParams, "error");
  const loginError = getLoginErrorCopy(errorCode);
  const developerBootstrapEnabled = isDeveloperBootstrapEnabled();

  if (!developerBootstrapEnabled) {
    return (
      <PublicShell>
        <AuthCard
          badge="Bootstrap Disabled"
          description="This hidden recovery route is disabled in the current environment. Discord OAuth remains the primary authentication path."
          title="Developer bootstrap access is off"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
              Enable `ENABLE_DEV_LOGIN=true`, configure `DEV_LOGIN_SECRET`, and set
              `DEV_LOGIN_EMAIL` only when temporary bootstrap access is actively needed.
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep this route disabled in production unless an operator is restoring access, then
              turn it off again immediately after the maintenance window.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Return to Login</Link>
            </Button>
          </div>
        </AuthCard>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <AuthCard
        badge="Internal Bootstrap"
        description="Environment-gated developer access path for owner or administrator recovery only. This route is hidden from normal navigation, audited, and disabled by default."
        title="Developer access bootstrap"
      >
        <div className="flex flex-col gap-4">
          {loginError ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm leading-6 text-danger">
              {loginError}
            </div>
          ) : null}
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
            This path is a temporary recovery tool. Disable `ENABLE_DEV_LOGIN` after access is
            restored, especially outside local development.
          </div>
          <form action={loginWithDeveloperBootstrap} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="dev-login-secret">
                Bootstrap secret
              </label>
              <Input
                autoComplete="current-password"
                id="dev-login-secret"
                name="secret"
                placeholder="Enter the environment bootstrap secret"
                required
                type="password"
              />
            </div>
            <Button className="w-full" type="submit">
              Enter command portal
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-sm leading-6 text-muted-foreground">
            Successful and failed attempts are written to the audit log. This route never exposes
            the configured developer email or stores the raw secret in the database.
          </p>
        </div>
      </AuthCard>
    </PublicShell>
  );
}

export async function LogoutPage() {
  const session = await getPortalSession();

  return (
    <PublicShell>
      <AuthCard
        badge={session.mode === "authenticated" ? "Authenticated" : "Signed Out"}
        description={
          session.mode === "authenticated"
            ? "End the active portal session and return to the public login route."
            : "There is no active portal session right now, but the sign-out route remains available for the final auth flow."
        }
        title={session.mode === "authenticated" ? "Sign out of the portal" : "No active session"}
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          {session.mode === "authenticated" ? (
            <form action={logoutFromPortal} className="sm:flex-1">
              <Button className="w-full" type="submit">
                Sign Out
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
          <Button asChild className="sm:flex-1" variant="outline">
            <Link href={session.mode === "authenticated" ? "/dashboard" : "/login"}>
              {session.mode === "authenticated" ? "Back to Portal" : "Go to Login"}
            </Link>
          </Button>
        </div>
      </AuthCard>
    </PublicShell>
  );
}

export function UnauthorizedPage() {
  return (
    <PublicShell>
      <AuthCard
        badge="Unauthorized"
        description="This route requires an authenticated portal session. Sign in with Discord to continue into the protected app shell."
        title="Authentication required"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <form action={loginWithDiscord} className="sm:flex-1">
            <Button className="w-full" type="submit">
              Continue with Discord
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <Button asChild className="sm:flex-1" variant="outline">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </AuthCard>
    </PublicShell>
  );
}

export async function ForbiddenPage() {
  const session = await getPortalSession();

  return (
    <PublicShell>
      <AuthCard
        badge="Forbidden"
        description="Your account is authenticated, but the required permission key is not currently granted. Role assignments and unit-scoped access will determine future feature availability."
        title="Permission required"
      >
        <div className="rounded-xl border border-border/80 bg-card/60 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                {session.mode === "authenticated"
                  ? `${session.user.displayName} is signed in`
                  : "No active session found"}
              </p>
              <p>
                {session.mode === "authenticated"
                  ? `${session.user.permissions.length} permission key${session.user.permissions.length === 1 ? "" : "s"} are currently loaded for this account.`
                  : "Sign in first, then request the required permission assignment if access is still blocked."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <Button asChild className="sm:flex-1">
            <Link href="/dashboard">
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="sm:flex-1" variant="outline">
            <Link href="/login">Switch Account</Link>
          </Button>
        </div>
      </AuthCard>
    </PublicShell>
  );
}
