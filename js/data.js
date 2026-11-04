/* Demo data + page configuration. All values are generated deterministically. */

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rint = (r, a, b) => Math.floor(r() * (b - a + 1)) + a;
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const daysAgo = (r, max) => { const d = new Date(); d.setDate(d.getDate() - rint(r, 0, max)); d.setHours(rint(r, 8, 23), rint(r, 0, 59)); return d.toISOString(); };
const daysAhead = (r, max) => { const d = new Date(); d.setDate(d.getDate() + rint(r, 3, max)); return d.toISOString(); };
const B = (ar, en) => ({ ar, en });

const POOL = {
  people: [B('أحمد العتيبي', 'Ahmed Alotaibi'), B('سارة القحطاني', 'Sara Alqahtani'), B('محمد الشهري', 'Mohammed Alshehri'), B('نورة الدوسري', 'Noura Aldossari'),
    B('خالد الحربي', 'Khalid Alharbi'), B('ريم المطيري', 'Reem Almutairi'), B('فهد الغامدي', 'Fahad Alghamdi'), B('لمى الزهراني', 'Lama Alzahrani'),
    B('عبدالله السبيعي', 'Abdullah Alsubaie'), B('هيا العنزي', 'Haya Alanazi'), B('تركي الشمري', 'Turki Alshammari'), B('جود البقمي', 'Joud Albuqami'),
    B('سلطان الحزام', 'Sultan Alhazzam'), B('دانة الرشيد', 'Dana Alrasheed')],
  products: [B('لاتيه مثلج', 'Iced Latte'), B('كرواسون زبدة', 'Butter Croissant'), B('كيكة الشوكولاتة', 'Chocolate Cake'), B('تشيز كيك سان سباستيان', 'San Sebastian Cheesecake'),
    B('قهوة سعودية', 'Saudi Coffee'), B('شاي كرك', 'Karak Tea'), B('سندويش حلومي', 'Halloumi Sandwich'), B('كوكيز', 'Cookies'),
    B('موهيتو', 'Mojito'), B('كابتشينو', 'Cappuccino'), B('عصير برتقال طازج', 'Fresh Orange Juice'), B('تشيز كيك توت', 'Berry Cheesecake'),
    B('سبانش لاتيه', 'Spanish Latte'), B('فلات وايت', 'Flat White'), B('ماتشا لاتيه', 'Matcha Latte'), B('كرواسون زعتر', "Za'atar Croissant")],
  prodCats: [B('مشروبات ساخنة', 'Hot Drinks'), B('مشروبات باردة', 'Cold Drinks'), B('مخبوزات', 'Bakery'), B('حلويات', 'Desserts'), B('سندويشات', 'Sandwiches'), B('عصائر', 'Juices')],
  materials: [B('حليب كامل الدسم', 'Full-fat Milk'), B('بن محمص', 'Roasted Coffee Beans'), B('سكر أبيض', 'White Sugar'), B('دقيق فاخر', 'Premium Flour'),
    B('زبدة', 'Butter'), B('شوكولاتة داكنة', 'Dark Chocolate'), B('كريمة خفق', 'Whipping Cream'), B('أكواب ورقية 12oz', 'Paper Cups 12oz'),
    B('أغطية أكواب', 'Cup Lids'), B('جبنة كريمي', 'Cream Cheese'), B('بيض', 'Eggs'), B('فانيلا', 'Vanilla Extract'), B('هيل', 'Cardamom'), B('جبنة حلومي', 'Halloumi Cheese')],
  matCats: [B('ألبان', 'Dairy'), B('بن ومشروبات', 'Coffee & Drinks'), B('مواد جافة', 'Dry Goods'), B('تغليف', 'Packaging'), B('مبردات', 'Chilled'), B('بهارات', 'Spices')],
  branches: [B('الرياض - العليا', 'Riyadh - Olaya'), B('جدة - التحلية', 'Jeddah - Tahlia'), B('الدمام - الكورنيش', 'Dammam - Corniche'), B('الخبر - العزيزية', 'Khobar - Aziziyah'), B('الرياض - الملقا', 'Riyadh - Malqa')],
  warehouses: [B('المستودع الرئيسي', 'Main Warehouse'), B('مستودع المطبخ المركزي', 'Central Kitchen Store')],
  cities: [B('الرياض', 'Riyadh'), B('جدة', 'Jeddah'), B('الدمام', 'Dammam'), B('الخبر', 'Khobar'), B('مكة', 'Makkah')],
  units: [B('كيلو', 'Kilogram'), B('لتر', 'Liter'), B('حبة', 'Piece'), B('كرتون', 'Carton'), B('علبة', 'Box'), B('جرام', 'Gram'), B('كيس', 'Bag')],
  unitSym: ['kg', 'L', 'pc', 'ctn', 'box', 'g', 'bag'],
  orderTypes: [B('محلي', 'Dine-in'), B('سفري', 'Takeaway'), B('توصيل', 'Delivery'), B('أونلاين', 'Online'), B('سيارة', 'Drive-thru')],
  payments: [B('مدى', 'Mada'), B('نقدي', 'Cash'), B('فيزا', 'Visa'), B('Apple Pay', 'Apple Pay'), B('STC Pay', 'STC Pay')],
  suppliers: [B('مؤسسة الندى للتوريد', 'Al-Nada Supply Est.'), B('شركة البن الذهبي', 'Golden Bean Co.'), B('مصنع الريف للألبان', 'Al-Reef Dairy'),
    B('مؤسسة الأفق للتغليف', 'Horizon Packaging'), B('شركة الحبة الأولى', 'First Grain Co.'), B('مؤسسة الواحة الغذائية', 'Oasis Foods')],
  roles: [B('مدير فرع', 'Branch Manager'), B('كاشير', 'Cashier'), B('باريستا', 'Barista'), B('محاسب', 'Accountant'), B('أمين مستودع', 'Storekeeper'), B('مشرف', 'Supervisor')],
  prodRoles: [B('خباز', 'Baker'), B('شيف حلويات', 'Pastry Chef'), B('مساعد مطبخ', 'Kitchen Assistant'), B('مسؤول تغليف', 'Packer'), B('رئيس الوردية', 'Shift Lead')],
  shifts: [B('صباحية', 'Morning'), B('مسائية', 'Evening'), B('ليلية', 'Night')],
  depts: [B('المطبخ', 'Kitchen'), B('البار', 'Bar'), B('المخبز', 'Bakery'), B('الصالة', 'Front of house')],
  locTypes: [B('ثلاجة', 'Fridge'), B('فريزر', 'Freezer'), B('رفوف جافة', 'Dry shelves'), B('غرفة تبريد', 'Cold room')],
  reasonsRet: [B('فائض عن الحاجة', 'Surplus stock'), B('خطأ في الطلب', 'Ordering error'), B('إغلاق وردية', 'Shift closing')],
  reasonsDmg: [B('منتهي الصلاحية', 'Expired'), B('تالف أثناء النقل', 'Damaged in transit'), B('انسكاب', 'Spillage'), B('سوء تخزين', 'Improper storage')],
  reasonsSup: [B('جودة غير مطابقة', 'Quality mismatch'), B('كمية زائدة', 'Over-delivery'), B('قرب الانتهاء', 'Near expiry')],
  zones: [B('حي العليا', 'Olaya'), B('حي الملقا', 'Malqa'), B('حي النرجس', 'Narjis'), B('حي الياسمين', 'Yasmin'), B('حي الروضة', 'Rawdah'), B('حي السليمانية', 'Sulaimaniyah'), B('حي الصحافة', 'Sahafa'), B('حي حطين', 'Hittin')],
  moveTypes: [B('تحويل', 'Transfer'), B('صرف', 'Issue'), B('استلام', 'Receiving'), B('تسوية', 'Adjustment')],
  discNames: [B('خصم الافتتاح', 'Grand Opening'), B('عرض الصباح', 'Morning Deal'), B('خصم الموظفين', 'Staff Discount'), B('اليوم الوطني', 'National Day'), B('عرض الويكند', 'Weekend Offer'), B('عملاء VIP', 'VIP Customers')]
};

const NAV = [
  { section: 'sec.main', items: ['reports', 'orders', 'employee-journal', 'online-orders', 'customers', 'products', 'product-info', 'product-categories', 'units', 'item-card', 'storage-locations', 'sticker-maker', 'production-tracking'] },
  { group: 'grp.inventory', icon: 'warehouse', items: ['stock-materials', 'material-categories', 'issue', 'production', 'production-staff', 'stocktake', 'receiving', 'transfers', 'cashier-requests', 'return-warehouse', 'damaged-returns'] },
  { group: 'grp.suppliers', icon: 'truck', items: ['suppliers', 'purchases', 'supplier-returns'] },
  { group: 'grp.admin', icon: 'shield', items: ['pending-movements', 'devices', 'users', 'tables', 'branches', 'delivery-fees', 'discounts', 'order-types', 'payment-methods'] }
];

const ROUTE_ICON = {
  reports: 'chart', orders: 'receipt', 'employee-journal': 'journal', 'online-orders': 'bag', customers: 'users', products: 'package',
  'product-info': 'info', 'product-categories': 'layers', units: 'ruler', 'item-card': 'idcard', 'storage-locations': 'pin', 'sticker-maker': 'tag',
  'production-tracking': 'activity', 'stock-materials': 'box', 'material-categories': 'folder', issue: 'out', production: 'factory',
  'production-staff': 'hardhat', stocktake: 'clipcheck', receiving: 'in', transfers: 'swap', 'cashier-requests': 'send', 'return-warehouse': 'undo',
  'damaged-returns': 'trash', suppliers: 'truck', purchases: 'cart', 'supplier-returns': 'ret', 'pending-movements': 'clock', devices: 'monitor',
  users: 'usercog', tables: 'utensils', branches: 'building', 'delivery-fees': 'bike', discounts: 'percent', 'order-types': 'list', 'payment-methods': 'card'
};

const NAV_BADGE = { 'online-orders': 5, 'pending-movements': 3 };

/* Status key -> tone */
const TONE = {
  completed: 'success', paid: 'success', active: 'success', present: 'success', approved: 'success', received: 'success', ok: 'success',
  pending: 'warning', partial: 'warning', late: 'warning', gold: 'warning', low: 'warning',
  processing: 'info', inTransit: 'info',
  cancelled: 'danger', unpaid: 'danger', absent: 'danger', rejected: 'danger', full: 'danger',
  draft: 'neutral', leave: 'neutral', regular: 'neutral', vip: 'accent'
};

const time = (r, h0, h1) => `${String(rint(r, h0, h1)).padStart(2, '0')}:${String(rint(r, 0, 59)).padStart(2, '0')}`;
const wst = (r, list) => { const x = r(); let acc = 0; for (const [k, w] of list) { acc += w; if (x <= acc) return k; } return list[0][0]; };

/* Generic page configs.
   cols: [key, type]  -> label key is 'c.'+key
   kpis: [labelKey, kind, compute(rows)] */
const sum = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
const cnt = (rows, k, v) => rows.filter(r => r[k] === v).length;

const CONFIG = {
  orders: {
    n: 48, cols: [['id', 'id'], ['customer', 'person'], ['type', 'text'], ['branch', 'text'], ['items', 'num'], ['total', 'money'], ['payment', 'text'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 10480 - i, customer: pick(r, POOL.people), type: pick(r, POOL.orderTypes), branch: pick(r, POOL.branches), items: rint(r, 1, 9), total: rint(r, 18, 640), payment: pick(r, POOL.payments), date: daysAgo(r, 6), status: wst(r, [['completed', .7], ['processing', .15], ['pending', .08], ['cancelled', .07]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'receipt'], ['kp.sales', 'money', rows => sum(rows, 'total'), 'wallet'], ['kp.avg', 'money', rows => sum(rows, 'total') / rows.length, 'chart'], ['kp.cancelled', 'num', rows => cnt(rows, 'status', 'cancelled'), 'x']]
  },
  'employee-journal': {
    n: 32, cols: [['employee', 'person'], ['role', 'text'], ['branch', 'text'], ['date', 'date'], ['checkIn', 'code'], ['checkOut', 'code'], ['hours', 'num'], ['sales', 'money'], ['status', 'status']],
    gen: r => ({ employee: pick(r, POOL.people), role: pick(r, POOL.roles), branch: pick(r, POOL.branches), date: daysAgo(r, 3), checkIn: time(r, 7, 9), checkOut: time(r, 16, 18), hours: rint(r, 6, 10), sales: rint(r, 0, 4800), status: wst(r, [['present', .75], ['late', .17], ['absent', .08]]) }),
    kpis: [['kp.present', 'num', rows => cnt(rows, 'status', 'present'), 'check'], ['kp.late', 'num', rows => cnt(rows, 'status', 'late'), 'clock'], ['kp.absent', 'num', rows => cnt(rows, 'status', 'absent'), 'x'], ['kp.hours', 'num', rows => sum(rows, 'hours'), 'activity']]
  },
  customers: {
    n: 40, cols: [['name', 'person'], ['phone', 'code'], ['city', 'text'], ['orders', 'num'], ['spent', 'money'], ['lastOrder', 'date'], ['tier', 'status']],
    gen: r => ({ name: pick(r, POOL.people), phone: '05' + rint(r, 10000000, 99999999), city: pick(r, POOL.cities), orders: rint(r, 1, 140), spent: rint(r, 40, 18000), lastOrder: daysAgo(r, 40), tier: wst(r, [['regular', .6], ['gold', .28], ['vip', .12]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'users'], ['kp.vip', 'num', rows => cnt(rows, 'tier', 'vip'), 'star'], ['kp.sales', 'money', rows => sum(rows, 'spent'), 'wallet'], ['kp.new', 'num', () => 12, 'plus']]
  },
  products: {
    n: 16, cols: [['code', 'code'], ['name', 'product'], ['category', 'text'], ['price', 'money'], ['cost', 'money'], ['stock', 'num'], ['active', 'toggle']],
    gen: (r, i) => { const p = rint(r, 9, 38); return { code: 'P-' + (1001 + i), name: POOL.products[i % 16], category: pick(r, POOL.prodCats), price: p, cost: +(p * (.25 + r() * .2)).toFixed(2), stock: rint(r, 0, 260), active: r() > .15 }; },
    kpis: [['kp.total', 'num', rows => rows.length, 'package'], ['kp.active', 'num', rows => rows.filter(x => x.active).length, 'check'], ['kp.categories', 'num', () => 6, 'layers'], ['kp.avg', 'money', rows => sum(rows, 'price') / rows.length, 'tag']]
  },
  'product-info': {
    n: 16, cols: [['name', 'product'], ['barcode', 'code'], ['unit', 'text'], ['calories', 'num'], ['prep', 'text'], ['tax', 'pct'], ['status', 'status']],
    gen: (r, i) => ({ name: POOL.products[i % 16], barcode: '628' + rint(r, 100000000, 999999999) + rint(r, 0, 9), unit: POOL.units[2], calories: rint(r, 5, 620), prep: B(rint(r, 2, 12) + ' دقائق', rint(r, 2, 12) + ' min'), tax: 15, status: wst(r, [['active', .85], ['draft', .15]]) })
  },
  'product-categories': {
    n: 6, cols: [['name', 'text'], ['code', 'code'], ['products', 'num'], ['sort', 'num'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.prodCats[i], code: 'CAT-0' + (i + 1), products: rint(r, 4, 24), sort: i + 1, active: true })
  },
  units: {
    n: 7, cols: [['name', 'text'], ['symbol', 'code'], ['base', 'text'], ['factor', 'num'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.units[i], symbol: POOL.unitSym[i], base: POOL.units[[0, 1, 2, 2, 2, 0, 2][i]], factor: [1, 1, 1, 24, 12, 0.001, 10][i], active: true })
  },
  'storage-locations': {
    n: 12, cols: [['name', 'text'], ['code', 'code'], ['branch', 'text'], ['type', 'text'], ['capacity', 'progress'], ['items', 'num'], ['status', 'status']],
    gen: (r, i) => { const c = rint(r, 18, 99); const t = pick(r, POOL.locTypes); return { name: B(t.ar + ' ' + (i + 1), t.en + ' ' + (i + 1)), code: 'LOC-' + String(i + 1).padStart(3, '0'), branch: pick(r, POOL.branches.concat(POOL.warehouses)), type: t, capacity: c, items: rint(r, 6, 80), status: c > 90 ? 'full' : 'ok' }; }
  },
  'stock-materials': {
    n: 28, cols: [['code', 'code'], ['material', 'text'], ['category', 'text'], ['unit', 'text'], ['qty', 'stock'], ['minQty', 'num'], ['cost', 'money'], ['location', 'text']],
    gen: (r, i) => { const m = rint(r, 10, 40); return { code: 'M-' + (2001 + i), material: POOL.materials[i % 14], category: pick(r, POOL.matCats), unit: pick(r, POOL.units), qty: rint(r, 2, 220), minQty: m, cost: +(r() * 90 + 2).toFixed(2), location: pick(r, POOL.warehouses) }; },
    kpis: [['kp.total', 'num', rows => rows.length, 'box'], ['kp.low', 'num', rows => rows.filter(x => x.qty < x.minQty).length, 'alert'], ['kp.value', 'money', rows => rows.reduce((a, x) => a + x.qty * x.cost, 0), 'wallet'], ['kp.categories', 'num', () => 6, 'folder']]
  },
  'material-categories': {
    n: 6, cols: [['name', 'text'], ['code', 'code'], ['materials', 'num'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.matCats[i], code: 'MC-0' + (i + 1), materials: rint(r, 3, 30), active: true })
  },
  issue: {
    n: 24, cols: [['id', 'id'], ['from', 'text'], ['dept', 'text'], ['items', 'num'], ['value', 'money'], ['by', 'person'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'IS-' + (5120 - i), from: pick(r, POOL.warehouses), dept: pick(r, POOL.depts), items: rint(r, 1, 18), value: rint(r, 60, 4200), by: pick(r, POOL.people), date: daysAgo(r, 14), status: wst(r, [['approved', .7], ['pending', .2], ['rejected', .1]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'out'], ['kp.value', 'money', rows => sum(rows, 'value'), 'wallet'], ['kp.pending', 'num', rows => cnt(rows, 'status', 'pending'), 'clock'], ['kp.today', 'num', () => 4, 'calendar']]
  },
  production: {
    n: 22, cols: [['batch', 'code'], ['product', 'product'], ['qty', 'num'], ['branch', 'text'], ['cost', 'money'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ batch: 'B-' + (8800 - i), product: pick(r, POOL.products), qty: rint(r, 12, 240), branch: pick(r, POOL.warehouses), cost: rint(r, 120, 3400), date: daysAgo(r, 10), status: wst(r, [['completed', .65], ['processing', .25], ['cancelled', .1]]) })
  },
  'production-staff': {
    n: 14, cols: [['employee', 'person'], ['role', 'text'], ['shift', 'text'], ['output', 'num'], ['efficiency', 'progress'], ['status', 'status']],
    gen: (r, i) => ({ employee: POOL.people[i % 14], role: pick(r, POOL.prodRoles), shift: pick(r, POOL.shifts), output: rint(r, 40, 420), efficiency: rint(r, 62, 99), status: wst(r, [['active', .85], ['leave', .15]]) })
  },
  stocktake: {
    n: 14, cols: [['id', 'id'], ['branch', 'text'], ['items', 'num'], ['variance', 'delta'], ['by', 'person'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'ST-' + (340 - i), branch: pick(r, POOL.branches.concat(POOL.warehouses)), items: rint(r, 40, 320), variance: rint(r, -900, 300), by: pick(r, POOL.people), date: daysAgo(r, 60), status: wst(r, [['approved', .6], ['processing', .25], ['draft', .15]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'clipcheck'], ['kp.variance', 'money', rows => sum(rows, 'variance'), 'activity'], ['kp.pending', 'num', rows => rows.filter(x => x.status !== 'approved').length, 'clock'], ['kp.month', 'num', () => 3, 'calendar']]
  },
  receiving: {
    n: 20, cols: [['id', 'id'], ['supplier', 'text'], ['branch', 'text'], ['items', 'num'], ['value', 'money'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'GRN-' + (7710 - i), supplier: pick(r, POOL.suppliers), branch: pick(r, POOL.warehouses), items: rint(r, 2, 30), value: rint(r, 300, 22000), date: daysAgo(r, 20), status: wst(r, [['received', .7], ['partial', .2], ['pending', .1]]) })
  },
  transfers: {
    n: 22, cols: [['id', 'id'], ['from', 'text'], ['to', 'text'], ['items', 'num'], ['value', 'money'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'TR-' + (6400 - i), from: pick(r, POOL.warehouses), to: pick(r, POOL.branches), items: rint(r, 2, 26), value: rint(r, 200, 9000), date: daysAgo(r, 12), status: wst(r, [['received', .6], ['inTransit', .25], ['pending', .15]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'swap'], ['kp.value', 'money', rows => sum(rows, 'value'), 'wallet'], ['kp.pending', 'num', rows => cnt(rows, 'status', 'inTransit'), 'truck'], ['kp.today', 'num', () => 5, 'calendar']]
  },
  'cashier-requests': {
    n: 16, cols: [['id', 'id'], ['cashier', 'person'], ['branch', 'text'], ['items', 'num'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'CR-' + (930 - i), cashier: pick(r, POOL.people), branch: pick(r, POOL.branches), items: rint(r, 1, 12), date: daysAgo(r, 5), status: wst(r, [['pending', .4], ['approved', .45], ['rejected', .15]]) })
  },
  'return-warehouse': {
    n: 14, cols: [['id', 'id'], ['branch', 'text'], ['items', 'num'], ['value', 'money'], ['reason', 'text'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'RW-' + (410 - i), branch: pick(r, POOL.branches), items: rint(r, 1, 10), value: rint(r, 40, 2400), reason: pick(r, POOL.reasonsRet), date: daysAgo(r, 20), status: wst(r, [['received', .6], ['pending', .4]]) })
  },
  'damaged-returns': {
    n: 18, cols: [['id', 'id'], ['material', 'text'], ['qty', 'num'], ['reason', 'text'], ['value', 'money'], ['branch', 'text'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'DM-' + (220 - i), material: pick(r, POOL.materials), qty: rint(r, 1, 30), reason: pick(r, POOL.reasonsDmg), value: rint(r, 12, 900), branch: pick(r, POOL.branches), date: daysAgo(r, 30), status: wst(r, [['approved', .6], ['pending', .3], ['rejected', .1]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'trash'], ['kp.value', 'money', rows => sum(rows, 'value'), 'wallet'], ['kp.pending', 'num', rows => cnt(rows, 'status', 'pending'), 'clock'], ['kp.month', 'num', () => 7, 'calendar']]
  },
  suppliers: {
    n: 6, cols: [['name', 'text'], ['contact', 'person'], ['phone', 'code'], ['city', 'text'], ['purchases', 'money'], ['balance', 'money'], ['status', 'status']],
    gen: (r, i) => ({ name: POOL.suppliers[i], contact: pick(r, POOL.people), phone: '05' + rint(r, 10000000, 99999999), city: pick(r, POOL.cities), purchases: rint(r, 20000, 480000), balance: rint(r, 0, 60000), status: wst(r, [['active', .85], ['leave', .15]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'truck'], ['kp.due', 'money', rows => sum(rows, 'balance'), 'wallet'], ['kp.value', 'money', rows => sum(rows, 'purchases'), 'cart'], ['kp.active', 'num', rows => cnt(rows, 'status', 'active'), 'check']]
  },
  purchases: {
    n: 24, cols: [['id', 'id'], ['supplier', 'text'], ['branch', 'text'], ['items', 'num'], ['total', 'money'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'PO-' + (3150 - i), supplier: pick(r, POOL.suppliers), branch: pick(r, POOL.warehouses), items: rint(r, 2, 40), total: rint(r, 500, 36000), date: daysAgo(r, 45), status: wst(r, [['paid', .55], ['partial', .25], ['unpaid', .2]]) }),
    kpis: [['kp.total', 'num', rows => rows.length, 'cart'], ['kp.value', 'money', rows => sum(rows, 'total'), 'wallet'], ['kp.due', 'num', rows => cnt(rows, 'status', 'unpaid'), 'alert'], ['kp.month', 'num', () => 9, 'calendar']]
  },
  'supplier-returns': {
    n: 10, cols: [['id', 'id'], ['supplier', 'text'], ['items', 'num'], ['value', 'money'], ['reason', 'text'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'SR-' + (150 - i), supplier: pick(r, POOL.suppliers), items: rint(r, 1, 8), value: rint(r, 80, 6000), reason: pick(r, POOL.reasonsSup), date: daysAgo(r, 40), status: wst(r, [['approved', .6], ['pending', .4]]) })
  },
  'pending-movements': {
    n: 9, cols: [['id', 'id'], ['type', 'text'], ['from', 'text'], ['to', 'text'], ['value', 'money'], ['by', 'person'], ['date', 'date'], ['status', 'status']],
    gen: (r, i) => ({ id: 'MV-' + (2090 - i), type: pick(r, POOL.moveTypes), from: pick(r, POOL.warehouses), to: pick(r, POOL.branches), value: rint(r, 100, 7000), by: pick(r, POOL.people), date: daysAgo(r, 3), status: 'pending' })
  },
  users: {
    n: 14, cols: [['name', 'person'], ['email', 'code'], ['role', 'text'], ['branch', 'text'], ['lastLogin', 'date'], ['active', 'toggle']],
    gen: (r, i) => { const p = POOL.people[i % 14]; return { name: p, email: p.en.toLowerCase().replace(/[^a-z]+/g, '.') + '@raseed.sa', role: pick(r, POOL.roles), branch: pick(r, POOL.branches), lastLogin: daysAgo(r, 7), active: r() > .1 }; }
  },
  branches: {
    n: 5, cols: [['name', 'text'], ['city', 'text'], ['manager', 'person'], ['phone', 'code'], ['tables', 'num'], ['sales', 'money'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.branches[i], city: POOL.cities[[0, 1, 2, 3, 0][i]], manager: pick(r, POOL.people), phone: '011' + rint(r, 1000000, 9999999), tables: rint(r, 12, 40), sales: rint(r, 80000, 420000), active: true })
  },
  'delivery-fees': {
    n: 8, cols: [['zone', 'text'], ['city', 'text'], ['fee', 'money'], ['minOrder', 'money'], ['eta', 'text'], ['active', 'toggle']],
    gen: (r, i) => { const m = rint(r, 20, 45); return { zone: POOL.zones[i], city: POOL.cities[0], fee: rint(r, 5, 25), minOrder: rint(r, 30, 80), eta: B(m + ' دقيقة', m + ' min'), active: r() > .1 }; }
  },
  discounts: {
    n: 6, cols: [['name', 'text'], ['code', 'code'], ['type', 'text'], ['usage', 'num'], ['ends', 'date'], ['active', 'toggle']],
    gen: (r, i) => { const pct = r() > .4; const v = pct ? rint(r, 5, 30) : rint(r, 5, 50); return { name: POOL.discNames[i], code: ['OPEN20', 'MORN10', 'STAFF', 'KSA95', 'WKND15', 'VIP25'][i], type: pct ? B('نسبة ' + v + '%', v + '% off') : B('مبلغ ' + v + ' ر.س', v + ' SAR off'), usage: rint(r, 10, 1800), ends: daysAhead(r, 60), active: r() > .2 }; }
  },
  'order-types': {
    n: 5, cols: [['name', 'text'], ['code', 'code'], ['orders', 'num'], ['share', 'progress'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.orderTypes[i], code: ['DINE', 'TAKE', 'DLV', 'ONL', 'DRV'][i], orders: [4200, 3100, 1800, 2400, 900][i], share: [34, 25, 15, 19, 7][i], active: true })
  },
  'payment-methods': {
    n: 5, cols: [['name', 'text'], ['code', 'code'], ['tx', 'num'], ['total', 'money'], ['fee', 'pct'], ['active', 'toggle']],
    gen: (r, i) => ({ name: POOL.payments[i], code: ['MADA', 'CASH', 'VISA', 'APAY', 'STC'][i], tx: rint(r, 400, 6000), total: rint(r, 20000, 380000), fee: [0.8, 0, 2.2, 1.5, 1][i], active: true })
  }
};

/* Lazily generated, mutable per-route rows */
const DB = {};
function getRows(route) {
  if (!DB[route]) {
    const cfg = CONFIG[route];
    let seed = 0; for (const ch of route) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const r = rng(seed);
    DB[route] = Array.from({ length: cfg.n }, (_, i) => ({ _k: route + i, ...cfg.gen(r, i) }));
  }
  return DB[route];
}
