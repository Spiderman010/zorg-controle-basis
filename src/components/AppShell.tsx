import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OpslagDiagnoseMelding } from "@/components/OpslagDiagnoseMelding";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/dossiers/nieuw", label: "Nieuw controledossier" },
  { to: "/debug", label: "Rekenkern (debug)" },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">Zorg Controle Basis</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <OpslagDiagnoseMelding />
        <Outlet />
      </main>
    </div>
  );
}
