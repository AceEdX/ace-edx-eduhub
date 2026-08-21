import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { myApplicationQuery } from "@/lib/principals";
import { Bell, LayoutDashboard, LogOut, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NAV_LINKS } from "@/lib/brand";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const myApplication = useQuery(myApplicationQuery(user?.id));
  const hasApplication = Boolean(myApplication.data);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const initials = (user?.email ?? "A").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container-page flex h-16 min-w-0 items-center gap-3">
        <Logo />

        <nav className="hidden min-w-0 items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.slice(0, 5).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:px-3"
              activeProps={{ className: "bg-secondary text-foreground" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
          {NAV_LINKS.length > 5 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:px-3">
                  More
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {NAV_LINKS.slice(5).map((link) => (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link to={link.to}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
          <form
            className="relative hidden xl:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/courses", search: { q: term } });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search courses, webinars, experts"
              aria-label="Search the platform"
              className="h-9 w-56 rounded-full pl-9"
            />
          </form>


          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="Notifications">
                <Link to="/dashboard">
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">My Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-learning">My Learning</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/certificates">My Certificates</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">My Profile</Link>
                  </DropdownMenuItem>
                  {hasApplication && (
                    <DropdownMenuItem asChild>
                      <Link to="/studio">Principal Studio</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin console</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button variant="brand" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join free
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="ml-auto rounded-md p-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-3 pb-2">
              {user ? (
                <Button variant="brand" className="flex-1" asChild onClick={() => setOpen(false)}>
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" asChild onClick={() => setOpen(false)}>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button variant="brand" className="flex-1" asChild onClick={() => setOpen(false)}>
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Join free
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
