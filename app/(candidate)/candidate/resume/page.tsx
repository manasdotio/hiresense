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

  async function uploadResume() {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/resume/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResumeId(data.resumeId);

    setLoading(false);
  }

  async function processResume() {
    if (!resumeId) return;

    setLoading(true);

    const res = await fetch("/api/resume/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resumeId }),
    });

    const data = await res.json();
    setSkills(data.extractedSkills || []);

    setLoading(false);
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
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

          <Button onClick={uploadResume} disabled={!file || loading}>
            Upload
          </Button>

          {resumeId && (
            <Button
              variant="secondary"
              onClick={processResume}
              disabled={loading}
            >
              Process Resume
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