import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompactList } from "@/components/shared/compact-list";

describe("CompactList", () => {
  it("renders dense list items with title, status, metadata, and action", () => {
    render(
      <CompactList
        items={[
          {
            actionHref: "/personnel/members/example",
            actionLabel: "Open",
            meta: "Alpha / 2 issues",
            statusLabel: "Review",
            statusTone: "warning",
            subtitle: "Missing required qualification",
            title: "Nomad",
          },
        ]}
        label="Example queue"
      />,
    );

    expect(screen.getByRole("list", { name: "Example queue" })).toBeInTheDocument();
    expect(screen.getByText("Nomad")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/personnel/members/example",
    );
  });
});

