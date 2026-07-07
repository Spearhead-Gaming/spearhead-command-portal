type DiscordIdentityLike = {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
} | null;

type MemberDisplayNameSource = {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
  user?: DiscordIdentityLike;
};

function normalizeValue(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function getPreferredMemberDisplayName(input: {
  discordDisplayName?: string | null;
  profileDisplayName?: string | null;
  discordUsername?: string | null;
  email?: string | null;
}) {
  return (
    normalizeValue(input.discordDisplayName) ??
    normalizeValue(input.profileDisplayName) ??
    normalizeValue(input.discordUsername) ??
    normalizeValue(input.email) ??
    "Unknown Member"
  );
}

export function getMemberDisplayName(member: MemberDisplayNameSource) {
  return getPreferredMemberDisplayName({
    discordDisplayName: member.user?.displayName,
    profileDisplayName: member.displayName,
    discordUsername: member.user?.name ?? member.name,
    email: member.user?.email ?? member.email,
  });
}
