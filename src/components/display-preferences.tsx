"use client";
import { createContext, useContext, useEffect } from "react";
import { useTheme } from "next-themes";
import type { InterfacePreferences } from "@/lib/interface-preferences";
import { dateFormatter } from "@/lib/display-date";
const Context = createContext<InterfacePreferences>({
  theme: "system",
  timeZone: "Asia/Manila",
  dateFormat: "medium",
  defaultTaskView: "list",
});
export function DisplayPreferences({
  value,
  children,
}: {
  value: InterfacePreferences;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(value.theme);
  }, [value.theme, setTheme]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const usePreferences = () => useContext(Context);
export const useDateFormatter = () => dateFormatter(usePreferences());
