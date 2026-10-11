const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "short" });
const month = new Intl.DateTimeFormat("en-IN", { month: "short" });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "12 Oct 2026, 7:00 pm – 10:00 pm", or two full dates if it spans days */
export const formatDateRange = (startIso: string, endIso?: string | null) => {
  if (!endIso) return formatDateTime(startIso);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return `${dateTime.format(start)} – ${sameDay ? time.format(end) : dateTime.format(end)}`;
};

/** For the little calendar badge on cards: { month: "Oct", day: 12 } */
export const calendarParts = (iso: string) => {
  const d = new Date(iso);
  return { month: month.format(d), day: d.getDate() };
};

// <input type="date"> gives "YYYY-MM-DD"; the API wants a full timestamp.
export const startOfDayISO = (day: string) => new Date(`${day}T00:00:00`).toISOString();
export const endOfDayISO = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

/** ISO → "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local"> */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** "YYYY-MM-DDTHH:mm" (local) → ISO, or undefined if empty */
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : undefined);
