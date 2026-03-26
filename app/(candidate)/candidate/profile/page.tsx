"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CandidateProfile,
  UpdateCandidateProfileInput,
  getCandidateProfile,
  updateCandidateProfile,
} from "@/lib/candidateApi";
import { UserCircle, Mail, AtSign, Briefcase } from "lucide-react";

type ProfileFormValues = {
  fullname: string;
  username: string;
  email: string;
  experienceYears: string;
};

function toFormValues(profile: CandidateProfile): ProfileFormValues {
  return {
    fullname: profile.fullname,
    username: profile.username,
    email: profile.email,
    experienceYears:
      profile.experienceYears === null ? "" : String(profile.experienceYears),
  };
}

function normalizeText(value: string): string {
  return value.trim();
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function AccountInfoCard({ profile }: { profile: CandidateProfile }) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm mt-8">
      <CardHeader className="border-b border-slate-100 bg-slate-50 pb-4">
        <CardTitle className="text-sm uppercase tracking-widest text-slate-500 font-semibold">System Record</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:gap-12">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Platform Role:</span> 
            <span className="uppercase tracking-wide px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{profile.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Member Since:</span> 
            <span>{new Date(profile.joinedAt).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfilePanel({ profile }: { profile: CandidateProfile }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ProfileFormValues>(() =>
    toFormValues(profile),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    const fullnameChanged = normalizeText(values.fullname) !== normalizeText(profile.fullname);
    const usernameChanged = normalizeText(values.username).toLowerCase() !== normalizeText(profile.username).toLowerCase();
    const emailChanged = normalizeText(values.email).toLowerCase() !== normalizeText(profile.email).toLowerCase();
    const experienceText = values.experienceYears.trim();
    const currentExperience = profile.experienceYears === null ? null : Number(profile.experienceYears);
    const experienceChanged = experienceText === "" ? currentExperience !== null : Number(experienceText) !== currentExperience;
    return fullnameChanged || usernameChanged || emailChanged || experienceChanged;
  }, [profile, values]);

  const updateProfileMutation = useMutation({
    mutationFn: updateCandidateProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["candidate", "profile"], updatedProfile);
      setValues(toFormValues(updatedProfile));
      setIsEditing(false);
      setSuccess("Profile securely updated.");
      setError(null);
    },
    onError: (mutationError) => {
      setSuccess(null);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update profile",
      );
    },
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function buildPayload(): UpdateCandidateProfileInput | null {
    const payload: UpdateCandidateProfileInput = {};
    const fullname = normalizeText(values.fullname);
    const username = normalizeText(values.username).toLowerCase();
    const email = normalizeText(values.email).toLowerCase();

    if (fullname !== normalizeText(profile.fullname)) payload.fullname = fullname;
    if (username !== normalizeText(profile.username).toLowerCase()) payload.username = username;
    if (email !== normalizeText(profile.email).toLowerCase()) payload.email = email;

    const experienceText = values.experienceYears.trim();
    const currentExperience = profile.experienceYears === null ? null : Number(profile.experienceYears);
    if (experienceText === "") {
      if (currentExperience !== null) payload.experienceYears = null;
    } else {
      const experienceNumber = Number(experienceText);
      if (experienceNumber !== currentExperience) payload.experienceYears = experienceNumber;
    }

    if (Object.keys(payload).length === 0) return null;
    return payload;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const fullname = normalizeText(values.fullname);
    const username = normalizeText(values.username);
    const email = normalizeText(values.email);
    const experienceText = values.experienceYears.trim();

    if (!fullname) return setError("Full name cannot be empty.");
    if (!username) return setError("Username cannot be empty.");
    if (!email || !isEmailValid(email)) return setError("Please enter a valid email.");

    if (experienceText !== "") {
      const experienceNumber = Number(experienceText);
      if (Number.isNaN(experienceNumber)) return setError("Experience years must be a valid number.");
      if (experienceNumber < 0) return setError("Experience years cannot be negative.");
    }

    const payload = buildPayload();
    if (!payload) return setError("No changes to save.");
    
    updateProfileMutation.mutate(payload);
  }

  function startEditing() {
    setError(null);
    setSuccess(null);
    setValues(toFormValues(profile));
    setIsEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setValues(toFormValues(profile));
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">Personal Details</CardTitle>
            <CardDescription className="text-slate-500 mt-1">Review the details we use for scoring your experience.</CardDescription>
          </div>
          <Button onClick={startEditing} variant="outline" className="border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-semibold gap-2">
            Edit
          </Button>
        </CardHeader>

        <CardContent className="p-8">
          {success && <p className="text-sm font-medium text-emerald-600 mb-6 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</p>}

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                <UserCircle className="size-4" /> Legal Name
              </p>
              <p className="text-lg font-medium text-slate-900">{profile.fullname}</p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                <AtSign className="size-4" /> Handle
              </p>
              <p className="text-lg font-medium text-slate-900">{profile.username}</p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                <Mail className="size-4" /> Email Address
              </p>
              <p className="text-lg font-medium text-slate-900">{profile.email}</p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                <Briefcase className="size-4" /> Base Experience
              </p>
              <p className="text-lg font-medium text-slate-900">
                {profile.experienceYears !== null ? `${profile.experienceYears} Years` : <span className="text-amber-500 italic">Not set. (Set this to earn match bonuses)</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-md overflow-hidden ring-1 ring-slate-900/5">
      <CardHeader className="bg-slate-50 border-b border-slate-200 p-6 object-cover">
        <CardTitle className="text-xl font-bold text-slate-900">Edit Personal Details</CardTitle>
        <CardDescription className="text-slate-500 mt-1">
          Make sure your experience year count is accurate for the Job matching engine.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8">
        <form className="space-y-8" onSubmit={handleSubmit}>
          
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullname" className="text-sm font-semibold text-slate-700">Legal Name</label>
              <Input
                id="fullname"
                name="fullname"
                className="h-11 bg-white border-slate-300 focus-visible:ring-emerald-500 shadow-sm"
                value={values.fullname}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-slate-700">Handle / Nickname</label>
              <Input
                id="username"
                name="username"
                className="h-11 bg-white border-slate-300 focus-visible:ring-emerald-500 shadow-sm"
                value={values.username}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
              <Input
                id="email"
                name="email"
                type="email"
                className="h-11 bg-white border-slate-300 focus-visible:ring-emerald-500 shadow-sm"
                value={values.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 border-t pt-6 mt-2 md:col-span-2">
              <label htmlFor="experienceYears" className="text-sm font-semibold text-slate-700">Total Years of Experience</label>
              <p className="text-xs text-slate-500 mb-2">Used by the Match Engine to award seniority bonuses.</p>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                step="0.5"
                className="h-11 bg-white border-slate-300 focus-visible:ring-emerald-500 shadow-sm w-full sm:w-1/3"
                value={values.experienceYears}
                onChange={handleChange}
              />
            </div>
          </div>

          {(error || success) && (
            <div className={`p-4 rounded-lg font-medium text-sm ${error ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
              {error || success}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={updateProfileMutation.isPending}
              className="border-slate-300 text-slate-700 h-11 px-8 font-semibold w-full sm:w-auto"
            >
              Cancel Edit
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || !hasChanges}
              className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm h-11 px-8 font-semibold w-full sm:w-auto ml-auto"
            >
              {updateProfileMutation.isPending ? "Validating..." : "Save Securely"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function CandidateProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: getCandidateProfile,
  });

  const profile = profileQuery.data;
  const errorMessage = profileQuery.error instanceof Error ? profileQuery.error.message : "Failed to load profile";

  if (profileQuery.isPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500 mt-2">Loading your details...</p>
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
        <Card className="bg-rose-50 shadow-sm border border-rose-200 p-6">
          <CardTitle className="text-rose-900 mb-2">Could not load profile</CardTitle>
          <CardDescription className="text-rose-700 font-medium">{errorMessage}</CardDescription>
        </Card>
      </div>
    );
  }

  const profileFormKey = [
    profile.candidateId,
    profile.fullname,
    profile.username,
    profile.email,
    String(profile.experienceYears ?? ""),
  ].join("|");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Details</h1>
        <p className="mt-2 text-slate-500">
          Manage your personal details and adjust your detected experience level.
        </p>
      </div>

      <ProfilePanel key={profileFormKey} profile={profile} />
      
      <AccountInfoCard profile={profile} />
    </div>
  );
}
