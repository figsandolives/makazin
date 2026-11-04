/* In-memory stand-in for the server, used only with ?mock in the URL.
   Same shapes as the real collections; test login code: 1234. */
window.MOCK_DB = (() => {
  const DAY = 86400000, now = Date.now();
  let token = sessionStorage.getItem('mockToken') || '';
  const data = {
    users: { u1: { name: 'مستخدم تجريبي', role: 'manager', code: '1234' }, u2: { name: 'أمين المستودع', role: 'storekeeper', code: '5678' }, manager: { name: 'غير معرف', role: 'manager', code: '123456', active: true }, u3: { name: 'سارة كاشير', role: 'cashier', code: '4321', active: true } },
    branches: {
      main: { nameAr: 'الفرع الرئيسي', nameEn: 'Main Branch', isMain: true },
      yarmouk: { nameAr: 'اليرموك', nameEn: 'Yarmouk' },
      main_warehouse: { nameAr: 'المخزن الرئيسي', nameEn: 'Main Warehouse' }
    },
    units: { pc: { nameAr: 'حبة', nameEn: 'Piece' }, kg: { nameAr: 'كيلو', nameEn: 'Kg' }, ctn: { nameAr: 'كرتون', nameEn: 'Carton' }, bag: { nameAr: 'كيس', nameEn: 'Bag' } },
    suppliers: {
      s1: { nameAr: 'شركة الألبان المتحدة', nameEn: 'United Dairy', phone: '22445566', createdAt: now - 90 * DAY },
      s2: { nameAr: 'مطاحن الكويت', nameEn: 'Kuwait Flour Mills', phone: '24830000', createdAt: now - 80 * DAY, materialIds: { mat7: true } },
      s3: { nameAr: 'مؤسسة <b>التغليف</b>', nameEn: 'Packaging Co.', phone: '', createdAt: now - 40 * DAY },
      s4: { nameAr: 'مورد بدون أصناف', nameEn: 'Empty Supplier', phone: '99887766', createdAt: now - 5 * DAY }
    },
    stockMaterials: {
      mat1: { nameAr: 'حليب كامل الدسم', nameEn: 'Full-fat Milk', ingredients: 'حليب بقري طازج مبستر', origin: 'السعودية', categoryId: 'mc1', storageLocationId: 'sl1', countryOriginId: 'sa', mainBranchId: 'main_warehouse', reorderPoint: 12, minStock: 5, maxStock: 60, code: 'M001', barcode: '6281001001', unitId: 'ctn', cost: 4.1, supplierIds: ['s1'], stockByBranch: { main_warehouse: 14, main: 3 } },
      mat2: { nameAr: 'زبدة', nameEn: 'Butter', categoryId: 'mc1', mainBranchId: 'main_warehouse', reorderPoint: 6, code: 'M002', unitId: 'kg', cost: 2.75, supplierId: 's1', supplierIds: ['s1'], stockByBranch: { main_warehouse: 6 } },
      mat3: { nameAr: 'جبنة كريمي', nameEn: 'Cream Cheese', code: 'M003', unitId: 'kg', cost: 3.1, supplierIds: ['s1'], stockByBranch: { main_warehouse: 2 } },
      mat4: { nameAr: 'كريمة خفق', nameEn: 'Whipping Cream', code: 'M004', unitId: 'pc', cost: 0.9, supplierIds: ['s1'], stockByBranch: {} },
      mat5: { nameAr: 'دقيق فاخر', nameEn: 'Premium Flour', categoryId: 'mc2', unitDefinitionQty: '25', unitDefinitionUnitId: 'kg', mainBranchId: 'main_warehouse', reorderPoint: 20, code: 'M005', barcode: '6281005005', unitId: 'bag', cost: 6.25, supplierIds: ['s2'], stockByBranch: { yarmouk: 11, main_warehouse: 40 } },
      mat6: { nameAr: 'أكواب ورقية', nameEn: 'Paper Cups', categoryId: 'mc3', mainBranchId: 'main', code: 'M006', unitId: 'ctn', cost: 11, supplierIds: ['s3'], stockByBranch: { main: 5 } },
      mat7: { nameAr: 'سكر أبيض', nameEn: 'White Sugar', code: 'M007', unitId: 'bag', cost: 3.4, stockByBranch: { main_warehouse: 9 } },
      mat8: { nameAr: 'خميرة', nameEn: 'Yeast', code: 'M008', unitId: 'kg', cost: 1.2, stockByBranch: {} }
    },
    products: {
      prd1: { nameAr: 'كرواسون زبدة', nameEn: 'Butter Croissant', code: 'FG-1001', barcode: '628100000001', unitId: 'pc', price: 0.45, cost: 0.18, supplierIds: ['s2'], categoryId: 'pc2', storageLocationId: 'sl2', locStock: { sl2: 22, sl1: 8 }, countryOriginId: 'kw', mainBranchId: 'main', openingQty: 30, minStock: 10, reorderPoint: 25, maxStock: 120, stockByBranch: { main: 30, yarmouk: 8 }, createdAt: now - 20 * DAY },
      prd2: { nameAr: 'كعك بالسمسم', nameEn: 'Sesame Ka\'ak', code: 'FG-1002', barcode: '628100000002', unitId: 'pc', price: 0.25, cost: 0.08, mainBranchId: 'main', openingQty: 0, reorderPoint: 5, stockByBranch: {}, createdAt: now - 10 * DAY, incompleteInfo: true },
      prd3: { nameAr: 'كيكة الشوكولاتة', nameEn: 'Chocolate Cake', code: 'FG-1003', barcode: '628100000003', unitId: 'ctn', unitDefinitionQty: '8', unitDefinitionUnitId: 'pc', price: 6.5, cost: 2.4, categoryId: 'pc4', countryOriginId: 'fr', mainBranchId: 'main', openingQty: 12, minStock: 2, reorderPoint: 4, maxStock: 20, stockByBranch: { main: 12 }, fixedExpiryEnabled: true, fixedProductionDate: '2026-11-01', fixedExpiryDate: '2026-11-10', createdAt: now - 2 * DAY }
    },
    productCategories: {
      pc1: { nameAr: 'المخبوزات', nameEn: 'Bakery', parentId: null },
      pc2: { nameAr: 'معجنات', nameEn: 'Pastries', parentId: 'pc1' },
      pc3: { nameAr: 'خبز', nameEn: 'Bread', parentId: 'pc1' },
      pc4: { nameAr: 'الحلويات', nameEn: 'Desserts', parentId: null }
    },
    materialCategories: {
      mc1: { nameAr: 'ألبان', nameEn: 'Dairy', parentId: null },
      mc2: { nameAr: 'مواد جافة', nameEn: 'Dry goods', parentId: null },
      mc3: { nameAr: 'تغليف', nameEn: 'Packaging', parentId: null }
    },
    productInfos: { pi1: { productId: 'prd1', productName: 'كرواسون زبدة', ingredients: 'دقيق القمح، زبدة طبيعية، حليب، سكر، خميرة، ملح', origin: 'الكويت', barcode: '628100000001' } },
    storageLocations: { sl1: { nameAr: 'ثلاجة 1', nameEn: 'Fridge 1' }, sl2: { nameAr: 'رف A', nameEn: 'Shelf A' }, sl3: { nameAr: 'مخزن جاف', nameEn: 'Dry Store' } },
    countryOrigins: { kw: { nameAr: 'الكويت', nameEn: 'Kuwait' }, sa: { nameAr: 'السعودية', nameEn: 'Saudi Arabia' }, fr: { nameAr: 'فرنسا', nameEn: 'France' } },
    dailySessions: {
      ds1: { id: 'ds1', branch: 'الفرع الرئيسي', cashierName: 'كاشير حولي', cashierCode: '1111', openedAt: now - 4 * DAY, closedAt: now - 1 * 3600000, openingAmount: 50, status: 'closed',
        payments: [{ name: 'شراء ثلج', amount: 2.5 }], totals: { cash: 0, online: 0, knet: 0 }, ordersCount: 1, firstInvoice: '1203', lastInvoice: '1203' },
      ds2: { id: 'ds2', branch: 'اليرموك', cashierName: 'كاشير اليرموك', cashierCode: '2222', openedAt: now - 2 * 3600000, openingAmount: 30, status: 'open' }
    },
    discounts: {
      managerDiscount: { type: 'manager', label: 'manager_discount', active: true, locked: true, createdAt: now - 200 * DAY },
      dc1: { type: 'code', code: 'EID10', audience: 'vip', startDate: '2026-10-01', endDate: '2026-12-31', valueType: 'percent', value: 10, active: true, createdAt: now - 20 * DAY },
      dc2: { type: 'code', code: 'OLD5', audience: 'all', startDate: '2026-01-01', endDate: '2026-02-01', valueType: 'amount', value: 5, active: true, createdAt: now - 90 * DAY }
    },
    discountUsage: { dc1: { u1: { orderNumber: '1202' } } },
    deliveryPrices: {
      mainYarmouk: { 'حولي': { area: 'حولي', price: 1.5, groupKey: 'mainYarmouk', groupLabel: 'الفرع الرئيسي واليرموك', branch: 'الفرع الرئيسي', updatedAt: now - 3 * DAY },
        'غرب مشرف': { area: 'غرب مشرف', price: 2, groupKey: 'mainYarmouk', groupLabel: 'الفرع الرئيسي واليرموك', branch: 'اليرموك', updatedAt: now - DAY } },
      abuHasaniya: { 'المنقف': { area: 'المنقف', price: 1, groupKey: 'abuHasaniya', groupLabel: 'فرع أبو الحصانية', updatedAt: now - DAY } }
    },
    deliveryZones: { z1: { nameAr: 'حولي', nameEn: 'Hawalli' }, z2: { nameAr: 'السالمية', nameEn: 'Salmiya' }, z3: { nameAr: 'الجابرية', nameEn: 'Jabriya' }, z4: { nameAr: 'منطقة اليرموك', nameEn: 'Yarmouk' } },
    cashiers: { k1: { name: 'كاشير حولي', code: 'C1' }, k2: { name: 'كاشير اليرموك', code: 'C2' } },
    tables: { tb1: { tableNumber: '1', branchId: 'main', location: 'الصالة', active: true }, tb2: { tableNumber: '2', branchId: 'main', location: 'الصالة', active: true }, tb3: { tableNumber: '5', branchId: 'main', location: 'الجلسة الخارجية', active: true }, tb4: { tableNumber: '1', branchId: 'yarmouk', active: true } },
    devices: {
      'dev-hw7k2m9p-a1b2': { label: 'كاشير حولي 1', page: 'cashier', deviceId: 'dev-hw7k2m9p-a1b2', branchId: 'main', branchNameAr: 'الفرع الرئيسي', branchNameEn: 'Main branch', lastSeen: now - 60e3 },
      'dev-yr3q8z1c-c3d4': { label: 'كاشير اليرموك', page: 'cashier', deviceId: 'dev-yr3q8z1c-c3d4', branchId: 'yarmouk', branchNameAr: 'اليرموك', branchNameEn: 'Yarmouk', lastSeen: now - 3 * DAY },
      'dev-ad9x4n2w-e5f6': { label: 'ADM-e5f6', page: 'accounting', deviceId: 'dev-ad9x4n2w-e5f6', lastSeen: now - 120e3 },
      'dev-old00000-0000': { label: 'جهاز قديم', page: 'cashier', deviceId: 'dev-old00000-0000', lastSeen: now - 40 * DAY }
    },
    status: { 'dev-hw7k2m9p-a1b2': { online: true, page: 'cashier' }, 'dev-yr3q8z1c-c3d4': { online: false, page: 'cashier' }, 'dev-ad9x4n2w-e5f6': { online: true, page: 'accounting' } },
    registeredDevices: { 'dev-hw7k2m9p-a1b2': { id: 'dev-hw7k2m9p-a1b2', label: 'كاشير حولي 1', branchId: 'main', branch: 'الفرع الرئيسي' }, 'dev-yr3q8z1c-c3d4': { id: 'dev-yr3q8z1c-c3d4', label: 'كاشير اليرموك', branchId: 'yarmouk', branch: 'اليرموك' } },
    orderTypes: { ot1: { nameAr: 'توصيل', nameEn: 'Delivery' }, ot2: { nameAr: 'استلام', nameEn: 'Pickup' } },
    paymentMethods: { pm1: { nameAr: 'كاش', nameEn: 'Cash' }, pm2: { nameAr: 'كي-نت', nameEn: 'KNET' } },
    customers: {
      cu1: { nameAr: 'أحمد الكندري', nameEn: 'أحمد الكندري', phone: '99001122', addresses: [{ id: 'addr-1', zoneId: 'z1', details: 'قطعة 3 شارع 5 منزل 12' }, { id: 'addr-2', zoneId: 'z2', details: 'برج الريم' }], zoneId: 'z1', address: 'قطعة 3 شارع 5 منزل 12', createdAt: now - 60 * DAY },
      cu2: { nameAr: 'نورة العتيبي', nameEn: 'نورة العتيبي', phone: '66554433', addresses: [{ id: 'addr-3', zoneId: 'z3', details: 'قطعة 1' }], zoneId: 'z3', address: 'قطعة 1', createdAt: now - 30 * DAY },
      cu3: { nameAr: 'خالد <i>المطيري</i>', nameEn: 'Khaled', phone: '55112233', addresses: [], isBlocked: true, blockReason: 'طلبات وهمية متكررة', createdAt: now - 20 * DAY },
      cu4: { nameAr: 'سارة', nameEn: 'سارة', phone: '90909090', createdAt: now - 3 * DAY }
    },
    orders: {
      o1: { orderNumber: 1201, invoiceNumber: '1201', dailySessionId: 'ds1', orderType: 'delivery', courierName: 'مندوب ١', tableNumber: '١', status: 'paid', createdAt: now - 2 * 3600000, branchId: 'main', cashierId: 'k1', cashierName: 'كاشير حولي', customerId: 'cu1', customerName: 'أحمد الكندري', customerPhone: '99001122', deliveryZoneId: 'z1', deliveryAddress: 'قطعة 3 شارع 5', orderTypeId: 'ot1', paymentMethodId: 'pm2',
        items: [{ productId: 'prd1', productName: 'كرواسون زبدة', qty: 14, price: 0.45, unit: 'حبة', notes: 'بدون سكر' }, { productId: 'prd3', productName: 'كيكة الشوكولاتة', qty: 2, price: 6.5, unit: 'كرتون' }], subtotal: 19.3, netTotal: 19.3, deliveryFee: 1, discountType: 'fixed', discountValue: 2, discountAmount: 2, discount: 2, total: 18.3,
        stockDeducted: true, stockMovements: { prd1: { branchId: 'main', quantity: 14 }, prd3: { branchId: 'main', quantity: 2 } } },
      o2: { orderNumber: 1202, status: 'paid', createdAt: now - 1 * DAY, branchId: 'yarmouk', cashierId: 'k2', cashierName: 'كاشير اليرموك', customerId: 'cu1', customerName: 'أحمد الكندري', customerPhone: '99001122', deliveryZoneId: 'z2', orderTypeId: 'ot1', paymentMethodId: 'pm1',
        items: [{ productId: 'prd2', productName: 'كعك بالسمسم', qty: 30, price: 0.25 }, { productId: 'prd1', productName: 'كرواسون زبدة', qty: 4, price: 0.45 }], subtotal: 9.3, netTotal: 9.3, deliveryFee: 0.75, total: 10.05 },
      o3: { orderNumber: 1199, invoiceNumber: '1199', dailySessionId: 'ds1', tableNumber: 5, status: 'cancelled', isCancelled: true, cancelledAt: now - 2 * DAY, cancelledByName: 'مستخدم تجريبي', createdAt: now - 3 * DAY, branchId: 'main', cashierId: 'k1', customerId: 'cu2', customerName: 'نورة العتيبي', customerPhone: '66554433', deliveryZoneId: 'z3', orderTypeId: 'ot1', paymentMethodId: 'pm1',
        items: [{ productId: 'prd3', productName: 'كيكة الشوكولاتة', qty: 500, price: 6.5 }], subtotal: 3250, deliveryFee: 1, total: 3251 },
      o4: { orderNumber: 1203, invoiceNumber: '1203', dailySessionId: 'ds1', paymentMethod: 'payment_link', status: 'paid', createdAt: now - 3 * 3600000, accountingDate: new Date(now + 2 * DAY).toISOString().slice(0, 10), isInvoiceDeferred: true, branchId: 'main', cashierId: 'k1', customerId: 'cu2', customerName: 'نورة العتيبي', customerPhone: '66554433', orderTypeId: 'ot2', paymentMethodId: 'pm2',
        items: [{ productId: 'prd3', productName: 'كيكة الشوكولاتة', qty: 1, price: 6.5 }], subtotal: 6.5, netTotal: 6.5, deliveryFee: 0, total: 6.5 },
      o5: { orderNumber: 1190, status: 'paid', createdAt: now - 4 * DAY, branchId: 'main', cashierId: 'k1', customerId: 'cu1', customerName: 'أحمد الكندري', customerPhone: '99001122', deliveryZoneId: 'z1', orderTypeId: 'ot1', paymentMethod: 'cash',
        items: [{ productId: 'prd1', productName: 'كرواسون زبدة', qty: 20, price: 0.45 }], subtotal: 9, netTotal: 9, deliveryFee: 1, total: 10 },
      o6: { orderNumber: 1204, status: 'paid', createdAt: now - 1 * 3600000, tableNumber: '05', tableOpenedAt: now - 2 * 3600000, tableClosedAt: now - 1 * 3600000, branchId: 'main', cashierId: 'k1', orderType: 'takeaway', paymentMethod: 'knet', items: [{ productId: 'prd2', qty: 4, price: 0.25 }], total: 1 }
    },
    production: {
      b1: { itemType: 'product', itemId: 'prd1', productionNumber: 88, productionDate: new Date(now - DAY).toISOString().slice(0, 10), expiryDate: new Date(now + 3 * DAY).toISOString().slice(0, 10) },
      b2: { itemType: 'product', itemId: 'prd1', productionNumber: 91, productionDate: new Date(now).toISOString().slice(0, 10), expiryDate: new Date(now + 4 * DAY).toISOString().slice(0, 10) }
    },
    meta: { purchaseCounter: 42, purchaseReceiptCounter: 17, supplierReturnCounter: 6 },
    supplierReturns: {
      sr1: { returnNumber: 5, createdAt: now - 1 * DAY, storekeeperId: 'u2', storekeeperName: 'أمين المستودع', supplierId: 's1', supplierName: 'شركة الألبان المتحدة', branchId: 'main', reason: 'expired', note: 'انتهت صلاحيتها قبل الاستخدام',
        items: [{ itemType: 'material', itemId: 'mat1', name: 'حليب كامل الدسم', unitId: 'ctn', unitName: 'كرتون', qty: 2, unitPrice: 4.1 }] },
      sr0: { returnNumber: 4, createdAt: now - 12 * DAY, storekeeperName: 'أمين المستودع', supplierId: 's3', supplierName: 'مؤسسة <b>التغليف</b>',
        items: [{ itemType: 'material', itemId: 'mat6', name: 'أكواب ورقية', unitId: 'ctn', qty: 1 }] }
    },
    purchases: {
      p1: { purchaseNumber: 41, createdAt: now - 2 * 3600e3, storekeeperName: 'أمين المستودع', supplierId: 's1', supplierName: 'شركة الألبان المتحدة', branchId: 'main_warehouse', status: 'pending', pendingMoveId: 'm1',
        items: [{ itemType: 'material', itemId: 'mat1', name: 'حليب كامل الدسم', unitId: 'ctn', qty: 12, unitPrice: 4.25 }, { itemType: 'material', itemId: 'mat2', name: 'زبدة', unitId: 'kg', qty: 8, unitPrice: 2.9 }, { itemType: 'material', itemId: 'mat3', name: 'جبنة كريمي', unitId: 'kg', qty: 5, unitPrice: 3.125 }, { itemType: 'material', itemId: 'mat4', name: 'كريمة خفق', unitId: 'pc', qty: 24, unitPrice: 0.95 }] },
      p2: { purchaseNumber: 42, createdAt: now - 5 * 3600e3, storekeeperName: 'أمين المستودع', supplierId: 's2', supplierName: 'مطاحن الكويت', branchId: 'yarmouk', status: 'pending', pendingMoveId: 'm2',
        items: [{ itemType: 'material', itemId: 'mat5', name: 'دقيق فاخر', unitId: 'bag', qty: 30, unitPrice: 6.5 }] },
      p3: { purchaseNumber: 39, purchaseInvoiceNumber: 'PK-221', lastReceiptNumber: 16, receivedItems: [{ itemType: 'material', itemId: 'mat6', name: 'أكواب ورقية', unitId: 'ctn', qty: 4 }], createdAt: now - 3 * DAY, storekeeperName: 'أمين المستودع', supplierId: 's3', supplierName: 'مؤسسة <b>التغليف</b>', branchId: 'main', status: 'received', pendingMoveId: 'm3',
        items: [{ itemType: 'material', itemId: 'mat6', name: 'أكواب ورقية', unitId: 'ctn', qty: 4, unitPrice: 11 }] },
      p5: { purchaseNumber: 40, createdAt: now - 1 * DAY, storekeeperName: 'أمين المستودع', supplierId: 's2', supplierName: 'مطاحن الكويت', branchId: 'main_warehouse', status: 'approved', pendingMoveId: 'm6', purchaseInvoiceNumber: 'KFM-7781',
        items: [{ itemType: 'material', itemId: 'mat5', name: 'دقيق فاخر', unitId: 'bag', qty: 20, unitPrice: 6.25 }, { itemType: 'material', itemId: 'mat7', name: 'سكر أبيض', unitId: 'bag', qty: 10, unitPrice: 3.4 }] },
      p4: { purchaseNumber: 37, createdAt: now - 6 * DAY, storekeeperName: 'أمين المستودع', supplierId: 's1', supplierName: 'شركة الألبان المتحدة', branchId: 'main', status: 'rejected', pendingMoveId: 'm4',
        items: [{ itemType: 'material', itemId: 'mat1', name: 'حليب كامل الدسم', unitId: 'ctn', qty: 6, unitPrice: 4.4 }] }
    },
    purchaseReceipts: {
      r1: { createdAt: now - 10 * DAY, items: [{ itemType: 'material', itemId: 'mat1', cost: 4.1, unitId: 'ctn' }, { itemType: 'material', itemId: 'mat2', cost: 2.75, unitId: 'kg' }] },
      r3: { purchaseId: 'p3', receiptNumber: 16, supplierName: 'مؤسسة <b>التغليف</b>', branchId: 'main', purchaseInvoiceNumber: 'PK-221', storekeeperName: 'أمين المستودع', createdAt: now - 2 * DAY, items: [{ itemType: 'material', itemId: 'mat6', name: 'أكواب ورقية', unitId: 'ctn', qty: 4, cost: 11, unitPrice: 11 }] },
      r2: { createdAt: now - 4 * DAY, items: [{ itemType: 'material', itemId: 'mat1', cost: 0.36, unitId: 'pc' }, { itemType: 'material', itemId: 'mat5', cost: 6.25, unitId: 'bag' }] }
    },
    pendingStockMoves: {
      m1: { name: 'طلب شراء 41', note: 'شركة الألبان المتحدة', createdAt: now - 2 * 3600e3, status: 'pending', type: 'purchase', purchaseId: 'p1', branchId: 'main_warehouse' },
      m2: { name: 'طلب شراء 42', note: 'مطاحن الكويت', createdAt: now - 5 * 3600e3, status: 'pending', type: 'purchase', purchaseId: 'p2', branchId: 'yarmouk' },
      m3: { name: 'طلب شراء 39', note: 'مؤسسة <b>التغليف</b>', createdAt: now - 3 * DAY, status: 'approved', type: 'purchase', purchaseId: 'p3', branchId: 'main', decidedAt: now - 3 * DAY + 3600e3 },
      m4: { name: 'طلب شراء 37', note: 'شركة الألبان المتحدة', createdAt: now - 6 * DAY, status: 'rejected', type: 'purchase', purchaseId: 'p4', branchId: 'main', decidedAt: now - 6 * DAY + 7200e3 },
      m6: { name: 'طلب شراء 40', note: 'مطاحن الكويت', createdAt: now - 1 * DAY, status: 'approved', type: 'purchase', purchaseId: 'p5', branchId: 'main_warehouse', decidedAt: now - 20 * 3600e3, decidedByName: 'مستخدم تجريبي' },
      m5: { name: 'طلب شراء 35', note: 'مطاحن الكويت', createdAt: now - 8 * DAY, status: 'pending', type: 'purchase', purchaseId: 'gone', branchId: 'main' }
    }
  };
  // A few weeks of paid invoices for the reports (fixed pattern, not random)
  const PRICES = { prd1: 0.45, prd2: 0.25, prd3: 6.5 };
  for (let i = 0; i < 60; i++) {
    const at = now - (2 + i * 13) * 3600000, br = i % 3 ? 'main' : 'yarmouk', pid = ['prd1', 'prd2', 'prd3'][i % 3], qty = 2 + (i * 7) % 11;
    const sub = +(qty * PRICES[pid]).toFixed(3), fee = i % 4 ? 0.5 : 0;
    data.orders[`g${i}`] = { orderNumber: 1100 - i, status: 'paid', createdAt: at, branchId: br, cashierId: br === 'main' ? 'k1' : 'k2', cashierName: br === 'main' ? 'كاشير حولي' : 'كاشير اليرموك',
      customerId: ['cu1', 'cu2', 'cu3'][i % 3], customerName: ['أحمد الكندري', 'نورة العتيبي', 'فهد الرشيدي'][i % 3], customerPhone: ['99001122', '66554433', '55112233'][i % 3],
      deliveryZoneId: fee ? 'z2' : '', orderTypeId: fee ? 'ot1' : 'ot2', paymentMethod: ['cash', 'knet', 'cash', 'online', 'knet'][i % 5], items: [{ productId: pid, qty, price: PRICES[pid] }], subtotal: sub, netTotal: sub, deliveryFee: fee, total: +(sub + fee).toFixed(3) };
  }
  // The cashier stamps every invoice with `timestamp` (orders are read by it)
  Object.values(data.orders).forEach(o => { if (o.timestamp == null) o.timestamp = o.createdAt; });
  data.stockReturn = {
    rt1: { stockReturnNumber: 3, createdAt: now - 2 * DAY, fromBranchId: 'yarmouk', toBranchId: 'main', reason: 'قرب انتهاء الصلاحية', storekeeperName: 'أمين المستودع', items: [{ itemType: 'product', itemId: 'prd1', qty: 6 }, { itemType: 'material', itemId: 'mat2', qty: 1.5 }] },
    rt2: { stockReturnNumber: 4, createdAt: now - 6 * DAY, fromBranchId: 'yarmouk', toBranchId: 'main', reason: 'فائض', storekeeperName: 'أمين المستودع', items: [{ itemType: 'product', itemId: 'prd1', qty: 3 }] }
  };
  data.scrapReturn = {
    sc1: { scrapReturnNumber: 2, createdAt: now - 1 * DAY, branchId: 'yarmouk', senderName: 'سالم', storekeeperName: 'أمين المستودع', items: [{ itemType: 'product', itemId: 'prd3', qty: 1 }, { itemType: 'product', itemId: 'prd1', qty: 4 }] }
  };

  // المخازن — inventory vouchers
  const ymd = ms => new Date(ms).toISOString().slice(0, 10);
  Object.assign(data.meta, { issueCounter: 14, productionCounter: 91, inventoryCounter: 5, receivingCounter: 8, transferCounter: 22, stockReturnCounter: 4, scrapReturnCounter: 2 });
  data.productionStaff = { ps1: { nameAr: 'خالد الشمري', nameEn: 'Khaled Alshammari' }, ps2: { nameAr: 'مريم يوسف', nameEn: 'Maryam Yousef' } };
  data.issueEmployees = { e1: { nameAr: 'عبدالله سعد', nameEn: 'Abdullah Saad' } };
  data.stockIssue = {
    is1: { issueNumber: 12, issueType: 'production', createdAt: now - 1 * DAY - 3600000, branchId: 'main', storekeeperName: 'أمين المستودع', productionStaffId: 'ps1', productionStaffName: 'خالد الشمري', items: [{ itemType: 'material', itemId: 'mat2', qty: 2 }, { itemType: 'material', itemId: 'mat5', qty: 1 }] },
    is2: { issueNumber: 13, issueType: 'order', createdAt: now - 2 * DAY, branchId: 'main', storekeeperName: 'أمين المستودع', cashierId: 'k1', cashierName: 'كاشير حولي', invoiceNumber: '1188', items: [{ itemType: 'product', itemId: 'prd1', qty: 5 }] },
    is3: { issueNumber: 14, issueType: 'use', createdAt: now - 4 * DAY, branchId: 'main', storekeeperName: 'أمين المستودع', cashierId: 'emp:e1', cashierName: 'عبدالله سعد', items: [{ itemType: 'material', itemId: 'mat6', qty: 1 }] }
  };
  data.production.b1 = { ...data.production.b1, createdAt: now - DAY, branchId: 'main', storekeeperName: 'أمين المستودع', productionStaffId: 'ps1', productionStaffName: 'خالد الشمري', productionBarcode: '2000000000881', issueId: 'is1', issueNumber: 12,
    itemName: 'كرواسون زبدة', itemNameAr: 'كرواسون زبدة', itemNameEn: 'Butter Croissant', unitId: 'pc', unitName: 'حبة', qty: 24,
    items: [{ itemId: 'prd1', itemType: 'product', itemName: 'كرواسون زبدة', itemNameAr: 'كرواسون زبدة', itemNameEn: 'Butter Croissant', unitId: 'pc', unitName: 'حبة', qty: 24, productionDate: ymd(now - DAY), expiryDate: ymd(now + 3 * DAY), origin: 'الكويت' },
      { itemId: 'prd2', itemType: 'product', itemName: 'كعك بالسمسم', itemNameAr: 'كعك بالسمسم', itemNameEn: 'Sesame Ka\'ak', unitId: 'pc', unitName: 'حبة', qty: 12, productionDate: ymd(now - DAY), expiryDate: ymd(now + 3 * DAY) }] };
  data.production.b2 = { ...data.production.b2, createdAt: now - 3 * 3600000, branchId: 'main', storekeeperName: 'أمين المستودع', productionStaffId: 'ps2', productionStaffName: 'مريم يوسف', productionBarcode: '2000000000914', itemName: 'كرواسون زبدة', itemNameAr: 'كرواسون زبدة', itemNameEn: 'Butter Croissant', unitId: 'pc', qty: 18 };
  // An expired batch still on the shelf (for the expiry alerts)
  data.production.b3 = { productionNumber: 80, createdAt: now - 8 * DAY, branchId: 'main', storekeeperName: 'أمين المستودع', productionStaffId: 'ps2', productionStaffName: 'مريم يوسف', productionBarcode: '2000000000800',
    itemType: 'product', itemId: 'prd3', itemName: 'كيكة الشوكولاتة', itemNameAr: 'كيكة الشوكولاتة', itemNameEn: 'Chocolate Cake', unitId: 'ctn', qty: 5, productionDate: ymd(now - 8 * DAY), expiryDate: ymd(now - 2 * DAY) };
  data.inventoryCount = {
    ic1: { countNumber: 5, createdAt: now - 3 * DAY, branchId: 'main', storageLocationId: 'sl2', storekeeperName: 'أمين المستودع', items: [{ itemType: 'product', itemId: 'prd1', qty: 30, previousQty: 32 }, { itemType: 'material', itemId: 'mat6', qty: 5, previousQty: 5 }] }
  };
  data.receiving = {
    rc1: { receivingNumber: 8, createdAt: now - 2 * DAY, sourceName: 'مطبخ مركزي', storekeeperName: 'أمين المستودع', items: [{ nameAr: 'صواني ألمنيوم', nameEn: 'Aluminium Trays', qty: 40, storageLocationId: 'sl2' }, { nameAr: 'قشطة', nameEn: 'Clotted Cream', qty: 6, storageLocationId: 'sl1' }] }
  };
  data.transfers = {
    tr1: { transferNumber: 22, createdAt: now - 1 * DAY, fromBranchId: 'main', toBranchId: 'yarmouk', receiverName: 'سالم', storekeeperName: 'أمين المستودع', items: [{ itemType: 'product', itemId: 'prd1', qty: 8 }] }
  };
  const d8 = ymd(now).replace(/-/g, '');
  data.transferRequests = {
    q1: { requestNumber: `TR-${d8}-3`, status: 'pending', createdAt: now - 2 * 3600000, branchId: 'yarmouk', cashierName: 'كاشير اليرموك', items: [{ itemType: 'product', itemId: 'prd1', nameAr: 'كرواسون زبدة', nameEn: 'Butter Croissant', qty: 20, groupKey: 'sweets' }, { itemType: 'stock', itemId: 'mat6', nameAr: 'أكواب ورقية', nameEn: 'Paper Cups', qty: 2, groupKey: 'tableware' }] },
    q2: { requestNumber: `TR-${d8}-2`, status: 'accepted', acceptedBy: 'مستخدم تجريبي', createdAt: now - 5 * 3600000, branchId: 'yarmouk', cashierName: 'كاشير اليرموك', items: [{ itemType: 'product', itemId: 'prd3', nameAr: 'كيكة الشوكولاتة', nameEn: 'Chocolate Cake', qty: 2, groupKey: 'sweets' }, { itemType: 'stock', itemId: 'mat7', nameAr: 'سكر أبيض', nameEn: 'White Sugar', qty: 1, groupKey: 'supplies' }] },
    q3: { requestNumber: `TR-${d8}-1`, status: 'received', createdAt: now - 26 * 3600000, sentAt: now - 25 * 3600000, sentBy: 'أمين المستودع', receivedAt: now - 24 * 3600000, receivedByCashier: 'كاشير اليرموك', stockSentAt: now - 25 * 3600000, branchId: 'yarmouk', cashierName: 'كاشير اليرموك',
      items: [{ itemType: 'product', itemId: 'prd1', nameAr: 'كرواسون زبدة', nameEn: 'Butter Croissant', qty: 10, requestedQty: 10, sentQty: 10, receivedQty: 10, groupKey: 'sweets' }, { itemType: 'stock', itemId: 'mat1', nameAr: 'حليب كامل الدسم', qty: 1, requestedQty: 1, sentQty: 1, receivedQty: 1, groupKey: 'other' }] }
  };
  data.cashierTransfers = {};

  const listeners = new Set();
  const parts = p => String(p || '').split('/').filter(Boolean);
  const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
  const get = p => parts(p).reduce((c, k) => (c && typeof c === 'object' ? c[k] ?? null : null), data);
  const resolve = (v, cur) => (Array.isArray(v) ? v.map(x => resolve(x)) : v && typeof v === 'object'
    ? ('.sv' in v ? (v['.sv'] === 'timestamp' ? Date.now() : (Number(cur) || 0) + Number(v['.sv'].increment || 0))
      : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, cur && cur[k])])))
    : v);
  function set(p, v) {
    const ks = parts(p); let c = data;
    ks.slice(0, -1).forEach(k => { if (!c[k] || typeof c[k] !== 'object') c[k] = {}; c = c[k]; });
    if (v === null || v === undefined) delete c[ks.at(-1)]; else c[ks.at(-1)] = resolve(v, c[ks.at(-1)]);
  }
  const snap = (p, val) => { const v = val === undefined ? clone(get(p)) : val; return { key: parts(p).at(-1) || null, val: () => v, exists: () => v != null }; };
  const notify = () => setTimeout(() => listeners.forEach(l => l.cb(snap(l.path))), 60);
  const delay = ms => new Promise(r => setTimeout(r, ms));

  /* orderByChild/orderByKey + equalTo / startAt / limitToLast, like the server */
  function query(path, q) {
    const val = (k, v) => (q.child ? v && v[q.child] : k);
    const pick = () => {
      let rows = Object.entries(get(path) || {}).filter(([k, v]) => v != null
        && (q.eq === undefined || val(k, v) === q.eq) && (q.start === undefined || (q.child ? Number(val(k, v)) >= q.start : k >= q.start)));
      if (q.last) rows = rows.sort((x, y) => (q.child ? Number(val(...x)) - Number(val(...y)) : x[0] < y[0] ? -1 : 1)).slice(-q.last);
      return rows.length ? clone(Object.fromEntries(rows)) : null;
    };
    const wrap = cb => () => cb(snap(path, pick()));
    return {
      equalTo: v => query(path, { ...q, eq: v }),
      startAt: v => query(path, { ...q, start: v }),
      limitToLast: n => query(path, { ...q, last: n }),
      on(ev, cb) { const l = { path, cb: wrap(cb) }; listeners.add(l); setTimeout(() => l.cb(), q.last ? 90 : 250); cb.__ql = l; return cb; },
      off(ev, cb) { if (cb && cb.__ql) listeners.delete(cb.__ql); },
      once: async () => { await delay(q.eq !== undefined ? 150 : 120); return snap(path, pick()); }
    };
  }

  function ref(path = '') {
    const r = {
      key: parts(path).at(-1) || null,
      // a whole collection takes longer the bigger it is (like the server)
      on(ev, cb) { const l = { path, cb }; listeners.add(l); setTimeout(() => cb(snap(path)), 250 + 20 * Object.keys(get(path) || {}).length); cb.__l = l; return cb; },
      off(ev, cb) { if (cb && cb.__l) listeners.delete(cb.__l); },
      once: async () => { await delay(120); return snap(path); },
      update: async obj => { await delay(350); Object.entries(obj).forEach(([k, v]) => set(parts(path).concat(parts(k)).join('/'), v)); notify(); },
      set: async v => { await delay(200); set(path, v); notify(); },
      remove: async () => { await delay(200); set(path, null); notify(); },
      push: () => ({ key: '-M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }),
      transaction: async fn => { await delay(150); const next = fn(clone(get(path))); if (next === undefined) return { committed: false, snapshot: snap(path) }; set(path, next); notify(); return { committed: true, snapshot: snap(path) }; },
      orderByChild: child => query(path, { child }),
      orderByKey: () => query(path, {})
    };
    return r;
  }

  return {
    database: () => ({ ref }),
    auth: async code => { await delay(400); if (Object.values(data.users).some(u => u.code === code)) return 'mock-' + code; throw Object.assign(new Error(''), { kind: 'invalid' }); },
    setToken: t => { token = t || ''; sessionStorage.setItem('mockToken', token); },
    hasToken: () => !!token,
    // GET /accounting/online-orders on the platform server
    platform: async path => {
      await delay(500);
      if (path !== '/accounting/online-orders') throw Object.assign(new Error('not found'), { status: 404 });
      const H = 3600000;
      return [
        { rawOrder: { orderId: 'B-3101', createdAt: now - 1 * H, branchId: 'hawalli', customerName: 'منيرة الرشيدي', customerPhone: '97771111', deliveryZoneName: 'حولي', mode: 'delivery', paymentMethod: 'online', subtotal: 7.5, deliveryFee: 1, total: 8.5, catalogType: 'bakery',
          items: [{ productId: 'prd1', name: 'كرواسون زبدة', qty: 10, price: 0.45 }, { productId: 'prd3', name: 'كيكة الشوكولاتة', qty: 0.5, price: 6} ] } },
        { rawOrder: { orderId: 'R-220', createdAt: now - 5 * H, branchId: 'yarmouk', customerName: 'Fahad', phone: '96660000', address: 'اليرموك - قطعة 2', mode: 'pickup', paymentMethod: 'knet', subtotal: 12, total: 12, items: [{ name: 'برجر', qty: 2, price: 6 }] } },
        { rawOrder: { orderId: 'B-3099', createdAt: now - 2 * DAY, branchId: 'abu', customerName: 'ريم', customerPhone: '95550000', deliveryZoneName: 'أبو الحصانية', mode: 'delivery', paymentMethod: 'online', subtotal: 4, deliveryFee: 1.5, total: 5.5, items: [{ name: 'كعك', qty: 16, price: 0.25 }] } },
        { rawOrder: { orderId: 'B-3090', status: 'cancelled', cancelledByName: 'الإدارة', cancelledAt: now - 3 * DAY, createdAt: now - 3 * DAY, branchId: 'hawalli', customerName: 'ملغي', mode: 'delivery', total: 9 } }
      ];
    },
    _data: data
  };
})();
