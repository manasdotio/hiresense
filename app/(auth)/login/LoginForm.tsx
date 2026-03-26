"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
import Link from "next/link";
import { useState } from "react";
import { UploadCloud, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

const schema = z.object({
  identifier: z.string().min(3, "Identifier must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const result = await signIn("credentials", {
      identifier: data.identifier,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex selection:bg-slate-200">
      
      {/* Visual Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 size-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-20 size-96 bg-sky-500/20 rounded-full blur-3xl"></div>
        
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
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Enter your credentials to access your candidate dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Email or Username
                  </Label>
                  <Input 
                    id="identifier"
                    className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    placeholder="name@example.com" 
                    {...register("identifier")} 
                  />
                  {errors.identifier && (
                    <p className="text-sm font-medium text-rose-500">{errors.identifier.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Password
                    </Label>
                    <a href="#" className="text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    placeholder="Enter your password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm font-medium text-rose-500">{errors.password.message}</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="size-4" /> {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  <Button type="submit" className="w-full h-11 bg-slate-900 text-white hover:bg-slate-800 font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? "Authenticating..." : "Sign into Account"} <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-500 font-medium">
            New to Match Engine?{" "}
            <Link href="/register" className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors">
              Create a free account &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
