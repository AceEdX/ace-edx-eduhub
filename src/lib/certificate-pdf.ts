import { jsPDF } from "jspdf";
import type { Certificate } from "@/lib/api";

const NAVY = [15, 42, 74] as const;
const ORANGE = [249, 115, 22] as const;
const GREEN = [22, 163, 74] as const;
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

  // Header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AceEdX", 18, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(201, 214, 228);
  doc.text("Professional learning for school leaders", W - 18, 17, { align: "right" });

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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text("Date of issue", 69, baseY + 5, { align: "center" });
  doc.text("Issuing authority", W - 69, baseY + 5, { align: "center" });

  // Verification seal
  doc.setFillColor(236, 253, 243);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.circle(W / 2, baseY - 4, 15, "FD");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("VERIFIED", W / 2, baseY - 7, { align: "center" });
  doc.setFontSize(6.6);
  doc.setFont("helvetica", "normal");
  doc.text("CREDENTIAL", W / 2, baseY - 3, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.text("AceEdX", W / 2, baseY + 2.5, { align: "center" });

  // Footer bar
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Certificate ID: ${certificate.certificate_id}`, 14, H - 3.6);
  doc.text(`Verify at ${verifyUrl}`, W - 14, H - 3.6, { align: "right" });

  doc.save(`AceEdX-Certificate-${certificate.certificate_id}.pdf`);
}
