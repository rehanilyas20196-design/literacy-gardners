const PALETTES = {
  c1: { grad: ['#ff4500', '#cc3800'], text: '#ffffff', sub: '#ffffffcc' },
  c2: { grad: ['#000000', '#1a1a1a'], text: '#ffffff', sub: '#ffffffcc' },
  c3: { grad: ['#c5d3e8', '#a8b9d4'], text: '#000000', sub: '#000000aa' },
  c4: { grad: ['#ffffff', '#f7f7f4'], text: '#000000', sub: '#000000aa', border: true },
  c5: { grad: ['#f7f7f4', '#e8e8e4'], text: '#000000', sub: '#000000aa', border: true },
  c6: { grad: ['#000000', '#2b2b2b'], text: '#ff4500', sub: '#ff4500cc' },
  c7: { grad: ['#ff4500', '#ff6a33'], text: '#000000', sub: '#000000aa' },
  c8: { grad: ['#c5d3e8', '#d7e2f0'], text: '#000000', sub: '#000000aa', border: true }
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function makeCoverCanvas(book, size = 640) {
  const pal = PALETTES[book.cover_class] || PALETTES.c1;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, pal.grad[0]);
  g.addColorStop(1, pal.grad[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  if (pal.border) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }

  ctx.globalAlpha = 0.12;
  ctx.font = `${size * 0.32}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.text;
  ctx.fillText(book.ornament || '❀', size / 2, size / 2 + size * 0.02);
  ctx.globalAlpha = 1;

  const spine = ctx.createLinearGradient(0, 0, size * 0.07, 0);
  spine.addColorStop(0, 'rgba(0,0,0,0.18)');
  spine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spine;
  ctx.fillRect(0, 0, size * 0.07, size);

  ctx.textAlign = 'center';
  ctx.fillStyle = pal.sub;
  ctx.font = `600 ${size * 0.026}px Inter, Helvetica, sans-serif`;
  ctx.save();
  ctx.letterSpacing = `${size * 0.008}px`;
  ctx.fillText('LITERACY GARDENERS', size / 2, size * 0.12);
  ctx.restore();

  ctx.fillStyle = pal.text;
  ctx.font = `700 ${size * 0.072}px Georgia, 'Times New Roman', serif`;
  const lines = wrapText(ctx, book.title, size * 0.78);
  const lineH = size * 0.085;
  const startY = size * 0.52 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, size / 2, startY + i * lineH));

  ctx.fillStyle = pal.sub;
  ctx.font = `500 ${size * 0.032}px Inter, Helvetica, sans-serif`;
  ctx.fillText(book.author_name || '', size / 2, size * 0.82);

  ctx.strokeStyle = pal.sub;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.35, size * 0.87);
  ctx.lineTo(size * 0.65, size * 0.87);
  ctx.stroke();
  ctx.globalAlpha = 1;

  return canvas;
}

export function coverDataURL(book) {
  if (typeof document === 'undefined') return '';
  return makeCoverCanvas(book).toDataURL('image/jpeg', 0.85);
}

export function averageColor(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 64) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  return [r / n / 255, g / n / 255, b / n / 255];
}

export function formatPKR(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return `₨ ${num.toLocaleString('en-PK')}`;
}
