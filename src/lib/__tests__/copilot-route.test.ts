import { describe, it, expect } from "vitest";
import { parseSearchRequest } from "@/app/api/copilot/search/parse";

describe("parseSearchRequest", () => {
  it("accepts an idea", () => {
    expect(parseSearchRequest({ mode: "idea", idea: "pagamentos para agentes" })).toEqual({ mode: "idea", idea: "pagamentos para agentes" });
  });
  it("rejects a short idea", () => {
    expect(parseSearchRequest({ mode: "idea", idea: "oi" })).toBeNull();
  });
  it("accepts browse filters and clamps offset", () => {
    expect(parseSearchRequest({ mode: "browse", hackathon: "radar", winnersOnly: true, offset: -3 }))
      .toEqual({ mode: "browse", hackathon: "radar", trackKey: undefined, clusterKey: undefined, winnersOnly: true, offset: 0 });
  });
  it("rejects unknown modes and junk", () => {
    expect(parseSearchRequest({ mode: "x" })).toBeNull();
    expect(parseSearchRequest(null)).toBeNull();
  });
});
