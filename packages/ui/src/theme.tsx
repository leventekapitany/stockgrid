"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import * as z from "zod/v4";

import { Button } from "./button";

const ThemeModeSchema = z.enum(["light", "dark"]);

const themeKey = "theme-mode";

export type ThemeMode = z.output<typeof ThemeModeSchema>;
export type ResolvedTheme = ThemeMode;

const getStoredThemeMode = (): ThemeMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const storedTheme = localStorage.getItem(themeKey);
    return ThemeModeSchema.parse(storedTheme);
  } catch {
    return null;
  }
};

const setStoredThemeMode = (theme: ThemeMode) => {
  try {
    const parsedTheme = ThemeModeSchema.parse(theme);
    localStorage.setItem(themeKey, parsedTheme);
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const subscribeSystemTheme = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getServerTheme = (): ResolvedTheme => "light";

const updateThemeClass = (themeMode: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(themeMode);
};

export const themeDetectorScript = (function () {
  function themeFn() {
    const isValidTheme = (theme: string): theme is ThemeMode => {
      const validThemes = ["light", "dark"] as const;
      return validThemes.includes(theme as ThemeMode);
    };
    const storedTheme = localStorage.getItem("theme-mode");
    const storedThemeValue = storedTheme ?? "";
    const theme: ThemeMode = isValidTheme(storedThemeValue)
      ? storedThemeValue
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    document.documentElement.classList.add(theme);
  }
  return `(${themeFn.toString()})();`;
})();

interface ThemeContextProps {
  themeMode: ThemeMode | null;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleMode: () => void;
}
const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined,
);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [themeMode, setThemeMode] = React.useState(getStoredThemeMode);
  const systemTheme = React.useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    getServerTheme,
  );
  const resolvedTheme = themeMode ?? systemTheme;

  React.useEffect(() => {
    updateThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    setStoredThemeMode(newTheme);
    updateThemeClass(newTheme);
  };

  const toggleMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext
      value={{
        themeMode,
        resolvedTheme,
        setTheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = React.use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { resolvedTheme, toggleMode } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleMode}
      aria-label={`Switch to ${nextTheme} theme`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
      <span className="sr-only">Switch to {nextTheme} theme</span>
    </Button>
  );
}
