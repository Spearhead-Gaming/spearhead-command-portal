type StagingBannerProps = {
  environment?: string;
};

export function StagingBanner({ environment }: StagingBannerProps) {
  const appEnv = environment?.trim().toLowerCase();

  if (appEnv !== "staging" && appEnv !== "testing") {
    return null;
  }

  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
      {appEnv} environment - production data and credentials should not be used here
    </div>
  );
}
