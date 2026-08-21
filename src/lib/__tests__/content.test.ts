import { describe, it, expect } from "vitest";
import { extractYouTubeId } from "../content";

describe("extractYouTubeId", () => {
  it("reads a watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads a share link", () => {
    expect(extractYouTubeId("https://youtu.be/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads an embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("reads a live URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("ignores extra query parameters", () => {
    expect(extractYouTubeId("https://youtu.be/2pcm7ICRJKU?si=abc123&t=42")).toBe("2pcm7ICRJKU");
  });

  it("accepts a bare id", () => {
    expect(extractYouTubeId("2pcm7ICRJKU")).toBe("2pcm7ICRJKU");
  });

  it("rejects anything else", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(extractYouTubeId("not a link")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
  });
});