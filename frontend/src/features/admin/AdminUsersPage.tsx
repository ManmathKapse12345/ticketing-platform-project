import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/NativeSelect";
import { Pagination } from "@/components/Pagination";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import type { UserRole } from "@/features/auth/types";
import { useAdminUsers } from "./api";
import { SearchBox } from "./SearchBox";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useAdminUsers({ page, search, role });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search by name or email" onSearch={(v) => { setSearch(v); setPage(1); }} />
        <NativeSelect aria-label="Role" value={role}
          onChange={(e) => { setRole(e.target.value as UserRole | ""); setPage(1); }}>
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="platformAdmin">Platform admins</option>
        </NativeSelect>
      </div>

      {isPending ? <Skeleton className="h-40" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : data.users.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No users found.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Role</TableHead>
                <TableHead>Organizations</TableHead><TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}{!u.isVerified && " · email not verified"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "platformAdmin" ? <Badge>Platform admin</Badge> : <span className="text-sm">Customer</span>}
                  </TableCell>
                  <TableCell>
                    {u.memberships.length === 0 ? "—" : (
                      <div className="grid gap-0.5 text-sm">
                        {u.memberships.map((m) => (
                          <span key={m.organization.id}>
                            {m.organization.name} <span className="text-xs text-muted-foreground capitalize">({m.role})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
