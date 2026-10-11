import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/FormField";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { orgKeys, updateOrganization, useOrganization } from "./api";
import type { Organization } from "./types";
import { useOrgRole } from "./useOrgRole";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  logoUrl: z.union([z.literal(""), z.url("Enter a full URL (https://…)")]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #2563eb"),
});
type Values = z.infer<typeof schema>;

export default function OrgSettingsPage() {
  const { organizationId } = useOrgRole();
  const { data: org, isPending, isError, error } = useOrganization(organizationId);
  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;
  return <SettingsForm key={org.updatedAt} org={org} />;
}

function SettingsForm({ org }: { org: Organization}) {
  const { can } = useOrgRole();
  const qc = useQueryClient();
  const readOnly = !can("owner");
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: org.name, logoUrl: org.logoUrl ?? "", primaryColor: org.primaryColor ?? "#2563eb" },
  });

  const onSubmit = async (v: Values) => {
    try {
      await updateOrganization(org.id, {
        name: v.name,
        branding: { logoUrl: v.logoUrl || undefined, primaryColor: v.primaryColor },
      });
      qc.invalidateQueries({ queryKey: orgKeys.detail(org.id) });
      qc.invalidateQueries({ queryKey: orgKeys.mine });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Organization settings</CardTitle>
        {org.verifiedAt ? <Badge>Verified</Badge> : <Badge variant="outline">Not verified yet</Badge>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <fieldset disabled={readOnly} className="grid gap-4">
            <FormField id="name" label="Name" error={errors.name?.message} {...register("name")} />
            <FormField id="logoUrl" label="Logo URL" placeholder="https://…" error={errors.logoUrl?.message} {...register("logoUrl")} />
            <FormField id="primaryColor" label="Brand colour" type="color" className="h-10 w-20 p-1"
              error={errors.primaryColor?.message} {...register("primaryColor")} />
          </fieldset>
          {readOnly ? (
            <p className="text-sm text-muted-foreground">Only the owner can change these settings.</p>
          ) : (
            <Button type="submit" disabled={isSubmitting || !isDirty} className="justify-self-start">
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          )}
          {!org.verifiedAt && (
            <p className="text-xs text-muted-foreground">A platform admin needs to verify your organization before you can request payouts.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
