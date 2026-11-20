import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortfolioTemplate } from "@/app/_templates";
import { currentUserId, loadOwner } from "@/lib/data";
import { previewOf } from "@/lib/data/public";
import { DEMO } from "@/lib/demo";
import { educationLines, linkLines } from "@/lib/links";
import { portfolioUrl } from "@/lib/site";
import { normalizeOptions } from "@/lib/theme";
import { Editor, type EditorData } from "./Editor";

/**
 * Edit on the page: the owner's site rendered exactly as visitors see it (approved projects only),
 * with every marked field clickable. Saving refreshes the server render, so what you see is what's live.
 */
export default async function EditorPage() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  const res = await loadOwner(userId);
  if (!res.ok) {
    console.error("[editor]", res.error.cause);
    return <EditorMessage title="We couldn’t load your portfolio." body="Refresh the page in a moment." />;
  }
  if (!res.value) return <EditorMessage title="Upload a resume first." body="The editor opens once Unfold has built your site." />;

  const { portfolio: p, projects } = res.value;
  const preview = previewOf(p, projects);
  const o = normalizeOptions(p.theme_options);
  const data: EditorData = {
    values: {
      name: p.name,
      headline: p.headline,
      bio: p.bio,
      location: p.location ?? "",
      email: p.email ?? "",
      skills: p.skills.join(", "),
      links: linkLines(p.links),
      education: educationLines(p.education),
    },
    projects: Object.fromEntries(
      projects.map(pr => [pr.id, { title: pr.title, organization: pr.organization ?? "", period: pr.period ?? "", summary: pr.summary, story: pr.story, link_url: pr.link_url ?? "" }]),
    ),
    look: { theme: p.theme, accent: o.accent, font: o.font, mode: o.mode },
    published: p.published,
    liveUrl: DEMO ? `/s/${p.slug}` : portfolioUrl(p.slug),
    drafts: projects.filter(pr => !pr.approved).length,
    showEmail: p.show_email,
  };

  return (
    <Editor data={data}>
      <PortfolioTemplate p={preview} />
    </Editor>
  );
}

function EditorMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="ed-msg">
      <h1>{title}</h1>
      <p>{body}</p>
      <a className="btn btn-silver" href="/dashboard">Go to your dashboard</a>
    </main>
  );
}
