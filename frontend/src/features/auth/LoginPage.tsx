import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "./useAuth";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }: Values) => {
    try {
      await login(email, password); // GuestOnly redirects once logged in
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) setUnverifiedEmail(email);
      toast.error(getErrorMessage(err));
    }
  };

  const resend = async () => {
    try {
      await api.post("/auth/resend-verification", { email: unverifiedEmail });
      toast.success("Verification email sent. Check your inbox.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AuthCard
      title="Log in"
      description={<>No account? <Link to="/register" className="underline">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField id="email" label="Email" type="email" autoComplete="email"
          error={errors.email?.message} {...register("email")} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password"
          error={errors.password?.message} {...register("password")} />
        <Link to="/forgot-password" className="text-sm underline">Forgot password?</Link>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in…" : "Log in"}</Button>
        {unverifiedEmail && (
          <Button type="button" variant="outline" onClick={resend}>Resend verification email</Button>
        )}
      </form>
    </AuthCard>
  );
}
