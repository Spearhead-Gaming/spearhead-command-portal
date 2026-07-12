import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button variants", () => {
  it("renders semantic destructive, warning, success, and link actions", () => {
    render(
      <div>
        <Button variant="destructive">Archive</Button>
        <Button variant="warning">Needs Review</Button>
        <Button variant="success">Approve</Button>
        <Button size="link" variant="link">
          View details
        </Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Needs Review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
  });
});

