import { Bell, CreditCard, Globe, Shield, User } from "lucide-react";

const ROWS = [
  {
    icon: User,
    title: "Profile",
    sub: "Manage your name, email and avatar",
  },
  {
    icon: CreditCard,
    title: "Billing & Credits",
    sub: "Recharge credits and view usage",
  },
  {
    icon: Bell,
    title: "Notifications",
    sub: "Email alerts when renders are done",
  },
  {
    icon: Globe,
    title: "Language & Region",
    sub: "Default voice language and time zone",
  },
  {
    icon: Shield,
    title: "Security",
    sub: "Password, sessions, login activity",
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[#e8e8f0] bg-white p-6 lg:p-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          These sections will be wired up once auth and backend land. Layout is
          ready.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ROWS.map((r) => {
          const Icon = r.icon;
          return (
            <li
              key={r.title}
              className="flex items-start gap-4 rounded-2xl border border-[#e8e8f0] bg-white p-5 transition-colors hover:border-violet-200 hover:bg-violet-50/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{r.sub}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
