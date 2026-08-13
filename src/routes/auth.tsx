import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTEREST_AREAS, PROFESSIONAL_ROLES, brand } from "@/lib/brand";
import { SCHOOL_BOARDS } from "@/lib/principals";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Join the Principal Network — AceEdX PrincipalX" },
      {
        name: "description",
        content:
          "Create your verified principal account to access the community, webinars, masterclasses, courses and certificates on AceEdX PrincipalX.",
      },
      { property: "og:title", content: "Join the Principal Network — AceEdX PrincipalX" },
      {
        property: "og:description",
        content: "A professional network built exclusively for school principals and education leaders.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z.string().min(1, "Enter a password").max(72);

type Form = {
  fullName: string;
  email: string;
  password: string;
  professionalRole: string;
  designation: string;
  schoolName: string;
  affiliationNumber: string;
  board: string;
  schoolWebsite: string;
  mobile: string;
  linkedinUrl: string;
  city: string;
  state: string;
  country: string;
  years: string;
  interests: string[];
  bio: string;
};

const emptyForm: Form = {
  fullName: "",
  email: "",
  password: "",
  professionalRole: "",
  designation: "",
  schoolName: "",
  affiliationNumber: "",
  board: "",
  schoolWebsite: "",
  mobile: "",
  linkedinUrl: "",
  city: "",
  state: "",
  country: "",
  years: "",
  interests: [],
  bio: "",
};

const STEPS = [
  "Your name",
  "Email",
  "Password",
  "Professional role",
  "Your school",
  "School verification",
  "Contact details",
  "Location",
  "Experience",
  "Areas of interest",
  "About you",
];

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(): string | null {
    if (step === 0 && form.fullName.trim().length < 2) return "Please enter your full name";
    if (step === 1) {
      const r = emailSchema.safeParse(form.email);
      if (!r.success) return r.error.issues[0].message;
    }
    if (step === 2) {
      const r = passwordSchema.safeParse(form.password);
      if (!r.success) return r.error.issues[0].message;
    }
    if (step === 3 && !form.professionalRole) return "Choose your professional role";
    if (step === 4 && form.schoolName.trim().length < 2) return "Enter your school or organisation";
    if (step === 5) {
      if (form.affiliationNumber.trim().length < 3)
        return "Your school affiliation number is required for verification";
      if (!form.board) return "Select your school board";
    }
    if (step === 6 && form.mobile.trim().length < 6) return "Enter a mobile number we can reach you on";
    if (step === 7 && form.country.trim().length < 2) return "Enter your country";
    return null;
  }

  function next() {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else void signUp();
  }

  async function signUp() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: form.fullName.trim() },
        },
      });
      if (error) throw error;
      if (data.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: form.fullName.trim(),
            professional_role: form.professionalRole,
            designation: form.designation.trim() || form.professionalRole,
            school_name: form.schoolName.trim(),
            board: form.board,
            school_website: form.schoolWebsite.trim() || null,
            linkedin_url: form.linkedinUrl.trim() || null,
            city: form.city.trim(),
            state: form.state.trim() || null,
            country: form.country.trim(),
            years_in_education: form.years ? Number(form.years) : null,
            interests: form.interests,
            bio: form.bio.trim(),
            verification_status: "pending",
            onboarding_complete: true,
          })
          .eq("id", data.user.id);

        await supabase.from("school_verifications").upsert(
          {
            user_id: data.user.id,
            full_name: form.fullName.trim(),
            mobile: form.mobile.trim(),
            school_name: form.schoolName.trim(),
            affiliation_number: form.affiliationNumber.trim(),
            board: form.board,
            designation: form.designation.trim() || form.professionalRole,
            city: form.city.trim(),
            state: form.state.trim(),
            country: form.country.trim(),
            school_website: form.schoolWebsite.trim() || null,
            linkedin_url: form.linkedinUrl.trim() || null,
            status: "pending",
          },
          { onConflict: "user_id" },
        );
      }
      if (data.session) {
        toast.success("Account created — your school verification is under review");
        navigate({ to: "/verification" });
      } else {
        toast.success("Check your email to confirm your account");
        setMode("signin");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create your account");
    } finally {
      setBusy(false);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signinEmail.trim(),
        password: signinPassword,
      });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo />
        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-tight text-primary-foreground">
            {brand.headline}
          </h1>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/75">{brand.subheadline}</p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            <li>Verified principals only — every member is reviewed</li>
            <li>Webinars, masterclasses and courses from Resource Principals</li>
            <li>Verifiable certificates you can share</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">{brand.tagline}</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-8 flex gap-1 rounded-full bg-secondary p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Join the network"}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <form onSubmit={signIn} className="mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Welcome back</h2>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showSigninPassword ? "text" : "password"}
                    required
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSigninPassword((v) => !v)}
                    aria-label={showSigninPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="brand" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New here?{" "}
                <button type="button" className="font-semibold text-accent" onClick={() => setMode("signup")}>
                  Join the Principal Network
                </button>
              </p>
            </form>
          ) : (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{STEPS[step]}</h2>
              <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4 h-1.5" />

              <div className="mt-6 space-y-4">
                {step === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      placeholder="Priya Menon"
                      maxLength={100}
                    />
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Work email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="principal@school.edu"
                    />
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Create a password</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showSignupPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((v) => !v)}
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Any password you like.</p>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {PROFESSIONAL_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => set("professionalRole", role)}
                          className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                            form.professionalRole === role
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-border bg-card hover:border-accent/50"
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="designation">Official designation (optional)</Label>
                      <Input
                        id="designation"
                        value={form.designation}
                        onChange={(e) => set("designation", e.target.value)}
                        placeholder="Principal & Head of Senior School"
                        maxLength={120}
                      />
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-2">
                    <Label htmlFor="school">School or organisation</Label>
                    <Input
                      id="school"
                      value={form.schoolName}
                      onChange={(e) => set("schoolName", e.target.value)}
                      maxLength={140}
                    />
                  </div>
                )}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs text-accent">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        We verify every principal. Your affiliation number is stored privately, reviewed
                        by our team and never shown on your public profile.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="affiliation">School affiliation number</Label>
                      <Input
                        id="affiliation"
                        value={form.affiliationNumber}
                        onChange={(e) => set("affiliationNumber", e.target.value)}
                        placeholder="e.g. 1234567"
                        maxLength={40}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="board">School board</Label>
                      <div className="flex flex-wrap gap-2">
                        {SCHOOL_BOARDS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => set("board", b)}
                            className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                              form.board === b
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-border bg-card hover:border-accent/50"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">School website (optional)</Label>
                      <Input
                        id="website"
                        value={form.schoolWebsite}
                        onChange={(e) => set("schoolWebsite", e.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                )}
                {step === 6 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile number</Label>
                      <Input
                        id="mobile"
                        value={form.mobile}
                        onChange={(e) => set("mobile", e.target.value)}
                        placeholder="+91 98765 43210"
                        maxLength={24}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn profile (optional)</Label>
                      <Input
                        id="linkedin"
                        value={form.linkedinUrl}
                        onChange={(e) => set("linkedinUrl", e.target.value)}
                        placeholder="https://linkedin.com/in/…"
                      />
                    </div>
                  </div>
                )}
                {step === 7 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State / region</Label>
                      <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={(e) => set("country", e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {step === 8 && (
                  <div className="space-y-2">
                    <Label htmlFor="years">Years in education</Label>
                    <Input
                      id="years"
                      type="number"
                      min={0}
                      max={60}
                      value={form.years}
                      onChange={(e) => set("years", e.target.value)}
                    />
                  </div>
                )}
                {step === 9 && (
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_AREAS.map((interest) => {
                      const active = form.interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() =>
                            set(
                              "interests",
                              active
                                ? form.interests.filter((i) => i !== interest)
                                : [...form.interests, interest],
                            )
                          }
                          className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                            active
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-border bg-card hover:border-accent/50"
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                )}
                {step === 10 && (
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short professional biography</Label>
                    <Textarea
                      id="bio"
                      rows={5}
                      maxLength={600}
                      value={form.bio}
                      onChange={(e) => set("bio", e.target.value)}
                      placeholder="Principal of a 1,200-student CBSE school, focused on teacher development and wellbeing."
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                <Button variant="brand" className="flex-1" onClick={next} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step === STEPS.length - 1 ? "Submit for verification" : "Continue"}
                  {step < STEPS.length - 1 && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Back to {brand.name}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
