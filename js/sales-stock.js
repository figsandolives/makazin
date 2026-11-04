/* مبيعات الكاشير على المخزون — the cashier only saves the invoice; the stock it sold comes off here.
   Every invoice the cashier marks salesStock (saved from meta/salesStockFrom on) takes its products from
   its branch: what a branch holds = products/{id}/stockByBranch − its marked, non-cancelled sales.
   Nothing is written for a sale, so editing or cancelling an invoice changes the stock at once.
   LIVE serves those invoices as the 'salesSince' collection, loaded with every page that reads products.
   Invoices saved before the change (stockDeducted, or not marked) were already handled and are not read. */

const isSalesStock = o => !!o && o.salesStock === true && !o.stockDeducted && !(o.status === 'cancelled' || o.isCancelled === true) && !!o.stockBranchId;
const saleLines = o => items$(o.items).filter(it => it.productId && it.productId !== 'breakfast-trolley-deposit' && !it.depositForLineId);

// {productId: {branchId: qty}} of the marked sales, rebuilt when the invoices change
let soldIdx = { src: null, map: {} };
function soldMap() {
  const src = LIVE.cache.salesSince;
  if (soldIdx.src !== src) {
    const map = {};
    Object.values(src || {}).forEach(o => {
      if (!isSalesStock(o)) return;
      saleLines(o).forEach(it => {
        const by = (map[it.productId] ||= {});
        by[o.stockBranchId] = (by[o.stockBranchId] || 0) + (Number(it.quantity ?? it.qty) || 0);
      });
    });
    soldIdx = { src, map };
  }
  return soldIdx.map;
}
const soldQty = (pid, branchId) => Number((soldMap()[pid] || {})[branchId] || 0);

// The id of a product object from the cache (stock is read from the object itself)
let pidIdx = { src: null, map: new WeakMap() };
function productIdOf(item) {
  const src = LIVE.cache.products;
  if (pidIdx.src !== src) {
    const map = new WeakMap();
    Object.entries(src || {}).forEach(([id, p]) => { if (p && typeof p === 'object') map.set(p, id); });
    pidIdx = { src, map };
  }
  return pidIdx.map.get(item) || null;
}
// What the cashier's sales took from this product at a branch (0 for materials)
const soldOf = (item, branchId) => { const pid = item && productIdOf(item); return pid ? soldQty(pid, branchId) : 0; };
