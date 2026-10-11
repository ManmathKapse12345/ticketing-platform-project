import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { Scanner, type IScannerError } from "@yudiel/react-qr-scanner";
import { ArrowLeft, CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { checkInTicket, useOrgEvent } from "./api";
import { useOrgRole } from "./useOrgRole";

type Result =
  | { kind: "ok"; title: string; detail: string }
  | { kind: "used" | "error"; title: string; detail: string };

const RESULT_STYLES = {
  ok: { box: "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100", Icon: CircleCheck },
  used: { box: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100", Icon: CircleAlert },
  error: { box: "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100", Icon: CircleX },
};

const RESUME_AFTER_MS = 2500;

const CAMERA_ERRORS: Partial<Record<IScannerError["kind"], string>> = {
  "permission-denied": "Camera permission was denied. Allow it in your browser settings and reload.",
  "no-camera": "No camera found on this device. Paste the ticket code below instead.",
  "in-use": "The camera is being used by another app.",
  "insecure-context": "The camera only works over HTTPS or on localhost.",
};

export default function ScanPage() {
  const { eventId = "" } = useParams();
  const { organizationId } = useOrgRole();
  const { data: event, isPending } = useOrgEvent(organizationId, eventId);

  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkedIn, setCheckedIn] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The camera can report the same code several times before React re-renders,
  // so a ref (not state) decides whether a scan is already being handled.
  const locked = useRef(false);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const scanNext = () => {
    clearTimeout(resumeTimer.current);
    setResult(null);
    locked.current = false;
  };

  const submit = async (qrCode: string) => {
    if (locked.current || !qrCode.trim()) return;
    locked.current = true;
    setBusy(true);
    let next: Result;
    try {
      const ticket = await checkInTicket(organizationId, eventId, qrCode.trim());
      setCheckedIn((n) => n + 1);
      next = { kind: "ok", title: "Checked in", detail: `${ticket.owner.name} · ${ticket.ticketTier?.name ?? "Ticket"}` };
    } catch (err) {
      const message = getErrorMessage(err);
      const alreadyUsed = axios.isAxiosError(err) && err.response?.status === 409 && message.includes("used");
      next = alreadyUsed
        ? { kind: "used", title: "Already checked in", detail: "This ticket was scanned before. Don't let it in again." }
        : { kind: "error", title: "Not valid", detail: message };
    }
    navigator.vibrate?.(next.kind === "ok" ? 100 : [80, 60, 80]);
    setResult(next);
    setBusy(false);
    setManualCode("");
    resumeTimer.current = setTimeout(scanNext, RESUME_AFTER_MS);
  };

  const onManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(manualCode);
  };

  if (isPending) return <FullPageSpinner />;

  const style = result && RESULT_STYLES[result.kind];

  return (
    <div className="mx-auto grid w-full max-w-md gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link to=".." relative="path" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft /> Back
        </Link>
        <span className="text-sm text-muted-foreground">{checkedIn} checked in this session</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Scan tickets</h1>
        {event && <p className="text-muted-foreground">{event.title}</p>}
      </div>

      <div className="relative aspect-square overflow-hidden rounded-xl border bg-black">
        {cameraError ? (
          <p className="grid h-full place-items-center p-6 text-center text-sm text-white">{cameraError}</p>
        ) : (
          <Scanner
            onScan={(codes) => codes[0] && submit(codes[0].rawValue)}
            onError={(e) => setCameraError(CAMERA_ERRORS[e.kind] ?? e.message)}
            formats={["qr_code"]}
            paused={busy || !!result}
            components={{ finder: true, torch: true }}
            sound={false}
          />
        )}

        {result && style && (
          <button type="button" onClick={scanNext}
            className={cn("absolute inset-0 grid place-items-center border-4 p-6 text-center", style.box)}>
            <span className="grid justify-items-center gap-2">
              <style.Icon className="size-16" />
              <span className="text-2xl font-semibold">{result.title}</span>
              <span className="text-base">{result.detail}</span>
              <span className="mt-2 text-xs opacity-70">Tap to scan the next ticket</span>
            </span>
          </button>
        )}
      </div>

      <form onSubmit={onManualSubmit} className="flex gap-2">
        <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)}
          placeholder="Or paste the ticket code" aria-label="Ticket code" />
        <Button type="submit" disabled={busy || !!result || !manualCode.trim()}>Check in</Button>
      </form>
    </div>
  );
}
