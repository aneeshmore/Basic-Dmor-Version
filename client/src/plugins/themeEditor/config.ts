/**
 * Theme Editor Plugin Configuration
 *
 * This plugin allows runtime theme customization.
 * Set VITE_ENABLE_THEME_EDITOR=true in .env to enable.
 *
 * To remove in production:
 * 1. Delete the entire /plugins/themeEditor folder
 * 2. Remove VITE_ENABLE_THEME_EDITOR from .env files
 * 3. Remove theme editor imports from App.tsx
 */

export const THEME_EDITOR_CONFIG = {
  enabled: import.meta.env.VITE_ENABLE_THEME_EDITOR === "true",
  storageKey: "morex-theme",

  // Default theme
  defaultTheme: {
    primary: "#6366f1",
    secondary: "#64748b",
    background: "#f8fafc",
    surface: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    border: "#e2e8f0",
    success: "#10b981",
    danger: "#ef4444",
  },

  // Logging
  logging: {
    enabled: true,
    prefix: "[THEME EDITOR]",
  },
} as const;

export const isThemeEditorEnabled = () => THEME_EDITOR_CONFIG.enabled;

export const logThemeEditor = (message: string, ...args: any[]) => {
  if (THEME_EDITOR_CONFIG.logging.enabled && THEME_EDITOR_CONFIG.enabled) {
    console.log(
      `%c${THEME_EDITOR_CONFIG.logging.prefix} ${message}`,
      "color: #a855f7; font-weight: bold;",
      ...args
    );
  }
};
