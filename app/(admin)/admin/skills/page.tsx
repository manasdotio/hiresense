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
        <h2 className="page-title">Skills Governance</h2>
        <p className="page-subtitle">
          Curate skills for cleaner matching signals and consistent taxonomy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skill Curation</CardTitle>
          <CardDescription>
            This section is prepared for taxonomy management workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested merges</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unmapped aliases</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
            <div className="surface-soft p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Archived skills</p>
              <p className="mt-1 text-lg font-semibold">0</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button">Create Skill</Button>
            <Button type="button" variant="outline">
              Import Taxonomy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default page