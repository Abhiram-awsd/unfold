import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for using Unfold." };

export default function Terms() {
  return (
    <>
      <h1>Terms of use</h1>
      <p className="lg-date">Last updated {LEGAL_UPDATED}</p>
      <p>By using Unfold you agree to these terms. If you don’t agree, please don’t use it.</p>

      <h2>Your content</h2>
      <p>Your resume, portfolio and images stay yours. You give us permission to store, process and display them so the service can work, including sending your resume to an AI service to draft your portfolio (see the <a href="/privacy">privacy policy</a>).</p>
      <p>You’re responsible for what you publish. Only upload a resume that is yours, and check AI-drafted text before approving it: drafts can contain mistakes.</p>

      <h2>What’s not allowed</h2>
      <ul>
        <li>Pretending to be someone else, or publishing false qualifications or other people’s work as your own.</li>
        <li>Illegal, hateful, harassing or sexually explicit content, malware, phishing or spam.</li>
        <li>Publishing other people’s personal information without their permission.</li>
        <li>Attacking, overloading or scraping the service, or getting around its limits.</li>
      </ul>
      <p>We may unpublish a site or close an account that breaks these rules.</p>

      <h2>The service</h2>
      <p>Unfold is currently free. We may add paid plans later; anything free today won’t be charged for without your agreement. We work to keep sites online but can’t promise the service will never be interrupted, and features may change.</p>
      <p>Custom domains remain yours. You’re responsible for renewing them and for their DNS settings.</p>

      <h2>Ending your use</h2>
      <p>You can delete your account at any time from Dashboard → Settings, which removes your data and takes your site offline.</p>

      <h2>Liability</h2>
      <p>Unfold is provided “as is”. To the extent the law allows, we aren’t liable for indirect losses such as a missed job opportunity, lost data or lost income arising from use of the service. Nothing here limits rights you have under consumer law that can’t be waived.</p>

      <h2>Changes and contact</h2>
      <p>We’ll give notice of important changes to these terms by email or in the dashboard. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>
  );
}
