import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AdminPage = () => {
  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">Platform Control</h2>
        <p className="page-subtitle">
          Manage governance settings, review data health, and jump to skill or
          user operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Skill Taxonomy</CardDescription>
            <CardTitle>Maintain Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keep canonical skill names clean and grouped for matching quality.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>User Access</CardDescription>
            <CardTitle>Review Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Confirm HR and candidate permissions are aligned with policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>System Integrity</CardDescription>
            <CardTitle>Operational Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor index freshness and consistency between jobs and profiles.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Common admin actions in one place.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/skills" className="surface-soft p-4 text-sm transition-colors hover:border-primary/40">
            <p className="font-medium text-foreground">Open Skills Management</p>
            <p className="mt-1 text-muted-foreground">Review, merge, or retire skill entries.</p>
          </Link>

          <Link href="/admin/users" className="surface-soft p-4 text-sm transition-colors hover:border-primary/40">
            <p className="font-medium text-foreground">Open User Management</p>
            <p className="mt-1 text-muted-foreground">Inspect role assignments and account posture.</p>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
