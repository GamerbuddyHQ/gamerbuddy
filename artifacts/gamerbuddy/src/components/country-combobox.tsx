import * as React from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
  const isActive = value !== "any";

  // Separate "any" from the rest so we can render it at the top with a divider
  const anyOption = COUNTRIES[0]; // { value: "any", flag: "🌍", label: "Any / Worldwide" }
  const countryOptions = COUNTRIES.slice(1);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background/60 border-border/60 h-9 px-3 text-xs font-normal",
            "hover:bg-background/80 hover:border-border transition-all duration-150",
            "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
            isActive
              ? "border-amber-500/40 bg-amber-500/8 text-amber-100 hover:border-amber-500/60"
              : "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <span className="shrink-0 text-[13px] leading-none">{selected?.flag ?? "🌍"}</span>
            <span className="truncate font-medium">
              {selected?.label ?? placeholder}
            </span>
          </span>
          <span className="flex items-center gap-0.5 shrink-0 ml-1.5">
            {isActive ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("any");
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onValueChange("any");
                    setOpen(false);
                  }
                }}
                className="rounded-full p-0.5 hover:bg-amber-500/25 text-amber-400/60 hover:text-amber-200 transition-colors mr-0.5"
                aria-label="Clear nation filter"
              >
                <X className="h-3 w-3" />
              </span>
            ) : (
              <Search className="h-3 w-3 text-muted-foreground/35 mr-0.5" aria-hidden />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 border-border/60 shadow-2xl", className)}
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: "200px" }}
        align="start"
        sideOffset={5}
      >
        <Command>
          <CommandInput
            placeholder="Type to search nations…"
            className="h-9 text-xs"
          />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-5 text-center text-xs text-muted-foreground/60">
              No country found.
            </CommandEmpty>
            <CommandGroup>
              {/* "Any" option always at top, styled distinctly */}
              <CommandItem
                key="any"
                value="any worldwide"
                onSelect={() => { onValueChange("any"); setOpen(false); }}
                className="text-xs gap-2 cursor-pointer font-medium text-muted-foreground/80"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === "any" ? "opacity-100" : "opacity-0")} />
                <span className="text-[13px] leading-none shrink-0">{anyOption.flag}</span>
                <span className="truncate">{anyOption.label}</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Countries">
              {countryOptions.map((c) => (
                <CommandItem
                  key={c.value}
                  value={`${c.label} ${c.value}`}
                  onSelect={() => { onValueChange(c.value); setOpen(false); }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === c.value ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px] leading-none shrink-0">{c.flag}</span>
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

/* ── Gender Select (popover list) ────────────────────────────── */

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
  const isActive = value !== "any";

  const anyOption = GENDERS[0];
  const genderOptions = GENDERS.slice(1);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background/60 border-border/60 h-9 px-3 text-xs font-normal",
            "hover:bg-background/80 hover:border-border transition-all duration-150",
            "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
            isActive
              ? "border-pink-500/40 bg-pink-500/8 text-pink-100 hover:border-pink-500/60"
              : "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <span className="shrink-0 text-[13px] leading-none">{selected?.icon ?? "✨"}</span>
            <span className="truncate font-medium">
              {selected?.label ?? placeholder}
            </span>
          </span>
          <span className="flex items-center gap-0.5 shrink-0 ml-1.5">
            {isActive ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("any");
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onValueChange("any");
                    setOpen(false);
                  }
                }}
                className="rounded-full p-0.5 hover:bg-pink-500/25 text-pink-400/60 hover:text-pink-200 transition-colors mr-0.5"
                aria-label="Clear gender filter"
              >
                <X className="h-3 w-3" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-border/60 shadow-2xl"
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: "180px" }}
        align="start"
        sideOffset={5}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                key="any"
                value="any"
                onSelect={() => { onValueChange("any"); setOpen(false); }}
                className="text-xs gap-2 cursor-pointer font-medium text-muted-foreground/80"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === "any" ? "opacity-100" : "opacity-0")} />
                <span className="text-[13px] leading-none shrink-0">{anyOption.icon}</span>
                <span>{anyOption.label}</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {genderOptions.map((g) => (
                <CommandItem
                  key={g.value}
                  value={g.value}
                  onSelect={() => { onValueChange(g.value); setOpen(false); }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === g.value ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px] leading-none shrink-0">{g.icon}</span>
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
