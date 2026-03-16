"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function getErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object") {
      const maybeError = (payload as { error?: unknown }).error;
      if (typeof maybeError === "string" && maybeError.length > 0) {
        return maybeError;
      }
    }

    return fallback;
  }

  async function uploadAndProcessResume() {
    if (!file) return;

    setError(null);
    setSuccess(null);
    setSkills([]);
    setLoading(true);

    let uploadedResumeId: string | null = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const uploadPayload = (await uploadResponse
        .json()
        .catch(() => null)) as { resumeId?: string; error?: string } | null;

      if (!uploadResponse.ok || !uploadPayload?.resumeId) {
        throw new Error(getErrorMessage(uploadPayload, "Upload failed"));
      }

      uploadedResumeId = uploadPayload.resumeId;
      setResumeId(uploadedResumeId);

      const processResponse = await fetch("/api/resume/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeId: uploadedResumeId }),
      });

      const processPayload = (await processResponse
        .json()
        .catch(() => null)) as { extractedSkills?: string[]; error?: string } | null;

      if (!processResponse.ok) {
        throw new Error(getErrorMessage(processPayload, "Resume processing failed"));
      }

      setSkills(processPayload?.extractedSkills ?? []);
      setSuccess("Resume uploaded and processed successfully.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong";

      if (uploadedResumeId) {
        setError(`Resume uploaded, but processing failed: ${message}`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function retryProcessResume() {
    if (!resumeId) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const processResponse = await fetch("/api/resume/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeId }),
      });

      const processPayload = (await processResponse
        .json()
        .catch(() => null)) as { extractedSkills?: string[]; error?: string } | null;

      if (!processResponse.ok) {
        throw new Error(getErrorMessage(processPayload, "Resume processing failed"));
      }

      setSkills(processPayload?.extractedSkills ?? []);
      setSuccess("Resume processed successfully.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Resume</h1>

      {/* Upload */}
      <Card className="bg-zinc-700 text-white">
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="file"
              accept="application/pdf"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

            <Button onClick={uploadAndProcessResume} disabled={!file || loading}>
              {loading ? "Uploading and processing..." : "Upload and Process"}
          </Button>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}

            {resumeId && error && (
            <Button
              variant="secondary"
                onClick={retryProcessResume}
              disabled={loading}
            >
                Retry Process
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Extracted Skills */}
      {skills.length > 0 && (
        <Card className="bg-zinc-700 text-2xl text-white">
          <CardHeader>
            <CardTitle>Extracted Skills</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2 text-black">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="bg-gray-200 px-3 py-1 rounded text-sm"
              >
                {skill}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}