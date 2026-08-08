import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — AceEdX" },
      {
        name: "description",
        content:
          "The cookies and local storage AceEdX uses, why they are needed, and how you can control them in your browser.",
      },
      { property: "og:title", content: "Cookie Policy — AceEdX" },
      {
        property: "og:description",
        content: "Essential, preference and analytics cookies used on www.aceedx.com.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${brand.siteUrl}/cookie-policy` },
    ],
    links: [{ rel: "canonical", href: `${brand.siteUrl}/cookie-policy` }],
  }),
  component: () => (
    <PolicyPage
      title="Cookie Policy"
      description="How www.aceedx.com uses cookies and browser storage to keep you signed in and improve the platform."
      updated="8 August 2026"
      sections={[
        {
          heading: "1. What we use",
          body: [
            "Essential cookies and local storage keep your session active so you stay signed in as you move between courses, webinars and the community. Without them the platform cannot function.",
            "Preference storage remembers small choices such as filters you applied or the lesson you were last watching.",
            "Analytics cookies, where enabled, tell us anonymously which pages and programmes are used most so we can improve them. They never identify you personally.",
          ],
        },
        {
          heading: "2. Third-party cookies",
          body: [
            "Our payment partner sets cookies during checkout to prevent fraud. Embedded video players (for example YouTube or Vimeo recordings) may set their own cookies when you play a recording; these are governed by the provider's policy.",
          ],
        },
        {
          heading: "3. Controlling cookies",
          body: [
            "You can clear or block cookies in your browser settings at any time. Blocking essential cookies will sign you out and prevent progress and certificates from saving.",
            "Clearing local storage will also clear your saved session; you will simply need to sign in again.",
          ],
        },
        {
          heading: "4. Questions",
          body: [
            `If you would like more detail on any cookie we set, email ${brand.supportEmail}.`,
          ],
        },
      ]}
    />
  ),
});
