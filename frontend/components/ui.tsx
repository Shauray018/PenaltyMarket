import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "press-3d inline-flex h-10 items-center justify-center rounded-[14px] bg-[var(--accent)] px-4 text-sm font-black text-black transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-[18px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-11 w-full rounded-[14px] border border-[var(--border)] bg-black px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
      {...props}
    />
  );
}
