"use client"

const PRESET_COLORS = [
    "#3b82f6", // blue
    "#22c55e", // green
    "#f97316", // orange
    "#ef4444", // red
    "#a855f7", // purple
    "#ec4899", // pink
    "#eab308", // yellow
    "#14b8a6", // teal
    "#6366f1", // indigo
    "#64748b", // slate
]

interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        value.toLowerCase() === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                />
            ))}
            <label className="relative h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground overflow-hidden cursor-pointer flex items-center justify-center">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                />
                <div className="h-full w-full" style={{ backgroundColor: value }} />
            </label>
        </div>
    )
}
