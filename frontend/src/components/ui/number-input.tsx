import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

function NumberInput({
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  disabled = false,
  className,
}: NumberInputProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  const btnClass = cn(
    "inline-flex items-center justify-center size-7 rounded-md border border-input bg-background text-muted-foreground shadow-xs transition-colors",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    "disabled:pointer-events-none disabled:opacity-50"
  );

  return (
    <div
      className={cn("flex items-center gap-1", disabled && "opacity-50 pointer-events-none", className)}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className={btnClass}
        aria-label="Decrementar"
      >
        <Minus className="size-3" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        className={cn(
          "w-14 h-7 rounded-md border border-input bg-background px-2 text-sm text-center shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        )}
      />
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className={btnClass}
        aria-label="Incrementar"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

export { NumberInput };
