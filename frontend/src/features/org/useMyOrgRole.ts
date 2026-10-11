import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/useAuth";
import type { OrgRole } from "@/features/auth/types";

interface Member {
  userId: string;
  role: OrgRole;
  user: { id: string; name: string; email: string };
}

export function useMyOrgRole(organizationId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["organization", organizationId, "members"],
    queryFn: () =>
      api.get<{ members: Member[] }>(`/organization/${organizationId}/members`).then((r) => r.data.members),
    enabled: !!organizationId && !!user,
    select: (members) => members.find((m) => m.userId === user?.id)?.role ?? null,
    retry: false, // a 403 means "not a member"; retrying won't change that
  });
}
