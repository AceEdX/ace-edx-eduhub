import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { certificateQuery } from "@/lib/api";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/verify/$certificateId")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify certificate ${params.certificateId} — AceEdX` },
      {
        name: "description",
        content: `Public verification page for AceEdX certificate ${params.certificateId}.`,
      },
      { property: "og:title", content: `Verify certificate ${params.certificateId} — AceEdX` },
      { property: "og:description", content: "Check the authenticity of an AceEdX certificate." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { certificateId } = Route.useParams();
  const { data, isLoading } = useQuery(certificateQuery(certificateId));

  return (
    <PageShell>
      <div className="container-page max-w-2xl py-16">
        {isLoading ? (
          <Skeleton className="h-72 rounded-2xl" />
        ) : !data || data.revoked ? (
          <div className="card-surface p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold">
              {data?.revoked ? "Certificate revoked" : "Certificate not found"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We could not verify <span className="font-mono">{certificateId}</span>. Check the ID
              on the certificate and try again.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link to="/">Back to {brand.name}</Link>
            </Button>
          </div>
        ) : (
          <div className="card-surface overflow-hidden">
            <div className="bg-success px-8 py-6 text-success-foreground">
              <p className="inline-flex items-center gap-2 font-display text-xl font-semibold">
                <BadgeCheck className="h-6 w-6" /> Certificate valid
              </p>
            </div>
            <dl className="divide-y divide-border">
              {[
                ["Recipient", data.recipient_name],
                [data.kind === "webinar" ? "Webinar" : "Course", data.title],
                ["Issued by", data.issuer],
                ["Certificate ID", data.certificate_id],
                ["Issue date", new Date(data.issued_at).toLocaleDateString()],
                ...(data.speaker ? [["Speaker", data.speaker]] : []),
                ...(data.duration_text ? [["Duration", data.duration_text]] : []),
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-6 px-8 py-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-right text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-border px-8 py-5 text-xs text-muted-foreground">
              This credential was issued by {brand.name} and can be independently verified at this
              URL at any time.
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
