import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { NativeSelect } from "@/components/NativeSelect";
import { useAuth } from "@/features/auth/useAuth";
import type { OrgRole } from "@/features/auth/types";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { changeMemberRole, inviteMember, orgKeys, removeMember, useMembers } from "./api";
import type { Member } from "./types";
import { useOrgRole } from "./useOrgRole";

type AssignableRole = Exclude<OrgRole, "owner">;
const ROLES: AssignableRole[] = ["viewer", "editor", "admin"];

export default function MembersPage() {
  const { organizationId, can } = useOrgRole();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: members, isPending, isError, error } = useMembers(organizationId);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const isOwner = can("owner");
  const refresh = () => qc.invalidateQueries({ queryKey: orgKeys.members(organizationId) });

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email")).trim();
    setInviting(true);
    try {
      await inviteMember(organizationId, email, data.get("role") as AssignableRole);
      toast.success(`Invite sent to ${email}`);
      form.reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (m: Member, newRole: AssignableRole) => {
    try {
      await changeMemberRole(organizationId, m.userId, newRole);
      toast.success(`${m.user.name} is now ${newRole}`);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Members</h1>

      {isOwner && (
        <Card>
          <CardHeader><CardTitle>Invite someone</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
              <Input name="email" type="email" required placeholder="name@example.com" className="min-w-56 flex-1" aria-label="Email" />
              <NativeSelect name="role" defaultValue="viewer" aria-label="Role">
                {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
              </NativeSelect>
              <Button type="submit" disabled={inviting}>{inviting ? "Sending…" : "Send invite"}</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Viewer: read-only · Editor: manage events & tiers · Admin: also orders, refunds, cancelling events
            </p>
          </CardContent>
        </Card>
      )}

      {isPending ? <Skeleton className="h-40" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelf = m.userId === user?.id;
              const editable = isOwner && !isSelf && m.role !== "owner";
              return (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.user.name}{isSelf && " (you)"}</TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    {editable ? (
                      <NativeSelect value={m.role} aria-label={`Role for ${m.user.name}`}
                        onChange={(e) => handleRoleChange(m, e.target.value as AssignableRole)}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </NativeSelect>
                    ) : <span className="capitalize">{m.role}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(m.joinedAt)}</TableCell>
                  <TableCell className="text-right">
                    {editable && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${m.user.name}`} onClick={() => setRemoving(m)}><Trash2 /></Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} destructive
        title={`Remove ${removing?.user.name}?`} description="They lose access to this organization immediately."
        confirmLabel="Remove"
        onConfirm={async () => {
          await removeMember(organizationId, removing!.userId);
          toast.success("Member removed");
          refresh();
        }} />
    </div>
  );
}
