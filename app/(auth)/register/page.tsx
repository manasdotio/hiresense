"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle2, ChevronRight } from "lucide-react";

type RegisterFormData = {
  fullname: string;
  username: string;
  email: string;
  password: string;
};

const initialFormData: RegisterFormData = {
  fullname: "",
  username: "",
  email: "",
  password: "",
};

type ApiErrorResponse = {
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !formData.fullname.trim() ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      setError("All fields are required.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: formData.fullname.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ApiErrorResponse;

      if (!response.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess("Account created successfully. Redirecting to login...");
      setFormData(initialFormData);

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex selection:bg-slate-200">
      {/* Visual Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 size-96 bg-emerald-500/20 rounded-full blur-3xl rounded-full"></div>
        <div className="absolute top-1/2 -right-20 size-96 bg-sky-500/20 rounded-full blur-3xl rounded-full"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl">
            <UploadCloud className="size-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Match Engine</span>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg mb-20">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Stop guessing. Start matching.
          </h1>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="size-6 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-lg text-slate-300">Instantly extract thousands of skills from any PDF resume.</p>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="size-6 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-lg text-slate-300">Compare your DNA directly against real-world job descriptions.</p>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="size-6 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-lg text-slate-300">Discover exact missing skills and experience gaps in seconds.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="bg-slate-900 p-2.5 rounded-xl">
              <UploadCloud className="size-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Match Engine</span>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Create an account</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Enter your details below to build your initial profile.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-xs font-semibold uppercase tracking-widest text-slate-500">Full Name</Label>
                    <Input
                      id="fullname"
                      name="fullname"
                      className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                      placeholder="Jane Doe"
                      value={formData.fullname}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-widest text-slate-500">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                      placeholder="janedoe"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-slate-500">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    placeholder="jane@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">Secure Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    placeholder="8+ characters required"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>

                {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium">{error}</div>}
                {success && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm font-medium flex items-center gap-2"><CheckCircle2 className="size-4"/>{success}</div>}

                <Button type="submit" className="w-full h-11 bg-slate-900 text-white hover:bg-slate-800 font-semibold mt-2" disabled={isSubmitting}>
                  {isSubmitting ? "Creating profile..." : "Create Account"} <ChevronRight className="ml-2 size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-500 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors">
              Sign in securely &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}