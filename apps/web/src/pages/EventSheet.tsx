import { useState, type FormEvent } from "react";
import type { EventFields } from "../events";

export function EventSheet(props: {
  title: string;
  submitLabel: string;
  initial?: EventFields;
  onCancel: () => void;
  /** May be async; a rejection is shown in the sheet and the values are kept. */
  onSubmit: (values: EventFields) => Promise<unknown> | void;
}) {
  const [values, setValues] = useState<EventFields>(props.initial ?? { name: "", description: "", date: "", targets: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof EventFields) => (event: { target: { value: string } }) => setValues({ ...values, [key]: event.target.value });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) return setError("Give the event a name.");
    setBusy(true);
    setError(null);
    try {
      await props.onSubmit({ ...values, name: values.name.trim() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save the event.");
      setBusy(false);
    }
  };
  return (
    <div className="scrim" onClick={props.onCancel}>
      <form className="sheet" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h3>{props.title}</h3>
        <label>Event name</label>
        <input autoFocus value={values.name} onChange={set("name")} placeholder="Code Cubicle 7.0" />
        <label>Description</label>
        <textarea rows={2} value={values.description} onChange={set("description")} placeholder="What is this event?" />
        <label>Event date</label>
        <input value={values.date} onChange={set("date")} placeholder="Nov 14–15" />
        <label>Targets</label>
        <input value={values.targets} onChange={set("targets")} placeholder="15+ sponsors, 8 judges, 20 student teams" />
        {error && <p className="err" style={{ margin: "10px 0 0" }}>{error}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={props.onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn blue" disabled={busy || !values.name.trim()}>
            {busy ? "Saving…" : props.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
