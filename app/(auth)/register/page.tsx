"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthShell from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterRole = "HR" | "CANDIDATE";

type RegisterFormData = {
  fullname: string;
  username: string;
  email: string;
  password: string;
  role: RegisterRole;
};

const initialFormData: RegisterFormData = {
  fullname: "",
  username: "",
  email: "",
  password: "",
  role: "CANDIDATE",
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

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname: formData.fullname.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as ApiErrorResponse;

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
    <AuthShell
      title="Create Your Account"
      subtitle="Register as a candidate or HR in one minute."
      switchText="Already have an account?"
      switchHref="/login"
      switchLabel="Sign in"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullname">Full Name</Label>
          <Input
            id="fullname"
            name="fullname"
            placeholder="John Doe"
            value={formData.fullname}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="johndoe"
            value={formData.username}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="field-select"
          >
            <option value="CANDIDATE">Candidate</option>
            <option value="HR">HR</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Need help choosing a role?{" "}
          <Link href="/login" className="text-link font-medium">
            Talk to support
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}