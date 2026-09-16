import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, inputClass } from "../components/ui";
import { ApiError } from "../api/client";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)] px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-eucalyptus)] text-center mb-1">Revenue Expense Tracker</h1>
        <p className="text-center text-[var(--color-ink-soft)] mb-8">Takes about a minute to set up.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--color-line)] p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Create your account</h2>
          {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}
          <Field label="Your name" htmlFor="fullName">
            <input id="fullName" required className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input id="email" type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating your account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-soft)] mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-eucalyptus)] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
