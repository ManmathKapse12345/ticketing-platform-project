import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { useAuth } from "@/features/auth/useAuth";
import { getErrorMessage } from "@/lib/api";
import { acceptInvite, orgKeys } from "./api";

export default function InviteAcceptPage() {
  const { token = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const org = await acceptInvite(token);
      await qc.invalidateQueries({ queryKey: orgKeys.mine });
      toast.success(`You joined ${org.name}`);
      navigate(`/org/${org.id}/events`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err)); // 403 = invite was for another email, 410 = expired/used
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Join organization" description={`You're logged in as ${user?.email}.`}>
      <div className="grid gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={accept} disabled={busy}>{busy ? "Joining…" : "Accept invite"}</Button>
        <p className="text-xs text-muted-foreground">
          The invite only works for the email address it was sent to. Wrong account? Log out and log in with that address.
        </p>
      </div>
    </AuthCard>
  );
}
