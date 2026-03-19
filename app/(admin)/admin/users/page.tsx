import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const page = () => {
  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">User Management</h2>
        <p className="page-subtitle">
          Review account roles and maintain clean access boundaries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Oversight</CardTitle>
          <CardDescription>
            This module is ready for role and permission workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total users</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">HR accounts</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidates</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Suspended</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button">Invite User</Button>
            <Button type="button" variant="outline">
              Export Users
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default page