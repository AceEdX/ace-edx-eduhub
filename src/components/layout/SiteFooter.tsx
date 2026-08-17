import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { brand, POLICY_LINKS } from "@/lib/brand";

const columns = [
  {
    heading: "Learn",
    links: [
      { to: "/courses", label: "Courses" },
      { to: "/webinars", label: "Webinars" },
      { to: "/learning-paths", label: "Learning paths" },
      { to: "/media", label: "Media library" },
      { to: "/resources", label: "Resource library" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { to: "/community", label: "Community" },
      { to: "/experts", label: "Experts" },
      { to: "/request-a-speaker", label: "Request a speaker" },
      { to: "/sponsorships", label: "Sponsorships" },
      { to: "/dashboard", label: "My dashboard" },
    ],
  },
  {
    heading: "Company",
    links: POLICY_LINKS,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {brand.tagline} The professional home for principals, school owners and academic
            leaders — learning, community and verifiable credentials in one place.
          </p>
          <a
            href={brand.siteUrl}
            className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
          >
            {brand.site}
          </a>
        </div>
        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
              {col.heading}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {brand.name} · {brand.site}. All rights reserved.
          </span>
          <span>{brand.supportEmail}</span>
        </div>
      </div>
    </footer>
  );
}
