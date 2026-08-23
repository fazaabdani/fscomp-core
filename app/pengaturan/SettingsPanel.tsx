import type { LayoutPreference, ThemePreference } from "@/lib/app-settings";
import { LayoutToggle } from "../LayoutToggle";
import { ThemeToggle } from "../ThemeToggle";

export function SettingsPanel({ theme, layout }: { theme: ThemePreference; layout: LayoutPreference }) {
  return (
    <div className="settingsPanel">
      <div className="settingsPanelGroup">
        <p className="eyebrow">Tema</p>
        <ThemeToggle current={theme} />
      </div>
      <div className="settingsPanelGroup">
        <p className="eyebrow">Posisi menu</p>
        <LayoutToggle current={layout} />
      </div>
    </div>
  );
}
