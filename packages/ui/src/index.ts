import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export { Moon } from "lucide-react";

export const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));
