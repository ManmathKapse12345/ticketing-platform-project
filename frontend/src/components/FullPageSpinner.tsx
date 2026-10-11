import { LoaderCircle } from "lucide-react";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
