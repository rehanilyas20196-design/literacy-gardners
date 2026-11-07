const { getDb } = require('../connection');

async function createOrder(order) {
  const db = getDb();
  const payload = {
    user_id: order.user_id ?? null,
    name: order.name,
    email: order.email,
    phone: order.phone ?? null,
    address: order.address,
    notes: order.notes ?? null,
    items: order.items ?? [],
    subtotal: order.subtotal ?? 0,
    shipping: order.shipping ?? 0,
    total: order.total ?? 0,
    payment_method: order.payment_method === 'bank_transfer' ? 'bank_transfer' : 'cod',
    status: 'pending',
  };
  const { data, error } = await db.from('orders').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function listOrders(status = null) {
  const db = getDb();
  let query = db.from('orders').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function listOrdersForUser(userId) {
  const db = getDb();
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getOrderById(id) {
  const db = getDb();
  const { data, error } = await db.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status) {
  const db = getDb();
  const { data, error } = await db
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  createOrder,
  listOrders,
  listOrdersForUser,
  getOrderById,
  updateOrderStatus,
};
