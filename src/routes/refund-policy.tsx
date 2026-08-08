import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — AceEdX" },
      {
        name: "description",
        content:
          "How refunds and cancellations work for AceEdX paid courses and webinars, including timelines and non-refundable cases.",
      },
      { property: "og:title", content: "Refund & Cancellation Policy — AceEdX" },
      {
        property: "og:description",
        content: "Refund windows, processing timelines and exceptions for AceEdX purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${brand.siteUrl}/refund-policy` },
    ],
    links: [{ rel: "canonical", href: `${brand.siteUrl}/refund-policy` }],
  }),
  component: () => (
    <PolicyPage
      title="Refund & Cancellation Policy"
      description="We want every school leader to get real value from AceEdX. This policy explains when a purchase can be cancelled or refunded."
      updated="8 August 2026"
      sections={[
        {
          heading: "1. Scope",
          body: [
            "This policy applies to all paid purchases made on www.aceedx.com — individual courses, live webinars, recorded webinar access and toolkit bundles. Free content carries no payment and therefore no refund.",
            "All payments are processed in Indian Rupees (INR) through our payment partner. Refunds are always returned to the original payment method.",
          ],
        },
        {
          heading: "2. Live webinars",
          body: [
            "You may cancel a paid live webinar registration up to 48 hours before the scheduled start time for a full refund.",
            "Cancellations within 48 hours of the start time are not refundable, because the seat can no longer be reallocated. You will still receive access to the recording.",
            "If AceEdX cancels or reschedules a webinar and the new date does not work for you, you receive a full refund automatically.",
          ],
        },
        {
          heading: "3. Courses and recorded content",
          body: [
            "Paid courses can be refunded within 7 days of purchase provided you have completed less than 25% of the lessons and no certificate has been issued.",
            "Once a certificate of completion has been issued for a course, that purchase is final and non-refundable.",
            "Downloadable resources and toolkit PDFs are non-refundable once downloaded, as the content is delivered in full at that moment.",
          ],
        },
        {
          heading: "4. How to request a refund",
          body: [
            `Email ${brand.supportEmail} from the address registered on your AceEdX account with your order reference, the item purchased and the reason for the request.`,
            "We acknowledge every request within 2 working days and confirm the outcome within 5 working days.",
          ],
        },
        {
          heading: "5. Processing time",
          body: [
            "Approved refunds are initiated within 5 working days of approval. Depending on your bank or card issuer, the amount typically appears in your account within 5 to 10 additional working days.",
            "Payment gateway fees, where non-recoverable, may be deducted from partial refunds; this will always be stated in writing before processing.",
          ],
        },
        {
          heading: "6. Duplicate and failed payments",
          body: [
            "If you are charged twice for the same item, or money is debited without access being granted, we refund the full duplicate amount without deduction. Contact us with the transaction reference and we will resolve it as a priority.",
          ],
        },
        {
          heading: "7. Institutional and bulk purchases",
          body: [
            "Purchases made by a school or trust under a written agreement are governed by the refund terms of that agreement, which take precedence over this page.",
          ],
        },
      ]}
    />
  ),
});
