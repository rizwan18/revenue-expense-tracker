import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";

const TRACK_OPTIONS = [
  { id: "property", label: "Property" },
  { id: "shares", label: "Shares & ETFs" },
  { id: "other", label: "Other investments" },
  { id: "bills", label: "Household bills" },
  { id: "income", label: "Income & expenses" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function finish() {
    // Selections are used to tailor first-run suggestions in a future
    // iteration; for now, simply route the person into the dashboard,
    // where empty states already guide them to add whatever's relevant.
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)] px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[var(--color-line)] p-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)] mb-1">What would you like to track?</h1>
        <p className="text-[var(--color-ink-soft)] mb-6">Choose as many as you like — you can always add more later.</p>

        <div className="space-y-2 mb-8">
          {TRACK_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                selected.includes(opt.id) ? "border-[var(--color-eucalyptus)] bg-[var(--color-eucalyptus-tint)]" : "border-[var(--color-line)]"
              }`}
            >
              <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => toggle(opt.id)} className="w-5 h-5 accent-[var(--color-eucalyptus)]" />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-sm text-[var(--color-ink-soft)] underline">
            Skip for now
          </button>
          <Button onClick={finish}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
