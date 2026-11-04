'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import Reveal from '@/components/Reveal';

const EDITING_LEVELS = [
  { id: 'proofreading', label: 'Proofreading', price: 25, note: 'Light quality check for spelling and grammar.' },
  { id: 'grammar', label: 'Grammar', price: 45, note: 'Full grammar and syntax review with suggestions.' },
];

const FORMATTING_LEVELS = [
  { id: 'textual', label: 'Textual Formatting', price: 10, note: 'Paragraph styles, headers, and typography.' },
  { id: 'graphical', label: 'Graphical Formatting', price: 20, note: 'Layout, images, and visual design elements.' },
];

const TIMELINES = [
  { id: 'standard', label: 'Standard', weeks: '4–8 weeks', price: 0, note: 'Free' },
  { id: 'accelerated', label: 'Accelerated', weeks: '2–4 weeks', price: 2000, note: '2,000 PKR' },
  { id: 'urgent', label: 'Urgent', weeks: '1–2 weeks', price: 5000, note: '5,000 PKR' },
];

const ADDONS = [
  { id: 'isbn', label: 'ISBN + National Library Submission', price: 2500, note: 'Includes 2 additional copies for National Library' },
  { id: 'cover', label: 'Professional Cover Design', price: 2500, note: 'Custom cover design for your book' },
];

const BASE_PRICE = 10000;
const INCLUDED_COPIES = 3;

function formatPKR(n) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(n);
}

export default function GetPublishedClient() {
  const [pages, setPages] = useState(0);
  const [editing, setEditing] = useState(EDITING_LEVELS[0].id);
  const [formatting, setFormatting] = useState(FORMATTING_LEVELS[0].id);
  const [timeline, setTimeline] = useState(TIMELINES[0].id);
  const [addons, setAddons] = useState(new Set());
  const [extraCopies, setExtraCopies] = useState(0);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', bookTitle: '', notes: '',
  });
  const [file, setFile] = useState(null);
  const [frontCover, setFrontCover] = useState(null);
  const [backCover, setBackCover] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const MANUSCRIPT_EXT = ['.pdf', '.doc', '.docx'];
  const COVER_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

  function pickFile(setter, kind) {
    return (e) => {
      const f = e.target.files?.[0] || null;
      setError('');
      if (!f) {
        setter(null);
        return;
      }
      const ext = `.${f.name.split('.').pop()?.toLowerCase() || ''}`;
      const maxMb = kind === 'manuscript' ? 25 : 10;
      const allowed = kind === 'manuscript' ? MANUSCRIPT_EXT : COVER_EXT;
      if (!allowed.includes(ext)) {
        setter(null);
        e.target.value = '';
        setError(
          kind === 'manuscript'
            ? `"${f.name}" is not a PDF, DOC, or DOCX file.`
            : `"${f.name}" must be a JPG, PNG, or WebP image.`
        );
        return;
      }
      if (f.size > maxMb * 1024 * 1024) {
        setter(null);
        e.target.value = '';
        setError(`"${f.name}" is larger than ${maxMb}MB.`);
        return;
      }
      setter(f);
    };
  }

  const editingLevel = EDITING_LEVELS.find((e) => e.id === editing);
  const formattingLevel = FORMATTING_LEVELS.find((f) => f.id === formatting);
  const timelineLevel = TIMELINES.find((t) => t.id === timeline);

  const pageEditingCost = pages * (editingLevel?.price || 0);
  const pageFormattingCost = pages * (formattingLevel?.price || 0);
  const addonCost = Array.from(addons).reduce((sum, id) => sum + (ADDONS.find((a) => a.id === id)?.price || 0), 0);
  const extraCopyCost = extraCopies * 700;
  const total = BASE_PRICE + pageEditingCost + pageFormattingCost + timelineLevel.price + addonCost + extraCopyCost;

  const toggleAddon = useCallback((id) => {
    setAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');

    // Client-side validation before any network work
    if (!form.name.trim() || !form.email.trim() || !form.bookTitle.trim()) {
      setError('Please fill in your name, email, and book title.');
      return;
    }
    if (!file || !frontCover || !backCover) {
      setError('Please attach your manuscript and both cover images.');
      return;
    }

    setState('uploading');
    try {
      // 1. Upload files to Supabase Storage
      const manuscript = await api.uploadFile(file, 'manuscript');
      const front = await api.uploadFile(frontCover, 'cover');
      const back = await api.uploadFile(backCover, 'cover');

      // 2. Submit the quote as JSON referencing the uploaded files
      setState('sending');
      await api.submitQuote({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        book_title: form.bookTitle.trim(),
        notes: form.notes.trim() || null,
        pages,
        editing_level: editing,
        formatting_level: formatting,
        delivery_timeline: timeline,
        addons: JSON.stringify(Array.from(addons)),
        extra_copies: extraCopies,
        estimated_total: total,
        manuscript_file: manuscript.path,
        front_cover_file: front.url || front.path,
        back_cover_file: back.url || back.path,
      });

      setState('sent');
      setForm({ name: '', email: '', phone: '', bookTitle: '', notes: '' });
      setFile(null);
      setFrontCover(null);
      setBackCover(null);
      setPages(0);
      setEditing(EDITING_LEVELS[0].id);
      setFormatting(FORMATTING_LEVELS[0].id);
      setTimeline(TIMELINES[0].id);
      setAddons(new Set());
      setExtraCopies(0);
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Quote request sent — we will contact you soon.' }));
    } catch (err) {
      setState('error');
      setError(err.message || 'Something went wrong');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Hero */}
      <section className="mb-20 text-center">
        <Reveal>
          <span className="inline-block bg-primary text-white font-display text-lg px-3 py-1.5 -rotate-1 select-none">
            Solo Book Publishing
          </span>
          <h1 className="mt-8 font-display text-[40px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-ink mb-6">
            Professional Publishing Services
          </h1>
          <div className="inline-block bg-primary/5 border border-primary/20 text-primary font-display text-lg px-4 py-2 rounded-full mb-10">
            Important: Please ensure your document is formatted in A5 SIZE using TIMES NEW ROMAN font at SIZE 12
          </div>
          <p className="text-lg leading-relaxed text-ink/65 max-w-2xl mx-auto">
            Publish your book with professional editing, formatting, cover design, and ISBN registration —
            priced transparently for young authors.
          </p>
        </Reveal>
      </section>

      {/* Pricing Calculator */}
      <section className="mb-20">
        <Reveal>
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight text-ink">
                Build Your Quote
              </h2>
              <p className="text-ink/60 leading-relaxed">
                Select your publishing options below. The estimated total updates automatically.
              </p>

              {/* Number of Pages */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">Number of Pages</h3>
                    <p className="text-sm text-ink/50">Manuscript page count</p>
                  </div>
                  <span className="text-primary font-display font-bold text-xl">{pages}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={pages}
                  onChange={(e) => setPages(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-2xl font-display text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Editing Level */}
              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink mb-1">Editing Level</h3>
                  <p className="text-xs text-ink/45 font-mono uppercase tracking-wider">
                    Lower levels will require a quality check, and if quality standard is not met then you will have to choose a higher level advised by us according to your needs
                  </p>
                </div>
                <div className="space-y-3">
                  {EDITING_LEVELS.map((level) => {
                    const selected = editing === level.id;
                    return (
                      <label key={level.id} className="cursor-pointer quote-option">
                        <input
                          type="radio"
                          name="editing"
                          checked={selected}
                          onChange={() => setEditing(level.id)}
                          className="sr-only peer"
                        />
                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-ink/30'
                        }`}>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            selected ? 'bg-primary text-primary' : 'border-border bg-surface'
                          } flex items-center justify-center check-mark`}>
                            {selected && '✓'}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-ink">{level.label}</span>
                            <span className="text-xs text-ink/50">{level.price === 25 ? '25 PKR/pg' : '45 PKR/pg'}</span>
                          </div>
                          <span className="ml-auto text-sm font-semibold text-primary">
                            {formatPKR(pageEditingCost)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Formatting Level */}
              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink mb-1">Formatting Level</h3>
                  <p className="text-xs text-ink/45 font-mono uppercase tracking-wider">
                    Lower levels will require a quality check, and if quality standard is not met then you will have to choose a higher level advised by us according to your needs
                  </p>
                </div>
                <div className="space-y-3">
                  {FORMATTING_LEVELS.map((level) => {
                    const selected = formatting === level.id;
                    return (
                      <label key={level.id} className="cursor-pointer quote-option">
                        <input
                          type="radio"
                          name="formatting"
                          checked={selected}
                          onChange={() => setFormatting(level.id)}
                          className="sr-only peer"
                        />
                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-ink/30'
                        }`}>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            selected ? 'bg-primary text-primary' : 'border-border bg-surface'
                          } flex items-center justify-center check-mark`}>
                            {selected && '✓'}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-ink">{level.label}</span>
                            <span className="text-xs text-ink/50">{level.price === 10 ? '10 PKR/pg' : '20 PKR/pg'}</span>
                          </div>
                          <span className="ml-auto text-sm font-semibold text-primary">
                            {formatPKR(pageFormattingCost)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Delivery Timeline */}
              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink mb-1">Delivery Timeline</h3>
                </div>
                <div className="space-y-3">
                  {TIMELINES.map((tl) => {
                    const selected = timeline === tl.id;
                    return (
                      <label key={tl.id} className="cursor-pointer quote-option">
                        <input
                          type="radio"
                          name="timeline"
                          checked={selected}
                          onChange={() => setTimeline(tl.id)}
                          className="sr-only peer"
                        />
                        <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-ink/30'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 ${
                              selected ? 'bg-primary text-primary' : 'border-border bg-surface'
                            } flex items-center justify-center check-mark`}>
                              {selected && '✓'}
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-ink">{tl.label}</span>
                              <span className="text-xs text-ink/50">{tl.weeks}</span>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${tl.price === 0 ? 'text-green-600' : 'text-primary'}`}>
                            {tl.note}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Add-ons */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-ink mb-4">Add-ons</h3>
                <div className="space-y-3">
                  {ADDONS.map((addon) => {
                    const selected = addons.has(addon.id);
                    return (
                      <label key={addon.id} className="cursor-pointer quote-option">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAddon(addon.id)}
                          className="sr-only peer"
                        />
                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-ink/30'
                        }`}>
                          <div className={`w-5 h-5 rounded border-2 ${
                            selected ? 'bg-primary text-primary' : 'border-border bg-surface'
                          } flex items-center justify-center check-mark`}>
                            {selected && '✓'}
                          </div>
                          <div className="flex-1">
                            <span className="block text-sm font-medium text-ink">{addon.label}</span>
                            <span className="text-xs text-ink/50">{addon.note}</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatPKR(addon.price)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional Copies */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-1">Additional Book Copies</h3>
                    <p className="text-xs text-ink/45 font-mono uppercase tracking-wider">
                      Discounted rate of 30% during publishing • {INCLUDED_COPIES} book copies included
                    </p>
                  </div>
                  <span className="text-primary font-display font-bold text-xl">
                    {extraCopies === 0 ? 'Included Free' : formatPKR(extraCopyCost)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExtraCopies((prev) => Math.max(0, prev - 1))}
                    disabled={extraCopies === 0}
                    className="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-ink font-bold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={extraCopies}
                    onChange={(e) => setExtraCopies(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 rounded-xl border border-border bg-surface px-3 py-2 text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setExtraCopies((prev) => prev + 1)}
                    className="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-ink font-bold hover:bg-muted transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Free Inclusions */}
              <div className="card p-6 border-green-100 bg-green-50">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Included Free</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Certificate of Publication
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Letter of Acknowledgement
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Award (Shield)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Estimated Total */}
        <Reveal delay={100}>
          <div className="mt-12 flex flex-col lg:flex-row items-center justify-between gap-6 p-8 rounded-2xl border-2 border-primary bg-primary text-white quote-total">
            <div>
              <p className="text-white/20 font-mono text-xs uppercase tracking-wider">Estimated Total</p>
              <p className="text-4xl font-display font-bold mt-1">{formatPKR(total)}</p>
              <p className="text-white/30 text-xs mt-2">
                *Price is subject to change after review
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setPages(0);
                  setEditing(EDITING_LEVELS[0].id);
                  setFormatting(FORMATTING_LEVELS[0].id);
                  setTimeline(TIMELINES[0].id);
                  setAddons(new Set());
                  setExtraCopies(0);
                }}
                className="px-6 py-3 rounded-md border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                className="px-8 py-3 rounded-md bg-white text-ink text-sm font-medium hover:bg-primary/90 transition-colors"
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Send Quote Request
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="border-t border-border pt-16">
        <Reveal>
          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6">
              <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight text-ink">
                Contact Information
              </h2>
              <p className="text-ink/60 leading-relaxed">
                Fill in your details and upload your manuscript. We will review your quote and get back to you.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5 card p-6 md:p-8">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="field">
                  <label htmlFor="quote-name">Your Name <span className="text-error">*</span></label>
                  <input
                    id="quote-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="field">
                  <label htmlFor="quote-email">Email Address <span className="text-error">*</span></label>
                  <input
                    id="quote-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="field">
                  <label htmlFor="quote-phone">Phone Number</label>
                  <input
                    id="quote-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="field">
                  <label htmlFor="quote-book-title">Book Title <span className="text-error">*</span></label>
                  <input
                    id="quote-book-title"
                    type="text"
                    required
                    value={form.bookTitle}
                    onChange={(e) => setForm({ ...form, bookTitle: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="quote-manuscript">Upload Manuscript <span className="text-error">*</span></label>
                <input
                  id="quote-manuscript"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={pickFile(setFile, 'manuscript')}
                  className="block w-full text-sm text-ink/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                {file && (
                  <p className="mt-2 text-xs text-ink/50 font-mono">
                    {file.name} • {Math.round(file.size / 1024 / 1024 * 100) / 100} MB
                  </p>
                )}
                <p className="mt-1 text-xs text-ink/45 font-mono">
                  PDF, DOC, or DOCX • Max 25MB
                </p>
              </div>

              <div className="field">
                <label htmlFor="quote-front-cover">Front Cover Image <span className="text-error">*</span></label>
                <input
                  id="quote-front-cover"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={pickFile(setFrontCover, 'cover')}
                  className="block w-full text-sm text-ink/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                {frontCover && (
                  <p className="mt-2 text-xs text-ink/50 font-mono">
                    {frontCover.name} • {Math.round(frontCover.size / 1024 / 1024 * 100) / 100} MB
                  </p>
                )}
                <p className="mt-1 text-xs text-ink/45 font-mono">
                  JPG, PNG, or WebP • Max 10MB
                </p>
              </div>

              <div className="field">
                <label htmlFor="quote-back-cover">Back Cover Image <span className="text-error">*</span></label>
                <input
                  id="quote-back-cover"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={pickFile(setBackCover, 'cover')}
                  className="block w-full text-sm text-ink/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                />
                {backCover && (
                  <p className="mt-2 text-xs text-ink/50 font-mono">
                    {backCover.name} • {Math.round(backCover.size / 1024 / 1024 * 100) / 100} MB
                  </p>
                )}
                <p className="mt-1 text-xs text-ink/45 font-mono">
                  JPG, PNG, or WebP • Max 10MB
                </p>
              </div>
              <div className="field">
                <label htmlFor="quote-notes">Additional Notes (Optional)</label>
                <textarea
                  id="quote-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y"
                />
              </div>
              <div className="text-sm text-ink/50 font-mono mt-2">
                Pages: {pages} • Editing: {editingLevel?.label} • Formatting: {formattingLevel?.label} • Delivery: {timelineLevel?.label}
              </div>
              {error && (
                <p className="text-sm text-error bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</p>
              )}
              <button
                type="submit"
                disabled={state === 'uploading' || state === 'sending'}
                className="w-full rounded-md bg-ink text-white text-sm font-medium py-3.5 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === 'uploading' ? 'Uploading files…' : state === 'sending' ? 'Sending…' : 'Send Quote Request'}
              </button>
              {state === 'sent' && (
                <p className="text-sm text-center text-green-600 font-medium">Quote request sent ✓</p>
              )}
            </form>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
