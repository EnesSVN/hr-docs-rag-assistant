import { FileText } from "lucide-react";
import { NavLink } from "@/components/molecules/NavLink";

const links = [
  { href: "/", label: "Chat" },
  { href: "/upload", label: "Upload" },
] as const;

// The top bar shown on every page.
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5">
        <span className="mr-4 flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4 text-primary" aria-hidden="true" />
          HR Assistant
        </span>
        {links.map((link) => (
          <NavLink key={link.href} href={link.href}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
