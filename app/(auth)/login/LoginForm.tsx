"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import AuthShell from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

const schema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
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

    router.push("/candidate/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in with your email or username to continue."
      switchText="New to HireSense?"
      switchHref="/register"
      switchLabel="Create account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or Username</Label>
          <Input
            id="identifier"
            placeholder="you@company.com or username"
            {...register("identifier")}
          />
          {errors.identifier?.message && (
            <p className="text-sm text-red-300">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-link text-sm">
              Forgot password?
            </Link>
          </div>

          <Input
            id="password"
            type="password"
            placeholder="Your password"
            {...register("password")}
          />
          {errors.password?.message && (
            <p className="text-sm text-red-300">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="space-y-2 pt-1">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
          <Button type="button" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
