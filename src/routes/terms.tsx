import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — AceEdX" },
      {
        name: "description",
        content:
          "The terms governing your use of AceEdX: accounts, acceptable use, content ownership, certificates, payments and liability.",
      },
      { property: "og:title", content: "Terms of Use — AceEdX" },
      {
        property: "og:description",
        content: "Account rules, content ownership, certificates and payment terms for AceEdX.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${brand.siteUrl}/terms` },
    ],
    links: [{ rel: "canonical", href: `${brand.siteUrl}/terms` }],
  }),
  component: () => (
    <PolicyPage
      title="Terms of Use"
      description="These terms form the agreement between you and AceEdX when you use www.aceedx.com."
      updated="8 August 2026"
      sections={[
        {
          heading: "1. Acceptance",
          body: [
            "By creating an account, browsing or purchasing on www.aceedx.com you agree to these terms. If you do not agree, please do not use the platform.",
          ],
        },
        {
          heading: "2. Your account",
          body: [
            "You must provide accurate professional details and keep your login credentials confidential. Accounts are personal to you and may not be shared across a school team; institutional access is available separately.",
            "You are responsible for all activity that takes place under your account.",
          ],
        },
        {
          heading: "3. Acceptable use",
          body: [
            "AceEdX is a professional community. You agree not to post content that is unlawful, defamatory, discriminatory, plagiarised or commercially promotional, and not to share personally identifiable information about students.",
            "You may not download, record, resell or redistribute course videos, webinar recordings or library documents outside your own school without written permission.",
            "We may suspend or remove accounts that breach these rules, without refund where the breach is serious.",
          ],
        },
        {
          heading: "4. Content ownership",
          body: [
            "All courses, webinars, documents and platform materials remain the intellectual property of AceEdX or the contributing expert. You receive a personal, non-transferable licence to access them for your own professional development.",
            "Content you post to the community remains yours, but you grant AceEdX a licence to display and distribute it within the platform.",
          ],
        },
        {
          heading: "5. Certificates",
          body: [
            "Certificates are issued only after genuine completion — all lessons finished for a course, or the required share of a webinar actually attended or watched.",
            "Each certificate carries a unique ID and a public verification link. AceEdX may revoke a certificate obtained through misrepresentation or account sharing.",
            "Certificates evidence participation in professional learning. They are not a statutory or regulatory qualification.",
          ],
        },
        {
          heading: "6. Payments",
          body: [
            "Prices are shown in Indian Rupees and include applicable taxes unless stated otherwise. Payments are handled by our payment partner; we do not store your card details.",
            "Refunds are governed by our Refund & Cancellation Policy.",
          ],
        },
        {
          heading: "7. Availability",
          body: [
            "We aim for continuous availability but may suspend the platform for maintenance or events beyond our control. Scheduled webinars may occasionally be rescheduled; registrants are notified.",
          ],
        },
        {
          heading: "8. Limitation of liability",
          body: [
            "To the extent permitted by law, AceEdX's total liability arising from your use of the platform is limited to the amount you paid for the item concerned in the preceding twelve months.",
          ],
        },
        {
          heading: "9. Changes and governing law",
          body: [
            "We may update these terms; material changes will be notified on the platform. Continued use after the update constitutes acceptance.",
            "These terms are governed by the laws of India and subject to the exclusive jurisdiction of the courts of India.",
          ],
        },
      ]}
    />
  ),
});
