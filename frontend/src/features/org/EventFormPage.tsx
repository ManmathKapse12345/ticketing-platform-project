import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/FormField";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { createEvent, invalidateEvent, updateEvent, useOrgEvent } from "./api";
import type { OrgEvent } from "./types";
import { useOrgRole } from "./useOrgRole";

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().max(5000),
    venue: z.string().trim().max(200),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: "End must be after start", path: ["endDate"] });
type Values = z.infer<typeof schema>;

export default function EventFormPage() {
  const { organizationId } = useOrgRole();
  const { eventId } = useParams();
  const event = useOrgEvent(organizationId, eventId ?? "", !!eventId);

  if (eventId && event.isPending) return <FullPageSpinner />;
  if (eventId && event.isError) return <p className="text-destructive">{getErrorMessage(event.error)}</p>;
  return <EventForm organizationId={organizationId} event={event.data} />;
}

function EventForm({ organizationId, event }: { organizationId: string; event?: OrgEvent }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      venue: event?.venue ?? "",
      startDate: toLocalInput(event?.startDate),
      endDate: toLocalInput(event?.endDate),
    },
  });

  const onSubmit = async (v: Values) => {
    const body = {
      title: v.title,
      description: v.description,
      venue: v.venue,
      startDate: fromLocalInput(v.startDate)!,
      endDate: fromLocalInput(v.endDate),
    };
    try {
      if (event) {
        await updateEvent(organizationId, event.id, body);
        invalidateEvent(qc, organizationId, event.id);
        toast.success("Event updated");
        navigate(`/org/${organizationId}/events/${event.id}`);
      } else {
        const created = await createEvent(organizationId, { ...body, status: "DRAFT" });
        qc.invalidateQueries({ queryKey: ["organization", organizationId, "events"] });
        toast.success("Draft created. Add ticket tiers, then publish.");
        navigate(`/org/${organizationId}/events/${created.id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>{event ? "Edit event" : "New event"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <FormField id="title" label="Title" error={errors.title?.message} {...register("title")} />
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} {...register("description")} />
          </div>
          <FormField id="venue" label="Venue" error={errors.venue?.message} {...register("venue")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="startDate" label="Starts" type="datetime-local" error={errors.startDate?.message} {...register("startDate")} />
            <FormField id="endDate" label="Ends (optional)" type="datetime-local" error={errors.endDate?.message} {...register("endDate")} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : event ? "Save changes" : "Create draft"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
