export const brand = {
  name: "AceEdX",
  tagline: "Learn. Lead. Connect. Transform.",
  headline: "The Professional Learning & Community Platform for School Leaders",
  subheadline:
    "Learn from experts. Connect with peers. Discover what works. Lead better schools.",
  certificatePrefix: "ACE",
  supportEmail: "hello@aceedx.com",
  currency: "INR",
  site: "www.aceedx.com",
  siteUrl: "https://www.aceedx.com",
} as const;

export const POLICY_LINKS = [
  { to: "/refund-policy", label: "Refund policy" },
  { to: "/terms", label: "Terms of use" },
  { to: "/privacy-policy", label: "Privacy policy" },
  { to: "/cookie-policy", label: "Cookie policy" },
  { to: "/disclaimer", label: "Disclaimer" },
] as const;

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/webinars", label: "Webinars" },
  { to: "/community", label: "Community" },
  { to: "/resource-principals", label: "Resource Principals" },
  { to: "/resources", label: "Resources" },
] as const;

export const PROFESSIONAL_ROLES = [
  "Principal",
  "School Owner",
  "Director",
  "Academic Coordinator",
  "Vice Principal",
  "Head of School",
  "Education Consultant",
  "Teacher Leader",
  "Other",
] as const;

export const INTEREST_AREAS = [
  "AI in Education",
  "School Leadership",
  "Teacher Development",
  "Student Wellbeing",
  "Curriculum",
  "Assessment",
  "School Growth",
  "Parent Engagement",
  "Education Technology",
  "Future Skills",
  "Governance",
  "Admissions",
] as const;

export function formatPrice(amountInr: number, isFree: boolean) {
  if (isFree || amountInr <= 0) return "Free";
  return `₹${amountInr.toLocaleString("en-IN")}`;
}
