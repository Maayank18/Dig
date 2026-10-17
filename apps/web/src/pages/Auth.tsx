import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api";
import { queryClient } from "../query";
import { useSession, type Session } from "../session";
import { PasswordInput } from "../components/PasswordInput";

type Field = "name" | "email" | "password";

/** Real email + password accounts. On success the API sets a session cookie and the app opens. */
export function Auth({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useSession();
  const signup = mode === "signup";
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/dashboard";

  if (session) return <Navigate to={next} replace />;

  const set = (field: Field) => (event: { target: { value: string } }) => {
    setValues({ ...values, [field]: event.target.value });
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Check the obvious locally first, so empty fields get an instant, specific message.
    const missing: Partial<Record<Field, string>> = {};
    if (signup && !values.name.trim()) missing.name = "Enter your name.";
    if (!values.email.trim()) missing.email = "Enter your email.";
    if (!values.password) missing.password = signup ? "Enter a password." : "Enter your password.";
    if (Object.keys(missing).length) return setErrors(missing);

    setBusy(true);
    try {
      const body = signup ? values : { email: values.email, password: values.password };
      await api(`/api/auth/${signup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify(body) });
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => api<Session>("/api/auth/me") });
      navigate(next, { replace: true });
    } catch (error) {
      const field = error instanceof ApiError && ["name", "email", "password"].includes(error.field ?? "") ? (error.field as Field) : "form";
      setErrors({ [field]: error instanceof Error ? error.message : "Something went wrong. Please try again." });
      setBusy(false);
    }
  };

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p className="auth-err" id={`${field}-err`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div
      className="landing"
      style={{
        display: "grid",
        placeItems: "center",
        padding: "24px 0",
        background: "linear-gradient(rgba(23,17,13,.78), rgba(23,17,13,.9)), url(/art/hero.jpg) center / cover",
      }}
    >
      <form className="auth-card" onSubmit={submit} noValidate>
        <Link to="/">
          <img src="/art/logo.png" alt="Dig" style={{ height: 38, display: "block", margin: "0 auto 18px" }} />
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 4px" }}>{signup ? "Start digging" : "Welcome back"}</h1>
        <p style={{ textAlign: "center", color: "var(--dust)", fontSize: 13, margin: "0 0 8px" }}>
          {signup ? "Create your team’s space for event research." : "Log in to your team’s events."}
        </p>
        {signup && (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" autoComplete="name" placeholder="Ashima Arora" value={values.name} onChange={set("name")} aria-invalid={Boolean(errors.name)} />
            {fieldError("name")}
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@geekroom.in" value={values.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} />
        {fieldError("email")}
        <label htmlFor="password">Password</label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "At least 8 characters" : "••••••••"}
          value={values.password}
          onChange={set("password")}
          aria-invalid={Boolean(errors.password)}
        />
        {fieldError("password")}
        {errors.form && <p className="auth-err form">{errors.form}</p>}
        <button type="submit" className="px-btn" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 22 }}>
          {busy ? (signup ? "Creating account…" : "Logging in…") : signup ? "Sign up free" : "Log in"}
        </button>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--dust)", margin: "18px 0 0" }}>
          {signup ? "Already digging? " : "New to Dig? "}
          <Link to={`${signup ? "/login" : "/signup"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ color: "var(--amber)" }}>
            {signup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </form>
    </div>
  );
}
