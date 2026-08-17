export const applicationEnvironments = [
  "development",
  "staging",
  "production",
] as const;

export type ApplicationEnvironment =
  (typeof applicationEnvironments)[number];

export type SystemConfig = {
  appEnv: ApplicationEnvironment;
  appUrl: string;
  authUrl: string;
  nodeEnv: string;
};

export type SystemInfo = {
  application: {
    name: string;
    version: string;
  };
  environment: {
    appEnv: ApplicationEnvironment;
    nodeEnv: string;
  };
  urls: {
    appUrl: string;
    authUrl: string;
  };
};