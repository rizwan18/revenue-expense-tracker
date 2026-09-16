import { useAuth } from "../context/AuthContext";
import { Card, SectionHeading } from "../components/ui";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-xl">
      <SectionHeading title="Settings" />

      <Card>
        <h3 className="font-display font-semibold mb-1">Your details</h3>
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">{user?.fullName} · {user?.email}</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold">Easy View</h3>
            <p className="text-sm text-[var(--color-ink-soft)] max-w-sm mt-1">Larger text, bigger buttons, and simpler screens — good if you're using a phone or prefer less on the page.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={user?.easyViewEnabled ?? false}
              onChange={(e) => updateUser({ easyViewEnabled: e.target.checked })}
            />
            <div className="w-12 h-7 bg-[var(--color-line)] peer-checked:bg-[var(--color-eucalyptus)] rounded-full transition-colors" />
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-semibold mb-1">About your data</h3>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Your financial information is only visible to you and members of your household. This app is a record-keeping and planning tool — it does not give tax or
          financial advice. Always review your records with a registered tax professional or financial adviser.
        </p>
      </Card>

      <button onClick={logout} className="text-sm text-[var(--color-brick)] font-medium">
        Sign out
      </button>
    </div>
  );
}
