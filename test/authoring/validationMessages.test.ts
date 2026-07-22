import { formatAuthoredDocumentErrors } from "@/authoring/validationMessages";
import { describe, expect, it } from "vitest";

describe("formatAuthoredDocumentErrors", () => {
  it("explains the pendulum head centre rule with a one-based segment location", () => {
    expect(
      formatAuthoredDocumentErrors([
        {
          code: "PENDULUM_HEAD_CENTER_NOT_DOWN",
          trackId: "left",
          segmentIndex: 0,
          node: "head"
        }
      ])
    ).toBe(
      "left track / segment 1 / head: the head pendulum must be centred straight down; its start phase must equal -90° + amplitude × sin(swing phase)"
    );
  });
});
