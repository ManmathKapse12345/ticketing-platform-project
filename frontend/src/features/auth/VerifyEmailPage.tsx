import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "./useAuth";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { status: authStatus, refreshUser } = useAuth();
  const [state, setState] = useState<"verifying" | "success" | "error">(token ? "verifying" : "error");
  const [message, setMessage] = useState(token ? "" : "This link is missing its token.");
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => setState("success"))
      .catch((err) => {
        setState("error");
        setMessage(getErrorMessage(err));
      });
  }, [token]);

  // If they're logged in, reload the user so the "please verify" banner goes away
  useEffect(() => {
    if (state === "success" && authStatus === "authenticated") refreshUser();
  }, [state, authStatus, refreshUser]);

  if (state === "verifying") return <FullPageSpinner />;

  const next = authStatus === "authenticated" ? "/" : "/login";
  return state === "success" ? (
    <AuthCard title="Email verified" description="Your account is ready to use.">
      <Link to={next} className={buttonVariants()}>Continue</Link>
    </AuthCard>
  ) : (
    <AuthCard title="Verification failed" description={message}>
      <p className="mb-4 text-sm text-muted-foreground">
        The link may have expired. Log in and you'll be offered a new one.
      </p>
      <Link to={next} className={buttonVariants({ variant: "outline" })}>Continue</Link>
    </AuthCard>
  );
}
