"use client";
import { usePersistedTheme } from "./use-persisted-theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./ui/button";
export function ThemeSettings() {
  const { setTheme } = usePersistedTheme();
  return (
    <section className="panel p-5 sm:p-7">
      <h2 className="font-bold">Appearance</h2>
      <p className="mb-5 mt-1 text-sm text-muted">
        Choose a theme. Your choice is saved to your account.
      </p>
      <div className="flex flex-wrap gap-3">
        {[
          { name: "Light", icon: Sun },
          { name: "Dark", icon: Moon },
          { name: "System", icon: Monitor },
        ].map(({ name, icon: Icon }) => (
          <Button
            key={name}
            variant="outline"
            onClick={() => setTheme(name.toLowerCase())}
          >
            <Icon />
            {name}
          </Button>
        ))}
      </div>
    </section>
  );
}
