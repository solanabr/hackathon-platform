import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("writes a BOM, CRLF rows and empty cells for null", () => {
    expect(toCsv(["a", "b"], [["x", null]])).toBe("﻿a,b\r\nx,\r\n");
  });

  it("quotes cells with commas, quotes and newlines", () => {
    expect(toCsv(["v"], [['he said "hi", ok\nnext']])).toBe('﻿v\r\n"he said ""hi"", ok\nnext"\r\n');
  });

  it("neutralises formula prefixes", () => {
    const csv = toCsv(["v"], [["=SUM(1)"], ["+55 11 9"], ["-1"], ["@x"]]);
    expect(csv).toBe("﻿v\r\n'=SUM(1)\r\n'+55 11 9\r\n'-1\r\n'@x\r\n");
  });

  it("stringifies numbers and booleans", () => {
    expect(toCsv(["n", "b"], [[3, true]])).toBe("﻿n,b\r\n3,true\r\n");
  });
});
