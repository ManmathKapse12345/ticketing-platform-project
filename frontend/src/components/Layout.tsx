import { Link, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { api, getErrorMessage } from "@/lib/api";
import { useMyOrganizations } from "@/features/org/api";

export function Layout() {
  const { user, status, logout } = useAuth();
  const { data: myOrgs } = useMyOrganizations(status === "authenticated");
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const resendVerification = async () => {
    try {
      await api.post("/auth/resend-verification", { email: user?.email });
      toast.success("Verification email sent");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            Ticketing
          </Link>
          <nav className="flex items-center gap-2">
            {status === "authenticated" && (
              <>
                {user?.role === "platformAdmin" && (
                  <Link to="/admin" className={buttonVariants({ variant: "ghost" })}>
                    Admin
                  </Link>
                )}
                {!!myOrgs?.length && (
                  <Link to="/org" className={buttonVariants({ variant: "ghost" })}>
                    Organizer
                  </Link>
                )}
                <Link to="/tickets" className={buttonVariants({ variant: "ghost" })}>
                  My tickets
                </Link>
                <Link to="/orders" className={buttonVariants({ variant: "ghost" })}>
                  Orders
                </Link>
                <Link to="/profile" className={buttonVariants({ variant: "ghost" })}>
                  {user?.name}
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            )}
            {status === "guest" && (
              <>
                <Link to="/login" className={buttonVariants({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link to="/register" className={buttonVariants()}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {user && !user.isVerified && (
        <div className="border-b bg-muted px-4 py-2 text-center text-sm">
          Please verify your email ({user.email}).{" "}
          <button type="button" className="underline" onClick={resendVerification}>
            Resend link
          </button>
        </div>
      )}

      <main className="mx-auto max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
