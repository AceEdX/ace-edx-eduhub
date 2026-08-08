import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer — AceEdX" },
      {
        name: "description",
        content:
          "AceEdX content is professional guidance, not legal or regulatory advice. How to read our policy summaries and expert opinions.",
      },
      { property: "og:title", content: "Disclaimer — AceEdX" },
      {
        property: "og:description",
        content: "The status of AceEdX guidance, policy summaries and expert opinions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${brand.siteUrl}/disclaimer` },
    ],
    links: [{ rel: "canonical", href: `${brand.siteUrl}/disclaimer` }],
  }),
  component: () => (
    <PolicyPage
      title="Disclaimer"
      description="Please read this before acting on any guidance, template or policy summary you find on www.aceedx.com."
      updated="8 August 2026"
      sections={[
        {
          heading: "1. Educational guidance only",
          body: [
            "All courses, webinars, templates and library documents on AceEdX are provided for professional learning. They are not legal, regulatory, financial or medical advice, and should not be used as a substitute for advice from a qualified professional or from your affiliating board.",
          ],
        },
        {
          heading: "2. Policy references",
          body: [
            "Where our documents refer to NEP 2020, the National Curriculum Frameworks, the RTE Act 2009, NIPUN Bharat, POCSO, the DPDP Act 2023 or other government instruments, they present summaries and practical interpretations prepared for school leaders.",
            "They are not official publications and are not endorsed by the Government of India, NCERT, NCTE, CBSE or any State authority. Always consult the original notification or circular before taking a compliance decision.",
          ],
        },
        {
          heading: "3. Expert opinions",
          body: [
            "Views expressed by speakers, contributors and community members are their own and do not necessarily reflect the position of AceEdX. We do not warrant the accuracy or completeness of any individual contribution.",
          ],
        },
        {
          heading: "4. Outcomes",
          body: [
            "School improvement depends on context. AceEdX makes no guarantee of any particular academic, admissions, inspection or financial outcome from applying the content.",
          ],
        },
        {
          heading: "5. External links",
          body: [
            "Links to external websites are provided for convenience. We are not responsible for the content, accuracy or availability of those sites.",
          ],
        },
        {
          heading: "6. Contact",
          body: [
            `If you believe anything on ${brand.site} is inaccurate or out of date, tell us at ${brand.supportEmail} and we will review it promptly.`,
          ],
        },
      ]}
    />
  ),
});
