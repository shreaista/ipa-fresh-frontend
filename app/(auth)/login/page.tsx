"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Loader2,
  AlertCircle,
  Shield,
  BarChart3,
  Users,
  Zap,
  Mail,
  Lock,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <svg className="absolute inset-0 h-full w-full stroke-muted-foreground/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M.5 40V.5H40" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#grid)" />
        </svg>
      </div>

      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(74,222,128,0.1),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">IPA</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            Investment Portfolio
            <br />
            <span className="text-white/80">Assessment Platform</span>
          </h1>

          <p className="text-lg text-white/60 mb-12 max-w-md leading-relaxed">
            Enterprise-grade solution for managing funding proposals, assessments, and portfolio analytics.
          </p>

          {/* Features */}
          <div className="space-y-4 mb-12">
            <FeatureItem icon={Shield} text="Role-based access control" />
            <FeatureItem icon={BarChart3} text="Real-time analytics dashboard" />
            <FeatureItem icon={Users} text="Multi-tenant architecture" />
            <FeatureItem icon={Zap} text="Automated assessment workflows" />
          </div>

          {/* Security callout */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 max-w-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">Enterprise Security.</span>{" "}
              SOC 2 compliant with end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-2.5 mb-10 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">IPA</span>
            </div>

            {/* Login Card */}
            <Card className="border shadow-xl shadow-black/5">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Welcome back
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign in to your account to continue
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <Alert variant="destructive" className="py-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="ml-2">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                {/* Demo accounts */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Demo Accounts
                  </p>
                  <div className="space-y-2">
                    <DemoAccountRow
                      role="SaaS Admin"
                      email="admin@ipa.com"
                      password="Admin#123"
                      variant="default"
                    />
                    <DemoAccountRow
                      role="Tenant Admin"
                      email="tenant@ipa.com"
                      password="Tenant#123"
                      variant="secondary"
                    />
                    <DemoAccountRow
                      role="Assessor"
                      email="assessor@ipa.com"
                      password="Assess#123"
                      variant="outline"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              © ShreAIsta — IPA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm text-white/80">{text}</span>
    </div>
  );
}

function DemoAccountRow({
  role,
  email,
  password,
  variant,
}: {
  role: string;
  email: string;
  password: string;
  variant: "default" | "secondary" | "outline";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${email} / ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 group">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant={variant} className="text-[10px] shrink-0">
          {role}
        </Badge>
        <code className="text-xs text-muted-foreground truncate">
          {email}
        </code>
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          "p-1.5 rounded-md transition-colors shrink-0",
          copied
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="Copy credentials"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
