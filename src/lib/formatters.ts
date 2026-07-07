const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsedValue = typeof value === "string" ? new Date(value) : value;

  return shortDateFormatter.format(parsedValue);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsedValue = typeof value === "string" ? new Date(value) : value;

  return shortDateTimeFormatter.format(parsedValue);
}

export function formatCountLabel(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}
