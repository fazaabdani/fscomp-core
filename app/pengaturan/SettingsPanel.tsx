import type { ThemePreference } from "@/lib/app-settings";
import { ThemeToggle } from "../ThemeToggle";

export function SettingsPanel({ theme }: { theme: ThemePreference; layout: string }) {
  return (
    <div className="settingsPanel">
      <ThemeToggle current={theme} />
    </div>
  );
}
