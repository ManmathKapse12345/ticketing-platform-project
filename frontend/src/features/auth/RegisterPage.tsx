import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/AuthCard";
import { FormField } from "@/components/FormField";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "./useAuth";

const schema = z
  .object({
    accountType: z.enum(["customer", "owner"]),
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    companyName: z.string().trim().optional(),
    payoutMethod: z.enum(["upi", "bank"]),
    upiId: z.string().trim().optional(),
    accountHolderName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    ifsc: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.accountType !== "owner") return;
    const check = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
    };
    check(!!v.companyName, "companyName", "Organization name is required");
    if (v.payoutMethod === "upi") {
      check(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(v.upiId ?? ""), "upiId", "Invalid UPI ID");
    } else {
      check((v.accountHolderName ?? "").length >= 2, "accountHolderName", "Account holder name is required");
      check(/^\d{9,18}$/.test(v.accountNumber ?? ""), "accountNumber", "Account number must be 9-18 digits");
      check(/^[A-Z]{4}0[A-Z0-9]{6}$/.test((v.ifsc ?? "").toUpperCase()), "ifsc", "Invalid IFSC code");
    }
  });
type Values = z.infer<typeof schema>;

function Choice<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <Button key={o.value} type="button" variant={value === o.value ? "default" : "outline"}
          onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const { startSession } = useAuth();
  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: "customer", payoutMethod: "upi" },
  });
  const accountType = useWatch({ control, name: "accountType" });
  const payoutMethod = useWatch({ control, name: "payoutMethod" });

  const onSubmit = async (v: Values) => {
    const base = { name: v.name, email: v.email, password: v.password };
    const body =
      v.accountType === "customer"
        ? base
        : {
            ...base,
            role: "owner",
            companyName: v.companyName,
            branding: {}, // logo/colour can be set later in org settings
            payoutDetails:
              v.payoutMethod === "upi"
                ? { method: "upi", upiId: v.upiId }
                : { method: "bank", accountHolderName: v.accountHolderName,
                    accountNumber: v.accountNumber, ifsc: v.ifsc?.toUpperCase() },
          };
    try {
      const { data } = await api.post<{ accessToken: string }>("/auth/register", body);
      await startSession(data.accessToken); // GuestOnly then redirects to "/"
      toast.success("Account created! Check your email to verify it.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AuthCard
      title="Create an account"
      description={<>Already have an account? <Link to="/login" className="underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Choice value={accountType} onChange={(v) => setValue("accountType", v)}
          options={[{ value: "customer", label: "I'm buying tickets" }, { value: "owner", label: "I'm organizing events" }]} />
        <FormField id="name" label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <FormField id="email" label="Email" type="email" autoComplete="email"
          error={errors.email?.message} {...register("email")} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password"
          error={errors.password?.message} {...register("password")} />

        {accountType === "owner" && (
          <>
            <FormField id="companyName" label="Organization name"
              error={errors.companyName?.message} {...register("companyName")} />
            <div className="grid gap-2">
              <p className="text-sm font-medium">Where should we send your payouts?</p>
              <Choice value={payoutMethod} onChange={(v) => setValue("payoutMethod", v)}
                options={[{ value: "upi", label: "UPI" }, { value: "bank", label: "Bank account" }]} />
            </div>
            {payoutMethod === "upi" ? (
              <FormField id="upiId" label="UPI ID" placeholder="name@bank"
                error={errors.upiId?.message} {...register("upiId")} />
            ) : (
              <>
                <FormField id="accountHolderName" label="Account holder name"
                  error={errors.accountHolderName?.message} {...register("accountHolderName")} />
                <FormField id="accountNumber" label="Account number" inputMode="numeric"
                  error={errors.accountNumber?.message} {...register("accountNumber")} />
                <FormField id="ifsc" label="IFSC code" placeholder="HDFC0001234"
                  error={errors.ifsc?.message} {...register("ifsc")} />
              </>
            )}
          </>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
