import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { brand } from "@/lib/brand";

export type PolicySection = { heading: string; body: string[] };

export function PolicyPage({
  eyebrow = "Policies",
  title,
  description,
  updated,
  sections,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  updated: string;
  sections: PolicySection[];
}) {
  return (
    <PageShell>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="container-page max-w-3xl py-12">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Last updated {updated}
        </p>
        <div className="mt-8 space-y-9">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-xl font-semibold">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="card-surface mt-12 p-6">
          <h2 className="font-display text-lg font-semibold">Contact us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {brand.name} — {brand.tagline}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>
              Website:{" "}
              <a className="text-accent hover:underline" href={brand.siteUrl}>
                {brand.site}
              </a>
            </li>
            <li>Email: {brand.supportEmail}</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
