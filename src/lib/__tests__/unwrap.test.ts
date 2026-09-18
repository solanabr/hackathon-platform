import { describe, expect, it, vi } from "vitest";
import { withClockSkewRetry } from "../supabase/unwrap";

describe("withClockSkewRetry", () => {
  it("returns the first result when it is not a clock-skew error", async () => {
    const run = vi.fn(async () => ({ data: 1, error: null }));
    expect(await withClockSkewRetry(run, 0)).toEqual({ data: 1, error: null });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not retry other errors", async () => {
    const run = vi.fn(async () => ({ data: null, error: { code: "42501", message: "denied" } }));
    await withClockSkewRetry(run, 0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once on PGRST303", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303", message: "JWT issued at future" } })
      .mockResolvedValueOnce({ data: 2, error: null });
    expect(await withClockSkewRetry(run, 0)).toEqual({ data: 2, error: null });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    const err = { code: "PGRST303", message: "JWT issued at future" };
    const run = vi.fn(async () => ({ data: null, error: err }));
    expect((await withClockSkewRetry(run, 0)).error).toBe(err);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
