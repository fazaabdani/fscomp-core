const THEME_INIT_SCRIPT = `(function () {
  try {
    var pref = localStorage.getItem("fscomp-theme") || "dark";
    var resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : pref;
    document.documentElement.dataset.theme = resolved;
  } catch (e) {}
})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
