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
    <Card>
      <CardHeader>
        <CardTitle>Account Info</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Role: {profile.role}</p>
        <p>Joined: {new Date(profile.joinedAt).toLocaleDateString()}</p>
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
    const fullnameChanged =
      normalizeText(values.fullname) !== normalizeText(profile.fullname);
    const usernameChanged =
      normalizeText(values.username).toLowerCase() !==
      normalizeText(profile.username).toLowerCase();
    const emailChanged =
      normalizeText(values.email).toLowerCase() !==
      normalizeText(profile.email).toLowerCase();

    const experienceText = values.experienceYears.trim();
    const currentExperience =
      profile.experienceYears === null ? null : Number(profile.experienceYears);

    const experienceChanged =
      experienceText === ""
        ? currentExperience !== null
        : Number(experienceText) !== currentExperience;

    return (
      fullnameChanged || usernameChanged || emailChanged || experienceChanged
    );
  }, [profile, values]);

  const updateProfileMutation = useMutation({
    mutationFn: updateCandidateProfile,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["candidate", "profile"], updatedProfile);
      setValues(toFormValues(updatedProfile));
      setIsEditing(false);
      setSuccess("Profile updated successfully.");
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

    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function buildPayload(): UpdateCandidateProfileInput | null {
    const payload: UpdateCandidateProfileInput = {};

    const fullname = normalizeText(values.fullname);
    const username = normalizeText(values.username).toLowerCase();
    const email = normalizeText(values.email).toLowerCase();

    if (fullname !== normalizeText(profile.fullname)) {
      payload.fullname = fullname;
    }

    if (username !== normalizeText(profile.username).toLowerCase()) {
      payload.username = username;
    }

    if (email !== normalizeText(profile.email).toLowerCase()) {
      payload.email = email;
    }

    const experienceText = values.experienceYears.trim();
    const currentExperience =
      profile.experienceYears === null ? null : Number(profile.experienceYears);

    if (experienceText === "") {
      if (currentExperience !== null) {
        payload.experienceYears = null;
      }
    } else {
      const experienceNumber = Number(experienceText);
      if (experienceNumber !== currentExperience) {
        payload.experienceYears = experienceNumber;
      }
    }

    if (Object.keys(payload).length === 0) {
      return null;
    }

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

    if (!fullname) {
      setError("Full name cannot be empty.");
      return;
    }

    if (!username) {
      setError("Username cannot be empty.");
      return;
    }

    if (!email || !isEmailValid(email)) {
      setError("Please enter a valid email.");
      return;
    }

    if (experienceText !== "") {
      const experienceNumber = Number(experienceText);

      if (Number.isNaN(experienceNumber)) {
        setError("Experience years must be a valid number.");
        return;
      }

      if (experienceNumber < 0) {
        setError("Experience years cannot be negative.");
        return;
      }
    }

    const payload = buildPayload();

    if (!payload) {
      setError("No changes to save.");
      return;
    }

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
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
            <CardDescription>
              Review your account details before editing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="surface-soft p-3">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{profile.fullname}</p>
              </div>

              <div className="surface-soft p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-medium">{profile.username}</p>
              </div>

              <div className="surface-soft p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>

              <div className="surface-soft p-3">
                <p className="text-xs text-muted-foreground">Experience Years</p>
                <p className="text-sm font-medium">
                  {profile.experienceYears ?? "Not set"}
                </p>
              </div>
            </div>

            <Button onClick={startEditing}>Edit Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your details. Save when you are done.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fullname" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="fullname"
                  name="fullname"
                  value={values.fullname}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  value={values.username}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="experienceYears" className="text-sm font-medium">
                  Experience Years
                </label>
                <Input
                  id="experienceYears"
                  name="experienceYears"
                  type="number"
                  min="0"
                  step="0.5"
                  value={values.experienceYears}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || !hasChanges}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CandidateProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: getCandidateProfile,
  });

  const profile = profileQuery.data;
  const errorMessage =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : "Failed to load profile";

  if (profileQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading profile...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load profile</CardTitle>
          <CardDescription className="text-red-300">{errorMessage}</CardDescription>
        </CardHeader>
      </Card>
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
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">Profile</h2>
        <p className="page-subtitle">
          View your details first, then switch to edit mode when needed.
        </p>
      </div>

      <ProfilePanel key={profileFormKey} profile={profile} />
      <AccountInfoCard profile={profile} />
    </div>
  );
}
