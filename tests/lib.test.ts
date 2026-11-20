import { describe, expect, it } from "vitest";
import { fillDays, isTarget, safeTimeZone, sourceLabel, sourceOf } from "@/lib/analytics";
import { cleanPublic, downloadName, safeUrl } from "@/lib/data/public";
import { cleanDomain, dnsRecord } from "@/lib/domains";
import { skillList, webUrl } from "@/lib/edit";
import { readmeExcerpt } from "@/lib/github-repos";
import { sniffImage } from "@/lib/images";
import { accentSet, contrast, effectiveMode, normalizeOptions, themeAttrs } from "@/lib/theme";

describe("theme", () => {
  it("keeps accents readable in both modes", () => {
    for (const hex of ["#f59e0b", "#2f54eb", "#ffff00", "#000000", "#ffffff", "#10b981"]) {
      expect(contrast(accentSet(hex, "light").accent, "#f4f4f2")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accentSet(hex, "dark").accent, "#0a0a0b")).toBeGreaterThanOrEqual(4.5);
      const { accent, onAccent } = accentSet(hex, "light");
      expect(contrast(accent, onAccent)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("ignores malformed stored options", () => {
    expect(normalizeOptions({ accent: "red; background:url(x)", font: "comic", mode: 3 })).toEqual({ accent: null, font: "default", mode: "default" });
    expect(normalizeOptions(null)).toEqual({ accent: null, font: "default", mode: "default" });
    expect(themeAttrs("minimal", {}).style).toEqual({});
  });
  it("resolves the template's own mode", () => {
    expect(effectiveMode("dark", {})).toBe("dark");
    expect(effectiveMode("minimal", { mode: "dark" })).toBe("dark");
  });
});

describe("analytics", () => {
  it("names traffic sources without keeping URLs", () => {
    expect(sourceOf("https://www.linkedin.com/feed/?x=1", "", "maya.unfold.site")).toBe("linkedin.com");
    expect(sourceOf("https://maya.unfold.site/", "", "maya.unfold.site")).toBeNull();
    expect(sourceOf("", "LinkedIn<script>", null)).toBe("utm:linkedinscript");
    expect(sourceOf("not a url", "", null)).toBeNull();
    expect(sourceLabel("utm:linkedin")).toBe("LinkedIn (campaign link)");
    expect(sourceLabel("mail.google.com")).toBe("Gmail");
    expect(sourceLabel("")).toBe("Direct or unknown");
  });
  it("accepts only known click targets", () => {
    expect(isTarget("project:abc-123")).toBe(true);
    expect(isTarget("link:https://github.com/x")).toBe(true);
    expect(isTarget("resume")).toBe(true);
    expect(isTarget("javascript:alert(1)")).toBe(false);
    expect(isTarget("link:javascript:alert(1)")).toBe(false);
  });
  it("fills every day of the range once", () => {
    for (const tz of ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      const days = fillDays([], 30, tz);
      expect(days).toHaveLength(30);
      expect(new Set(days.map(d => d.day)).size).toBe(30);
      expect([...days].sort((a, b) => a.day.localeCompare(b.day))).toEqual(days);
    }
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
  });
});

describe("public data", () => {
  it("drops unsafe URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
    expect(safeUrl("mailto:a@b.co")).toBeNull();
    expect(safeUrl("mailto:a@b.co", true)).toBe("mailto:a@b.co");
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
  });
  it("normalises a sparse portfolio", () => {
    const p = cleanPublic({ id: "1", slug: "a", theme: "minimal", links: [{ label: "", url: "javascript:x" }, { label: "Site", url: "https://a.co" }], projects: [{ id: "p", title: "T", link_url: "javascript:x", stars: -4 }] });
    expect(p.links).toEqual([{ label: "Site", url: "https://a.co/" }]);
    expect(p.projects[0]).toMatchObject({ link_url: null, stars: null, image_url: null });
    expect(p.contact).toBe(false);
    expect(p.skills).toEqual([]);
  });
  it("names resume downloads", () => {
    expect(downloadName("Maya Iyer", "pdf")).toBe("Maya-Iyer-Resume.pdf");
    expect(downloadName("  ", "pdf")).toBe("Resume.pdf");
    expect(downloadName("../../etc", "pdf")).toBe("etc-Resume.pdf");
  });
});

describe("domains", () => {
  it("accepts real hostnames only", () => {
    expect(cleanDomain("https://WWW.Maya.dev/path")).toBe("www.maya.dev");
    expect(cleanDomain("maya.dev.")).toBe("maya.dev");
    expect(cleanDomain("localhost")).toBeNull();
    expect(cleanDomain("foo.localhost")).toBeNull();
    expect(cleanDomain("my-app.vercel.app")).toBeNull();
    expect(cleanDomain("a b.com")).toBeNull();
    expect(cleanDomain("-bad.com")).toBeNull();
  });
  it("gives the right DNS record", () => {
    expect(dnsRecord("maya.dev").type).toBe("A");
    expect(dnsRecord("www.maya.dev")).toMatchObject({ type: "CNAME", name: "www" });
  });
});

describe("inputs", () => {
  it("cleans skills and project links", () => {
    expect(skillList("Figma, Research, Figma, ,Prototyping")).toEqual(["Figma", "Research", "Prototyping"]);
    expect(skillList(Array.from({ length: 40 }, (_, i) => `s${i}`).join(","))).toHaveLength(20);
    expect(webUrl("example.com/case")).toBe("https://example.com/case");
    expect(webUrl("javascript:alert(1)")).toBeNull();
    expect(webUrl("mailto:a@b.co")).toBeNull();
  });
  it("identifies images by their bytes", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
  it("turns a README into plain text", () => {
    const text = readmeExcerpt("# Title\n[![CI](https://x/b.svg)](https://x)\n\n**Unfold CLI** turns a resume into a static site you can host anywhere.\n\n```bash\nnpm i -g unfold\n```\n\n<p align=\"center\"><img src=\"x.png\"></p>\n");
    expect(text).toBe("Unfold CLI turns a resume into a static site you can host anywhere.");
    expect(readmeExcerpt("short")).toBe("");
    expect(readmeExcerpt("word ".repeat(2000)).length).toBeLessThanOrEqual(1201);
  });
});
