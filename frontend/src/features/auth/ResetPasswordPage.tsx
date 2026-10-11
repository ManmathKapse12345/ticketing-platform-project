import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";
import { api, getErrorMessage } from "@/lib/api";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ newPassword }: Values) => {
    try {
      await api.post(`/auth/reset-password/${token}`, { newPassword });
      toast.success("Password reset. You can log in now.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField id="newPassword" label="New password" type="password" autoComplete="new-password"
          error={errors.newPassword?.message} {...register("newPassword")} />
        <FormField id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password"
          error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Reset password"}</Button>
      </form>
    </AuthCard>
  );
}
