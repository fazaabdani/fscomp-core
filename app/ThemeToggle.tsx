"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "./useTheme";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti sistem", icon: Monitor }
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="themeToggle" role="radiogroup" aria-label="Pilih tema tampilan">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          className={theme === value ? "themeToggleOption active" : "themeToggleOption"}
          onClick={() => setTheme(value)}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
