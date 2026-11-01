'use client';

import { useState } from 'react';
import Book3D from '@/components/Book3D';

const TEMPLATES = [
  {
    id: 'hardcover',
    name: 'Template 1: Hardcover',
    desc: 'Thick covers, realistic pages and rounded spine.',
    book: { title: 'The Imposter’s Mirror', author_name: 'Zoya Rahman', cover_class: 'c1', ornament: '◈' }
  },
  {
    id: 'paperback',
    name: 'Template 2: Paperback',
    desc: 'Flexible-looking thin covers and slimmer pages.',
    book: { title: 'Whispers of the Vale', author_name: 'Ayesha Khan', cover_class: 'c3', ornament: '❀' }
  },
  {
    id: 'spiral',
    name: 'Template 3: Spiral-bound',
    desc: 'Visible metal rings and separate front and back covers.',
    book: { title: 'Verses in Bloom', author_name: 'Hamza Ali', cover_class: 'c7', ornament: '✿' }
  }
];

function TemplateCard({ tpl }) {
  const [frontImage, setFrontImage] = useState('/images/front.jpg');
  const [backImage, setBackImage] = useState('/images/back.jpg');
  const [spineImage, setSpineImage] = useState('/images/spine2.jpg');

  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden">
      <div className="bg-muted">
        <Book3D
          template={tpl.id}
          book={tpl.book}
          frontImage={frontImage || undefined}
          backImage={backImage || undefined}
          spineImage={spineImage || undefined}
          height={420}
        />
      </div>
      <div className="p-5 border-t border-border">
        <h2 className="font-display text-2xl font-bold">{tpl.name}</h2>
        <p className="mt-1 text-sm text-ink/60">{tpl.desc}</p>
        <div className="mt-4 space-y-2">
          <label className="block font-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
            Front cover image URL
            <input
              type="text"
              value={frontImage}
              onChange={(e) => setFrontImage(e.target.value)}
              placeholder="/images/front.jpg"
              className="mt-1 block w-full rounded-full border border-border bg-surface px-4 py-2 text-sm normal-case tracking-normal font-sans text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="block font-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
            Back cover image URL
            <input
              type="text"
              value={backImage}
              onChange={(e) => setBackImage(e.target.value)}
              placeholder="/images/back.jpg"
              className="mt-1 block w-full rounded-full border border-border bg-surface px-4 py-2 text-sm normal-case tracking-normal font-sans text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="block font-mono text-[10px] tracking-[0.08em] uppercase text-ink/50">
            Spine image URL
            <input
              type="text"
              value={spineImage}
              onChange={(e) => setSpineImage(e.target.value)}
              placeholder="/images/spine.jpg"
              className="mt-1 block w-full rounded-full border border-border bg-surface px-4 py-2 text-sm normal-case tracking-normal font-sans text-ink outline-none focus:border-ink"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function Book3DPreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">Components</p>
      <h1 className="font-display text-4xl md:text-[45px] font-bold tracking-tight">Book 3D Models</h1>
      <p className="mt-3 text-ink/60 max-w-lg">
        Drag to rotate. Paste image URLs below each model to preview real cover, back and spine art.
      </p>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.id} tpl={tpl} />
        ))}
      </div>
    </div>
  );
}
