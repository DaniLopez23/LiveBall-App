import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider-14";
import { cn } from "@/lib/utils";

interface FieldProps {
	label: string;
	children: ReactNode;
	className?: string;
}

export function Field({ label, children, className }: FieldProps) {
	return (
		<label className={cn("flex min-w-0 flex-col gap-1.5 text-xs font-medium", className)}>
			<span className="text-muted-foreground">{label}</span>
			{children}
		</label>
	);
}

interface TextFieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
	return (
		<Field label={label}>
			<Input
				value={value}
				placeholder={placeholder}
				onChange={(event) => onChange(event.target.value)}
			/>
		</Field>
	);
}

interface SelectFieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string; disabled?: boolean }>;
	placeholder?: string;
}

export function SelectField({
	label,
	value,
	onChange,
	options,
	placeholder,
}: SelectFieldProps) {
	return (
		<Field label={label}>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							disabled={option.disabled}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}

interface MinuteRangeFieldProps {
	label?: string;
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxMinute: number;
}

export function MinuteRangeField({
	label = "Ventana temporal",
	value,
	onChange,
	maxMinute,
}: MinuteRangeFieldProps) {
	const sliderMax = Math.max(1, Math.floor(maxMinute));
	const start = Math.min(sliderMax, Math.max(0, value[0]));
	const end = Math.min(sliderMax, Math.max(start, value[1]));

	return (
		<Field label={label}>
			<div className="flex items-center gap-2">
				<span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
					{start}'
				</span>
				<Slider
					min={0}
					max={sliderMax}
					step={1}
					value={[start, end]}
					onValueChange={(nextValue) => {
						const first = nextValue[0] ?? 0;
						const second = nextValue[1] ?? first;
						onChange([
							Math.min(first, second),
							Math.max(first, second),
						] as [number, number]);
					}}
					className="flex-1"
				/>
				<span className="w-8 text-xs tabular-nums text-muted-foreground">{end}'</span>
			</div>
		</Field>
	);
}

interface SwitchFieldProps {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export function SwitchField({
	label,
	description,
	checked,
	onChange,
}: SwitchFieldProps) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40"
		>
			<span className="min-w-0">
				<span className="block text-sm font-medium">{label}</span>
				{description ? (
					<span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
				) : null}
			</span>
			<span
				className={cn(
					"inline-flex size-8 shrink-0 items-center justify-center rounded-md border",
					checked
						? "border-primary bg-primary text-primary-foreground"
						: "border-input text-muted-foreground",
				)}
			>
				{checked ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
			</span>
		</button>
	);
}

interface CheckboxListProps {
	options: Array<{ value: string; label: string; description?: string }>;
	value: string[];
	onChange: (value: string[]) => void;
}

export function CheckboxList({ options, value, onChange }: CheckboxListProps) {
	return (
		<div className="grid gap-2">
			{options.map((option) => {
				const checked = value.includes(option.value);

				return (
					<label
						key={option.value}
						className="flex cursor-pointer items-start gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
					>
						<input
							type="checkbox"
							className="mt-1 size-4"
							checked={checked}
							onChange={(event) => {
								if (event.target.checked) {
									onChange([...value, option.value]);
									return;
								}

								onChange(value.filter((item) => item !== option.value));
							}}
						/>
						<span className="min-w-0">
							<span className="block font-medium">{option.label}</span>
							{option.description ? (
								<span className="mt-0.5 block text-xs text-muted-foreground">
									{option.description}
								</span>
							) : null}
						</span>
					</label>
				);
			})}
		</div>
	);
}

export function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
			{children}
		</p>
	);
}

export { Button };
