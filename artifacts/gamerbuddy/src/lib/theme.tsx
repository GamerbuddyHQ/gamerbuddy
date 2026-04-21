import React from "react";

export type Theme = "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  return { theme: "dark" as Theme, toggleTheme: () => {}, isDark: true };
}
