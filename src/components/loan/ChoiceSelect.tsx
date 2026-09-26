import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ChoiceSelect<T extends string>({
  id,
  value,
  onValueChange,
  options,
  describedBy,
  labelId,
}: {
  id: string
  value: T
  onValueChange: (v: T) => void
  options: { value: T; label: string }[]
  describedBy?: string
  labelId?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as T)}>
      <SelectTrigger id={id} aria-describedby={describedBy} aria-labelledby={labelId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
