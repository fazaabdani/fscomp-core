"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "fscomp-theme";
const THEME_CHANGE_EVENT = "fscomp-theme-change";

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return preference;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
  window.dispatchEvent(new CustomEvent<ResolvedTheme>(THEME_CHANGE_EVENT, { detail: resolved }));
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "dark";
    setThemeState(stored);
    setResolvedTheme(resolveTheme(stored));
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    function handleSystemChange() {
      const resolved = resolveTheme("system");
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    const resolved = resolveTheme(next);
    setThemeState(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
