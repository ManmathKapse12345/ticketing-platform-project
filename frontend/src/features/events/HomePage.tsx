import { useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { getErrorMessage } from "@/lib/api";
import { useEvents } from "./api";
import { EventCard } from "./EventCard";
import { EventFilters, type Filters } from "./EventFilters";

const PAGE_SIZE = 12;

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const filters: Filters = {
    search: params.get("search") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData } = useEvents({ page, limit: PAGE_SIZE, ...filters });

  // Write state to the URL, leaving out empty values
  const update = (next: Partial<Filters & { page: number }>) => {
    const merged = { ...filters, page, ...next };
    const sp = new URLSearchParams();
    if (merged.search) sp.set("search", merged.search);
    if (merged.from) sp.set("from", merged.from);
    if (merged.to) sp.set("to", merged.to);
    if (merged.page > 1) sp.set("page", String(merged.page));
    setParams(sp);
  };

  return (
    <div className="grid gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Upcoming events</h1>
        <p className="text-muted-foreground">Find something to do and grab your tickets.</p>
      </div>

      <EventFilters value={filters} onChange={(f) => update({ ...f, page: 1 })} />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : data.events.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No events found{filters.search || filters.from || filters.to ? " for these filters" : ""}.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.pagination.total} event{data.pagination.total === 1 ? "" : "s"}
          </p>
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? "opacity-60" : ""}`}>
            {data.events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
          <Pagination page={page} totalPages={data.pagination.totalPages}
            onPageChange={(p) => { update({ page: p }); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </div>
  );
}
