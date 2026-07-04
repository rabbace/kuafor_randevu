import { Logo } from "@/components/ui/Logo";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 lg:hidden">
      <Logo />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
        SK
      </div>
    </header>
  );
}
