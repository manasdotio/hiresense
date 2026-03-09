"use client";

import { useState } from "react";

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);

  async function uploadResume() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await fetch("/api/resume/upload", {
      method: "POST",
      body: formData
    });
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Upload Resume</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={uploadResume}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Upload
      </button>

    </div>
  );
}