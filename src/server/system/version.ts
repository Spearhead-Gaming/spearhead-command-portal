import packageJson from "../../../package.json";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const version = packageJson.version;

if (!SEMVER_PATTERN.test(version)) {
  throw new Error(
    `Invalid application version "${version}". Expected a valid SemVer version.`,
  );
}

export const applicationName = packageJson.name;
export const applicationVersion = version;

export type ApplicationVersionInfo = {
  name: string;
  version: string;
};

export function getApplicationVersion(): ApplicationVersionInfo {
  return {
    name: applicationName,
    version: applicationVersion,
  };
}
