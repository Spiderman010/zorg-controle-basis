import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus2, Wrench, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OpslagDiagnoseMelding } from "@/components/OpslagDiagnoseMelding";

const navItems = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/dossiers/nieuw", label: "Nieuw dossier", icon: FilePlus2 },
  { to: "/debug", label: "Diagnose", icon: Wrench },
];

function kruimelpad(pathname: string): string[] {
  if (pathname === "/") return ["Dashboard"];
  if (pathname === "/dossiers/nieuw") return ["Dashboard", "Nieuw controledossier"];
  if (pathname.startsWith("/debug")) return ["Dashboard", "Diagnose"];
  if (pathname.startsWith("/dossiers/")) {
    const pad = ["Dashboard", "Dossier"];
    if (pathname.endsWith("/bronnen")) pad.push("Bronnen");
    if (pathname.endsWith("/controle")) pad.push("Controle-overzicht");
    if (pathname.endsWith("/rapportage")) pad.push("Rapportage");
    return pad;
  }
  return ["Dashboard"];
}

export default function AppShell() {
  const { pathname } = useLocation();
  const pad = kruimelpad(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">Zorg Controle Basis</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Financiële verbandscontroles</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              {pad.map((stuk, i) => (
                <li key={i} className="flex items-center gap-1 truncate">
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
                  <span className={cn(i === pad.length - 1 && "font-medium text-foreground")}>{stuk}</span>
                </li>
              ))}
            </ol>
            {pathname !== "/dossiers/nieuw" && (
              <Button asChild size="sm" variant="outline" className="h-7 shrink-0 text-xs">
                <Link to="/dossiers/nieuw">
                  <FilePlus2 className="h-3.5 w-3.5" /> Nieuw dossier
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <OpslagDiagnoseMelding />
        <Outlet />
      </main>
    </div>
  );
}
