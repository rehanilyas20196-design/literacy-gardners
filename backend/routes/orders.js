const { Router } = require('express');
const db = require('../database');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { validateOrder, validateOrderId } = require('../middleware/validate');

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function shippingFee() {
  const raw = Number(process.env.ORDER_SHIPPING_FEE);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

// Public (optional login): create an order — cash on delivery only.
// Prices are ALWAYS recomputed server-side from the database; client totals are ignored.
router.post(
  '/',
  optionalAuthMiddleware,
  validateOrder,
  wrap(async (req, res) => {
    const itemsIn = Array.isArray(req.body.items) ? req.body.items : [];
    if (!itemsIn.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const items = [];
    let subtotal = 0;
    for (const entry of itemsIn) {
      const qty = Math.max(1, Math.min(100, Number(entry.qty) || 0));
      if (!entry.slug) {
        return res.status(400).json({ error: 'Every cart item needs a slug' });
      }
      const book = await db.getBookBySlug(String(entry.slug));
      if (!book) {
        return res.status(400).json({ error: `Book not found: ${entry.slug}` });
      }
      const unit = Number(book.sale_price != null ? book.sale_price : book.price) || 0;
      subtotal += unit * qty;
      items.push({
        slug: book.slug,
        title: book.title,
        price: unit,
        qty,
        image: book.image ?? null,
      });
    }

    const shipping = shippingFee();
    const order = await db.createOrder({
      user_id: req.user ? req.user.id : null,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping,
      total: Math.round((subtotal + shipping) * 100) / 100,
      payment_method: 'cod',
    });

    res.status(201).json({ ok: true, order });
  })
);

// Protected: the logged-in user's orders
router.get(
  '/mine',
  optionalAuthMiddleware,
  wrap(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authorization token required' });
    const orders = await db.listOrdersForUser(req.user.id);
    res.json(orders);
  })
);

// Protected: one order (owner or admin)
router.get(
  '/:id',
  optionalAuthMiddleware,
  validateOrderId,
  wrap(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authorization token required' });
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    res.json(order);
  })
);

module.exports = router;
