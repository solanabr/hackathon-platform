import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/analytics-browser", () => ({ trackClient: vi.fn() }));
vi.mock("@/components/analytics/google-tag-manager", () => ({ pushGtmEvent: vi.fn() }));
vi.mock("@/app/(app)/h/[slug]/register/actions", () => ({ registerForHackathon: vi.fn() }));
vi.mock("@/app/(public)/pre-registro/actions", () => ({ preRegister: vi.fn() }));

import { RegistrationForm } from "@/components/registration/registration-form";
import { PreregForm } from "@/app/(public)/pre-registro/prereg-form";
import { SubmissionEditor } from "@/components/submission/submission-editor";
import type { Submission } from "@/types/db";

/**
 * Every checkbox must be both wrapped by a <label> and paired with it via
 * id/htmlFor, so clicking the text toggles the box. Static markup is enough
 * to prove the wiring; there is no DOM environment in this test suite.
 */
function checkboxes(html: string) {
  const out: { id: string; wrapped: boolean; paired: boolean }[] = [];
  const re = /<input[^>]*type="checkbox"[^>]*>/g;
  for (const m of html.matchAll(re)) {
    const tag = m[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? "";
    const before = html.slice(0, m.index);
    const lastOpen = before.lastIndexOf("<label");
    const lastClose = before.lastIndexOf("</label>");
    const wrapped = lastOpen > lastClose;
    const openTag = wrapped ? before.slice(lastOpen, before.indexOf(">", lastOpen) + 1) : "";
    const paired = Boolean(id) && openTag.includes(`for="${id}"`);
    out.push({ id, wrapped, paired });
  }
  return out;
}

const submission = {
  id: "s1",
  team_id: "t1",
  status: "draft",
  image_path: null,
  updated_at: null,
  description: null,
  pitch_deck_url: null,
  pitch_video_url: null,
  demo_video_url: null,
  github_url: null,
  twitter_url: null,
  website_url: null,
  github_access_granted: false,
} as unknown as Submission;

describe("checkbox labels", () => {
  it("registration form pairs both checkboxes with their labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(RegistrationForm, { slug: "ed", lumaUrl: "https://lu.ma/x" }),
    );
    const boxes = checkboxes(html);
    expect(boxes.map((b) => b.id)).toEqual(["luma_confirmed", "terms_accepted"]);
    for (const b of boxes) expect(b).toMatchObject({ wrapped: true, paired: true });
  });

  it("pre-registro form pairs the terms checkbox", () => {
    const html = renderToStaticMarkup(React.createElement(PreregForm, { profile: null }));
    const boxes = checkboxes(html);
    expect(boxes.map((b) => b.id)).toEqual(["terms_accepted"]);
    expect(boxes[0]).toMatchObject({ wrapped: true, paired: true });
  });

  it("submission editor pairs the GitHub collaborator checkbox", () => {
    const html = renderToStaticMarkup(
      React.createElement(SubmissionEditor, {
        teamId: "t1",
        teamName: "Time",
        isLeader: true,
        editable: true,
        initial: submission,
        initialImageUrl: null,
        dashboardHref: "/h/ed/dashboard",
        membersPending: 0,
        membersAccepted: 3,
        teamMin: 2,
        judgeGithubHandle: "juiz",
      }),
    );
    const boxes = checkboxes(html);
    expect(boxes.map((b) => b.id)).toEqual(["github_access_granted"]);
    expect(boxes[0]).toMatchObject({ wrapped: true, paired: true });
    expect(html).toContain('for="project_image"');
    expect(html).toMatch(/<input[^>]*id="project_image"[^>]*type="file"/);
  });

  it("text inputs on those forms have a label with a matching for", () => {
    const html = renderToStaticMarkup(React.createElement(PreregForm, { profile: null }));
    for (const id of ["full_name", "whatsapp", "role"]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toMatch(new RegExp(`<(input|select)[^>]*id="${id}"`));
    }
  });
});
