export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
        K
      </div>
      <span className="text-base font-semibold tracking-tight">Kuaför Randevu</span>
    </div>
  );
}
