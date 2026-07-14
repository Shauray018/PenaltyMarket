import type { ReactNode } from "react";

export function ComingSoonOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none select-none grayscale opacity-45 blur-[1.5px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 z-10 grid place-items-center bg-[#c0c0c0]/45 p-3" role="status" aria-label="Coming soon">
        <div className="coming-soon-banner -rotate-3">Coming Soon</div>
      </div>
    </div>
  );
}
