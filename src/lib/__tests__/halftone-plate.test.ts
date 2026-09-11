import { describe, expect, it } from "vitest";
import {
  plateFilename,
  plateHash,
  plateKeyFromFilename,
  plateSvg,
} from "../halftone-plate";
import { PLATE_FILES, PLATE_SRC, plateByFilename } from "@/components/home/plates";

describe("halftone plates", () => {
  it("builds a mask-ready svg with two stroke weights", () => {
    const svg = plateSvg({
      viewBox: "0 0 10 10",
      light: "M1 1h2",
      dark: "M4 4h3",
      lightWidth: 1.5,
      darkWidth: 3,
    });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toContain('stroke-width="3"');
  });

  it("names a file by its content and reads the key back", () => {
    const a = plateFilename("colosseum", "<svg>a</svg>");
    const b = plateFilename("colosseum", "<svg>b</svg>");
    expect(a).not.toBe(b);
    expect(plateKeyFromFilename(a)).toBe("colosseum");
    expect(plateKeyFromFilename("colosseum.svg")).toBeNull();
    expect(plateKeyFromFilename("../etc/passwd")).toBeNull();
    expect(plateHash("x")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("serves every generated plate under its hashed url and nothing else", () => {
    expect(PLATE_FILES.length).toBe(3);
    for (const [key, src] of Object.entries(PLATE_SRC)) {
      const file = src.split("/").pop()!;
      expect(PLATE_FILES).toContain(file);
      const svg = plateByFilename(file);
      expect(svg).not.toBeNull();
      expect(svg!.length).toBeGreaterThan(1000);
      expect(plateByFilename(`${key}-00000000.svg`)).toBeNull();
    }
  });
});
