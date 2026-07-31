import { Link } from "@tanstack/react-router";
import logo from "@/assets/aceedx-logo.png";
import { brand } from "@/lib/brand";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${brand.name} home`}>
      <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-tight">{brand.name}</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            For School Leaders
          </span>
        </span>
      )}
    </Link>
  );
}
