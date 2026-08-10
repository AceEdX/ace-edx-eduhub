import { BadgeCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import type { Certificate } from "@/lib/api";

function verifyUrl(id: string) {
  const origin = typeof window === "undefined" ? "https://aceedx.com" : window.location.origin;
  return `${origin}/verify/${id}`;
}

/**
 * Print-quality certificate presentation, shared by the wallet and the public
 * verification page.
 */
export function CertificateArtwork({ certificate }: { certificate: Certificate }) {
  const c = certificate;
  const isWebinar = c.kind === "webinar";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="h-2 w-full bg-primary" />
      <div className="h-1 w-full bg-accent" />
      <div className="relative m-3 rounded-xl border border-primary/25 p-1 sm:m-5">
        <div className="rounded-lg border border-accent/40 px-5 py-8 text-center sm:px-10 sm:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Certificate of {isWebinar ? "participation" : "completion"}
          </p>
          <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-accent" />

          <p className="mt-8 text-sm text-muted-foreground">This is to certify that</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-primary sm:text-4xl">
            {c.recipient_name}
          </h2>
          <div className="mx-auto mt-3 h-px w-48 bg-border" />

          <p className="mt-6 text-sm text-muted-foreground">
            {isWebinar
              ? "has attended the live professional development webinar"
              : "has successfully completed the professional development course"}
          </p>
          <h3 className="mx-auto mt-2 max-w-xl font-display text-xl font-semibold leading-snug sm:text-2xl">
            {c.title}
          </h3>

          {(c.speaker || c.duration_text) && (
            <p className="mt-3 text-xs text-muted-foreground">
              {[c.speaker && `Facilitated by ${c.speaker}`, c.duration_text]
                .filter(Boolean)
                .join("   ·   ")}
            </p>
          )}

          <div className="mt-10 grid items-end gap-6 sm:grid-cols-3">
            <div className="order-2 sm:order-1">
              <div className="mx-auto h-px w-36 bg-border" />
              <p className="mt-2 text-sm font-semibold">
                {new Date(c.issued_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Date of issue
              </p>
            </div>

            <div className="order-1 flex justify-center sm:order-2">
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
                  <polygon
                    points="50,3 61.8,35.5 96.4,35.5 68.3,56.5 79.1,90 50,69.5 20.9,90 31.7,56.5 3.6,35.5 38.2,35.5"
                    className="fill-accent"
                  />
                  <polygon
                    points="50,14 59.6,40.5 87.8,40.5 65,57.6 73.8,84.8 50,68.1 26.2,84.8 35,57.6 12.2,40.5 40.4,40.5"
                    className="fill-accent-soft"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-accent">
                    Verified
                  </span>
                  <span className="text-[7px] uppercase tracking-wider text-muted-foreground">
                    Credential
                  </span>
                  <span className="text-[9px] font-bold text-primary">AceEdX</span>
                </div>
              </div>
            </div>


            <div className="order-3">
              <div className="mx-auto h-px w-36 bg-border" />
              <p className="mt-2 text-sm font-semibold">{c.issuer}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Issuing authority
              </p>
            </div>
          </div>

          <p className="mt-8 font-mono text-[11px] text-muted-foreground">
            ID {c.certificate_id} · Verify at {verifyUrl(c.certificate_id).replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CertificateDownloadButton({
  certificate,
  variant = "brand",
  size = "default",
}: {
  certificate: Certificate;
  variant?: "brand" | "outline";
  size?: "sm" | "default";
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => downloadCertificatePdf(certificate, verifyUrl(certificate.certificate_id))}
    >
      <Download className="h-4 w-4" /> Download PDF
    </Button>
  );
}

export function CertificateBadgeLine({ kind }: { kind: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
      <BadgeCheck className="h-4 w-4" />
      {kind === "webinar" ? "Participation" : "Completion"} certificate
    </p>
  );
}
