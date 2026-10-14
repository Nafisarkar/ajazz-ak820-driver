import type { ReactNode } from 'react'

export function Button({
  children,
  onClick,
  variant = 'default',
  disabled,
  className = '',
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean
  className?: string
  title?: string
}) {
  const styles = {
    default: 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
    primary: 'border border-sky-500 bg-sky-600 text-white hover:bg-sky-500',
    danger: 'border border-red-900 bg-zinc-900 text-red-300 hover:bg-red-950',
    ghost: 'border border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Panel({
  title,
  hint,
  children,
  className = '',
}: {
  title?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border border-zinc-800 bg-zinc-900 ${className}`}>
      {title && (
        <header className="border-b border-zinc-800 px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{title}</h3>
          {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string | number
  onChange: (value: string) => void
  options: { value: string | number; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 ${mono ? 'mono' : ''}`}
    />
  )
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-sky-500"
      />
      {label}
    </label>
  )
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'ok' | 'warn' | 'bad'
}) {
  const color = {
    default: 'text-zinc-200',
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
  }[tone]
  return (
    <div className="border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`mono mt-0.5 text-sm ${color}`}>{value}</div>
    </div>
  )
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
      {children}
    </div>
  )
}
