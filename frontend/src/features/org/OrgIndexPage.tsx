import { Link, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { useMyOrganizations } from "./api";

export default function OrgIndexPage() {
  const { data: orgs, isPending, isError, error } = useMyOrganizations();

  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="px-4 py-16 text-center text-destructive">{getErrorMessage(error)}</p>;
  if (orgs.length === 1) return <Navigate to={`/org/${orgs[0].id}/events`} replace />;

  return (
    <div className="mx-auto grid max-w-xl gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your organizations</h1>
      {orgs.length === 0 ? (
        <p className="text-muted-foreground">
          You're not part of an organization yet. Register as an organizer, or ask an owner to invite you.
        </p>
      ) : (
        orgs.map((o) => (
          <Link key={o.id} to={`/org/${o.id}/events`}>
            <Card className="transition-shadow hover:shadow-md"><CardContent className="font-medium">{o.name}</CardContent></Card>
          </Link>
        ))
      )}
    </div>
  );
}
