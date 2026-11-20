import type { ResumeData } from "@/lib/parse-resume";

/** Id used for sample content, so templates can tell a preview from a real portfolio. */
export const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

/** A fictional resume, already parsed. Used by template previews and demo mode's "Try a sample resume". */
export const SAMPLE_RESUME: ResumeData = {
  name: "Maya Iyer",
  headline: "Designing calm software for busy teams.",
  bio: "I’m a product designer with eight years in health and finance. I turn complicated workflows into screens people can trust, and I like working closely with engineers from the first sketch to launch.",
  location: "Bengaluru, India",
  email: "maya@example.com",
  skills: ["Product design", "Design systems", "Prototyping", "User research", "Figma", "React", "Motion", "Accessibility"],
  links: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/example" },
    { label: "GitHub", url: "https://github.com/example" },
    { label: "Website", url: "https://example.com" },
  ],
  education: [
    { school: "National Institute of Design", degree: "M.Des, Interaction Design", period: "2015–2017" },
    { school: "Google UX Certificate", degree: null, period: "2016" },
  ],
  projects: [
    {
      title: "Care dashboard",
      organization: "Linear Health",
      period: "2022–now",
      summary: "A single view of every patient for nurses on shift.",
      story: "Nurses were switching between four tools to plan a shift. I mapped their day with twelve nurses, merged the tools into one dashboard and shipped it in stages. Time spent on handover notes dropped by a third.",
    },
    {
      title: "Mobile banking app",
      organization: "Tandem Bank",
      period: "2019–2022",
      summary: "Redesigned onboarding and everyday payments.",
      story: "New customers were dropping off at identity checks. I split the flow into three short steps with clear progress, and activation rose 18% in six weeks.",
    },
    {
      title: "Token design system",
      organization: "Studio North",
      period: "2017–2019",
      summary: "One set of colour, type and spacing tokens for eight client products.",
      story: "Every client project started from scratch. I built a shared token library with the front-end team, which cut the time to a first prototype from two weeks to four days.",
    },
    {
      title: "Accessible forms kit",
      organization: "Side project",
      period: "2021",
      summary: "Form patterns that pass WCAG AA out of the box.",
      story: "I collected the form mistakes I kept seeing in audits and turned the fixes into a small open-source kit used by a few hundred teams.",
    },
  ],
};
