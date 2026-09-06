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

const editorProps = {
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
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

  it("submission editor pairs every text field label with its input", () => {
    const html = renderToStaticMarkup(React.createElement(SubmissionEditor, editorProps));
    const fields = [
      ["project_name", "Nome do projeto"],
      ["description", "Descrição"],
      ["pitch_deck_url", "Deck"],
      ["pitch_video_url", "Vídeo de apresentação (demo)"],
      ["github_url", "Repositório GitHub"],
      ["twitter_url", "X / Twitter"],
      ["website_url", "Site"],
    ];
    for (const [id, text] of fields) {
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"[^>]*>(?:<span>)?${escapeRe(text)}`));
      expect(html).toMatch(new RegExp(`<(input|textarea)[^>]*id="${id}"`));
    }
    const labelFors = [...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]);
    for (const id of labelFors) {
      expect(html, `label for="${id}" has no control`).toMatch(new RegExp(`<(input|textarea|select)[^>]*\\bid="${id}"`));
    }
    const unpaired = [...html.matchAll(/<label(?![^>]*\bfor=)[^>]*>/g)];
    expect(unpaired).toHaveLength(0);
  });

  it("submission editor lists the empty required fields under a disabled submit", () => {
    const html = renderToStaticMarkup(React.createElement(SubmissionEditor, editorProps));
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Submeter projeto/);
    expect(html).toContain(
      "Para submeter, ainda falta: descrição, deck, vídeo de apresentação, repositório GitHub, confirmação do colaborador no GitHub.",
    );

    const filled = renderToStaticMarkup(
      React.createElement(SubmissionEditor, {
        ...editorProps,
        initial: {
          ...submission,
          description: "Um projeto",
          pitch_deck_url: "https://deck.example",
          github_url: "https://github.com/x/y",
          github_access_granted: true,
        } as Submission,
      }),
    );
    expect(filled).toContain("Para submeter, ainda falta: vídeo de apresentação.");
  });

  it("text inputs on those forms have a label with a matching for", () => {
    const html = renderToStaticMarkup(React.createElement(PreregForm, { profile: null }));
    for (const id of ["full_name", "whatsapp", "role"]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toMatch(new RegExp(`<(input|select)[^>]*id="${id}"`));
    }
  });
});
