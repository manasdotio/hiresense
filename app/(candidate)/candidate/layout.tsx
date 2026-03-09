import Link from "next/link";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-xl font-bold mb-6">Candidate</h2>

        <nav className="space-y-4">
          <Link href="/candidate/dashboard">Dashboard</Link>
          <Link href="/candidate/resume">Resume</Link>
          <Link href="/candidate/jobs">Job Matches</Link>
          <Link href="/candidate/applications">Applications</Link>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-gray-50">
        {children}
      </main>

    </div>
  );
}