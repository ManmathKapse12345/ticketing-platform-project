import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/FormField";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "./useAuth";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email"),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "New password must be different", path: ["newPassword"] });
type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const saveProfile = async (values: ProfileValues) => {
    try {
      await api.patch("/users/profile", values);
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const changePassword = async ({ currentPassword, newPassword }: PasswordValues) => {
    try {
      await api.post("/users/change-password", { currentPassword, newPassword });
      passwordForm.reset();
      toast.success("Password changed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const pe = profileForm.formState.errors;
  const pw = passwordForm.formState.errors;

  return (
    <div className="mx-auto grid max-w-xl gap-6 px-4 py-8">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="grid gap-4">
            <FormField id="name" label="Name" error={pe.name?.message} {...profileForm.register("name")} />
            <FormField id="email" label="Email" type="email" error={pe.email?.message} {...profileForm.register("email")} />
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="grid gap-4">
            <FormField id="currentPassword" label="Current password" type="password" autoComplete="current-password"
              error={pw.currentPassword?.message} {...passwordForm.register("currentPassword")} />
            <FormField id="newPassword" label="New password" type="password" autoComplete="new-password"
              error={pw.newPassword?.message} {...passwordForm.register("newPassword")} />
            <FormField id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password"
              error={pw.confirmPassword?.message} {...passwordForm.register("confirmPassword")} />
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>Change password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
