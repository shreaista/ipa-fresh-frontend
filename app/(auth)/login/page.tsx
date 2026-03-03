"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  BarChart3,
  Users,
  Zap,
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
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="flex-1 flex">
        {/* Left panel - Marketing */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Briefcase className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">IPA</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Investment Portfolio
              <br />
              Assessment Platform
            </h1>

            <p className="text-lg text-white/80 mb-10 max-w-md">
              Enterprise-grade solution for managing funding proposals, 
              assessments, and portfolio analytics.
            </p>

            <div className="space-y-5">
              <FeatureItem
                icon={Shield}
                title="Secure & Compliant"
                description="Enterprise security with role-based access control"
              />
              <FeatureItem
                icon={BarChart3}
                title="Real-time Analytics"
                description="Comprehensive dashboards and reporting tools"
              />
              <FeatureItem
                icon={Users}
                title="Multi-tenant"
                description="Manage multiple organizations seamlessly"
              />
              <FeatureItem
                icon={Zap}
                title="Workflow Automation"
                description="Streamline assessment and approval processes"
              />
            </div>
          </div>
        </div>

        {/* Right panel - Login */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">IPA</span>
            </div>

            <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
              <CardHeader className="space-y-1 pb-4">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Welcome back
                </h2>
                <p className="text-xs text-gray-400">
                  DEPLOY CHECK: 2026-03-03 08:45:00
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to access your account
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11"
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

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    Demo access
                  </span>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Test Accounts</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <DemoAccount
                      role="SaaS Admin"
                      email="admin@ipa.com"
                      password="Admin#123"
                    />
                    <DemoAccount
                      role="Tenant Admin"
                      email="tenant@ipa.com"
                      password="Tenant#123"
                    />
                    <DemoAccount
                      role="Assessor"
                      email="assessor@ipa.com"
                      password="Assess#123"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              © ShreAIsta — IPA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-white/70">{description}</p>
      </div>
    </div>
  );
}

function DemoAccount({
  role,
  email,
  password,
}: {
  role: string;
  email: string;
  password: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] font-medium">
          {role}
        </Badge>
      </div>
      <code className="text-xs text-muted-foreground">
        {email} / {password}
      </code>
    </div>
  );
}
