import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — AceEdX" },
      {
        name: "description",
        content:
          "How AceEdX collects, uses, stores and protects your personal data, and the rights you have under the DPDP Act 2023.",
      },
      { property: "og:title", content: "Privacy Policy — AceEdX" },
      {
        property: "og:description",
        content: "Data we collect, how we use it, and your rights as an AceEdX member.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${brand.siteUrl}/privacy-policy` },
    ],
    links: [{ rel: "canonical", href: `${brand.siteUrl}/privacy-policy` }],
  }),
  component: () => (
    <PolicyPage
      title="Privacy Policy"
      description="AceEdX is built for school leaders, and we treat your professional data with the same care we ask you to apply to your students'."
      updated="8 August 2026"
      sections={[
        {
          heading: "1. Data we collect",
          body: [
            "Account data: name, email address, professional role, school or organisation, city, country and years in education.",
            "Learning data: courses enrolled, lesson progress, webinar registrations and attendance, certificates issued, learning hours and streaks.",
            "Community data: posts, comments and group memberships you choose to create.",
            "Transaction data: order records for paid items, including amount, item and payment status. We never receive or store your full card number.",
            "Technical data: log information such as browser type and approximate location, used for security and reliability.",
          ],
        },
        {
          heading: "2. How we use it",
          body: [
            "To provide the service — authenticate you, deliver content, track progress and issue verifiable certificates.",
            "To communicate — registration confirmations, webinar reminders, certificate notifications and, where you opt in, updates about new programmes.",
            "To improve — understanding which topics and formats help school leaders most.",
            "We do not sell your personal data, and we do not use your community posts to advertise to third parties.",
          ],
        },
        {
          heading: "3. Legal basis and consent",
          body: [
            "We process data on the basis of your consent when you register, and on the basis of legitimate interest for platform security and service delivery. You may withdraw consent at any time by deleting your account.",
          ],
        },
        {
          heading: "4. Sharing",
          body: [
            "We share only what is necessary with: our cloud hosting and database provider, our payment gateway (for processing purchases), and our email delivery provider.",
            "Certificate verification pages expose only the details printed on the certificate itself — recipient name, programme title, issue date and certificate ID — and only to someone who already has the specific certificate ID.",
            "We may disclose data where required by law.",
          ],
        },
        {
          heading: "5. Retention",
          body: [
            "Account and learning records are retained while your account is active. Certificate records are retained indefinitely so that issued credentials remain verifiable, unless you specifically ask for revocation.",
            "Order records are retained as required by Indian tax and accounting rules.",
          ],
        },
        {
          heading: "6. Your rights",
          body: [
            "Under the Digital Personal Data Protection Act, 2023 you may request access to your data, correction of inaccurate data, erasure of your account, and details of processing.",
            `Write to ${brand.supportEmail} and we will respond within 30 days.`,
          ],
        },
        {
          heading: "7. Security",
          body: [
            "Data is stored on managed infrastructure with encryption in transit, row-level access controls so members can only read their own records, and role-restricted administrative access.",
          ],
        },
        {
          heading: "8. Children",
          body: [
            "AceEdX is a platform for education professionals and is not intended for use by children. Please do not upload student-identifying information into posts, comments or uploaded documents.",
          ],
        },
      ]}
    />
  ),
});
