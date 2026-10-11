import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";
import { api, getErrorMessage } from "@/lib/api";

const schema = z.object({ email: z.email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: Values) => {
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (sent) {
    return (
      <AuthCard title="Check your email"
        description="If an account with that email exists, we've sent a reset link. It expires in 15 minutes.">
        <Link to="/login" className={buttonVariants({ variant: "outline" })}>Back to log in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password" description="We'll email you a link to reset it.">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField id="email" label="Email" type="email" autoComplete="email"
          error={errors.email?.message} {...register("email")} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reset link"}</Button>
      </form>
    </AuthCard>
  );
}
