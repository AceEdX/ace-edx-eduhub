import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface PaymentConfirmationProps {
  itemTitle?: string;
  amountInr?: number;
  paymentId?: string;
  accessUrl?: string;
  itemType?: string;
}

export function PaymentConfirmation({
  itemTitle = "Your AceEdX purchase",
  amountInr = 0,
  paymentId = "—",
  accessUrl = "https://eduhub.aceedx.com/my-learning",
  itemType = "course",
}: PaymentConfirmationProps) {
  const label =
    itemType === "webinar" ? "webinar" : itemType === "subscription" ? "membership" : "course";

  return (
    <Html>
      <Head />
      <Preview>Payment confirmed — {itemTitle}</Preview>
      <Body style={{ backgroundColor: "#f5f6f8", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "12px", maxWidth: "560px", padding: "32px" }}>
          <Text style={{ color: "#F97316", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", margin: 0 }}>
            ACEEDX PRINCIPALX
          </Text>
          <Heading style={{ color: "#0F2B5B", fontSize: "24px", margin: "8px 0 16px" }}>
            Payment confirmed
          </Heading>
          <Text style={{ color: "#334155", fontSize: "15px", lineHeight: "24px" }}>
            Thank you for your payment. Your {label} access is ready.
          </Text>

          <Section style={{ backgroundColor: "#f8fafc", borderRadius: "10px", padding: "16px", margin: "20px 0" }}>
            <Text style={{ color: "#0F2B5B", fontSize: "15px", fontWeight: 700, margin: "0 0 8px" }}>{itemTitle}</Text>
            <Text style={{ color: "#475569", fontSize: "14px", margin: "0 0 4px" }}>
              Amount paid: Rs {amountInr}
            </Text>
            <Text style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Payment id: {paymentId}</Text>
          </Section>

          <Link
            href={accessUrl}
            style={{
              backgroundColor: "#0F2B5B",
              borderRadius: "8px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "15px",
              fontWeight: 700,
              padding: "12px 22px",
              textDecoration: "none",
            }}
          >
            Open your {label}
          </Link>

          <Text style={{ color: "#64748b", fontSize: "13px", lineHeight: "20px", marginTop: "24px" }}>
            If the button does not work, use this link: {accessUrl}
          </Text>
          <Text style={{ color: "#16A34A", fontSize: "13px", marginTop: "16px" }}>
            Need help? Reply to this email and our team will assist you.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: PaymentConfirmation,
  displayName: "Payment confirmation",
  subject: (data: Record<string, any>) =>
    `Payment confirmed — ${data["itemTitle"] ?? "your AceEdX purchase"}`,
  previewData: {
    itemTitle: "Leading School Transformation Masterclass",
    amountInr: 2999,
    paymentId: "pay_ABC123XYZ",
    accessUrl: "https://eduhub.aceedx.com/learn/leading-school-transformation",
    itemType: "course",
  },
} satisfies TemplateEntry;
