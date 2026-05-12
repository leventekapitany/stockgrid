import { cn } from "@stock/ui";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-input text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-12 w-full min-w-0 rounded-xl border px-4 py-3 text-base leading-normal shadow-none transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[#a8acb3]",
        "focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
