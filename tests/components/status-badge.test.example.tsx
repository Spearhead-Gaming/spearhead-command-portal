import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders the provided label for assistive technology and visual users", () => {
    render(<StatusBadge label="Mission Ready" tone="success" />);

    expect(screen.getByText("Mission Ready")).toBeInTheDocument();
  });
});
