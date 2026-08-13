import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/server/permissions/access";
import { validateDeploymentEnvironment } from "@/server/deployment/env-validation";
import { getSystemConfig, getSystemInfo } from "@/server/system/config";

function getValidationTone(
  ok: boolean,
  warningCount: number,
): "success" | "warning" | "danger" {
  if (!ok) {
    return "danger";
  }

  if (warningCount > 0) {
    return "warning";
  }

  return "success";
}

function getValidationLabel(
  ok: boolean,
  warningCount: number,
) {
  if (!ok) {
    return "Configuration errors";
  }

  if (warningCount > 0) {
    return "Operational with warnings";
  }

  return "Configuration healthy";
}

function formatEnvironment(value: string) {
  switch (value) {
    case "development":
      return "Development";

    case "staging":
      return "Staging";

    case "production":
      return "Production";

    default:
      return value;
  }
}

export async function SystemSettingsPage() {
  await requirePermission("admin.settings.view");

  const [systemInfo, systemConfig, validation] = await Promise.all([
    Promise.resolve(getSystemInfo()),
    Promise.resolve(getSystemConfig()),
    validateDeploymentEnvironment(),
  ]);

  const validationTone = getValidationTone(
    validation.ok,
    validation.warnings.length,
  );

  const validationLabel = getValidationLabel(
    validation.ok,
    validation.warnings.length,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "System Settings"]}
        description="Review application identity, runtime environment, configured URLs, and deployment configuration health. Sensitive credentials are intentionally never displayed."
        title="System Settings"
      />

      <Card className="border-border/70 bg-card/78">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={validationLabel}
              tone={validationTone}
            />

            <StatusBadge
              label={formatEnvironment(systemConfig.appEnv)}
              tone="muted"
            />
          </div>

          <div>
            <CardTitle>System configuration</CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              This panel exposes non-sensitive runtime information and
              configuration health for administrators. Secrets, tokens,
              passwords, and database credentials remain server-side.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Current application version reported by package metadata."
          title="Application Version"
          tone="info"
          value={systemInfo.application.version}
        />

        <KpiCard
          hint="Application deployment environment."
          label="Application Environment"
          tone="success"
          value={formatEnvironment(systemInfo.environment.appEnv)}
        />

        <KpiCard
          hint="Node.js runtime environment."
          label="Node Environment"
          tone="muted"
          value={systemInfo.environment.nodeEnv}
        />

        <KpiCard
          hint="Deployment configuration validation status."
          label="Configuration"
          tone={validationTone}
          value={
            validation.ok
              ? validation.warnings.length > 0
                ? `${validation.warnings.length} warning${validation.warnings.length === 1 ? "" : "s"}`
                : "Healthy"
              : `${validation.errors.length} error${validation.errors.length === 1 ? "" : "s"}`
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Application</CardTitle>
            <CardDescription>
              Application identity and runtime metadata.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-sm text-muted-foreground">
                Application name
              </span>
              <span className="text-right text-sm font-medium text-foreground">
                {systemInfo.application.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-sm text-muted-foreground">
                Application version
              </span>
              <span className="text-right text-sm font-medium text-foreground">
                {systemInfo.application.version}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Node environment
              </span>
              <span className="text-right text-sm font-medium text-foreground">
                {systemInfo.environment.nodeEnv}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>
              Runtime environment selected for this deployment.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-sm text-muted-foreground">
                Application environment
              </span>
              <StatusBadge
                label={formatEnvironment(systemConfig.appEnv)}
                tone={
                  systemConfig.appEnv === "production"
                    ? "success"
                    : systemConfig.appEnv === "staging"
                      ? "warning"
                      : "info"
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-sm text-muted-foreground">
                Node environment
              </span>
              <span className="text-sm font-medium text-foreground">
                {systemConfig.nodeEnv}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Configuration target
              </span>
              <span className="text-sm font-medium text-foreground">
                {formatEnvironment(validation.target)}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/80 bg-card/82">
        <CardHeader>
          <CardTitle>Application URLs</CardTitle>
          <CardDescription>
            Non-secret URLs currently resolved by the application runtime.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Application URL
              </p>
              <p className="text-xs text-muted-foreground">
                Primary public URL used by the portal.
              </p>
            </div>

            <code className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
              {systemInfo.urls.appUrl}
            </code>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Authentication URL
              </p>
              <p className="text-xs text-muted-foreground">
                URL used by the authentication system.
              </p>
            </div>

            <code className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
              {systemInfo.urls.authUrl}
            </code>
          </div>
        </CardContent>
      </Card>

      <CollapsibleSection
        badgeLabel={`${validation.errors.length + validation.warnings.length} findings`}
        description="Deployment validation checks required configuration without exposing the underlying secret values."
        title="Configuration health"
      >
        <div className="space-y-4">
          {validation.errors.length === 0 &&
          validation.warnings.length === 0 ? (
            <EmptyState
              actionLabel="No action required"
              description="The current deployment configuration passed validation without warnings."
              title="Configuration is healthy"
            />
          ) : null}

          {validation.errors.length > 0 ? (
            <Card className="border-danger/30 bg-danger/5">
              <CardHeader>
                <CardTitle>Errors</CardTitle>
                <CardDescription>
                  These configuration issues should be resolved before the
                  affected deployment target is considered healthy.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {validation.errors.map((issue, index) => (
                    <div
                      className="rounded-lg border border-danger/20 bg-danger/5 p-3"
                      key={`${issue.variable ?? "error"}-${index}`}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {issue.message}
                      </p>

                      {issue.variable ? (
                        <code className="mt-1 block text-xs text-muted-foreground">
                          {issue.variable}
                        </code>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {validation.warnings.length > 0 ? (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
                <CardDescription>
                  These conditions do not currently fail validation but may
                  require administrator attention.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {validation.warnings.map((issue, index) => (
                    <div
                      className="rounded-lg border border-warning/20 bg-warning/5 p-3"
                      key={`${issue.variable ?? "warning"}-${index}`}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {issue.message}
                      </p>

                      {issue.variable ? (
                        <code className="mt-1 block text-xs text-muted-foreground">
                          {issue.variable}
                        </code>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </CollapsibleSection>

      <Card className="border-border/70 bg-card/78">
        <CardHeader>
          <CardTitle>Security boundary</CardTitle>
          <CardDescription>
            Sensitive runtime configuration is intentionally excluded from
            this administrative surface.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Authentication secrets",
              "Discord client secrets",
              "Discord bot tokens",
              "Database connection credentials",
              "Developer login secrets",
              "Other private environment variables",
            ].map((item) => (
              <div
                className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}