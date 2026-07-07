export function formatSlugLabel(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatIdentifierLabel(value: string) {
  return formatSlugLabel(value.replace(/[^a-zA-Z0-9-_]/g, " "));
}
