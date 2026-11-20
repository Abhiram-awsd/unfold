import type { Metadata } from "next";
import { aiProviderName, CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy policy", description: "What Unfold collects, why, who processes it and how to delete it." };

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="lg-date">Last updated {LEGAL_UPDATED}</p>
      <p>Unfold turns your resume into a portfolio website. This page says what we collect, why, who handles it and how you can remove it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your email address and sign-in details, handled by our sign-in provider.</li>
        <li><b>Your resume:</b> the file you upload and the text read from it (name, headline, work history, education, skills, links, and anything else in the file, which may include a phone number or address).</li>
        <li><b>Portfolio content:</b> what you write or edit, your photo and project images, and repositories you choose to import from GitHub.</li>
        <li><b>Messages:</b> the name, email and message of people who use the contact form on your site.</li>
        <li><b>Visit counts:</b> for each published portfolio, the time of a visit, the site that linked to it (hostname only) and which links were clicked. We don’t use advertising cookies or build visitor profiles.</li>
      </ul>

      <h2>How your resume is processed</h2>
      <p>To build your portfolio, the resume file or its text is sent to an AI service, currently {aiProviderName()}. On a free AI tier the provider may keep the content it receives and use it to improve its services, so <b>remove anything you don’t want shared before uploading</b>. The AI only drafts content; nothing is published until you approve it.</p>

      <h2>What is public</h2>
      <ul>
        <li>Nothing is public until you press Publish. Draft projects never appear on your site.</li>
        <li>Your email appears only if you switch on “Show my email”.</li>
        <li>Your resume file is private. It becomes downloadable only if you switch on the download button, and stops when you switch it off.</li>
        <li>Photos and project images you add are stored at public addresses so your site can show them.</li>
      </ul>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Clerk: sign-in and accounts.</li>
        <li>Supabase: database and file storage.</li>
        <li>Vercel: hosting.</li>
        <li>{aiProviderName()}: reading resumes.</li>
        <li>Resend: email notifications, when enabled.</li>
        <li>GitHub: only when you import repositories or show your contribution calendar, using public data.</li>
      </ul>
      <p>These providers may store data outside your country. We don’t sell personal data.</p>

      <h2>How long we keep it</h2>
      <p>We keep your data while your account exists. Deleting your account (Dashboard → Settings) removes your portfolio, projects, resume files, images, messages and visit counts straight away. Backups held by our providers expire on their own schedule, normally within 30 days.</p>

      <h2>Your choices</h2>
      <ul>
        <li>See and correct your data in the dashboard at any time.</li>
        <li>Unpublish your site or delete your account from the dashboard.</li>
        <li>Ask us for a copy of your data, or for help with any of the above, at {mail}.</li>
      </ul>

      <h2>Children</h2>
      <p>Unfold is not meant for anyone under 18 without a parent or guardian’s consent.</p>

      <h2>Changes and contact</h2>
      <p>If this policy changes in a way that matters, we’ll tell you by email or in the dashboard before it takes effect. Questions and complaints: {mail}.</p>
    </>
  );
}
