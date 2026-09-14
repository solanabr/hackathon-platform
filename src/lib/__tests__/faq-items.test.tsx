import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { faqItems } from "@/app/(public)/faq-items";

const links = {
  colosseumHref: "https://colosseum.com/signup?ref=lp",
  earnHref: "https://superteam.fun/earn/s/superteambr",
  whatsappHref: "https://chat.whatsapp.com/x",
};

const html = (items: ReturnType<typeof faqItems>) =>
  items.map((f) => renderToStaticMarkup(<>{f.a}</>)).join("");

describe("faqItems", () => {
  it("keeps twelve questions in two columns of six", () => {
    expect(faqItems(links)).toHaveLength(12);
  });

  it("links the official registration, the Earn listing and the group", () => {
    const out = html(faqItems(links));
    expect(out).toContain(links.colosseumHref);
    expect(out).toContain(links.earnHref);
    expect(out).toContain(links.whatsappHref);
  });

  it("prints the real prizes", () => {
    const out = html(faqItems(links));
    expect(out).toContain("US$ 800 mil");
    expect(out).toContain("US$ 5 mil");
    expect(out).not.toContain("sai em 14 de setembro");
  });

  it("falls back to plain text when Colosseum has no link yet", () => {
    const out = renderToStaticMarkup(
      <>{faqItems({ ...links, colosseumHref: null })[3].a}</>,
    );
    expect(out).not.toContain("<a");
  });
});
