import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COUNTRIES, GENDERS, COUNTRY_MAP, GENDER_MAP } from "@/lib/geo-options";

/* ── Country Searchable Combobox ─────────────────────────────── */

interface CountryComboboxProps {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function CountryCombobox({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Any / Worldwide",
  className,
  triggerClassName,
}: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = COUNTRY_MAP[value];
  const isActive = value && value !== "any";

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background/60 border-border/60 h-9 px-3 text-xs font-normal hover:bg-background/80 focus:ring-1 focus:ring-primary/50",
            isActive && "border-amber-500/50 bg-amber-500/8 text-amber-200",
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <span className="shrink-0 text-sm leading-none">{selected?.flag ?? "🌍"}</span>
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-1">
            {isActive && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onValueChange("any"); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onValueChange("any"); setOpen(false); } }}
                className="rounded-full p-0.5 hover:bg-amber-500/20 text-amber-400/70 hover:text-amber-300 transition-colors"
                aria-label="Clear nation filter"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[240px] p-0 border-border/60 shadow-2xl", className)}
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder="Search countries..."
            className="h-9 text-xs border-b border-border/50"
          />
          <CommandList className="max-h-56 overflow-y-auto scrollbar-thin">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No country found.
            </CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.value}
                  value={`${c.label} ${c.value}`}
                  onSelect={() => {
                    onValueChange(c.value);
                    setOpen(false);
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-primary",
                      value === c.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-sm leading-none shrink-0">{c.flag}</span>
                  <span className="truncate">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ── Gender Select (enhanced) ────────────────────────────────── */

interface GenderSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
}

export function GenderSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Any / No preference",
  triggerClassName,
}: GenderSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = GENDER_MAP[value];
  const isActive = value && value !== "any";

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background/60 border-border/60 h-9 px-3 text-xs font-normal hover:bg-background/80 focus:ring-1 focus:ring-primary/50",
            isActive && "border-pink-500/50 bg-pink-500/8 text-pink-200",
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <span className="shrink-0 text-sm leading-none">{selected?.icon ?? "✨"}</span>
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-1">
            {isActive && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onValueChange("any"); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onValueChange("any"); setOpen(false); } }}
                className="rounded-full p-0.5 hover:bg-pink-500/20 text-pink-400/70 hover:text-pink-300 transition-colors"
                aria-label="Clear gender filter"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 border-border/60 shadow-2xl"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {GENDERS.map((g) => (
                <CommandItem
                  key={g.value}
                  value={g.value}
                  onSelect={() => {
                    onValueChange(g.value);
                    setOpen(false);
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-primary",
                      value === g.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-sm leading-none shrink-0">{g.icon}</span>
                  <span>{g.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
