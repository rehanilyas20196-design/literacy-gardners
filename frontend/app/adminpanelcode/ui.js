'use client';

import { useEffect } from 'react';

export function toast(message) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lg-toast', { detail: message }));
  }
}

const pkrFmt = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function fmtPKR(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return pkrFmt.format(num);
}

export function formatDate(value) {
  if (!value) return '—';
  const str = String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(str)
    ? str.replace(' ', 'T') + 'Z'
    : str;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '';
  const str = String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(str)
    ? str.replace(' ', 'T') + 'Z'
    : str;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink text-white text-xs font-medium px-3.5 py-2 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-xs font-medium px-3.5 py-2 text-ink hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium px-3.5 py-2 text-error hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  link: 'text-xs font-medium text-ink/55 hover:text-ink underline underline-offset-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  linkPrimary:
    'text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  linkDanger:
    'text-xs font-medium text-error hover:text-red-700 underline underline-offset-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
};

export const inputCls =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary placeholder:text-ink/35';

const TONES = {
  neutral: 'bg-surface text-ink/60 border-border/60',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-600 border-red-100',
  info: 'bg-blue-50 text-blue-600 border-blue-100',
};

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputCls} pl-8 pr-8`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink/35 hover:text-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-surface text-ink/50 hover:text-ink hover:bg-muted'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-primary/70' : 'text-ink/35'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink/40">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn.secondary} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Prev
        </button>
        <button
          type="button"
          className={btn.secondary}
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
      <div className="font-display text-2xl text-ink/25">❀</div>
      <p className="text-sm font-medium text-ink/70">{title}</p>
      {hint && <p className="text-xs text-ink/45">{hint}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/40">Loading panel…</span>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div className={`relative mx-auto w-full ${width} rounded-2xl border border-border bg-surface shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-ink/50">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg border border-border px-2 py-1 text-sm text-ink/50 transition-colors hover:bg-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onCancel} title={title} width="max-w-md">
      <p className="text-sm leading-relaxed text-ink/70">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={btn.secondary} onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? btn.danger : btn.primary}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function StatCard({ label, value, hint, tone = 'default', icon }) {
  const valueTone =
    tone === 'danger' ? 'text-error' : tone === 'primary' ? 'text-primary' : 'text-ink';
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-ink/20">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">{label}</span>
        {icon && <span className="text-sm leading-none" aria-hidden="true">{icon}</span>}
      </div>
      <div className={`mt-2 font-display text-3xl font-bold leading-none ${valueTone}`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-ink/45">{hint}</div>}
    </div>
  );
}

function csvEscape(cell) {
  const s = cell === null || cell === undefined ? '' : String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    toast('Nothing to export.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  });
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}.`);
}
