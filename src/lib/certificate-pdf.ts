import { jsPDF } from "jspdf";
import type { Certificate } from "@/lib/api";

const NAVY = [15, 42, 74] as const;
const ORANGE = [249, 115, 22] as const;

const GREY = [91, 107, 124] as const;

/**
 * Draws the AceEdX certificate as a vector PDF (A4 landscape) and downloads it.
 */
export function downloadCertificatePdf(certificate: Certificate, verifyUrl: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  // Background + frame
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 26, W, 2.4, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 10, W, 10, "F");

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.9);
  doc.rect(10, 33, W - 20, H - 50);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.35);
  doc.rect(13, 36, W - 26, H - 56);

  // Corner flourishes
  const corner = (x: number, y: number, dx: number, dy: number) => {
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(1.1);
    doc.line(x, y, x + dx * 14, y);
    doc.line(x, y, x, y + dy * 14);
  };
  corner(17, 40, 1, 1);
  corner(W - 17, 40, -1, 1);
  corner(17, H - 21, 1, -1);
  corner(W - 17, H - 21, -1, -1);

  // Watermark monogram
  doc.setFont("times", "bold");
  doc.setFontSize(120);
  doc.setTextColor(238, 242, 246);
  doc.text("AX", W / 2, H / 2 + 26, { align: "center" });

  // Header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AceEdX", 18, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(201, 214, 228);
  doc.text("www.aceedx.com  ·  Professional learning for school leaders", W - 18, 17, {
    align: "right",
  });

  const isWebinar = certificate.kind === "webinar";

  // Title block
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(
    isWebinar ? "CERTIFICATE OF PARTICIPATION" : "CERTIFICATE OF COMPLETION",
    W / 2,
    52,
    { align: "center", charSpace: 1.6 },
  );

  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1.1);
  doc.line(W / 2 - 22, 57, W / 2 + 22, 57);

  doc.setTextColor(...GREY);
  doc.setFontSize(11);
  doc.text("This is to certify that", W / 2, 70, { align: "center" });

  // Recipient
  doc.setTextColor(...NAVY);
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.text(certificate.recipient_name, W / 2, 85, { align: "center", maxWidth: W - 70 });

  doc.setDrawColor(220, 227, 234);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 70, 91, W / 2 + 70, 91);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GREY);
  doc.text(
    isWebinar
      ? "has attended the live professional development webinar"
      : "has successfully completed the professional development course",
    W / 2,
    101,
    { align: "center" },
  );

  // Programme title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...NAVY);
  const titleLines = doc.splitTextToSize(certificate.title, W - 90) as string[];
  titleLines.slice(0, 2).forEach((line, i) => {
    doc.text(line, W / 2, 113 + i * 9, { align: "center" });
  });

  const detailY = 113 + Math.min(titleLines.length, 2) * 9 + 6;
  const details = [
    certificate.speaker ? `Facilitated by ${certificate.speaker}` : null,
    certificate.duration_text ? `Duration: ${certificate.duration_text}` : null,
  ].filter(Boolean) as string[];
  if (details.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...GREY);
    doc.text(details.join("   |   "), W / 2, detailY, { align: "center" });
  }

  // Footer detail row
  const baseY = H - 42;
  doc.setDrawColor(220, 227, 234);
  doc.setLineWidth(0.4);
  doc.line(30, baseY, 108, baseY);
  doc.line(W - 108, baseY, W - 30, baseY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(new Date(certificate.issued_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }), 69, baseY - 3, { align: "center" });
  doc.text(certificate.issuer || "AceEdX", W - 69, baseY - 3, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(certificate.issuer || "AceEdX", W - 69, baseY - 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text("Date of issue", 69, baseY + 5, { align: "center" });
  doc.text("Authorised signatory  ·  Issuing authority", W - 69, baseY + 5, { align: "center" });

  // Verification seal — orange star
  const cx = W / 2;
  const cy = baseY - 4;
  const drawStar = (outer: number, inner: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]] as [number, number]);
    deltas.push([pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]]);
    return { start: pts[0], deltas };
  };

  const outerStar = drawStar(19, 8.4);
  doc.setFillColor(...ORANGE);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.lines(outerStar.deltas, outerStar.start[0], outerStar.start[1], [1, 1], "FD", true);

  const innerStar = drawStar(15.5, 6.8);
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.lines(innerStar.deltas, innerStar.start[0], innerStar.start[1], [1, 1], "FD", true);

  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("VERIFIED", cx, cy - 2.2, { align: "center" });
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text("CREDENTIAL", cx, cy + 1.4, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(...NAVY);
  doc.text("AceEdX", cx, cy + 5.2, { align: "center" });


  // Footer bar
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Certificate ID: ${certificate.certificate_id}`, 14, H - 3.6);
  doc.text(`Verify at ${verifyUrl}`, W - 14, H - 3.6, { align: "right" });

  doc.save(`AceEdX-Certificate-${certificate.certificate_id}.pdf`);
}
