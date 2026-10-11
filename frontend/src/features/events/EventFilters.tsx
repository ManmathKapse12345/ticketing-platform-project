import type { FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Filters {
  search: string;
  from: string;
  to: string;
}

interface Props {
  value: Filters;
  onChange: (filters: Filters) => void;
}

export function EventFilters({ value, onChange }: Props) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onChange({
      search: String(data.get("search") ?? "").trim(),
      from: String(data.get("from") ?? ""),
      to: String(data.get("to") ?? ""),
    });
  };

  const hasFilters = !!(value.search || value.from || value.to);

  return (
    // key: re-mount the inputs when filters change from outside (e.g. "Clear", back button)
    <form key={JSON.stringify(value)} onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="search">Search</Label>
        <Input id="search" name="search" placeholder="Event, venue or keyword" defaultValue={value.search} maxLength={100} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={value.from} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={value.to} min={value.from || undefined} />
      </div>
      <div className="flex gap-2">
        <Button type="submit"><Search /> Search</Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={() => onChange({ search: "", from: "", to: "" })}>
            <X /> Clear
          </Button>
        )}
      </div>
    </form>
  );
}
