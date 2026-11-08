// Free WhatsApp Click-to-Chat (wa.me) — no Cloud API, no paid service, no domain.
// Number comes from NEXT_PUBLIC_WHATSAPP_NUMBER (set it in Vercel BEFORE building).

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

// Rules: digits only, Pakistan country code 92, no leading 0, no +/spaces.
export function normalizeWhatsAppNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('0')) d = '92' + d.slice(1);
  else if (d.startsWith('3')) d = '92' + d;
  return d;
}

const money = (n) => Number(n || 0);

export function buildOrderWhatsAppMessage(order) {
  const o = order || {};
  const items = Array.isArray(o.items) ? o.items : [];
  const shortId = String(o.id || '').slice(0, 8).toUpperCase();
  const lines = [
    `Dear ${o.name || 'Customer'},`,
    '',
    "We've received your order!",
    '',
    `Order ID: ${shortId}`,
    '',
    'Customer Details:',
    `Name: ${o.name || ''}`,
    `Phone: ${o.phone || ''}`,
    `Email: ${o.email || ''}`,
    `Address: ${o.address || ''}`,
    '',
    'Products:',
    ...items.map((i) => `- ${i.title || i.slug} (x${money(i.qty)}) - ${money(i.price)} PKR`),
    '',
    `Shipping: ${money(o.shipping)} PKR`,
    `Total: ${money(o.total)} PKR`,
    '',
    'Please confirm your order so we can move forward with processing it!',
    '',
    'Warm regards,',
    'Literacy Gardeners',
  ];
  return lines.join('\n');
}

// Returns '' when no business number is configured (caller must NOT redirect).
export function buildWhatsAppUrl(message) {
  const num = normalizeWhatsAppNumber(WHATSAPP_NUMBER);
  if (!num) return '';
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
