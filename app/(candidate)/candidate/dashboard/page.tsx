"use client";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function CandidateDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Resume Uploaded</h2>
          <p className="text-gray-500">1 active resume</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Job Matches</h2>
          <p className="text-gray-500">4 matches found</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Applications</h2>
          <p className="text-gray-500">2 submitted</p>
        </div>
      </div>
      <div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
          Logout
        </Button>
      </div>
    </div>
  );
}