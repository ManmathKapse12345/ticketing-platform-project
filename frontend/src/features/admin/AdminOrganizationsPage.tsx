import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { NativeSelect } from "@/components/NativeSelect";
import { Pagination } from "@/components/Pagination";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { adminKeys, setOrganizationVerified, useAdminOrganizations, type AdminOrganization } from "./api";
import { SearchBox } from "./SearchBox";

export default function AdminOrganizationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<AdminOrganization | null>(null);
  const { data, isPending, isError, error } = useAdminOrganizations({ page, search, verified });

  const toggle = async () => {
    if (!toggling) return;
    const verify = !toggling.verifiedAt;
    await setOrganizationVerified(toggling.id, verify);
    qc.invalidateQueries({ queryKey: adminKeys.all });
    toast.success(verify ? `${toggling.name} verified` : `${toggling.name} is no longer verified`);
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search by name" onSearch={(v) => { setSearch(v); setPage(1); }} />
        <NativeSelect aria-label="Verification" value={verified}
          onChange={(e) => { setVerified(e.target.value as "" | "true" | "false"); setPage(1); }}>
          <option value="">All</option>
          <option value="false">Not verified</option>
          <option value="true">Verified</option>
        </NativeSelect>
      </div>

      {isPending ? <Skeleton className="h-40" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : data.organizations.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No organizations found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Events</TableHead><TableHead>Created</TableHead>
                <TableHead>Status</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.organizations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{o._count.members}</TableCell>
                  <TableCell className="text-right tabular-nums">{o._count.events}</TableCell>
                  <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                  <TableCell>
                    {o.verifiedAt ? <Badge>Verified</Badge> : <Badge variant="outline">Not verified</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={o.verifiedAt ? "ghost" : "default"} onClick={() => setToggling(o)}>
                      {o.verifiedAt ? "Remove verification" : "Verify"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog open={!!toggling} onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.verifiedAt ? "Remove verification?" : "Verify this organization?"}
        destructive={!!toggling?.verifiedAt}
        description={toggling?.verifiedAt
          ? `${toggling.name} won't be able to request new payouts until it's verified again.`
          : `${toggling?.name} will be able to request payouts of its earnings.`}
        confirmLabel={toggling?.verifiedAt ? "Remove verification" : "Verify"} onConfirm={toggle} />
    </div>
  );
}
