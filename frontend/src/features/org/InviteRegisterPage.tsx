import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/features/auth/useAuth";
import { getErrorMessage } from "@/lib/api";
import { registerFromInvite } from "./api";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
type Values = z.infer<typeof schema>;

export default function InviteRegisterPage() {
  const { token = "" } = useParams();
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ name, password }: Values) => {
    try {
      const { accessToken, organization } = await registerFromInvite(token, name, password);
      await startSession(accessToken);
      toast.success(`Welcome to ${organization.name}! Check your email to verify your account.`);
      navigate(`/org/${organization.id}/events`, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("root", { message: "You already have an account." });
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  };

  return (
    <AuthCard title="Create your account" description="You've been invited to join an organization.">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField id="name" label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <FormField id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password"
          error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        {errors.root && (
          <p className="text-sm text-destructive">
            {errors.root.message}{" "}
            <Link to="/login" state={{ from: `/invite/${token}/accept` }} className="underline">Log in to accept the invite</Link>
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account & join"}</Button>
      </form>
    </AuthCard>
  );
}
