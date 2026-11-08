/* Bilingual dictionary. Keys shared by both languages. */
const I18N = {
  ar: {
    brand: 'رصيد', brandSub: 'المحاسبة والمخازن',
    // nav
    'sec.main': 'الرئيسية', 'grp.inventory': 'المخازن', 'grp.suppliers': 'الموردون', 'grp.admin': 'الإدارة',
    reports: 'تقارير', orders: 'فواتير الكاشير', 'employee-journal': 'يوميات الموظفين', 'online-orders': 'فواتير الأونلاين',
    customers: 'العملاء', products: 'المنتجات', 'product-info': 'معلومات المنتجات', 'product-categories': 'تصنيفات المنتجات',
    units: 'الوحدات', 'item-card': 'بطاقة الصنف', 'storage-locations': 'أماكن التخزين', 'sticker-maker': 'صانع الستيكرات',
    'production-tracking': 'متابعة الإنتاج',
    'stock-materials': 'مواد المخزون', 'material-categories': 'تصنيفات المواد', issue: 'صرف', production: 'إنتاج',
    'production-staff': 'موظفو الإنتاج', stocktake: 'جرد', receiving: 'استلام', transfers: 'تحويلات',
    'cashier-requests': 'طلبات تحويل الكاشير', 'return-warehouse': 'مرتجع للمخزن', 'damaged-returns': 'مرتجع توالف',
    suppliers: 'قائمة الموردين', purchases: 'الشراء', 'supplier-returns': 'مرتجع للمورد',
    'pending-movements': 'حركات مخزون معلقة', devices: 'الأجهزة والكاشير', users: 'المستخدمون', tables: 'الطاولات',
    branches: 'الفروع', 'delivery-fees': 'أسعار التوصيل', discounts: 'خصومات', 'order-types': 'أنواع الطلب', 'payment-methods': 'طرق الدفع',
    // ui
    quickSearch: 'بحث سريع…', searchPh: 'ابحث عن صفحة أو إجراء…', search: 'بحث', noResults: 'لا توجد نتائج',
    pages: 'الصفحات', actions: 'إجراءات', toggleTheme: 'تبديل الوضع الليلي/النهاري', toggleLang: 'Switch to English',
    collapse: 'طي القائمة', expand: 'توسيع القائمة', notifications: 'الإشعارات', markRead: 'تعليم الكل كمقروء',
    allBranches: 'كل الفروع', add: 'إضافة', addNew: 'إضافة جديد', export: 'تصدير', filter: 'تصفية', all: 'الكل',
    edit: 'تعديل', delete: 'حذف', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', undo: 'تراجع', print: 'طباعة', refresh: 'تحديث',
    rows: 'صف', of: 'من', showing: 'عرض', prev: 'السابق', next: 'التالي', searchTable: 'ابحث في الجدول…',
    saved: 'تم الحفظ بنجاح', added: 'تمت الإضافة بنجاح', deleted: 'تم الحذف', exported: 'تم تصدير الملف',
    required: 'هذا الحقل مطلوب', editItem: 'تعديل السجل', newItem: 'سجل جديد', fillForm: 'أدخل البيانات ثم اضغط حفظ',
    toggled: 'تم تحديث الحالة', home: 'الرئيسية', profile: 'الملف الشخصي', settings: 'الإعدادات', logout: 'تسجيل الخروج',
    role: 'مدير النظام', emptyTitle: 'لا توجد سجلات مطابقة', emptySub: 'جرّب تغيير كلمات البحث أو التصفية',
    view: 'عرض', viewAll: 'عرض الكل', live: 'مباشر', demo: 'بيانات تجريبية',
    // reports
    goodMorning: 'صباح الخير', goodEvening: 'مساء الخير', reportsSub: 'نظرة شاملة على أداء المبيعات والمخزون',
    today: 'اليوم', week: 'الأسبوع', month: 'الشهر', year: 'السنة',
    kSales: 'إجمالي المبيعات', kOrders: 'عدد الطلبات', kAvg: 'متوسط الفاتورة', kLow: 'أصناف منخفضة',
    vsPrev: 'مقارنة بالفترة السابقة', salesTrend: 'اتجاه المبيعات', current: 'الفترة الحالية', previous: 'الفترة السابقة',
    byType: 'المبيعات حسب نوع الطلب', topProducts: 'الأكثر مبيعاً', branchPerf: 'أداء الفروع', recentOrders: 'أحدث الطلبات',
    lowStock: 'تنبيهات المخزون', activity: 'النشاط المباشر', remaining: 'متبقي', min: 'الحد الأدنى', sold: 'مُباع',
    // kanban
    'k.new': 'جديد', 'k.preparing': 'قيد التحضير', 'k.ready': 'جاهز', 'k.delivering': 'في الطريق',
    nextStage: 'المرحلة التالية', complete: 'إنهاء', newOrderArrived: 'وصل طلب أونلاين جديد', minsAgo: 'د',
    // production
    target: 'المستهدف', produced: 'المُنتج', eta: 'الانتهاء المتوقع', advance: 'تقدّم', 'ps.prep': 'تجهيز', 'ps.cook': 'طبخ/خبز', 'ps.pack': 'تغليف', 'ps.done': 'مكتمل',
    batchesActive: 'دفعات نشطة', unitsToday: 'وحدات اليوم', avgEff: 'متوسط الكفاءة', delayed: 'متأخرة',
    // tables
    'z.indoor': 'الصالة الداخلية', 'z.outdoor': 'الجلسات الخارجية', 'z.vip': 'كبار الشخصيات', seats: 'مقاعد',
    't.available': 'متاحة', 't.occupied': 'مشغولة', 't.reserved': 'محجوزة', addTable: 'إضافة طاولة', tapToChange: 'اضغط على الطاولة لتغيير حالتها',
    // devices
    online: 'متصل', offline: 'غير متصل', lastSync: 'آخر مزامنة', 'd.pos': 'كاشير', 'd.kds': 'شاشة مطبخ', 'd.printer': 'طابعة', 'd.tablet': 'جهاز لوحي', addDevice: 'إضافة جهاز',
    // sticker
    stickerSettings: 'إعدادات الستيكر', preview: 'معاينة مباشرة', product: 'المنتج', price: 'السعر', prodDate: 'تاريخ الإنتاج',
    expDate: 'تاريخ الانتهاء', weight: 'الوزن', size: 'المقاس', color: 'اللون', showBarcode: 'إظهار الباركود', copies: 'عدد النسخ', printSticker: 'طباعة الستيكر',
    // item card
    selectItem: 'اختر الصنف', currentStock: 'الرصيد الحالي', avgCost: 'متوسط التكلفة', stockValue: 'قيمة المخزون', movements: 'حركة الصنف',
    stock30: 'الرصيد خلال 30 يوماً', docType: 'نوع المستند', docNo: 'رقم المستند', qtyIn: 'وارد', qtyOut: 'منصرف', balance: 'الرصيد',
    'doc.purchase': 'فاتورة شراء', 'doc.sale': 'مبيعات', 'doc.transfer': 'تحويل', 'doc.issue': 'صرف', 'doc.adjust': 'تسوية جرد',
    // columns
    'c.id': 'الرقم', 'c.customer': 'العميل', 'c.type': 'النوع', 'c.branch': 'الفرع', 'c.items': 'الأصناف', 'c.total': 'الإجمالي',
    'c.payment': 'الدفع', 'c.date': 'التاريخ', 'c.status': 'الحالة', 'c.employee': 'الموظف', 'c.checkIn': 'الحضور', 'c.checkOut': 'الانصراف',
    'c.hours': 'الساعات', 'c.sales': 'المبيعات', 'c.name': 'الاسم', 'c.phone': 'رقم الهاتف', 'c.city': 'المدينة', 'c.orders': 'الطلبات',
    'c.spent': 'إجمالي الإنفاق', 'c.lastOrder': 'آخر طلب', 'c.tier': 'الفئة', 'c.code': 'الكود', 'c.category': 'التصنيف', 'c.price': 'السعر',
    'c.cost': 'التكلفة', 'c.stock': 'المخزون', 'c.active': 'مفعّل', 'c.barcode': 'الباركود', 'c.unit': 'الوحدة', 'c.calories': 'السعرات',
    'c.prep': 'وقت التحضير', 'c.tax': 'الضريبة', 'c.products': 'المنتجات', 'c.sort': 'الترتيب', 'c.symbol': 'الرمز', 'c.base': 'الوحدة الأساسية',
    'c.factor': 'معامل التحويل', 'c.capacity': 'الإشغال', 'c.material': 'المادة', 'c.qty': 'الكمية', 'c.minQty': 'حد الطلب', 'c.location': 'الموقع',
    'c.materials': 'المواد', 'c.to': 'إلى', 'c.from': 'من', 'c.value': 'القيمة', 'c.by': 'بواسطة', 'c.batch': 'الدفعة', 'c.role': 'الوظيفة',
    'c.shift': 'الوردية', 'c.output': 'الإنتاج', 'c.efficiency': 'الكفاءة', 'c.variance': 'الفروقات', 'c.supplier': 'المورد', 'c.cashier': 'الكاشير',
    'c.reason': 'السبب', 'c.contact': 'المسؤول', 'c.balance': 'الرصيد', 'c.purchases': 'المشتريات', 'c.email': 'البريد', 'c.lastLogin': 'آخر دخول',
    'c.manager': 'المدير', 'c.tables': 'الطاولات', 'c.zone': 'المنطقة', 'c.fee': 'رسوم التوصيل', 'c.minOrder': 'أقل طلب', 'c.eta': 'مدة التوصيل',
    'c.usage': 'الاستخدام', 'c.ends': 'ينتهي في', 'c.share': 'النسبة', 'c.tx': 'العمليات', 'c.product': 'المنتج', 'c.dept': 'القسم',
    // statuses
    'st.completed': 'مكتمل', 'st.pending': 'معلّق', 'st.cancelled': 'ملغي', 'st.processing': 'قيد التنفيذ', 'st.paid': 'مدفوع', 'st.partial': 'جزئي',
    'st.unpaid': 'غير مدفوع', 'st.present': 'حاضر', 'st.late': 'متأخر', 'st.absent': 'غائب', 'st.active': 'نشط', 'st.leave': 'إجازة',
    'st.approved': 'معتمد', 'st.rejected': 'مرفوض', 'st.draft': 'مسودة', 'st.inTransit': 'قيد النقل', 'st.received': 'مستلم',
    'st.vip': 'VIP', 'st.gold': 'ذهبي', 'st.regular': 'عادي', 'st.full': 'ممتلئ', 'st.ok': 'جيد', 'st.low': 'منخفض',
    // page kpis
    'kp.total': 'الإجمالي', 'kp.today': 'اليوم', 'kp.value': 'القيمة', 'kp.pending': 'معلّقة', 'kp.active': 'نشط', 'kp.avg': 'المتوسط',
    'kp.sales': 'المبيعات', 'kp.cancelled': 'ملغاة', 'kp.present': 'حاضرون', 'kp.late': 'متأخرون', 'kp.absent': 'غائبون', 'kp.hours': 'ساعات العمل',
    'kp.vip': 'عملاء VIP', 'kp.new': 'جدد هذا الشهر', 'kp.low': 'منخفض المخزون', 'kp.categories': 'تصنيفات', 'kp.month': 'هذا الشهر',
    'kp.due': 'مستحقات', 'kp.variance': 'صافي الفروقات', 'kp.online': 'متصل الآن',
    currency: 'د.ك'
  },
  en: {
    brand: 'Raseed', brandSub: 'Accounting & Inventory',
    'sec.main': 'Main', 'grp.inventory': 'Inventory', 'grp.suppliers': 'Suppliers', 'grp.admin': 'Administration',
    reports: 'Reports', orders: 'Cashier Invoices', 'employee-journal': 'Employee Journal', 'online-orders': 'Online Invoices',
    customers: 'Customers', products: 'Products', 'product-info': 'Product Info', 'product-categories': 'Product Categories',
    units: 'Units', 'item-card': 'Item Card', 'storage-locations': 'Storage Locations', 'sticker-maker': 'Sticker Maker',
    'production-tracking': 'Production Tracking',
    'stock-materials': 'Stock Materials', 'material-categories': 'Material Categories', issue: 'Issue', production: 'Production',
    'production-staff': 'Production Staff', stocktake: 'Stocktake', receiving: 'Receiving', transfers: 'Transfers',
    'cashier-requests': 'Cashier Transfer Requests', 'return-warehouse': 'Return to Warehouse', 'damaged-returns': 'Damaged Returns',
    suppliers: 'Supplier List', purchases: 'Purchasing', 'supplier-returns': 'Return to Supplier',
    'pending-movements': 'Pending Stock Movements', devices: 'Devices & Cashiers', users: 'Users', tables: 'Tables',
    branches: 'Branches', 'delivery-fees': 'Delivery Fees', discounts: 'Discounts', 'order-types': 'Order Types', 'payment-methods': 'Payment Methods',
    quickSearch: 'Quick search…', searchPh: 'Search pages or actions…', search: 'Search', noResults: 'No results',
    pages: 'Pages', actions: 'Actions', toggleTheme: 'Toggle light/dark mode', toggleLang: 'التبديل إلى العربية',
    collapse: 'Collapse sidebar', expand: 'Expand sidebar', notifications: 'Notifications', markRead: 'Mark all as read',
    allBranches: 'All branches', add: 'Add', addNew: 'Add new', export: 'Export', filter: 'Filter', all: 'All',
    edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close', undo: 'Undo', print: 'Print', refresh: 'Refresh',
    rows: 'rows', of: 'of', showing: 'Showing', prev: 'Previous', next: 'Next', searchTable: 'Search table…',
    saved: 'Saved successfully', added: 'Added successfully', deleted: 'Deleted', exported: 'File exported',
    required: 'This field is required', editItem: 'Edit record', newItem: 'New record', fillForm: 'Fill in the details, then save',
    toggled: 'Status updated', home: 'Home', profile: 'Profile', settings: 'Settings', logout: 'Sign out',
    role: 'System Admin', emptyTitle: 'No matching records', emptySub: 'Try changing your search or filters',
    view: 'View', viewAll: 'View all', live: 'Live', demo: 'Demo data',
    goodMorning: 'Good morning', goodEvening: 'Good evening', reportsSub: 'A complete view of sales and inventory performance',
    today: 'Today', week: 'Week', month: 'Month', year: 'Year',
    kSales: 'Total Sales', kOrders: 'Orders', kAvg: 'Avg. Ticket', kLow: 'Low-stock Items',
    vsPrev: 'vs previous period', salesTrend: 'Sales Trend', current: 'Current period', previous: 'Previous period',
    byType: 'Sales by Order Type', topProducts: 'Top Sellers', branchPerf: 'Branch Performance', recentOrders: 'Recent Orders',
    lowStock: 'Stock Alerts', activity: 'Live Activity', remaining: 'left', min: 'min', sold: 'sold',
    'k.new': 'New', 'k.preparing': 'Preparing', 'k.ready': 'Ready', 'k.delivering': 'On the way',
    nextStage: 'Next stage', complete: 'Complete', newOrderArrived: 'New online order received', minsAgo: 'm',
    target: 'Target', produced: 'Produced', eta: 'ETA', advance: 'Advance', 'ps.prep': 'Prep', 'ps.cook': 'Cook/Bake', 'ps.pack': 'Pack', 'ps.done': 'Done',
    batchesActive: 'Active batches', unitsToday: 'Units today', avgEff: 'Avg. efficiency', delayed: 'Delayed',
    'z.indoor': 'Indoor Hall', 'z.outdoor': 'Outdoor', 'z.vip': 'VIP Lounge', seats: 'seats',
    't.available': 'Available', 't.occupied': 'Occupied', 't.reserved': 'Reserved', addTable: 'Add table', tapToChange: 'Tap a table to change its status',
    online: 'Online', offline: 'Offline', lastSync: 'Last sync', 'd.pos': 'Cashier', 'd.kds': 'Kitchen display', 'd.printer': 'Printer', 'd.tablet': 'Tablet', addDevice: 'Add device',
    stickerSettings: 'Sticker settings', preview: 'Live preview', product: 'Product', price: 'Price', prodDate: 'Production date',
    expDate: 'Expiry date', weight: 'Weight', size: 'Size', color: 'Color', showBarcode: 'Show barcode', copies: 'Copies', printSticker: 'Print sticker',
    selectItem: 'Select item', currentStock: 'Current stock', avgCost: 'Average cost', stockValue: 'Stock value', movements: 'Item movements',
    stock30: 'Stock over 30 days', docType: 'Document', docNo: 'Doc #', qtyIn: 'In', qtyOut: 'Out', balance: 'Balance',
    'doc.purchase': 'Purchase invoice', 'doc.sale': 'Sales', 'doc.transfer': 'Transfer', 'doc.issue': 'Issue', 'doc.adjust': 'Stock adjustment',
    'c.id': 'No.', 'c.customer': 'Customer', 'c.type': 'Type', 'c.branch': 'Branch', 'c.items': 'Items', 'c.total': 'Total',
    'c.payment': 'Payment', 'c.date': 'Date', 'c.status': 'Status', 'c.employee': 'Employee', 'c.checkIn': 'Check-in', 'c.checkOut': 'Check-out',
    'c.hours': 'Hours', 'c.sales': 'Sales', 'c.name': 'Name', 'c.phone': 'Phone', 'c.city': 'City', 'c.orders': 'Orders',
    'c.spent': 'Total spent', 'c.lastOrder': 'Last order', 'c.tier': 'Tier', 'c.code': 'Code', 'c.category': 'Category', 'c.price': 'Price',
    'c.cost': 'Cost', 'c.stock': 'Stock', 'c.active': 'Active', 'c.barcode': 'Barcode', 'c.unit': 'Unit', 'c.calories': 'Calories',
    'c.prep': 'Prep time', 'c.tax': 'Tax', 'c.products': 'Products', 'c.sort': 'Order', 'c.symbol': 'Symbol', 'c.base': 'Base unit',
    'c.factor': 'Factor', 'c.capacity': 'Occupancy', 'c.material': 'Material', 'c.qty': 'Quantity', 'c.minQty': 'Reorder at', 'c.location': 'Location',
    'c.materials': 'Materials', 'c.to': 'To', 'c.from': 'From', 'c.value': 'Value', 'c.by': 'By', 'c.batch': 'Batch', 'c.role': 'Role',
    'c.shift': 'Shift', 'c.output': 'Output', 'c.efficiency': 'Efficiency', 'c.variance': 'Variance', 'c.supplier': 'Supplier', 'c.cashier': 'Cashier',
    'c.reason': 'Reason', 'c.contact': 'Contact', 'c.balance': 'Balance', 'c.purchases': 'Purchases', 'c.email': 'Email', 'c.lastLogin': 'Last login',
    'c.manager': 'Manager', 'c.tables': 'Tables', 'c.zone': 'Zone', 'c.fee': 'Fee', 'c.minOrder': 'Min. order', 'c.eta': 'ETA',
    'c.usage': 'Uses', 'c.ends': 'Ends', 'c.share': 'Share', 'c.tx': 'Transactions', 'c.product': 'Product', 'c.dept': 'Department',
    'st.completed': 'Completed', 'st.pending': 'Pending', 'st.cancelled': 'Cancelled', 'st.processing': 'Processing', 'st.paid': 'Paid', 'st.partial': 'Partial',
    'st.unpaid': 'Unpaid', 'st.present': 'Present', 'st.late': 'Late', 'st.absent': 'Absent', 'st.active': 'Active', 'st.leave': 'On leave',
    'st.approved': 'Approved', 'st.rejected': 'Rejected', 'st.draft': 'Draft', 'st.inTransit': 'In transit', 'st.received': 'Received',
    'st.vip': 'VIP', 'st.gold': 'Gold', 'st.regular': 'Regular', 'st.full': 'Full', 'st.ok': 'Good', 'st.low': 'Low',
    'kp.total': 'Total', 'kp.today': 'Today', 'kp.value': 'Value', 'kp.pending': 'Pending', 'kp.active': 'Active', 'kp.avg': 'Average',
    'kp.sales': 'Sales', 'kp.cancelled': 'Cancelled', 'kp.present': 'Present', 'kp.late': 'Late', 'kp.absent': 'Absent', 'kp.hours': 'Work hours',
    'kp.vip': 'VIP customers', 'kp.new': 'New this month', 'kp.low': 'Low stock', 'kp.categories': 'Categories', 'kp.month': 'This month',
    'kp.due': 'Payables', 'kp.variance': 'Net variance', 'kp.online': 'Online now',
    currency: 'KWD'
  }
};

/* Live pages + login */
Object.assign(I18N.ar, {
  liveData: 'بيانات مباشرة', loadingOld: 'جاري تحميل السجلات الأقدم…', waitAll: 'انتظر حتى يكتمل تحميل كل السجلات', alarmTip: 'تنبيه مخزون — افتح البطاقة الحمراء لإيقافه', alarmClick: 'يوجد تنبيه مخزون — اضغط في أي مكان لتشغيل الصوت', mockMode: 'وضع تجريبي — لا يتم الحفظ على السيرفر', mockHint: 'رمز التجربة: 1234',
  loginTitle: 'تسجيل الدخول', loginSub: 'أدخل رمز الموظف للدخول إلى النظام', loginCode: 'رمز الموظف', loginBtn: 'دخول',
  loginInvalid: 'الرمز غير صحيح', loginNoUser: 'الرمز صحيح لكنه غير مرتبط بمستخدم في النظام', loginNetwork: 'تعذر الاتصال بالسيرفر، حاول مرة أخرى',
  sessionExpired: 'انتهت الجلسة، أدخل الرمز مرة أخرى', logoutQ: 'تسجيل الخروج؟', logoutSub: 'ستحتاج إلى رمز الموظف للدخول مرة أخرى.',
  role_manager: 'مدير', role_cashier: 'كاشير', role_storekeeper: 'أمين مخزن', noAccess: 'ليس لديك صلاحية لهذه الصفحة',
  'st.received': 'مستلم', 'st.partial': 'مستلم جزئياً',
  'pm.sub': 'طلبات الشراء بانتظار اعتماد المدير قبل الاستلام', 'pm.searchPh': 'ابحث برقم الطلب، المورد، الصنف…',
  'pm.request': 'الطلب', 'pm.purchaseReq': 'طلب شراء', 'pm.storekeeper': 'أمين المخزن', 'pm.latestCost': 'آخر تكلفة', 'pm.value': 'قيمة الفاتورة',
  'pm.more': 'أصناف أخرى', 'pm.invNo': 'فاتورة المورد', 'pm.missing': 'طلب الشراء المرتبط محذوف', 'pm.unitDiff': 'آخر سعر مسجّل بوحدة مختلفة',
  'pm.approve': 'اعتماد', 'pm.reject': 'رفض', 'pm.approveQ': 'اعتماد طلب الشراء؟', 'pm.rejectQ': 'رفض طلب الشراء؟',
  'pm.rejectNote': 'سيتم تحويل حالة طلب الشراء إلى «مرفوض» ولن يمكن استلامه.', 'pm.approvedOk': 'تم الاعتماد', 'pm.rejectedOk': 'تم الرفض',
  'pm.alreadyDecided': 'تم اتخاذ قرار في هذا الطلب من جهاز آخر', 'pm.saveFailed': 'لم يتم الحفظ — تحقق من الاتصال وحاول مرة أخرى',
  'pm.rejectFirst': 'لا يمكن حذف طلب معلّق مرتبط بطلب شراء — ارفضه أولاً ثم احذفه', 'pm.deleteQ': 'حذف الحركة من القائمة؟',
  'pm.deleteNote': 'يُحذف السجل من هذه القائمة فقط، ويبقى طلب الشراء كما هو.', 'pm.allClear': 'لا توجد طلبات معلّقة', 'pm.allClearSub': 'كل طلبات الشراء تمت مراجعتها',
  'pm.kPending': 'طلبات معلّقة', 'pm.kValue': 'قيمة المعلّق', 'pm.kApproved': 'معتمدة (30 يوماً)', 'pm.kRejected': 'مرفوضة (30 يوماً)',
  'pm.purchaseStatus': 'حالة طلب الشراء', 'pm.decidedBy': 'القرار بواسطة', 'pm.unitPrice': 'سعر الوحدة', 'pm.printedAt': 'تاريخ الطباعة'
});
Object.assign(I18N.en, {
  liveData: 'Live data', loadingOld: 'Loading older records…', waitAll: 'Wait until all records have loaded', alarmTip: 'Stock alert — open the red card to stop it', alarmClick: 'Stock alert — click anywhere to turn the sound on', mockMode: 'Demo mode — nothing is saved to the server', mockHint: 'Demo code: 1234',
  loginTitle: 'Sign in', loginSub: 'Enter your employee code to continue', loginCode: 'Employee code', loginBtn: 'Sign in',
  loginInvalid: 'Invalid code', loginNoUser: 'The code is valid but not linked to a user', loginNetwork: 'Could not reach the server, try again',
  sessionExpired: 'Session expired — enter your code again', logoutQ: 'Sign out?', logoutSub: 'You will need your employee code to sign in again.',
  role_manager: 'Manager', role_cashier: 'Cashier', role_storekeeper: 'Storekeeper', noAccess: 'You do not have access to this page',
  'st.received': 'Received', 'st.partial': 'Partially received',
  'pm.sub': 'Purchase requests waiting for manager approval before receiving', 'pm.searchPh': 'Search by request no., supplier, item…',
  'pm.request': 'Request', 'pm.purchaseReq': 'Purchase request', 'pm.storekeeper': 'Storekeeper', 'pm.latestCost': 'Latest cost', 'pm.value': 'Invoice value',
  'pm.more': 'more items', 'pm.invNo': 'Supplier invoice', 'pm.missing': 'Linked purchase was deleted', 'pm.unitDiff': 'Latest price was recorded in a different unit',
  'pm.approve': 'Approve', 'pm.reject': 'Reject', 'pm.approveQ': 'Approve this purchase request?', 'pm.rejectQ': 'Reject this purchase request?',
  'pm.rejectNote': 'The purchase request will be marked “Rejected” and cannot be received.', 'pm.approvedOk': 'approved', 'pm.rejectedOk': 'rejected',
  'pm.alreadyDecided': 'This request was already decided on another device', 'pm.saveFailed': 'Not saved — check the connection and try again',
  'pm.rejectFirst': 'A pending move linked to a purchase cannot be deleted — reject it first, then delete', 'pm.deleteQ': 'Remove this move from the list?',
  'pm.deleteNote': 'Only this list entry is removed; the purchase request stays as it is.', 'pm.allClear': 'No pending requests', 'pm.allClearSub': 'Every purchase request has been reviewed',
  'pm.kPending': 'Pending requests', 'pm.kValue': 'Pending value', 'pm.kApproved': 'Approved (30 days)', 'pm.kRejected': 'Rejected (30 days)',
  'pm.purchaseStatus': 'Purchase status', 'pm.decidedBy': 'Decided by', 'pm.unitPrice': 'Unit price', 'pm.printedAt': 'Printed at'
});

/* Purchases + suppliers */
Object.assign(I18N.ar, {
  'pu.sub': 'طلبات الشراء من الموردين: إنشاء، اعتماد، ثم استلام إلى المخزون', 'pu.new': 'طلب شراء جديد', 'pu.searchPh': 'ابحث برقم الطلب، فاتورة المورد، الصنف…',
  'pu.number': 'رقم الطلب', 'pu.itemsWord': 'أصناف', 'pu.receive': 'استلام', 'pu.allSuppliers': 'كل الموردين',
  'pu.st.pending': 'بانتظار الاعتماد', 'pu.st.approved': 'جاهز للاستلام', 'pu.st.partial': 'مستلم جزئياً', 'pu.st.received': 'مستلم بالكامل', 'pu.st.rejected': 'مرفوض',
  'pu.kPending': 'بانتظار الاعتماد', 'pu.kReady': 'جاهزة للاستلام', 'pu.kOpenValue': 'قيمة الطلبات المفتوحة', 'pu.kReceived30': 'المستلم (30 يوماً)',
  'pu.onlyPendingEdit': 'يمكن تعديل الطلب فقط وهو بانتظار الاعتماد', 'pu.editTitle': 'تعديل طلب الشراء', 'pu.formSub': 'اختر المورد ثم أضف الأصناف — يُرسل الطلب لاعتماد المدير',
  'pu.chooseSupplier': 'اختر المورد', 'pu.chooseBranch': 'اختر الفرع', 'pu.addItems': 'أصناف المورد', 'pu.itemSearchPh': 'ابحث بالاسم أو الكود أو امسح الباركود…',
  'pu.requestItems': 'أصناف الطلب', 'pu.submit': 'إرسال للاعتماد', 'pu.itemGone': 'الصنف محذوف من القائمة', 'pu.batch': 'دفعة', 'pu.noBatch': 'بدون دفعة',
  'pu.lastPrice': 'آخر سعر', 'pu.priceUp': 'أعلى من آخر سعر بـ', 'pu.priceDown': 'أقل من آخر سعر بـ', 'pu.noItems': 'لا توجد أصناف بعد',
  'pu.noItemsSub': 'اضغط على صنف من القائمة أعلاه لإضافته', 'pu.pickSupplierFirst': 'اختر المورد أولاً لعرض أصنافه', 'pu.supplierNoItems': 'لا توجد أصناف مرتبطة بهذا المورد — اربطها من صفحة الموردين',
  'pu.inStock': 'المخزون', 'pu.refine': 'نتائج كثيرة — اكتب للتصفية', 'pu.changeSupplierQ': 'تغيير المورد؟', 'pu.changeSupplierNote': 'سيتم حذف الأصناف المضافة لأنها تخص المورد السابق.',
  'pu.changeSupplier': 'تغيير المورد', 'pu.noMatch': 'لا يوجد صنف مطابق لهذا الكود', 'pu.needItems': 'أضف صنفاً واحداً على الأقل', 'pu.needQty': 'كل صنف يحتاج كمية أكبر من صفر',
  'pu.changedElsewhere': 'تغيّر الطلب من جهاز آخر — راجع الحالة وحاول مرة أخرى', 'pu.sentForApproval': 'أُرسل للاعتماد', 'pu.notReceivable': 'يمكن الاستلام فقط بعد اعتماد الطلب',
  'pu.receiveTitle': 'استلام طلب الشراء', 'pu.receiveAll': 'استلام كل المتبقي', 'pu.clearAll': 'تصفير', 'pu.ordered': 'المطلوب', 'pu.receivedBefore': 'مستلم سابقاً',
  'pu.remaining': 'المتبقي', 'pu.receiveNow': 'المستلم الآن', 'pu.itemGoneStock': 'الصنف محذوف — لن يُضاف للمخزون', 'pu.printAfter': 'طباعة سند الاستلام بعد الحفظ',
  'pu.receiveValue': 'قيمة المستلم', 'pu.confirmReceive': 'تأكيد الاستلام', 'pu.needReceiveQty': 'أدخل كمية مستلمة لصنف واحد على الأقل',
  'pu.receivedOk': 'تم الاستلام بالكامل وإضافته للمخزون', 'pu.partialOk': 'تم استلام جزئي — المتبقي ما زال مفتوحاً', 'pu.received': 'المستلم',
  'pu.receipts': 'سندات الاستلام', 'pu.receiptNo': 'سند استلام', 'pu.noReceipts': 'لم يتم أي استلام بعد', 'pu.receiptTitle': 'سند استلام مشتريات', 'pu.receivedTotal': 'إجمالي المستلم',
  'pu.cannotDeleteReceived': 'لا يمكن حذف طلب تم استلامه أو استلام جزء منه — الكميات دخلت المخزون', 'pu.deleteQ': 'حذف طلب الشراء؟',
  'pu.deleteNote': 'سيُحذف الطلب وحركته المعلّقة نهائياً.',
  'sp.sub': 'الموردون والأصناف التي يوردونها — تظهر في نموذج طلب الشراء', 'sp.new': 'مورد جديد', 'sp.searchPh': 'ابحث بالاسم أو رقم الهاتف…',
  'sp.open': 'طلبات مفتوحة', 'sp.lastPurchase': 'آخر طلب', 'sp.value30': 'المشتريات (30 يوماً)', 'sp.kCount': 'الموردون', 'sp.kItems': 'أصناف مرتبطة بموردين',
  'sp.kOpen': 'طلبات مفتوحة', 'sp.kValue30': 'المشتريات (30 يوماً)', 'sp.items': 'أصناف المورد', 'sp.none': 'لا يوجد موردون بعد', 'sp.noneSub': 'أضف أول مورد للبدء',
  'sp.editTitle': 'تعديل المورد', 'sp.nameAr': 'الاسم بالعربي', 'sp.nameEn': 'الاسم بالإنجليزي', 'sp.badPhone': 'رقم الهاتف غير صحيح', 'sp.duplicate': 'يوجد مورد بنفس الاسم',
  'sp.itemsSub': 'الأصناف التي تظهر عند إنشاء طلب شراء من هذا المورد', 'sp.remove': 'إزالة الصنف', 'sp.noItems': 'لا توجد أصناف مرتبطة', 'sp.addItems': 'إضافة أصناف',
  'sp.otherSuppliers': 'موردون آخرون:', 'sp.addSelected': 'إضافة المحدد', 'sp.removed': 'أُزيل من أصناف المورد', 'sp.addedItems': 'تمت إضافة الأصناف',
  'sp.hasOpen': 'لا يمكن حذف المورد — لديه {n} طلب شراء مفتوح', 'sp.deleteQ': 'حذف المورد؟', 'sp.deleteNote': 'سيُفك ارتباطه بالأصناف، وتبقى طلبات الشراء القديمة كما هي.'
});
Object.assign(I18N.en, {
  'pu.sub': 'Purchase requests to suppliers: create, approve, then receive into stock', 'pu.new': 'New purchase request', 'pu.searchPh': 'Search by request no., supplier invoice, item…',
  'pu.number': 'Request no.', 'pu.itemsWord': 'items', 'pu.receive': 'Receive', 'pu.allSuppliers': 'All suppliers',
  'pu.st.pending': 'Awaiting approval', 'pu.st.approved': 'Ready to receive', 'pu.st.partial': 'Partially received', 'pu.st.received': 'Fully received', 'pu.st.rejected': 'Rejected',
  'pu.kPending': 'Awaiting approval', 'pu.kReady': 'Ready to receive', 'pu.kOpenValue': 'Open requests value', 'pu.kReceived30': 'Received (30 days)',
  'pu.onlyPendingEdit': 'A request can only be edited while awaiting approval', 'pu.editTitle': 'Edit purchase request', 'pu.formSub': 'Pick the supplier, then add items — the request goes to the manager for approval',
  'pu.chooseSupplier': 'Choose supplier', 'pu.chooseBranch': 'Choose branch', 'pu.addItems': 'Supplier items', 'pu.itemSearchPh': 'Search by name or code, or scan a barcode…',
  'pu.requestItems': 'Request items', 'pu.submit': 'Send for approval', 'pu.itemGone': 'Item was deleted from the catalog', 'pu.batch': 'Batch', 'pu.noBatch': 'No batch',
  'pu.lastPrice': 'Last price', 'pu.priceUp': 'Higher than last price by', 'pu.priceDown': 'Lower than last price by', 'pu.noItems': 'No items yet',
  'pu.noItemsSub': 'Tap an item above to add it', 'pu.pickSupplierFirst': 'Choose a supplier first to see their items', 'pu.supplierNoItems': 'No items linked to this supplier — link them on the Suppliers page',
  'pu.inStock': 'Stock', 'pu.refine': 'Many results — type to narrow down', 'pu.changeSupplierQ': 'Change supplier?', 'pu.changeSupplierNote': 'Items already added will be removed because they belong to the previous supplier.',
  'pu.changeSupplier': 'Change supplier', 'pu.noMatch': 'No item matches this code', 'pu.needItems': 'Add at least one item', 'pu.needQty': 'Every item needs a quantity above zero',
  'pu.changedElsewhere': 'The request changed on another device — check its status and try again', 'pu.sentForApproval': 'sent for approval', 'pu.notReceivable': 'Receiving is only possible after approval',
  'pu.receiveTitle': 'Receive purchase request', 'pu.receiveAll': 'Receive all remaining', 'pu.clearAll': 'Clear', 'pu.ordered': 'Ordered', 'pu.receivedBefore': 'Received before',
  'pu.remaining': 'Remaining', 'pu.receiveNow': 'Receive now', 'pu.itemGoneStock': 'Item was deleted — stock will not be added', 'pu.printAfter': 'Print the receipt after saving',
  'pu.receiveValue': 'Received value', 'pu.confirmReceive': 'Confirm receipt', 'pu.needReceiveQty': 'Enter a received quantity for at least one item',
  'pu.receivedOk': 'fully received and added to stock', 'pu.partialOk': 'partially received — the rest stays open', 'pu.received': 'Received',
  'pu.receipts': 'Goods receipts', 'pu.receiptNo': 'Receipt', 'pu.noReceipts': 'Nothing received yet', 'pu.receiptTitle': 'Goods receipt', 'pu.receivedTotal': 'Total received',
  'pu.cannotDeleteReceived': 'A request that was fully or partly received cannot be deleted — its quantities are in stock', 'pu.deleteQ': 'Delete purchase request?',
  'pu.deleteNote': 'The request and its pending move will be removed permanently.',
  'sp.sub': 'Suppliers and the items they supply — shown in the purchase request form', 'sp.new': 'New supplier', 'sp.searchPh': 'Search by name or phone…',
  'sp.open': 'Open requests', 'sp.lastPurchase': 'Last request', 'sp.value30': 'Purchases (30 days)', 'sp.kCount': 'Suppliers', 'sp.kItems': 'Items linked to suppliers',
  'sp.kOpen': 'Open requests', 'sp.kValue30': 'Purchases (30 days)', 'sp.items': 'Supplier items', 'sp.none': 'No suppliers yet', 'sp.noneSub': 'Add your first supplier to get started',
  'sp.editTitle': 'Edit supplier', 'sp.nameAr': 'Arabic name', 'sp.nameEn': 'English name', 'sp.badPhone': 'Invalid phone number', 'sp.duplicate': 'A supplier with this name exists',
  'sp.itemsSub': 'Items offered when creating a purchase request from this supplier', 'sp.remove': 'Remove item', 'sp.noItems': 'No linked items', 'sp.addItems': 'Add items',
  'sp.otherSuppliers': 'Other suppliers:', 'sp.addSelected': 'Add selected', 'sp.removed': 'removed from supplier items', 'sp.addedItems': 'Items added',
  'sp.hasOpen': 'Cannot delete — this supplier has {n} open purchase request(s)', 'sp.deleteQ': 'Delete supplier?', 'sp.deleteNote': 'Its item links are removed; old purchase requests stay as they are.'
});
Object.assign(I18N.ar, {
  'sr.sub': 'إرجاع أصناف للمورد — تُخصم الكمية من مخزون الفرع الرئيسي فوراً', 'sr.new': 'سند مرتجع جديد', 'sr.searchPh': 'ابحث برقم السند أو المورد أو الصنف…',
  'sr.number': 'رقم السند', 'sr.reason': 'السبب', 'sr.chooseReason': 'اختر السبب (اختياري)', 'sr.note': 'ملاحظة', 'sr.notePh': 'مثال: الكرتون وصل تالف',
  'sr.r.damaged': 'تالف', 'sr.r.expired': 'منتهي الصلاحية', 'sr.r.wrong': 'خطأ في التوريد', 'sr.r.other': 'أخرى',
  'sr.kCount30': 'سندات المرتجع (30 يوماً)', 'sr.kValue30': 'قيمة المرتجع (30 يوماً)', 'sr.kSuppliers30': 'موردون أُرجع لهم (30 يوماً)', 'sr.kTotal': 'كل السندات',
  'sr.none': 'لا توجد مرتجعات', 'sr.noneSub': 'أنشئ أول سند مرتجع للمورد', 'sr.noMain': 'لم يُحدَّد فرع رئيسي — حدّده من صفحة الفروع أولاً',
  'sr.editTitle': 'تعديل سند مرتجع', 'sr.formSub': 'تُخصم الكميات من مخزون:', 'sr.returnItems': 'الأصناف المرتجعة', 'sr.returnValue': 'قيمة المرتجع',
  'sr.submit': 'حفظ وخصم من المخزون', 'sr.available': 'المتاح', 'sr.noStock': 'لا يوجد مخزون', 'sr.noStockFor': 'لا يوجد مخزون متاح من «{name}» للإرجاع',
  'sr.overStock': 'الكمية أكبر من المتاح', 'sr.overStockFor': 'كمية «{name}» أكبر من المتاح في المخزون', 'sr.printAfter': 'طباعة السند بعد الحفظ',
  'sr.voucher': 'سند مرتجع', 'sr.savedOut': 'حُفظ وخُصم من المخزون', 'sr.goneElsewhere': 'حُذف هذا السند من جهاز آخر', 'sr.fromBranch': 'خُصم من',
  'sr.lastEdit': 'آخر تعديل', 'sr.deleteQ': 'حذف سند المرتجع؟', 'sr.deleteNote': 'ستُعاد الكميات إلى مخزون «{branch}».', 'sr.deleted': 'حُذف السند وأُعيدت الكميات للمخزون'
});
Object.assign(I18N.en, {
  'sr.sub': 'Return items to a supplier — quantities leave the main branch stock right away', 'sr.new': 'New return voucher', 'sr.searchPh': 'Search by voucher no., supplier or item…',
  'sr.number': 'Voucher no.', 'sr.reason': 'Reason', 'sr.chooseReason': 'Choose a reason (optional)', 'sr.note': 'Note', 'sr.notePh': 'e.g. carton arrived damaged',
  'sr.r.damaged': 'Damaged', 'sr.r.expired': 'Expired', 'sr.r.wrong': 'Wrong delivery', 'sr.r.other': 'Other',
  'sr.kCount30': 'Return vouchers (30 days)', 'sr.kValue30': 'Returned value (30 days)', 'sr.kSuppliers30': 'Suppliers returned to (30 days)', 'sr.kTotal': 'All vouchers',
  'sr.none': 'No returns yet', 'sr.noneSub': 'Create your first supplier return voucher', 'sr.noMain': 'No main branch is set — set one on the Branches page first',
  'sr.editTitle': 'Edit return voucher', 'sr.formSub': 'Quantities are deducted from:', 'sr.returnItems': 'Returned items', 'sr.returnValue': 'Return value',
  'sr.submit': 'Save and deduct from stock', 'sr.available': 'Available', 'sr.noStock': 'Out of stock', 'sr.noStockFor': 'No stock of “{name}” available to return',
  'sr.overStock': 'More than available', 'sr.overStockFor': 'Quantity of “{name}” is more than the stock available', 'sr.printAfter': 'Print the voucher after saving',
  'sr.voucher': 'Return voucher', 'sr.savedOut': 'saved and deducted from stock', 'sr.goneElsewhere': 'This voucher was deleted on another device', 'sr.fromBranch': 'Deducted from',
  'sr.lastEdit': 'Last edit', 'sr.deleteQ': 'Delete return voucher?', 'sr.deleteNote': 'The quantities will go back to the “{branch}” stock.', 'sr.deleted': 'Voucher deleted and quantities returned to stock'
});
Object.assign(I18N.ar, { 'sp.addItem': 'إضافة صنف', 'sp.add': 'إضافة', 'sp.selectedN': '{n} محدد', 'sp.allLinked': 'كل الأصناف مرتبطة بهذا المورد', 'sp.noItemsHint': 'اضغط «إضافة صنف» لربط أصناف بهذا المورد' });
Object.assign(I18N.en, { 'sp.addItem': 'Add item', 'sp.add': 'Add', 'sp.selectedN': '{n} selected', 'sp.allLinked': 'Every item is already linked to this supplier', 'sp.noItemsHint': 'Tap “Add item” to link items to this supplier' });
Object.assign(I18N.ar, { loadingItems: 'جاري تحميل الأصناف… لحظة' });
Object.assign(I18N.en, { loadingItems: 'Loading items… one moment' });
Object.assign(I18N.ar, { 'sp.typeProduct': 'منتج', 'sp.typeMaterial': 'مادة', 'sp.showMore': 'عرض المزيد', 'sp.clearSel': 'إلغاء التحديد' });
Object.assign(I18N.en, { 'sp.typeProduct': 'Product', 'sp.typeMaterial': 'Material', 'sp.showMore': 'Show more', 'sp.clearSel': 'Clear selection' });

/* Products / stock materials / their categories */
Object.assign(I18N.ar, {
  'it.code': 'الرمز', 'it.price': 'سعر البيع', 'it.cost': 'التكلفة', 'it.unit': 'الوحدة', 'it.stock': 'الكمية في المخزون', 'it.category': 'التصنيف', 'it.storage': 'مكان التخزين', 'it.origin': 'بلد المنشأ',
  'it.min': 'الحد الأدنى', 'it.reorder': 'نقطة إعادة الطلب', 'it.max': 'الحد الأعلى', 'it.barcode': 'الباركود', 'it.barcodeValue': 'قيمة الباركود', 'it.generate': 'إنشاء',
  'it.nameAr': 'الاسم بالعربي', 'it.nameEn': 'الاسم بالإنجليزي', 'it.opening': 'الرصيد الافتتاحي', 'it.openingLocked': 'لا يتغير بعد الإضافة', 'it.chooseUnit': 'اختر الوحدة',
  'it.unitDef': 'تعريف الوحدة', 'it.unitDefQty': 'الكمية', 'it.unitDefUnit': 'الوحدة', 'it.unitDefBoth': 'أدخل الكمية والوحدة معاً، أو اتركهما فارغين',
  'it.fixedExpiry': 'تاريخ صلاحية محدد', 'it.prodDate': 'تاريخ الإنتاج', 'it.expDate': 'تاريخ الانتهاء', 'it.datesBoth': 'اختر تاريخ الإنتاج وتاريخ الانتهاء',
  'it.preview': 'معاينة الباركود', 'it.downloadBc': 'تحميل الباركود', 'it.bcInvalid': 'الباركود يحتوي على رموز غير مدعومة', 'it.copied': 'تم نسخ الباركود', 'it.clickCopy': 'اضغط للنسخ',
  'it.allCats': 'كل التصنيفات', 'it.allLocs': 'كل أماكن التخزين', 'it.allOrigins': 'كل بلدان المنشأ', 'it.perPage': 'لكل صفحة', 'it.sort': 'الفرز',
  'it.sort.default': 'بدون فرز', 'it.sort.salesDesc': 'الأعلى مبيعاً', 'it.sort.salesAsc': 'الأقل مبيعاً', 'it.sort.incompleteInfo': 'منتجات ناقصة معلومات', 'it.loadingSales': 'جاري تحميل المبيعات…',
  'it.exportSel': 'تحميل المحدد', 'ix.excel': 'إكسل', 'ix.nLocs': '{n} أماكن محددة', 'ix.nCats': '{n} تصنيفات محددة', 'ix.searchIn': 'ابحث…', 'ix.noCat': 'بدون تصنيف', 'ix.itemsN': 'صنف', 'it.codesFixed': 'تم إعطاء رمز جديد لـ {n} صنف', 'ix.pdf': 'طباعة PDF', 'ix.levels': 'مستويات المخزون', 'ix.all': 'كل البيانات', 'ix.levelsSub': 'الرمز والاسم والكمية وحدود الطلب', 'ix.allSub': 'كل أعمدة الجدول', 'ix.no': 'م', 'ix.nameAr': 'اسم المنتج بالعربي', 'ix.nameEn': 'اسم المنتج بالإنجليزي', 'ix.min': 'أقل كمية للطلب', 'ix.max': 'أقصى كمية', 'ix.count': 'عدد الأصناف', 'ix.filters': 'الفلاتر', 'ix.noFilter': 'بدون فلتر', 'ix.empty': 'لا توجد نتائج للتصدير', 'ix.search': 'البحث', 'ix.catsOfLoc': 'التصنيفات المتعلقة بمكان التخزين ({x})', 'ix.locsOfCat': 'أماكن التخزين المتعلقة بالتصنيف ({x})', 'ix.levelsTitle': 'مستويات المخزون', 'ix.allTitle': 'بيانات الأصناف', 'it.bcZip': 'تحميل الباركودات', 'it.import': 'إضافة من إكسل', 'it.selectFirst': 'حدد أصنافاً من الجدول أولاً', 'it.selectAll': 'تحديد كل الصفحة',
  'it.items': 'صنف', 'it.kCritical': 'وصلت نقطة إعادة الطلب', 'it.kWarning': 'قريبة من نقطة الطلب', 'it.kCats': 'التصنيفات', 'it.criticalTip': 'الرصيد عند نقطة إعادة الطلب أو أقل', 'it.warningTip': 'الرصيد قريب من نقطة إعادة الطلب',
  'it.searchPh': 'ابحث بالاسم أو الرمز أو الباركود…', 'it.deleteNote': 'سيُحذف نهائياً من القائمة.', 'it.goneElsewhere': 'حُذف هذا الصنف من جهاز آخر', 'it.libFail': 'تعذر تحميل المكتبة، تحقق من الاتصال',
  'it.product.new': 'منتج جديد', 'it.product.edit': 'تعديل منتج', 'it.product.sub': 'المنتجات مع أسعارها وأرصدتها وباركوداتها', 'it.product.none': 'لا توجد منتجات', 'it.product.noneSub': 'أضف أول منتج أو استورد من إكسل',
  'it.product.deleteQ': 'حذف المنتج؟', 'it.product.kTotal': 'عدد المنتجات', 'it.product.importTitle': 'إضافة مجموعة منتجات',
  'it.material.new': 'مادة جديدة', 'it.material.edit': 'تعديل مادة', 'it.material.sub': 'مواد المخزون مع تكلفتها وأرصدتها وباركوداتها', 'it.material.none': 'لا توجد مواد', 'it.material.noneSub': 'أضف أول مادة أو استورد من إكسل',
  'it.material.deleteQ': 'حذف المادة؟', 'it.material.kTotal': 'عدد المواد', 'it.material.importTitle': 'إضافة مجموعة مواد',
  'imp.sub': 'نفس نموذج الإكسل المستخدم في النظام القديم', 'imp.step1': 'نزّل النموذج واملأه', 'imp.step1Sub': 'صف لكل صنف — الاسمان والوحدة مطلوبة', 'imp.template': 'تحميل النموذج',
  'imp.step2': 'اختر الملف', 'imp.step2Sub': 'الأصناف الموجودة مسبقاً أو المكررة في الملف يتم تجاهلها', 'imp.choose': 'اضغط لاختيار ملف أو اسحبه هنا',
  'imp.loaded': 'صفوف الملف: {n}', 'imp.dupFile': 'مكرر داخل الملف: {n}', 'imp.existing': 'موجود مسبقاً (تم تجاهله): {n}', 'imp.ready': 'جاهز للإضافة: {n}', 'imp.nothing': 'لا توجد صفوف جديدة للإضافة',
  'imp.badFile': 'تعذرت قراءة الملف', 'imp.go': 'إضافة {n}', 'imp.progress': 'تمت معالجة {a} من {b}', 'imp.done': 'تمت إضافة {n} بنجاح', 'imp.partial': 'أُضيف {ok} — فشل {n}، اضغط إضافة لإعادة المحاولة',
  'pc.home': 'الرئيسية', 'pc.back': 'رجوع', 'pc.path': 'مسار الأقسام', 'pc.newCat': 'قسم جديد', 'pc.newSub': 'قسم فرعي', 'pc.searchPh': 'ابحث في الأقسام…', 'pc.open': 'فتح',
  'pc.subsN': '{n} قسم فرعي', 'pc.noCats': 'لا توجد أقسام هنا', 'pc.noCatsSub': 'اضغط «قسم جديد» لإضافة أول قسم', 'pc.noCatsSubIn': 'اضغط «قسم فرعي» لإضافة قسم داخل هذا القسم',
  'pc.editTitle': 'تعديل القسم', 'pc.inside': 'داخل قسم: {name}', 'pc.atTop': 'في المستوى الرئيسي', 'pc.deleteQ': 'حذف القسم؟', 'pc.folder': 'القسم', 'pc.subFolders': 'أقسام فرعية',
  'pc.removeItem': 'إزالة من القسم', 'pc.removed': 'أُزيل من القسم', 'pc.assigned': 'تم تحديث أصناف القسم', 'pc.inFolder': 'في القسم', 'pc.willAdd': 'إضافة {n}', 'pc.willRemove': 'إزالة {n}',
  'pc.product.sub': 'أقسام المنتجات وأقسامها الفرعية', 'pc.product.assign': 'إضافة منتجات للقسم', 'pc.product.itemsN': '{n} منتج', 'pc.product.itemsTitle': 'منتجات القسم', 'pc.product.itemsWord': 'منتجات ستصبح بدون تصنيف',
  'pc.product.pickFolder': 'افتح قسماً لعرض منتجاته', 'pc.product.noItems': 'لا توجد منتجات في هذا القسم — اضغط «إضافة منتجات للقسم»', 'pc.product.assignSub': 'المنتجات بدون تصنيف أو التابعة لهذا القسم',
  'pc.product.noFree': 'كل المنتجات مصنفة في أقسام أخرى', 'pc.product.noFreeSub': 'تظهر هنا المنتجات بدون تصنيف فقط', 'pc.product.deleteNote': 'ستُحذف أقسامه الفرعية أيضاً، وتبقى المنتجات بدون تصنيف.',
  'pc.material.sub': 'أقسام مواد المخزون وأقسامها الفرعية', 'pc.material.assign': 'إضافة مواد للقسم', 'pc.material.itemsN': '{n} مادة', 'pc.material.itemsTitle': 'مواد القسم', 'pc.material.itemsWord': 'مواد ستصبح بدون تصنيف',
  'pc.material.pickFolder': 'افتح قسماً لعرض مواده', 'pc.material.noItems': 'لا توجد مواد في هذا القسم — اضغط «إضافة مواد للقسم»', 'pc.material.assignSub': 'المواد بدون تصنيف أو التابعة لهذا القسم',
  'pc.material.noFree': 'كل المواد مصنفة في أقسام أخرى', 'pc.material.noFreeSub': 'تظهر هنا المواد بدون تصنيف فقط', 'pc.material.deleteNote': 'ستُحذف أقسامه الفرعية أيضاً، وتبقى المواد بدون تصنيف.'
});
Object.assign(I18N.en, {
  'it.code': 'Code', 'it.price': 'Sale price', 'it.cost': 'Cost', 'it.unit': 'Unit', 'it.stock': 'Stock qty', 'it.category': 'Category', 'it.storage': 'Storage', 'it.origin': 'Origin',
  'it.min': 'Min', 'it.reorder': 'Reorder point', 'it.max': 'Max', 'it.barcode': 'Barcode', 'it.barcodeValue': 'Barcode value', 'it.generate': 'Generate',
  'it.nameAr': 'Arabic name', 'it.nameEn': 'English name', 'it.opening': 'Opening balance', 'it.openingLocked': 'Fixed once the item is added', 'it.chooseUnit': 'Choose a unit',
  'it.unitDef': 'Unit definition', 'it.unitDefQty': 'Quantity', 'it.unitDefUnit': 'Unit', 'it.unitDefBoth': 'Enter both quantity and unit, or leave both empty',
  'it.fixedExpiry': 'Fixed expiry date', 'it.prodDate': 'Production date', 'it.expDate': 'Expiry date', 'it.datesBoth': 'Choose the production and expiry dates',
  'it.preview': 'Barcode preview', 'it.downloadBc': 'Download barcode', 'it.bcInvalid': 'The barcode has unsupported characters', 'it.copied': 'Barcode copied', 'it.clickCopy': 'Click to copy',
  'it.allCats': 'All categories', 'it.allLocs': 'All storage locations', 'it.allOrigins': 'All origins', 'it.perPage': 'Per page', 'it.sort': 'Sort',
  'it.sort.default': 'No sorting', 'it.sort.salesDesc': 'Best selling', 'it.sort.salesAsc': 'Least selling', 'it.sort.incompleteInfo': 'Incomplete info', 'it.loadingSales': 'Loading sales…',
  'it.exportSel': 'Download selected', 'ix.excel': 'Excel', 'ix.nLocs': '{n} locations selected', 'ix.nCats': '{n} categories selected', 'ix.searchIn': 'Search…', 'ix.noCat': 'No category', 'ix.itemsN': 'items', 'it.codesFixed': 'New codes given to {n} items', 'ix.pdf': 'Print PDF', 'ix.levels': 'Stock levels', 'ix.all': 'All data', 'ix.levelsSub': 'Code, name, quantity and order limits', 'ix.allSub': 'Every column of the table', 'ix.no': '#', 'ix.nameAr': 'Arabic name', 'ix.nameEn': 'English name', 'ix.min': 'Min order qty', 'ix.max': 'Max qty', 'ix.count': 'Items', 'ix.filters': 'Filters', 'ix.noFilter': 'No filter', 'ix.empty': 'Nothing to export', 'ix.search': 'Search', 'ix.catsOfLoc': 'Categories in storage location ({x})', 'ix.locsOfCat': 'Storage locations for category ({x})', 'ix.levelsTitle': 'Stock levels', 'ix.allTitle': 'Item data', 'it.bcZip': 'Download barcodes', 'it.import': 'Import from Excel', 'it.selectFirst': 'Select items in the table first', 'it.selectAll': 'Select the whole page',
  'it.items': 'items', 'it.kCritical': 'At reorder point', 'it.kWarning': 'Near reorder point', 'it.kCats': 'Categories', 'it.criticalTip': 'Stock at or below the reorder point', 'it.warningTip': 'Stock close to the reorder point',
  'it.searchPh': 'Search by name, code or barcode…', 'it.deleteNote': 'It will be removed from the list for good.', 'it.goneElsewhere': 'This item was deleted on another device', 'it.libFail': 'Could not load the library — check the connection',
  'it.product.new': 'New product', 'it.product.edit': 'Edit product', 'it.product.sub': 'Products with their prices, stock and barcodes', 'it.product.none': 'No products yet', 'it.product.noneSub': 'Add the first product or import from Excel',
  'it.product.deleteQ': 'Delete product?', 'it.product.kTotal': 'Products', 'it.product.importTitle': 'Import products',
  'it.material.new': 'New material', 'it.material.edit': 'Edit material', 'it.material.sub': 'Stock materials with their cost, stock and barcodes', 'it.material.none': 'No materials yet', 'it.material.noneSub': 'Add the first material or import from Excel',
  'it.material.deleteQ': 'Delete material?', 'it.material.kTotal': 'Materials', 'it.material.importTitle': 'Import materials',
  'imp.sub': 'Same Excel template as the old system', 'imp.step1': 'Download and fill the template', 'imp.step1Sub': 'One row per item — both names and the unit are required', 'imp.template': 'Download template',
  'imp.step2': 'Choose the file', 'imp.step2Sub': 'Items that already exist or repeat in the file are skipped', 'imp.choose': 'Click to choose a file or drop it here',
  'imp.loaded': 'Rows in file: {n}', 'imp.dupFile': 'Repeated in file: {n}', 'imp.existing': 'Already exist (skipped): {n}', 'imp.ready': 'Ready to add: {n}', 'imp.nothing': 'No new rows to add',
  'imp.badFile': 'Could not read the file', 'imp.go': 'Add {n}', 'imp.progress': '{a} of {b} processed', 'imp.done': '{n} added successfully', 'imp.partial': '{ok} added — {n} failed, press Add to retry',
  'pc.home': 'Top level', 'pc.back': 'Back', 'pc.path': 'Folder path', 'pc.newCat': 'New category', 'pc.newSub': 'Subcategory', 'pc.searchPh': 'Search categories…', 'pc.open': 'Open',
  'pc.subsN': '{n} subcategories', 'pc.noCats': 'No categories here', 'pc.noCatsSub': 'Press “New category” to add the first one', 'pc.noCatsSubIn': 'Press “Subcategory” to add one inside this category',
  'pc.editTitle': 'Edit category', 'pc.inside': 'Inside: {name}', 'pc.atTop': 'At the top level', 'pc.deleteQ': 'Delete category?', 'pc.folder': 'Category', 'pc.subFolders': 'Subcategories',
  'pc.removeItem': 'Remove from category', 'pc.removed': 'removed from the category', 'pc.assigned': 'Category items updated', 'pc.inFolder': 'In category', 'pc.willAdd': 'Add {n}', 'pc.willRemove': 'Remove {n}',
  'pc.product.sub': 'Product categories and their subcategories', 'pc.product.assign': 'Add products', 'pc.product.itemsN': '{n} products', 'pc.product.itemsTitle': 'Products in this category', 'pc.product.itemsWord': 'Products left uncategorised',
  'pc.product.pickFolder': 'Open a category to see its products', 'pc.product.noItems': 'No products in this category — press “Add products”', 'pc.product.assignSub': 'Uncategorised products or ones in this category',
  'pc.product.noFree': 'Every product is in another category', 'pc.product.noFreeSub': 'Only uncategorised products show here', 'pc.product.deleteNote': 'Its subcategories are deleted too; products stay, uncategorised.',
  'pc.material.sub': 'Stock material categories and their subcategories', 'pc.material.assign': 'Add materials', 'pc.material.itemsN': '{n} materials', 'pc.material.itemsTitle': 'Materials in this category', 'pc.material.itemsWord': 'Materials left uncategorised',
  'pc.material.pickFolder': 'Open a category to see its materials', 'pc.material.noItems': 'No materials in this category — press “Add materials”', 'pc.material.assignSub': 'Uncategorised materials or ones in this category',
  'pc.material.noFree': 'Every material is in another category', 'pc.material.noFreeSub': 'Only uncategorised materials show here', 'pc.material.deleteNote': 'Its subcategories are deleted too; materials stay, uncategorised.'
});

/* الطلبات · طلبات الأونلاين · العملاء */
Object.assign(I18N.ar, {
  'o.sub': 'فواتير الكاشير مع العميل والمنطقة والتوصيل — طباعة وتعديل وإلغاء', 'o.searchPh': 'ابحث برقم الفاتورة أو العميل أو الهاتف أو المنتج…',
  'o.number': 'رقم الفاتورة', 'o.customer': 'العميل', 'o.zone': 'المنطقة', 'o.cashier': 'الكاشير', 'o.branch': 'الفرع', 'o.type': 'نوع الطلب',
  'o.net': 'الصافي', 'o.fee': 'التوصيل', 'o.grand': 'الإجمالي', 'o.payment': 'طريقة الدفع', 'o.address': 'العنوان', 'o.table': 'رقم الطاولة',
  'o.product': 'المنتج', 'o.price': 'السعر', 'o.unit': 'الوحدة', 'o.invoice': 'فاتورة', 'o.pdf': 'PDF', 'o.status': 'الحالة',
  'o.active': 'فعالة', 'o.cancelled': 'ملغية', 'o.cancelledBy': 'ملغية — ألغيت بواسطة:', 'o.cancelledByCol': 'ألغيت بواسطة', 'o.cancelledAt': 'وقت الإلغاء', 'o.unknown': 'غير معروف',
  'o.delivery': 'توصيل', 'o.pickup': 'استلام', 'o.cash': 'كاش', 'o.online': 'أونلاين', 'o.knet': 'كي-نت',
  'o.allCashiers': 'كل الكاشيرية', 'o.allTypes': 'كل أنواع الطلب', 'o.allZones': 'كل المناطق', 'o.zones': 'المناطق', 'o.searchZone': 'ابحث عن منطقة…',
  'o.selectAll': 'تحديد الكل', 'o.clearAll': 'إلغاء التحديد', 'o.printReport': 'طباعة التقرير', 'o.download': 'تحميل إكسل', 'o.nothingToExport': 'لا توجد طلبات للتصدير',
  'o.kCount': 'عدد الطلبات', 'o.none': 'لا توجد طلبات', 'o.noneSub': 'تظهر هنا فواتير الكاشير', 'o.ordersWord': 'طلب',
  'o.deferred': 'فواتير مؤجلة من هذا اليوم', 'o.deferredSub': 'أُنشئت في هذا اليوم وتُحتسب في تاريخ التأجيل', 'o.deferredTo': 'مؤجلة إلى',
  'o.editTitle': 'تعديل الفاتورة', 'o.custInfo': 'بيانات العميل والتوصيل', 'o.defer': 'تأجيل الفاتورة', 'o.deferDate': 'تاريخ التأجيل', 'o.pickDeferDate': 'اختر تاريخ التأجيل',
  'o.discount': 'الخصم', 'o.discType': 'نوع الخصم', 'o.discValue': 'قيمة الخصم', 'o.disc.none': 'بدون خصم', 'o.disc.percent': 'نسبة %', 'o.disc.fixed': 'مبلغ ثابت',
  'o.findProduct': 'ابحث عن منتج بالاسم أو الرمز أو الباركود…', 'o.pickFirst': 'اختر منتجاً من نتائج البحث', 'o.picked': 'المنتج المختار:', 'o.addItem': 'إضافة',
  'o.itemNote': 'ملاحظة على المنتج', 'o.noItems': 'لا توجد منتجات في الفاتورة', 'o.beforeDisc': 'المجموع قبل الخصم', 'o.emptyCart': 'الفاتورة يجب أن تحتوي على منتج واحد على الأقل',
  'o.cantEditCancelled': 'لا يمكن تعديل فاتورة ملغية أو محذوفة', 'o.cancelInvoice': 'إلغاء الفاتورة', 'o.cancelQ': 'إلغاء الفاتورة؟',
  'o.cancelNote': 'هل تريد إلغاء هذه الفاتورة؟ ستبقى في الكشوفات مع اسمك ووقت الإلغاء، ويرجع المخزون المخصوم منها.', 'o.cancelledOk': 'تم إلغاء الفاتورة',
  'o.alreadyCancelled': 'الفاتورة ملغية مسبقاً', 'o.needLogin': 'لا يمكن تحديد اسم المستخدم — سجّل الدخول مرة أخرى',
  'oo.sub': 'طلبات المتجر الإلكتروني من سيرفر المنصة — تتحدث كل دقيقة', 'oo.refresh': 'تحديث', 'oo.refreshed': 'تم تحديث الطلبات', 'oo.catalog': 'الكتالوج',
  'oo.cat.all': 'كل الكتالوجات', 'oo.cat.bakery': 'المخبز', 'oo.cat.restaurant': 'المطعم', 'oo.kDelivery': 'طلبات التوصيل',
  'oo.none': 'لا توجد طلبات أونلاين', 'oo.noneSub': 'تظهر هنا طلبات المتجر الإلكتروني', 'oo.denied': 'لا توجد صلاحية لقراءة طلبات الأونلاين — سجّل الدخول مرة أخرى', 'oo.offline': 'تعذر الاتصال بسيرفر المنصة — تُعرض آخر بيانات محملة',
  'cu.sub': 'العملاء مع عناوينهم وطلباتهم ومستوياتهم', 'cu.new': 'عميل جديد', 'cu.import': 'إضافة من إكسل', 'cu.download': 'تحميل إكسل',
  'cu.searchPh': 'ابحث بالاسم أو الهاتف أو المنطقة أو العنوان…', 'cu.level': 'المستوى', 'cu.lv.all': 'كل المستويات', 'cu.lv.regular': 'عادي', 'cu.lv.vip': 'VIP', 'cu.lv.vvip': 'VVIP',
  'cu.sortDesc': 'الأكثر طلبات', 'cu.sortAsc': 'الأقل طلبات', 'cu.blockedOnly': 'المحظورين فقط', 'cu.lastOrder': 'آخر طلب', 'cu.orders': 'عدد الطلبات',
  'cu.avgValue': 'متوسط قيمة الطلب', 'cu.avgGap': 'متوسط الأيام بين الطلبات', 'cu.status': 'الحالة', 'cu.blocked': 'محظور', 'cu.active': 'نشط',
  'cu.details': 'تفاصيل العميل', 'cu.block': 'حظر', 'cu.unblock': 'إلغاء الحظر', 'cu.blockQ': 'حظر العميل؟', 'cu.unblockQ': 'إلغاء حظر العميل؟', 'cu.reason': 'سبب الحظر',
  'cu.blockedOk': 'تم حظر العميل', 'cu.unblocked': 'تم إلغاء الحظر', 'cu.deleteQ': 'حذف العميل؟', 'cu.deleteNote': 'يُحذف العميل من القائمة، وتبقى طلباته في الكشوفات.',
  'cu.kTotal': 'عدد العملاء', 'cu.kOrdering': 'عملاء لديهم طلبات', 'cu.kVip': 'VIP و VVIP', 'cu.kBlocked': 'محظورون',
  'cu.none': 'لا يوجد عملاء', 'cu.noneSub': 'اضغط «عميل جديد» لإضافة أول عميل', 'cu.nameOnly': 'اسم فقط (بدون عنوان)', 'cu.chooseZone': 'اختر المنطقة', 'cu.addrDetails': 'تفاصيل العنوان',
  'kd.open': 'عرض التفاصيل', 'kd.back': 'رجوع', 'rp.src': 'نوع الفاتورة', 'kd.byReason': 'حسب السبب', 'kd.noReason': 'بدون سبب', 'kd.bySupplier': 'حسب المورد', 'kd.waiting': 'منذ', 'kd.daysN': '{n} يوم', 'kd.todayShort': 'اليوم', 'kd.soonSub': 'دفعات تنتهي صلاحيتها خلال 7 أيام، الأقرب أولاً', 'kd.soonNone': 'لا توجد دفعات تنتهي قريباً', 'kd.today': 'تنتهي اليوم', 'kd.left': 'المتبقي', 'kd.daysLeft': 'باقي {n} يوم', 'kd.vouchers': 'السندات', 'kd.lines': 'السطور', 'kd.byItem': 'حسب الصنف', 'kd.itemsN': 'عدد الأصناف', 'kd.item': 'الصنف', 'kd.unit': 'الوحدة', 'kd.before': 'الرصيد قبل', 'kd.counted': 'المجرود', 'kd.diff': 'الفرق', 'kd.plus': 'زيادة', 'kd.minus': 'نقص', 'kd.dpSub': 'اضغط منطقة للانتقال إلى خانة سعرها', 'kd.minPrice': 'أقل سعر', 'kd.maxPrice': 'أعلى سعر', 'kd.noCat': 'بدون تصنيف', 'kd.parentCat': 'التصنيف الرئيسي', 'kd.catsSub': 'كل تصنيف وعدد الأصناف فيه وما يحتاج إعادة طلب — اضغط تصنيفاً لعرض أصنافه', 'kd.share': 'النسبة', 'kd.byBranch': 'حسب الفرع', 'kd.byArea': 'حسب المنطقة', 'kd.byPay': 'حسب طريقة الدفع', 'kd.byType': 'حسب نوع الطلب', 'kd.orders': 'عدد الطلبات', 'kd.filtered': 'حسب الفلاتر المختارة في الصفحة', 'kd.branch': 'الفرع', 'kd.area': 'المنطقة', 'kd.pay': 'طريقة الدفع', 'kd.type': 'نوع الطلب', 'kd.avg': 'المتوسط', 'kd.last30': 'آخر 30 يوماً', 'kd.search': 'بحث في القائمة…', 'kd.rows': 'سجل', 'kd.none': 'لا توجد بيانات', 'kd.more': 'عرض {n} أخرى',
  'cu.dOrderingSub': 'كل عميل له طلب واحد على الأقل (غير ملغى)، مرتبون حسب مجموع مشترياتهم', 'cu.dVipSub': 'العملاء المميزون حسب إعدادات المستويات', 'cu.dLastDays': 'آخر {n} يوماً', 'cu.dAllTime': 'كل الطلبات', 'cu.dToday': 'اليوم', 'cu.dAgo': 'قبل {n} يوم', 'cu.dBlockedSub': 'العملاء الموقوفون وسبب الحظر', 'cu.dNoBlocked': 'لا يوجد عملاء محظورون',
  'cu.levelSettings': 'إعدادات المستويات', 'cu.lvSub': 'كيف يحسب النظام مستوى العميل (عادي / VIP / VVIP)', 'cu.lvHow': 'طريقة الحساب',
  'cu.lvHow1': 'تُحسب طلبات العميل غير الملغاة خلال المدة المحددة (آخر 90 يوماً افتراضياً)، وتُربط بالعميل عن طريق رقم الهاتف.', 'cu.lvHow2': 'يُنظر إلى ثلاثة أشياء: عدد الطلبات، ومجموع ما دفعه، ومتى كان آخر طلب له.',
  'cu.lvHow3': 'يصير العميل VVIP إذا حقق الشروط الثلاثة لـ VVIP، وإلا VIP إذا حقق شروط VIP، وإلا يكون عادياً.', 'cu.lvHow4': 'العميل الذي يتوقف عن الطلب ينزل مستواه تلقائياً، وطلبان في يوم واحد لا يرفعانه.',
  'cu.lvOrders': 'أقل عدد طلبات', 'cu.lvSpend': 'أقل مجموع مدفوع', 'cu.lvRecent': 'آخر طلب خلال', 'cu.lvGeneral': 'شروط عامة', 'cu.lvMinOrders': 'أقل عدد طلبات',
  'cu.lvMinOrdersHint': 'العميل الذي طلباته أقل من هذا العدد يبقى عادياً (أقل قيمة 2، لأن متوسط الأيام يحتاج طلبين).', 'cu.lvDays': 'مدة الحساب: آخر',
  'cu.lvDaysHint': 'الطلبات الأقدم من هذه المدة لا تُحسب في المستوى. 0 = كل الطلبات منذ البداية.',
  'cu.lvPreview': 'عدد العملاء بهذه الإعدادات', 'cu.lvReset': 'القيم الأصلية', 'cu.lvBad': 'أدخل أرقاماً صحيحة (صفر أو أكثر)', 'cu.kd': 'د.ك', 'cu.days': 'يوم',
  'cu.lvManual': 'مستوى محدد يدوياً لهذا العميل', 'cu.phoneBad': 'رقم الهاتف يجب أن يكون 8 أرقام (كويتي)',
  'cu.phoneTaken': 'رقم الهاتف مسجل لعميل آخر', 'cu.editTitle': 'تعديل العميل', 'cu.addresses': 'العناوين', 'cu.addAddress': 'إضافة عنوان', 'cu.noAddress': 'لا توجد عناوين',
  'cu.backList': 'رجوع لقائمة العملاء', 'cu.backCustomer': 'رجوع لتفاصيل العميل', 'cu.productsAmount': 'مبلغ المنتجات', 'cu.deliveryAmount': 'مبلغ التوصيل', 'cu.totalSales': 'إجمالي المبيعات',
  'cu.favorite': 'المنتج المفضل', 'cu.noOrders': 'لا توجد طلبات لهذا العميل',
  'cu.importTitle': 'إضافة عملاء من إكسل', 'cu.impStep1Sub': 'الأعمدة: اسم الزبون، رقم الهاتف، العنوان (المنطقة - التفاصيل)', 'cu.impStep2Sub': 'الأرقام المسجلة أو المكررة في الملف يتم تجاهلها',
  'cu.impExisting': 'رقم مسجل مسبقاً (تم تجاهله): {n}', 'cu.impInvalid': 'صفوف ناقصة الاسم أو الهاتف أو العنوان: {n}', 'cu.impNoZone': 'منطقة غير موجودة في مناطق التوصيل: {n}'
});
Object.assign(I18N.en, {
  'o.sub': 'Cashier invoices with customer, zone and delivery — print, edit and cancel', 'o.searchPh': 'Search by invoice no., customer, phone or product…',
  'o.number': 'Invoice no.', 'o.customer': 'Customer', 'o.zone': 'Zone', 'o.cashier': 'Cashier', 'o.branch': 'Branch', 'o.type': 'Order type',
  'o.net': 'Net', 'o.fee': 'Delivery', 'o.grand': 'Total', 'o.payment': 'Payment', 'o.address': 'Address', 'o.table': 'Table no.',
  'o.product': 'Product', 'o.price': 'Price', 'o.unit': 'Unit', 'o.invoice': 'Invoice', 'o.pdf': 'PDF', 'o.status': 'Status',
  'o.active': 'Active', 'o.cancelled': 'Cancelled', 'o.cancelledBy': 'Cancelled by:', 'o.cancelledByCol': 'Cancelled by', 'o.cancelledAt': 'Cancelled at', 'o.unknown': 'unknown',
  'o.delivery': 'Delivery', 'o.pickup': 'Pickup', 'o.cash': 'Cash', 'o.online': 'Online', 'o.knet': 'KNET',
  'o.allCashiers': 'All cashiers', 'o.allTypes': 'All order types', 'o.allZones': 'All zones', 'o.zones': 'Zones', 'o.searchZone': 'Search zones…',
  'o.selectAll': 'Select all', 'o.clearAll': 'Clear', 'o.printReport': 'Print report', 'o.download': 'Download Excel', 'o.nothingToExport': 'No orders to export',
  'o.kCount': 'Orders', 'o.none': 'No orders', 'o.noneSub': 'Cashier invoices show here', 'o.ordersWord': 'orders',
  'o.deferred': 'Invoices deferred from this day', 'o.deferredSub': 'Created this day, counted on their deferral date', 'o.deferredTo': 'Deferred to',
  'o.editTitle': 'Edit invoice', 'o.custInfo': 'Customer & delivery', 'o.defer': 'Defer invoice', 'o.deferDate': 'Deferral date', 'o.pickDeferDate': 'Choose the deferral date',
  'o.discount': 'Discount', 'o.discType': 'Discount type', 'o.discValue': 'Discount value', 'o.disc.none': 'No discount', 'o.disc.percent': 'Percent %', 'o.disc.fixed': 'Fixed amount',
  'o.findProduct': 'Search a product by name, code or barcode…', 'o.pickFirst': 'Pick a product from the results', 'o.picked': 'Selected:', 'o.addItem': 'Add',
  'o.itemNote': 'Item note', 'o.noItems': 'The invoice has no products', 'o.beforeDisc': 'Subtotal before discount', 'o.emptyCart': 'The invoice needs at least one product',
  'o.cantEditCancelled': 'A cancelled or deleted invoice can’t be edited', 'o.cancelInvoice': 'Cancel invoice', 'o.cancelQ': 'Cancel invoice?',
  'o.cancelNote': 'Cancel this invoice? It stays in the reports with your name and the cancel time, and its deducted stock is returned.', 'o.cancelledOk': 'Invoice cancelled',
  'o.alreadyCancelled': 'The invoice is already cancelled', 'o.needLogin': 'Your user name is unknown — sign in again',
  'oo.sub': 'Online store orders from the platform server — refreshed every minute', 'oo.refresh': 'Refresh', 'oo.refreshed': 'Orders refreshed', 'oo.catalog': 'Catalog',
  'oo.cat.all': 'All catalogs', 'oo.cat.bakery': 'Bakery', 'oo.cat.restaurant': 'Restaurant', 'oo.kDelivery': 'Delivery orders',
  'oo.none': 'No online orders', 'oo.noneSub': 'Online store orders show here', 'oo.denied': 'No permission to read online orders — sign in again', 'oo.offline': 'Can’t reach the platform server — showing the last loaded data',
  'cu.sub': 'Customers with their addresses, orders and levels', 'cu.new': 'New customer', 'cu.import': 'Import from Excel', 'cu.download': 'Download Excel',
  'cu.searchPh': 'Search by name, phone, zone or address…', 'cu.level': 'Level', 'cu.lv.all': 'All levels', 'cu.lv.regular': 'Regular', 'cu.lv.vip': 'VIP', 'cu.lv.vvip': 'VVIP',
  'cu.sortDesc': 'Most orders', 'cu.sortAsc': 'Fewest orders', 'cu.blockedOnly': 'Blocked only', 'cu.lastOrder': 'Last order', 'cu.orders': 'Orders',
  'cu.avgValue': 'Avg order value', 'cu.avgGap': 'Avg days between orders', 'cu.status': 'Status', 'cu.blocked': 'Blocked', 'cu.active': 'Active',
  'cu.details': 'Customer details', 'cu.block': 'Block', 'cu.unblock': 'Unblock', 'cu.blockQ': 'Block customer?', 'cu.unblockQ': 'Unblock customer?', 'cu.reason': 'Block reason',
  'cu.blockedOk': 'Customer blocked', 'cu.unblocked': 'Customer unblocked', 'cu.deleteQ': 'Delete customer?', 'cu.deleteNote': 'The customer is removed from the list; their orders stay in the reports.',
  'cu.kTotal': 'Customers', 'cu.kOrdering': 'With orders', 'cu.kVip': 'VIP & VVIP', 'cu.kBlocked': 'Blocked',
  'cu.none': 'No customers', 'cu.noneSub': 'Press “New customer” to add the first one', 'cu.nameOnly': 'Name only (no address)', 'cu.chooseZone': 'Choose a zone', 'cu.addrDetails': 'Address details',
  'kd.open': 'show details', 'kd.back': 'Back', 'rp.src': 'Invoice type', 'kd.byReason': 'by reason', 'kd.noReason': 'No reason', 'kd.bySupplier': 'by supplier', 'kd.waiting': 'Waiting', 'kd.daysN': '{n} days', 'kd.todayShort': 'today', 'kd.soonSub': 'batches expiring within 7 days, soonest first', 'kd.soonNone': 'No batches expiring soon', 'kd.today': 'Expires today', 'kd.left': 'Left', 'kd.daysLeft': '{n} days left', 'kd.vouchers': 'Vouchers', 'kd.lines': 'Lines', 'kd.byItem': 'by item', 'kd.itemsN': 'Items', 'kd.item': 'Item', 'kd.unit': 'Unit', 'kd.before': 'Before', 'kd.counted': 'Counted', 'kd.diff': 'Difference', 'kd.plus': 'Over', 'kd.minus': 'Short', 'kd.dpSub': 'click an area to jump to its price box', 'kd.minPrice': 'Lowest price', 'kd.maxPrice': 'Highest price', 'kd.noCat': 'No category', 'kd.parentCat': 'Parent category', 'kd.catsSub': 'Each category, its items and what needs reordering — click one to list its items', 'kd.share': 'Share', 'kd.byBranch': 'by branch', 'kd.byArea': 'by area', 'kd.byPay': 'by payment method', 'kd.byType': 'by order type', 'kd.orders': 'Orders', 'kd.filtered': 'using the filters chosen on the page', 'kd.branch': 'Branch', 'kd.area': 'Area', 'kd.pay': 'Payment method', 'kd.type': 'Order type', 'kd.avg': 'Average', 'kd.last30': 'last 30 days', 'kd.search': 'Search the list…', 'kd.rows': 'records', 'kd.none': 'No data', 'kd.more': 'Show {n} more',
  'cu.dOrderingSub': 'Every customer with at least one non-cancelled order, by total spent', 'cu.dVipSub': 'Top customers by the level settings', 'cu.dLastDays': 'last {n} days', 'cu.dAllTime': 'all orders', 'cu.dToday': 'today', 'cu.dAgo': '{n} days ago', 'cu.dBlockedSub': 'Blocked customers and the reason', 'cu.dNoBlocked': 'No blocked customers',
  'cu.levelSettings': 'Level settings', 'cu.lvSub': 'How the system works out a customer\'s level (Regular / VIP / VVIP)', 'cu.lvHow': 'How it is calculated',
  'cu.lvHow1': 'The customer\'s non-cancelled orders within the set period (last 90 days by default) are counted, matched by phone number.', 'cu.lvHow2': 'Three things are checked: number of orders, total paid, and how recent the last order is.',
  'cu.lvHow3': 'A customer is VVIP when all three VVIP conditions hold, otherwise VIP when the VIP conditions hold, otherwise Regular.', 'cu.lvHow4': 'A customer who stops ordering drops a level automatically, and two orders on one day do not raise anyone.',
  'cu.lvOrders': 'Minimum orders', 'cu.lvSpend': 'Minimum total paid', 'cu.lvRecent': 'Last order within', 'cu.lvGeneral': 'General', 'cu.lvMinOrders': 'Minimum orders',
  'cu.lvMinOrdersHint': 'Customers with fewer orders stay Regular (at least 2, since the average gap needs two orders).', 'cu.lvDays': 'Period: the last',
  'cu.lvDaysHint': 'Older orders do not count toward the level. 0 = every order since the start.',
  'cu.lvPreview': 'Customers with these settings', 'cu.lvReset': 'Defaults', 'cu.lvBad': 'Enter valid numbers (zero or more)', 'cu.kd': 'KWD', 'cu.days': 'days',
  'cu.lvManual': 'Level set manually for this customer', 'cu.phoneBad': 'Phone must be 8 digits (Kuwait)',
  'cu.phoneTaken': 'This phone belongs to another customer', 'cu.editTitle': 'Edit customer', 'cu.addresses': 'Addresses', 'cu.addAddress': 'Add address', 'cu.noAddress': 'No addresses',
  'cu.backList': 'Back to customers', 'cu.backCustomer': 'Back to customer', 'cu.productsAmount': 'Products amount', 'cu.deliveryAmount': 'Delivery amount', 'cu.totalSales': 'Total sales',
  'cu.favorite': 'Favourite product', 'cu.noOrders': 'No orders for this customer',
  'cu.importTitle': 'Import customers', 'cu.impStep1Sub': 'Columns: name, phone, address (zone - details)', 'cu.impStep2Sub': 'Phones already registered or repeated in the file are skipped',
  'cu.impExisting': 'Phone already registered (skipped): {n}', 'cu.impInvalid': 'Rows missing name, phone or address: {n}', 'cu.impNoZone': 'Zone not in delivery zones: {n}'
});

/* صانع الستيكرات */
Object.assign(I18N.ar, {
  'sm.sub': 'ستيكر 57×38 مم للمنتجات ومواد المخزون — اضغط مرتين على التاريخ أو المكونات للتعديل',
  'sm.searchLabel': 'البحث عن منتج أو مادة مخزون', 'sm.searchPh': 'اكتب الاسم العربي أو الإنجليزي أو الباركود',
  'sm.product': 'منتج', 'sm.material': 'مادة مخزون', 'sm.pickQ': 'اختيار الصنف؟', 'sm.pickBody': 'هل تريد اختيار «{name}» لصناعة الستيكر؟', 'sm.pick': 'اختيار',
  'sm.pickHint': 'ابحث عن صنف واختره لتظهر معاينة الستيكر', 'sm.empty': 'لم يتم اختيار صنف', 'sm.emptySub': 'اختر منتجاً أو مادة من البحث',
  'sm.tip': 'اضغط مرتين على تاريخ الإنتاج أو الانتهاء أو المكونات لتعديلها', 'sm.dbl': 'اضغط مرتين للتعديل',
  'sm.origin': 'بلد المنشأ', 'sm.ingredients': 'المكونات', 'sm.editIngredients': 'تعديل المكونات', 'sm.editProd': 'تعديل تاريخ الإنتاج', 'sm.editExp': 'تعديل تاريخ الانتهاء',
  'sm.copies': 'عدد الستيكرات', 'sm.copiesHelp': 'اكتب عدد الستيكرات المراد طباعتها', 'sm.copiesPh': 'اكتب العدد', 'sm.badCopies': 'اكتب عدداً صحيحاً أكبر من صفر',
  'sm.less': 'تقليل', 'sm.more': 'زيادة', 'sm.printFailed': 'تعذرت طباعة الستيكر: {message}',
  'sm.infoSaveFailed': 'تعذر حفظ المكونات في معلومات المنتج', 'sm.materialSaveFailed': 'تعذر حفظ المكونات للمادة'
});
Object.assign(I18N.en, {
  'sm.sub': '57×38 mm labels for products and stock materials — double-click a date or the ingredients to edit',
  'sm.searchLabel': 'Search for a product or stock material', 'sm.searchPh': 'Enter the Arabic or English name, or barcode',
  'sm.product': 'Product', 'sm.material': 'Stock material', 'sm.pickQ': 'Select item?', 'sm.pickBody': 'Do you want to select “{name}” for the sticker?', 'sm.pick': 'Select',
  'sm.pickHint': 'Search for an item and select it to preview the sticker', 'sm.empty': 'No item selected', 'sm.emptySub': 'Pick a product or material from the search',
  'sm.tip': 'Double-click the production date, expiry date or ingredients to edit them', 'sm.dbl': 'Double-click to edit',
  'sm.origin': 'Origin', 'sm.ingredients': 'Ingredients', 'sm.editIngredients': 'Edit ingredients', 'sm.editProd': 'Edit production date', 'sm.editExp': 'Edit expiry date',
  'sm.copies': 'Number of stickers', 'sm.copiesHelp': 'Enter the number of stickers to print', 'sm.copiesPh': 'Enter quantity', 'sm.badCopies': 'Enter a whole number greater than zero',
  'sm.less': 'Decrease', 'sm.more': 'Increase', 'sm.printFailed': 'Could not print the sticker: {message}',
  'sm.infoSaveFailed': 'Could not save ingredients in product information', 'sm.materialSaveFailed': 'Could not save ingredients for the stock material'
});

/* معلومات المنتجات · الوحدات · أماكن التخزين */
Object.assign(I18N.ar, {
  'pi.sub': 'المكونات وبلد المنشأ والباركود التي تُطبع على الستيكر — التعديل يُحفظ مباشرة', 'pi.add': 'إضافة منتجات', 'pi.addSub': 'المنتجات التي ليس لها معلومات بعد',
  'pi.searchPh': 'بحث باسم المنتج أو الباركود', 'pi.product': 'اسم المنتج', 'pi.none': 'لا توجد معلومات منتجات', 'pi.noneSub': 'اضغط «إضافة منتجات» لإضافة أول منتج',
  'pi.saveFailed': 'تعذر حفظ معلومات المنتج', 'pi.deleteQ': 'حذف معلومات المنتج؟', 'pi.deleteNote': 'تُحذف المكونات وبلد المنشأ والباركود الخاصة بالستيكر، ويبقى المنتج نفسه.',
  'pi.deleteFailed': 'تعذر حذف معلومات المنتج', 'pi.typeToSearch': 'اكتب في البحث لعرض المنتجات', 'pi.typeToSearchSub': 'بدون تحميل القائمة كاملة',
  'pi.noMatch': 'لا توجد منتجات مطابقة', 'pi.noMatchSub': 'أو كل النتائج مضافة مسبقاً', 'pi.noBarcode': 'بدون باركود', 'pi.selectedN': '{n} منتج محدد',
  'pi.added': 'تمت إضافة المنتجات', 'pi.addFailed': 'تعذر إضافة المنتجات',
  'un.sub': 'وحدات القياس المستخدمة في المنتجات ومواد المخزون', 'un.new': 'وحدة جديدة', 'un.edit': 'تعديل الوحدة', 'un.formSub': 'يكفي أحد الاسمين',
  'un.productsN': 'عدد المنتجات', 'un.none': 'لا توجد وحدات', 'un.noneSub': 'اضغط «وحدة جديدة» لإضافة أول وحدة', 'un.noProducts': 'لا توجد منتجات بهذه الوحدة',
  'un.oneName': 'اكتب الاسم العربي أو الإنجليزي', 'un.deleteQ': 'حذف الوحدة؟', 'un.inUse': 'أصناف تستخدمها', 'un.inUseNote': 'تستخدمها {p} منتج و{m} مادة — ستبقى هذه الأصناف بدون وحدة ظاهرة.',
  'sl.sub': 'أماكن حفظ المنتجات ومواد المخزون', 'sl.new': 'مكان جديد', 'sl.edit': 'تعديل المكان', 'sl.assign': 'إضافة أصناف للمكان', 'sl.assignSub': 'الصنف يقدر يكون بأكثر من مكان — المحدد موجود هنا',
  'sl.searchPh': 'ابحث في أماكن التخزين…', 'sl.itemsN': '{n} صنف', 'sl.none': 'لا توجد أماكن تخزين', 'sl.noneSub': 'اضغط «مكان جديد» لإضافة أول مكان',
  'sl.itemsTitle': 'الأصناف في هذا المكان', 'sl.pick': 'افتح مكاناً لعرض أصنافه', 'sl.noItems': 'لا توجد أصناف هنا — اضغط «إضافة أصناف للمكان»',
  'sl.removeItem': 'إزالة من المكان', 'sl.removed': 'أُزيل من المكان', 'sl.location': 'المكان', 'sl.itemsWord': 'الأصناف', 'sl.deleteQ': 'حذف مكان التخزين؟',
  'sl.deleteNote': 'كميات الأصناف الموجودة فيه تصير «بدون مكان»، ويبقى رصيدها كما هو.', 'sl.inHere': 'في المكان', 'sl.noFree': 'لا توجد أصناف', 'sl.noFreeSub': 'أضف منتجات أو مواد مخزون أولاً',
  'sl.assigned': 'تم تحديث أصناف المكان', 'sl.noLocation': 'بدون مكان', 'sl.auto': 'تلقائي', 'sl.default': 'الافتراضي', 'sl.overLoc': 'أكثر من الموجود في هذا المكان',
  'sl.inLocNow': 'الموجود في هذا المكان', 'sl.move': 'نقل كمية لمكان آخر', 'sl.moveSub': 'من {from} — الرصيد الكلي لا يتغير', 'sl.moveTo': 'إلى مكان', 'sl.moveQty': 'الكمية', 'sl.moved': 'تم نقل الكمية',
  'sl.makeDefault': 'اجعله المكان الافتراضي', 'sl.defaultSet': 'تم تعيين المكان الافتراضي', 'sl.hasQty': 'لهذا الصنف كمية في هذا المكان — انقلها لمكان آخر أولاً', 'sl.hasQtyN': '{n} من الأصناف لها كمية هنا ولم تُزل — انقل كمياتها أولاً',
  'sl.noneSub': 'كميات بالفرع الرئيسي ما لها مكان — انقلها لمكانها', 'sl.qtyHere': 'هنا', 'sl.moveMax': 'الحد الأقصى {n}', 'sl.pickLoc': 'اختر المكان…', 'sl.needLoc': 'اختر مكان التخزين لـ «{name}» — موجود بأكثر من مكان', 'sl.loc': 'المكان'
});
Object.assign(I18N.en, {
  'pi.sub': 'Ingredients, origin and barcode printed on the sticker — edits save right away', 'pi.add': 'Add products', 'pi.addSub': 'Products that have no info yet',
  'pi.searchPh': 'Search by product name or barcode', 'pi.product': 'Product', 'pi.none': 'No product info yet', 'pi.noneSub': 'Press “Add products” to add the first one',
  'pi.saveFailed': 'Could not save product info', 'pi.deleteQ': 'Delete product info?', 'pi.deleteNote': 'The sticker ingredients, origin and barcode are removed; the product stays.',
  'pi.deleteFailed': 'Could not delete product info', 'pi.typeToSearch': 'Type to search products', 'pi.typeToSearchSub': 'The full list isn’t loaded up front',
  'pi.noMatch': 'No matching products', 'pi.noMatchSub': 'or every result is already added', 'pi.noBarcode': 'No barcode', 'pi.selectedN': '{n} selected',
  'pi.added': 'Products added', 'pi.addFailed': 'Could not add the products',
  'un.sub': 'Units of measure used by products and stock materials', 'un.new': 'New unit', 'un.edit': 'Edit unit', 'un.formSub': 'One of the two names is enough',
  'un.productsN': 'Products', 'un.none': 'No units yet', 'un.noneSub': 'Press “New unit” to add the first one', 'un.noProducts': 'No products use this unit',
  'un.oneName': 'Enter the Arabic or English name', 'un.deleteQ': 'Delete unit?', 'un.inUse': 'Items using it', 'un.inUseNote': 'Used by {p} products and {m} materials — they will show no unit.',
  'sl.sub': 'Where products and stock materials are kept', 'sl.new': 'New location', 'sl.edit': 'Edit location', 'sl.assign': 'Add items', 'sl.assignSub': 'An item can be in several locations — ticked ones are here',
  'sl.searchPh': 'Search storage locations…', 'sl.itemsN': '{n} items', 'sl.none': 'No storage locations', 'sl.noneSub': 'Press “New location” to add the first one',
  'sl.itemsTitle': 'Items in this location', 'sl.pick': 'Open a location to see its items', 'sl.noItems': 'No items here — press “Add items”',
  'sl.removeItem': 'Remove from location', 'sl.removed': 'removed from the location', 'sl.location': 'Location', 'sl.itemsWord': 'Items', 'sl.deleteQ': 'Delete storage location?',
  'sl.deleteNote': 'What its items hold here becomes “No location”; their stock stays the same.', 'sl.inHere': 'Here', 'sl.noFree': 'No items', 'sl.noFreeSub': 'Add products or stock materials first',
  'sl.assigned': 'Location items updated', 'sl.noLocation': 'No location', 'sl.auto': 'Automatic', 'sl.default': 'Default', 'sl.overLoc': 'More than this location holds',
  'sl.inLocNow': 'In this location', 'sl.move': 'Move to another location', 'sl.moveSub': 'From {from} — the total stock does not change', 'sl.moveTo': 'To location', 'sl.moveQty': 'Quantity', 'sl.moved': 'Quantity moved',
  'sl.makeDefault': 'Make default location', 'sl.defaultSet': 'Default location set', 'sl.hasQty': 'This item has stock in this location — move it elsewhere first', 'sl.hasQtyN': '{n} items still have stock here and were kept — move it first',
  'sl.noneSub': 'Main-branch stock with no location — move it to its place', 'sl.qtyHere': 'here', 'sl.moveMax': 'At most {n}', 'sl.pickLoc': 'Choose place…', 'sl.needLoc': 'Choose the storage place for “{name}” — it is kept in several places', 'sl.loc': 'Place'
});

/* التقارير */
Object.assign(I18N.ar, {
  'rp.sub': 'الطلبات والمبيعات لليوم أو الأسبوع أو الشهر', 'rp.day': 'يوم', 'rp.kNet': 'صافي المبيعات', 'rp.kAvg': 'متوسط الفاتورة', 'rp.kFee': 'إجمالي التوصيل', 'rp.kCancelled': 'الفواتير الملغاة', 'rp.branchPerf': 'أداء الفروع', 'rp.branchPerfSub': 'حصة كل فرع من المبيعات (كل الفروع)', 'rp.peak': 'ساعات الذروة', 'rp.peakSub': 'عدد الطلبات في كل ساعة خلال الفترة', 'rp.peakAt': 'أكثر وقت طلباً', 'rp.pay': 'طرق الدفع', 'rp.paySub': 'حسب قيمة المبيعات', 'rp.payWord': 'طرق', 'rp.types': 'أنواع الطلب', 'rp.typesSub': 'حسب عدد الطلبات', 'rp.topCust': 'أفضل العملاء', 'rp.topCustSub': 'الأعلى شراءً في الفترة', 'rp.ordersWord': 'طلب', 'rp.other': 'أخرى', 'rp.newShort': 'جديد', 'rp.ofSales': 'من المبيعات', 'rp.week': 'أسبوع', 'rp.month': 'شهر', 'rp.noData': 'لا توجد بيانات', 'rp.noDataSub': 'لا توجد مبيعات في هذه الفترة', 'rp.year': 'السنة',
  'rp.ordersCount': 'عدد الطلبات', 'rp.salesAmount': 'مبلغ المبيعات', 'rp.netAmount': 'صافي مبلغ المبيعات', 'rp.current': 'الحالي', 'rp.compare': 'المقارنة', 'rp.newValue': 'قيمة جديدة',
  'rp.view': 'عرض', 'rp.comparison': 'مقارنة', 'rp.available': 'التقارير المتاحة', 'rp.sales': 'المبيعات', 'rp.cashierSales': 'مبيعات حسب الكاشير', 'rp.returns': 'المرتجعات',
  'rp.orderSales': 'مبيعات الطلبات', 'rp.tpChart': 'تحليل مبيعات المنتجات', 'rp.modeTop': 'أعلى المنتجات مبيعاً', 'rp.modeBottom': 'أقل المنتجات مبيعاً', 'rp.showReport': 'عرض التقرير',
  'rp.salesOf': 'مبيعات', 'rp.revenue': 'المبيعات', 'rp.searchInvoice': 'ابحث برقم الفاتورة أو اسم العميل أو رقم الهاتف أو اسم المنتج', 'rp.productsAmount': 'مبلغ المنتجات', 'rp.period': 'الفترة',
  'rp.invoices': 'عدد الفواتير', 'rp.totalProducts': 'اجمالي مبالغ المنتجات', 'rp.totalDelivery': 'اجمالي قيم التوصيل', 'rp.totalSales': 'اجمالي المبيعات', 'rp.totalNet': 'اجمالي صافي المبيعات',
  'rp.salesSub': 'مبيعات كل منتج في كل فرع', 'rp.searchProducts': 'ابحث عن منتج بالاسم أو الرمز', 'rp.nameAr': 'الاسم بالعربي', 'rp.nameEn': 'الاسم بالإنجليزي', 'rp.soldQty': 'الكمية المباعة',
  'rp.productRevenue': 'مبيعات المنتج', 'rp.allCats': 'كل التصنيفات', 'rp.totalRevenue': 'إجمالي المبيعات', 'rp.selected': 'المحدد', 'rp.selectedRevenue': 'إجمالي المبيعات (المحدد)',
  'rp.productDetails': 'تفاصيل مبيعات المنتج', 'rp.invoiceQty': 'كمية المنتج في الفاتورة', 'rp.invoiceRevenue': 'إجمالي قيمة المنتج', 'rp.item': 'الصنف', 'rp.cashierSub': 'عدد الطلبات والمبيعات لكل كاشير',
  'rp.returnsSub': 'مرتجعات المخزون والتوالف والمرتجع للمورد', 'rp.searchReturns': 'ابحث برمز المنتج أو اسمه أو اسم أمين المخزن', 'rp.sort': 'الترتيب', 'rp.name': 'الاسم',
  'rp.fromBranch': 'مرتجع من فرع', 'rp.storekeeper': 'أمين المخزن', 'rp.returnQtys': 'كميات الإرجاع', 'rp.sortDesc': 'كميات الإرجاع: من الأعلى إلى الأقل', 'rp.sortAsc': 'كميات الإرجاع: من الأقل إلى الأعلى',
  'rp.toStock': 'للمخزون', 'rp.scrap': 'توالف', 'rp.toSupplier': 'للمورد', 'rp.retTotal': 'الإجمالي', 'rp.orderSalesSub': 'الفواتير بالترتيب مع الترصيد', 'rp.deliveryPrice': 'سعر التوصيل',
  'rp.balance': 'الترصيد', 'rp.pickPeriod': 'يرجى تحديد الفترة', 'rp.pickPeriodSub': 'اختر تاريخ البداية والنهاية لعرض التقرير', 'rp.total': 'الإجمالي', 'rp.topProducts': 'أكثر المنتجات مبيعاً',
  'rp.topSub': 'مبيعات المنتجات موزعة على الفروع', 'rp.searchProduct': 'ابحث برمز المنتج أو اسمه', 'rp.shownCount': 'عدد المنتجات المعروضة', 'rp.shownTotal': 'إجمالي المبيعات المعروضة',
  'rp.searchTpd': 'ابحث برقم الفاتورة أو الفرع أو الكاشير أو نوع الطلب أو العنوان', 'rp.address': 'عنوان العميل', 'rp.subCats': 'تصنيف فرعي', 'rp.pickCat': 'اختر التصنيف', 'rp.applyCur': 'اختيار هذا التصنيف'
});
Object.assign(I18N.en, {
  'rp.sub': 'Orders and sales for a day, week or month', 'rp.day': 'Day', 'rp.kNet': 'Net Sales', 'rp.kAvg': 'Average Invoice', 'rp.kFee': 'Total Delivery', 'rp.kCancelled': 'Cancelled Invoices', 'rp.branchPerf': 'Branch Performance', 'rp.branchPerfSub': 'Each branch’s share of sales (all branches)', 'rp.peak': 'Peak Hours', 'rp.peakSub': 'Orders in each hour over the period', 'rp.peakAt': 'Busiest time', 'rp.pay': 'Payment Methods', 'rp.paySub': 'By sales value', 'rp.payWord': 'methods', 'rp.types': 'Order Types', 'rp.typesSub': 'By number of orders', 'rp.topCust': 'Top Customers', 'rp.topCustSub': 'Highest spenders in the period', 'rp.ordersWord': 'orders', 'rp.other': 'Other', 'rp.newShort': 'New', 'rp.ofSales': 'of sales', 'rp.week': 'Week', 'rp.month': 'Month', 'rp.noData': 'No data', 'rp.noDataSub': 'There are no sales in this period', 'rp.year': 'Year',
  'rp.ordersCount': 'Orders Count', 'rp.salesAmount': 'Sales Amount', 'rp.netAmount': 'Net Sales Amount', 'rp.current': 'Current', 'rp.compare': 'Compare', 'rp.newValue': 'New value',
  'rp.view': 'View', 'rp.comparison': 'Comparison', 'rp.available': 'Available Reports', 'rp.sales': 'Sales', 'rp.cashierSales': 'Sales by Cashier', 'rp.returns': 'Returns',
  'rp.orderSales': 'Orders Sales', 'rp.tpChart': 'Products Sales Analysis', 'rp.modeTop': 'Top Selling Products', 'rp.modeBottom': 'Least Selling Products', 'rp.showReport': 'Show Report',
  'rp.salesOf': 'Sales —', 'rp.revenue': 'Sales', 'rp.searchInvoice': 'Search by invoice #, customer name, phone or product', 'rp.productsAmount': 'Products Amount', 'rp.period': 'Period',
  'rp.invoices': 'Invoices Count', 'rp.totalProducts': 'Total Products Amount', 'rp.totalDelivery': 'Total Delivery Amount', 'rp.totalSales': 'Total Sales', 'rp.totalNet': 'Total Net Sales',
  'rp.salesSub': 'Sales of each product in each branch', 'rp.searchProducts': 'Search products by name or code', 'rp.nameAr': 'Arabic Name', 'rp.nameEn': 'English Name', 'rp.soldQty': 'Sold Qty',
  'rp.productRevenue': 'Product Sales', 'rp.allCats': 'All categories', 'rp.totalRevenue': 'Total Sales', 'rp.selected': 'Selected', 'rp.selectedRevenue': 'Total Sales (selected)',
  'rp.productDetails': 'Product Sales Details', 'rp.invoiceQty': 'Product Qty in Invoice', 'rp.invoiceRevenue': 'Product Sales in Invoice', 'rp.item': 'Item', 'rp.cashierSub': 'Orders and sales of each cashier',
  'rp.returnsSub': 'Returns to stock, scrap and returns to supplier', 'rp.searchReturns': 'Search by product code, product name, or storekeeper', 'rp.sort': 'Sort', 'rp.name': 'Name',
  'rp.fromBranch': 'Returned From Branch', 'rp.storekeeper': 'Storekeeper', 'rp.returnQtys': 'Return Quantities', 'rp.sortDesc': 'Return Quantities: High to Low', 'rp.sortAsc': 'Return Quantities: Low to High',
  'rp.toStock': 'To Stock', 'rp.scrap': 'Scrap', 'rp.toSupplier': 'To Supplier', 'rp.retTotal': 'Total', 'rp.orderSalesSub': 'Invoices in order with a running balance', 'rp.deliveryPrice': 'Delivery Price',
  'rp.balance': 'Running Balance', 'rp.pickPeriod': 'Please select a period', 'rp.pickPeriodSub': 'Pick a start and end date to show the report', 'rp.total': 'Total', 'rp.topProducts': 'Top Selling Products',
  'rp.topSub': 'Product sales split by branch', 'rp.searchProduct': 'Search by product code or product name', 'rp.shownCount': 'Displayed Products Count', 'rp.shownTotal': 'Displayed Sales Total',
  'rp.searchTpd': 'Search by invoice #, branch, cashier, order type, or address', 'rp.address': 'Customer Address', 'rp.subCats': 'subcategories', 'rp.pickCat': 'Choose a category', 'rp.applyCur': 'Choose this category'
});

/* المخازن — inventory pages */
Object.assign(I18N.ar, {
  'iv.choose': 'اختر…', 'iv.chooseBranch': 'اختر الفرع', 'iv.allBranches': 'كل الفروع', 'iv.allStaff': 'كل موظفي الإنتاج', 'iv.allTypes': 'كل الأنواع',
  'iv.totalQty': 'إجمالي الكمية', 'iv.currentStock': 'الرصيد الحالي', 'iv.counted': 'الكمية المجرودة', 'iv.before': 'قبل', 'iv.prodDate': 'تاريخ الإنتاج', 'iv.expiry': 'تاريخ الانتهاء',
  'iv.pickBranchFirst': 'اختر الفرع أولاً ثم أضف الأصناف', 'iv.noItemsSub': 'ابحث عن صنف أو امسح الباركود لإضافته', 'iv.typeToSearch': 'اكتب للبحث عن صنف…',
  'iv.needCounted': 'أدخل الكمية المجرودة لكل صنف', 'iv.savedStock': 'تم الحفظ وتحديث المخزون', 'iv.days30': 'آخر ٣٠ يوم', 'iv.staffOne': 'موظف الإنتاج',
  'iv.bothNames': 'الاسم العربي والإنجليزي مطلوبان', 'iv.qty30': 'الكمية (آخر ٣٠ يوم)', 'iv.kTotal': 'إجمالي السندات', 'iv.fromBranch': 'من فرع', 'iv.toBranch': 'إلى فرع',
  'iv.bt.auto': 'تلقائي (الأقرب انتهاءً أولاً)', 'iv.bt.loose': 'بدون دفعة', 'iv.bt.chooseDates': 'اضغط على التواريخ اللي تبي تجردها ثم «إضافة»', 'iv.bt.addDates': 'إضافة', 'iv.bt.looseSub': 'كمية ما لها تاريخ', 'iv.bt.overBatch': 'أكثر من المتوفر في هذه الدفعة، المتوفر', 'iv.bt.noneLeft': 'لا يوجد رصيد متبقٍ من الدفعة {batch}', 'iv.bt.s.expired': 'منتهية', 'iv.bt.code': 'باركود الدفعة',
  'pt.sub': 'دفعات كل منتج حسب تاريخ الإنتاج والانتهاء، وما تبقى منها في كل فرع', 'pt.searchPh': 'ابحث باسم المنتج أو الكود أو رقم السند', 'pt.alerts': 'تنبيهات الانتهاء (خلال 7 أيام أو منتهية)',
  'pt.batch': 'الدفعة', 'pt.batches': 'الدفعات', 'pt.inStock': 'المتبقي', 'pt.state': 'الصلاحية', 'pt.code': 'كود المنتج', 'pt.vouchers': 'عدد سندات الإنتاج', 'pt.near': 'قريبة الانتهاء',
  'pt.liveBatches': 'دفعات في المخزون', 'pt.none': 'لا يوجد إنتاج', 'pt.noneSub': 'سندات الإنتاج تظهر هنا مجمعة حسب المنتج', 'pt.kLive': 'دفعات في المخزون', 'pt.kQty': 'الكمية في الدفعات',
  'pt.kSoon': 'دفعات تنتهي خلال 7 أيام', 'pt.kExpired': 'دفعات منتهية في المخزون', 'pt.back': 'رجوع', 'pt.produced': 'المنتج', 'pt.byBranch': 'في الفروع', 'pt.finished': 'نفدت',
  'pt.looseTip': 'كمية في الرصيد لا تعرف دفعتها (بيعت أو نُقلت قبل نظام الدفعات)', 'pt.noBatches': 'لا توجد دفعات', 'pt.noBatchesSub': 'كل سند إنتاج ينشئ دفعة بتاريخ إنتاجه وانتهائه',
  'pt.prodVouchers': 'سندات الإنتاج', 'pt.trace': 'تتبع الدفعة', 'pt.toTransfer': 'تحويل لفرع', 'pt.toScrap': 'مرتجع توالف', 'pt.pickBranch': 'الدفعة في أكثر من فرع، اختر الفرع من الفلتر أولاً',
  'pt.daysLeft': 'باقي {n} يوم', 'pt.expiredAgo': 'منتهية منذ {n} يوم', 'pt.today': 'تنتهي اليوم', 'pt.path': 'مسار الدفعة', 'pt.noPath': 'لا توجد حركات على هذه الدفعة',
  'pt.countedAs': 'جُردت', 'pt.traceNote': 'المبيعات وحركات الكميات التي لم تحدد دفعتها تُخصم من الأقرب انتهاءً أولاً.',
  'pt.bulkTransfer': 'تحويل المحدد', 'pt.bulkScrap': 'إتلاف المحدد', 'pt.selectAll': 'تحديد الكل', 'pt.oneBranch': 'المحدد من أكثر من فرع، اختر فرعاً واحداً من الفلتر', 'pt.noAlerts': 'لا توجد دفعات', 'pt.noAlertsSub': 'لا يوجد شيء يحتاج انتباهك هنا',
  'ic.sub': 'كل حركات الصنف في فرع خلال فترة، مع الرصيد الافتتاحي والرصيد بعد كل حركة', 'ic.item': 'الصنف', 'ic.cls': 'أو تصنيف', 'ic.clear': 'مسح', 'ic.types': 'نوع الحركة',
  'ic.pickItemPh': 'اختر صنفاً…', 'ic.pickClsPh': 'قسم أو مورد أو مكان تخزين…', 'ic.allTypes': 'كل الحركات', 'ic.noTypes': 'لم تختر أي حركة', 'ic.all': 'الكل', 'ic.run': 'عرض الحركات',
  'ic.p.today': 'اليوم', 'ic.p.week': 'آخر ٧ أيام', 'ic.p.month': 'هذا الشهر', 'ic.p.lastMonth': 'الشهر الماضي', 'ic.p.all': 'من البداية',
  'ic.pickItem': 'اختر صنفاً أو تصنيفاً أولاً', 'ic.clsEmpty': 'لا توجد أصناف في هذا التصنيف', 'ic.pickBranch': 'اختر الفرع', 'ic.pickPeriod': 'حدد تاريخ البداية والنهاية', 'ic.badPeriod': 'تاريخ البداية بعد تاريخ النهاية',
  'ic.code': 'الكود', 'ic.wait': 'جاري تحميل الحركات، حاول بعد لحظة', 'ic.allBranches': 'كل الأفرع', 'ic.forInvoice': 'لفاتورة', 'ic.date': 'التاريخ', 'ic.type': 'نوع الحركة', 'ic.doc': 'رقم المستند', 'ic.qty': 'الكمية', 'ic.invNo': 'رقم فاتورة الشراء', 'ic.invValue': 'قيمة الفاتورة', 'ic.price': 'سعر الوحدة', 'ic.balance': 'الرصيد',
  'ic.opening': 'الرصيد الافتتاحي', 'ic.closing': 'الرصيد الختامي', 'ic.qIn': 'الوارد', 'ic.qOut': 'الصادر', 'ic.count': 'عدد الحركات', 'ic.period': 'الفترة',
  'ic.start': 'اختر الصنف والفترة', 'ic.startSub': 'ثم اضغط «عرض الحركات»', 'ic.none': 'لا توجد حركات في هذه الفترة', 'ic.noneSub': 'جرّب فترة أطول أو أنواع حركات أكثر',
  'ic.in': 'وارد', 'ic.out': 'صادر', 'ic.from': 'من', 'ic.to': 'إلى', 'ic.counted': 'المجرود', 'ic.before': 'قبل الجرد', 'ic.noBefore': 'جرد قديم بدون الرصيد السابق',
  'ic.noStock': 'لا يخصم من المخزون', 'ic.notDeducted': 'فاتورة لم تخصم من المخزون', 'ic.noDoc': 'لا يوجد مستند لهذه الحركة', 'ic.noExact': 'لا يوجد صنف بهذا الكود أو الباركود',
  'ic.pickItemT': 'اختيار الصنف', 'ic.pickItemSub': 'ابحث بالاسم أو الكود أو الباركود، أو امسح باركود الدفعة', 'ic.searchPh': 'اسم الصنف أو الكود أو الباركود…',
  'ic.pickClsT': 'اختيار تصنيف', 'ic.pickClsSub': 'يعرض حركات كل أصناف التصنيف', 'ic.apply': 'تطبيق', 'ic.lvl0': 'القسم الرئيسي', 'ic.lvl1': 'القسم الفرعي', 'ic.lvl2': 'القسم الفرعي الثاني',
  'ic.c.products': 'أقسام المنتجات', 'ic.c.materials': 'أقسام المواد المخزنية', 'ic.c.suppliers': 'المورد', 'ic.c.storage': 'مكان التخزين',
  'ic.pickCat': 'اختر قسماً', 'ic.pickSupplier': 'اختر المورد', 'ic.pickStorage': 'اختر مكان التخزين',
  'ic.t.issue': 'صرف', 'ic.t.order': 'فاتورة بيع', 'ic.t.transfer': 'تحويل', 'ic.t.cashierRequest': 'طلب تحويل كاشير', 'ic.t.cashierTransfer': 'تحويل كاشير (قديم)', 'ic.t.stockReturn': 'مرتجع للمخزن',
  'ic.t.scrapReturn': 'مرتجع توالف', 'ic.t.supplierReturn': 'مرتجع للمورد', 'ic.t.production': 'إنتاج', 'ic.t.inventory': 'جرد', 'ic.t.purchaseReceipt': 'استلام مشتريات',
  'iv.none': 'لا يوجد', 'iv.addItems': 'إضافة أصناف', 'iv.rowNo': 'م', 'iv.excel': 'تصدير Excel', 'iv.printReport': 'طباعة التقرير',
  // صرف
  'iv.is.new': 'سند صرف جديد', 'iv.is.sub': 'صرف أصناف من المخزن الرئيسي لطلب أو إنتاج أو استخدام', 'iv.is.searchPh': 'ابحث برقم السند أو الموظف أو الفاتورة أو الصنف…',
  'iv.is.formSub': 'اختر نوع الصرف ثم أضف الأصناف', 'iv.is.voucher': 'سند صرف', 'iv.is.submit': 'حفظ سند الصرف', 'iv.is.none': 'لا توجد سندات صرف', 'iv.is.noneSub': 'أنشئ أول سند صرف من زر «سند صرف جديد»',
  'iv.is.number': 'رقم السند', 'iv.is.deleteQ': 'حذف سند الصرف؟', 'iv.is.deleteNote': 'سيتم إرجاع الكميات المخصومة إلى المخزن الرئيسي.',
  'iv.is.t.order': 'طلب', 'iv.is.t.production': 'إنتاج', 'iv.is.t.use': 'استخدام', 'iv.is.type': 'نوع الصرف', 'iv.is.employee': 'صرف إلى', 'iv.is.editEmployee': 'تعديل اسم الموظف', 'iv.is.invoice': 'رقم الفاتورة',
  'iv.is.addEmployee': 'إضافة موظف', 'iv.is.linked': 'لا يمكن حذف سند صرف مرتبط بسند إنتاج', 'iv.is.k30': 'سندات الصرف (آخر ٣٠ يوم)',
  // تحويلات
  'iv.tr.new': 'تحويل جديد', 'iv.tr.sub': 'تحويل أصناف بين الفروع', 'iv.tr.searchPh': 'ابحث برقم التحويل أو المستلم أو الفرع أو الصنف…', 'iv.tr.formSub': 'اختر الفرعين ثم أضف الأصناف',
  'iv.tr.voucher': 'تحويل', 'iv.tr.submit': 'حفظ التحويل', 'iv.tr.none': 'لا توجد تحويلات', 'iv.tr.noneSub': 'أنشئ أول تحويل من زر «تحويل جديد»', 'iv.tr.number': 'رقم التحويل',
  'iv.tr.deleteQ': 'حذف التحويل؟', 'iv.tr.deleteNote': 'سيتم عكس الكميات: ترجع لفرع المصدر وتنخصم من فرع الوجهة.', 'iv.tr.route': 'من فرع {from} إلى فرع {to}',
  'iv.tr.receiver': 'اسم المستلم', 'iv.tr.same': 'لا يمكن التحويل لنفس الفرع', 'iv.tr.k30': 'التحويلات (آخر ٣٠ يوم)', 'iv.tr.kBranches': 'الفروع المستلمة',
  // مرتجع للمخزن
  'iv.rw.new': 'مرتجع جديد', 'iv.rw.sub': 'إرجاع أصناف من فرع إلى المخزن الرئيسي', 'iv.rw.searchPh': 'ابحث برقم المرتجع أو الفرع أو السبب أو الصنف…', 'iv.rw.formSub': 'اختر الفرع والسبب ثم أضف الأصناف',
  'iv.rw.voucher': 'مرتجع للمخزن', 'iv.rw.submit': 'حفظ المرتجع', 'iv.rw.none': 'لا توجد مرتجعات', 'iv.rw.noneSub': 'أنشئ أول مرتجع من زر «مرتجع جديد»', 'iv.rw.number': 'رقم المرتجع',
  'iv.rw.deleteQ': 'حذف المرتجع؟', 'iv.rw.deleteNote': 'سيتم إرجاع الكميات إلى الفرع وخصمها من المخزن الرئيسي.', 'iv.rw.reason': 'سبب الإرجاع', 'iv.rw.reasonPh': 'مثال: فائض عن الحاجة',
  'iv.rw.k30': 'المرتجعات (آخر ٣٠ يوم)', 'iv.rw.kBranches': 'الفروع المرجِعة',
  // مرتجع توالف
  'iv.dm.new': 'مرتجع توالف جديد', 'iv.dm.sub': 'تسجيل أصناف تالفة وخصمها من مخزون الفرع', 'iv.dm.searchPh': 'ابحث برقم السند أو الفرع أو المرسل أو الصنف…', 'iv.dm.formSub': 'اختر الفرع ثم أضف الأصناف التالفة',
  'iv.dm.voucher': 'مرتجع توالف', 'iv.dm.submit': 'حفظ وخصم التوالف', 'iv.dm.none': 'لا توجد مرتجعات توالف', 'iv.dm.noneSub': 'أنشئ أول سند من زر «مرتجع توالف جديد»', 'iv.dm.number': 'رقم السند',
  'iv.dm.deleteQ': 'حذف مرتجع التوالف؟', 'iv.dm.deleteNote': 'سيتم إرجاع الكميات إلى مخزون الفرع.', 'iv.dm.sender': 'اسم المرسل', 'iv.dm.k30': 'التوالف (آخر ٣٠ يوم)',
  // جرد
  'iv.ic.new': 'جرد جديد', 'iv.ic.sub': 'جرد مخزون فرع وتعديل الرصيد للكمية الفعلية', 'iv.ic.searchPh': 'ابحث برقم الجرد أو الفرع أو مكان التخزين أو الصنف…', 'iv.ic.formSub': 'اختر الفرع ثم أدخل الكميات المجرودة',
  'iv.ic.voucher': 'جرد', 'iv.ic.submit': 'حفظ الجرد وتحديث الرصيد', 'iv.ic.none': 'لا توجد عمليات جرد', 'iv.ic.noneSub': 'أنشئ أول جرد من زر «جرد جديد»', 'iv.ic.number': 'رقم الجرد',
  'iv.ic.deleteQ': 'حذف الجرد؟', 'iv.ic.deleteNote': 'سيرجع رصيد كل صنف لما كان عليه قبل الجرد.', 'iv.ic.k30': 'عمليات الجرد (آخر ٣٠ يوم)', 'iv.ic.kItems30': 'أصناف مجرودة (آخر ٣٠ يوم)',
  'iv.ic.kDiff30': 'أصناف فيها فرق', 'iv.ic.cannotRevert': 'لا يمكن حذف هذا الجرد لأنه قديم ولا يحتوي الرصيد السابق',
  // إنتاج
  'iv.pr.new': 'سند إنتاج جديد', 'iv.pr.sub': 'تسجيل المنتجات المصنعة وإضافتها لمخزون الفرع', 'iv.pr.searchPh': 'ابحث برقم السند أو المنتج أو الموظف أو رقم الصرف…',
  'iv.pr.formSub': 'اختر الموظف والتواريخ ثم أضف المنتجات', 'iv.pr.voucher': 'سند إنتاج', 'iv.pr.number': 'رقم السند', 'iv.pr.product': 'المنتجات', 'iv.pr.issueNo': 'سند الصرف',
  'iv.pr.none': 'لا توجد سندات إنتاج', 'iv.pr.noneSub': 'أنشئ أول سند من زر «سند إنتاج جديد»', 'iv.pr.k30': 'سندات الإنتاج (آخر ٣٠ يوم)', 'iv.pr.kQty30': 'الكمية المنتجة (آخر ٣٠ يوم)',
  'iv.pr.kSoon': 'تنتهي خلال ٧ أيام', 'iv.pr.commonDate': 'تاريخ الإنتاج (للكل)', 'iv.pr.commonExpiry': 'تاريخ الانتهاء (للكل)', 'iv.pr.addProducts': 'إضافة منتجات',
  'iv.pr.itemSearchPh': 'ابحث بالاسم أو الرمز أو امسح الباركود…', 'iv.pr.produced': 'المنتجات المصنعة', 'iv.pr.noItemsSub': 'اختر المنتجات من القائمة بالأعلى', 'iv.pr.origin': 'المنشأ',
  'iv.pr.ingredients': 'المكونات', 'iv.pr.needWhole': 'أدخل كمية صحيحة أكبر من صفر لكل منتج', 'iv.pr.pickIssue': 'اختيار سند الصرف', 'iv.pr.noIssues': 'لا توجد سندات صرف من نوع إنتاج',
  'iv.pr.skip': 'تخطي', 'iv.pr.confirm': 'تأكيد', 'iv.pr.chooseIssue': 'اختر سند صرف أو اضغط تخطي', 'iv.pr.printLabels': 'طباعة الملصقات', 'iv.pr.printLabel': 'طباعة الملصق',
  'iv.pr.added': 'تمت الإضافة للمخزون', 'iv.pr.labelFail': 'تعذرت طباعة الملصق', 'iv.pr.linkedIssue': 'سند الصرف المرتبط', 'iv.pr.used': 'المواد المستخدمة',
  'iv.pr.deleteQ': 'حذف سند الإنتاج؟', 'iv.pr.deleteNote': 'سيتم خصم الكميات المنتجة من مخزون {branch}.', 'iv.pr.issueGone': 'سند الصرف غير موجود',
  // موظفو الإنتاج
  'iv.ps.new': 'إضافة موظف إنتاج', 'iv.ps.edit': 'تعديل موظف إنتاج', 'iv.ps.sub': 'الموظفون الذين يُسجَّل عليهم الإنتاج والصرف', 'iv.ps.formSub': 'الاسم العربي والإنجليزي مطلوبان',
  'iv.ps.vouchers': 'سندات الإنتاج', 'iv.ps.none': 'لا يوجد موظفو إنتاج', 'iv.ps.noneSub': 'أضف أول موظف من زر «إضافة موظف إنتاج»', 'iv.ps.deleteQ': 'حذف موظف الإنتاج؟',
  'iv.ps.inUseNote': 'السندات القديمة تحتفظ باسم الموظف.',
  // استلام
  'iv.rc.new': 'سند استلام جديد', 'iv.rc.sub': 'تسجيل البضاعة المستلمة من جهة خارجية', 'iv.rc.searchPh': 'ابحث برقم السند أو الجهة أو الصنف…', 'iv.rc.formSub': 'اكتب جهة المصدر ثم أضف الأصناف',
  'iv.rc.voucher': 'سند استلام', 'iv.rc.submit': 'حفظ الاستلام', 'iv.rc.number': 'رقم السند', 'iv.rc.source': 'جهة المصدر', 'iv.rc.location': 'مكان التخزين', 'iv.rc.addItem': 'إضافة صنف',
  'iv.rc.allFields': 'أكمل الاسم العربي والإنجليزي والكمية ومكان التخزين', 'iv.rc.noItemsSub': 'أكمل الحقول بالأعلى واضغط إضافة (أو Enter في الكمية)', 'iv.rc.none': 'لا توجد سندات استلام',
  'iv.rc.noneSub': 'أنشئ أول سند من زر «سند استلام جديد»', 'iv.rc.deleteQ': 'حذف سند الاستلام؟', 'iv.rc.k30': 'سندات الاستلام (آخر ٣٠ يوم)', 'iv.rc.kItems30': 'أصناف مستلمة (آخر ٣٠ يوم)',
  'iv.rc.kSources30': 'جهات المصدر (آخر ٣٠ يوم)',
  // طلبات تحويل الكاشير
  'iv.cr.sub': 'طلبات النواقص المرسلة من شاشات الكاشير', 'iv.cr.searchPh': 'ابحث برقم الطلب أو الفرع أو الكاشير أو الصنف…', 'iv.cr.number': 'رقم الطلب', 'iv.cr.cashier': 'الكاشير',
  'iv.cr.none': 'لا توجد طلبات', 'iv.cr.noneSub': 'تظهر هنا طلبات النواقص من الكاشير', 'iv.cr.kTotal': 'إجمالي الطلبات',
  'iv.cr.s.pending': 'بانتظار القبول', 'iv.cr.s.accepted': 'بانتظار التجهيز', 'iv.cr.s.sent': 'تم الارسال', 'iv.cr.s.transferred': 'تم التحويل', 'iv.cr.s.received': 'تم الاستلام',
  'iv.cr.s.partial_received': 'استلام جزئي', 'iv.cr.s.rejected': 'مرفوض',
  'iv.cr.g.sweets': 'حلويات', 'iv.cr.g.tableware': 'أدوات التقديم', 'iv.cr.g.supplies': 'مستلزمات', 'iv.cr.g.other': 'أخرى', 'iv.cr.group': 'المجموعة',
  'iv.cr.accept': 'قبول الطلب', 'iv.cr.accepted': 'تم قبول الطلب', 'iv.cr.deliver': 'تسليم', 'iv.cr.deliverTitle': 'تسليم الطلب', 'iv.cr.fillAll': 'تم تأمين كل النواقص',
  'iv.cr.deliverNote': 'الكميات المرسلة تنخصم من {branch}', 'iv.cr.requested': 'المطلوب', 'iv.cr.sentQty': 'المرسل', 'iv.cr.receivedQty': 'المستلم', 'iv.cr.send': 'ارسال',
  'iv.cr.sentOk': 'تم الارسال', 'iv.cr.badQty': 'تحقق من الكميات المرسلة', 'iv.cr.pdf': 'تقرير PDF', 'iv.cr.sheet': 'طباعة ورقة التسليم', 'iv.cr.details': 'تفاصيل الطلب',
  'iv.cr.printFull': 'طباعة الكل', 'iv.cr.requester': 'مقدم الطلب', 'iv.cr.executor': 'منفذ الطلب', 'iv.cr.receiver': 'مستلم الطلب', 'iv.cr.ack': 'الإقرار',
  'iv.cr.ackText': 'أقر أنا {name} باستلام الأصناف المذكورة أعلاه', 'iv.cr.receivedAt': 'وقت الاستلام', 'iv.cr.noBarcode': 'رقم الطلب لا يصلح لتوليد باركود'
});
Object.assign(I18N.en, {
  'iv.choose': 'Choose…', 'iv.chooseBranch': 'Choose branch', 'iv.allBranches': 'All branches', 'iv.allStaff': 'All production staff', 'iv.allTypes': 'All types',
  'iv.totalQty': 'Total quantity', 'iv.currentStock': 'Current stock', 'iv.counted': 'Counted qty', 'iv.before': 'Before', 'iv.prodDate': 'Production date', 'iv.expiry': 'Expiry date',
  'iv.pickBranchFirst': 'Choose the branch first, then add items', 'iv.noItemsSub': 'Search for an item or scan its barcode to add it', 'iv.typeToSearch': 'Type to search for an item…',
  'iv.needCounted': 'Enter the counted quantity for every item', 'iv.savedStock': 'Saved and stock updated', 'iv.days30': 'last 30 days', 'iv.staffOne': 'Production staff',
  'iv.bothNames': 'Arabic and English names are required', 'iv.qty30': 'Quantity (last 30 days)', 'iv.kTotal': 'Total vouchers', 'iv.fromBranch': 'From branch', 'iv.toBranch': 'To branch',
  'iv.bt.auto': 'Auto (first to expire first)', 'iv.bt.loose': 'No batch', 'iv.bt.chooseDates': 'Tap the dates you want to count, then “Add”', 'iv.bt.addDates': 'Add', 'iv.bt.looseSub': 'Stock with no date', 'iv.bt.overBatch': 'More than this batch holds, available', 'iv.bt.noneLeft': 'Nothing left of batch {batch}', 'iv.bt.s.expired': 'expired', 'iv.bt.code': 'Batch barcode',
  'pt.sub': 'Each product\'s batches by production and expiry date, and what is left of them in every branch', 'pt.searchPh': 'Search by product name, code or voucher number', 'pt.alerts': 'Expiry alerts (within 7 days or expired)',
  'pt.batch': 'Batch', 'pt.batches': 'Batches', 'pt.inStock': 'Left', 'pt.state': 'Shelf life', 'pt.code': 'Product code', 'pt.vouchers': 'Production vouchers', 'pt.near': 'Near expiry',
  'pt.liveBatches': 'Batches in stock', 'pt.none': 'No production', 'pt.noneSub': 'Production vouchers show here grouped by product', 'pt.kLive': 'Batches in stock', 'pt.kQty': 'Quantity in batches',
  'pt.kSoon': 'Batches expiring in 7 days', 'pt.kExpired': 'Expired batches in stock', 'pt.back': 'Back', 'pt.produced': 'Produced', 'pt.byBranch': 'In branches', 'pt.finished': 'Sold out',
  'pt.looseTip': 'Stock whose batch is unknown (sold or moved before batches existed)', 'pt.noBatches': 'No batches', 'pt.noBatchesSub': 'Every production voucher makes a batch with its production and expiry dates',
  'pt.prodVouchers': 'Production vouchers', 'pt.trace': 'Trace batch', 'pt.toTransfer': 'Transfer to a branch', 'pt.toScrap': 'Damaged return', 'pt.pickBranch': 'This batch is in several branches, pick the branch in the filter first',
  'pt.daysLeft': '{n} days left', 'pt.expiredAgo': 'Expired {n} days ago', 'pt.today': 'Expires today', 'pt.path': 'Batch path', 'pt.noPath': 'No moves on this batch',
  'pt.countedAs': 'Counted', 'pt.traceNote': 'Sales and moves that did not name a batch are taken from the first to expire.',
  'pt.bulkTransfer': 'Transfer selected', 'pt.bulkScrap': 'Scrap selected', 'pt.selectAll': 'Select all', 'pt.oneBranch': 'The selection is in more than one branch, pick one branch in the filter', 'pt.noAlerts': 'No batches', 'pt.noAlertsSub': 'Nothing needs your attention here',
  'ic.sub': 'Every movement of an item at a branch over a period, with the opening balance and the balance after each move', 'ic.item': 'Item', 'ic.cls': 'Or a classification', 'ic.clear': 'Clear', 'ic.types': 'Movement type',
  'ic.pickItemPh': 'Choose an item…', 'ic.pickClsPh': 'Category, supplier or storage place…', 'ic.allTypes': 'All movements', 'ic.noTypes': 'No movement chosen', 'ic.all': 'All', 'ic.run': 'Show movements',
  'ic.p.today': 'Today', 'ic.p.week': 'Last 7 days', 'ic.p.month': 'This month', 'ic.p.lastMonth': 'Last month', 'ic.p.all': 'From the start',
  'ic.pickItem': 'Choose an item or a classification first', 'ic.clsEmpty': 'No items in this classification', 'ic.pickBranch': 'Choose the branch', 'ic.pickPeriod': 'Set the start and end dates', 'ic.badPeriod': 'The start date is after the end date',
  'ic.code': 'Code', 'ic.wait': 'Loading the movements, try again in a moment', 'ic.allBranches': 'All branches', 'ic.forInvoice': 'for invoice', 'ic.date': 'Date', 'ic.type': 'Movement', 'ic.doc': 'Document #', 'ic.qty': 'Quantity', 'ic.invNo': 'Purchase invoice #', 'ic.invValue': 'Invoice value', 'ic.price': 'Unit price', 'ic.balance': 'Balance',
  'ic.opening': 'Opening balance', 'ic.closing': 'Closing balance', 'ic.qIn': 'In', 'ic.qOut': 'Out', 'ic.count': 'Movements', 'ic.period': 'Period',
  'ic.start': 'Choose the item and the period', 'ic.startSub': 'Then press “Show movements”', 'ic.none': 'No movements in this period', 'ic.noneSub': 'Try a longer period or more movement types',
  'ic.in': 'in', 'ic.out': 'out', 'ic.from': 'from', 'ic.to': 'to', 'ic.counted': 'Counted', 'ic.before': 'before', 'ic.noBefore': 'Old count without the previous balance',
  'ic.noStock': 'Does not take stock', 'ic.notDeducted': 'Invoice did not take stock', 'ic.noDoc': 'No document for this movement', 'ic.noExact': 'No item with this code or barcode',
  'ic.pickItemT': 'Choose item', 'ic.pickItemSub': 'Search by name, code or barcode, or scan a batch barcode', 'ic.searchPh': 'Item name, code or barcode…',
  'ic.pickClsT': 'Choose a classification', 'ic.pickClsSub': 'Shows the movements of every item in it', 'ic.apply': 'Apply', 'ic.lvl0': 'Main category', 'ic.lvl1': 'Sub-category', 'ic.lvl2': 'Second sub-category',
  'ic.c.products': 'Product categories', 'ic.c.materials': 'Material categories', 'ic.c.suppliers': 'Supplier', 'ic.c.storage': 'Storage place',
  'ic.pickCat': 'Choose a category', 'ic.pickSupplier': 'Choose the supplier', 'ic.pickStorage': 'Choose the storage place',
  'ic.t.issue': 'Issue', 'ic.t.order': 'Sale invoice', 'ic.t.transfer': 'Transfer', 'ic.t.cashierRequest': 'Cashier transfer request', 'ic.t.cashierTransfer': 'Cashier transfer (old)', 'ic.t.stockReturn': 'Return to warehouse',
  'ic.t.scrapReturn': 'Damaged return', 'ic.t.supplierReturn': 'Return to supplier', 'ic.t.production': 'Production', 'ic.t.inventory': 'Stocktake', 'ic.t.purchaseReceipt': 'Purchase receipt',
  'iv.none': 'None', 'iv.addItems': 'Add items', 'iv.rowNo': '#', 'iv.excel': 'Export Excel', 'iv.printReport': 'Print report',
  'iv.is.new': 'New issue voucher', 'iv.is.sub': 'Issue items from the main warehouse for an order, production or use', 'iv.is.searchPh': 'Search by voucher #, employee, invoice or item…',
  'iv.is.formSub': 'Choose the issue type, then add items', 'iv.is.voucher': 'Issue voucher', 'iv.is.submit': 'Save issue voucher', 'iv.is.none': 'No issue vouchers', 'iv.is.noneSub': 'Create the first one with “New issue voucher”',
  'iv.is.number': 'Voucher #', 'iv.is.deleteQ': 'Delete this issue voucher?', 'iv.is.deleteNote': 'Deducted quantities go back to the main warehouse.',
  'iv.is.t.order': 'Order', 'iv.is.t.production': 'Production', 'iv.is.t.use': 'Use', 'iv.is.type': 'Issue type', 'iv.is.employee': 'Issued to', 'iv.is.editEmployee': 'Edit employee name', 'iv.is.invoice': 'Invoice #',
  'iv.is.addEmployee': 'Add employee', 'iv.is.linked': 'An issue voucher linked to a production voucher can’t be deleted', 'iv.is.k30': 'Issue vouchers (last 30 days)',
  'iv.tr.new': 'New transfer', 'iv.tr.sub': 'Move items between branches', 'iv.tr.searchPh': 'Search by transfer #, receiver, branch or item…', 'iv.tr.formSub': 'Choose both branches, then add items',
  'iv.tr.voucher': 'Transfer', 'iv.tr.submit': 'Save transfer', 'iv.tr.none': 'No transfers', 'iv.tr.noneSub': 'Create the first one with “New transfer”', 'iv.tr.number': 'Transfer #',
  'iv.tr.deleteQ': 'Delete this transfer?', 'iv.tr.deleteNote': 'Quantities are reversed: back to the source branch and out of the destination.', 'iv.tr.route': 'From {from} to {to}',
  'iv.tr.receiver': 'Receiver name', 'iv.tr.same': 'Can’t transfer to the same branch', 'iv.tr.k30': 'Transfers (last 30 days)', 'iv.tr.kBranches': 'Receiving branches',
  'iv.rw.new': 'New return', 'iv.rw.sub': 'Return items from a branch to the main warehouse', 'iv.rw.searchPh': 'Search by return #, branch, reason or item…', 'iv.rw.formSub': 'Choose the branch and reason, then add items',
  'iv.rw.voucher': 'Return to warehouse', 'iv.rw.submit': 'Save return', 'iv.rw.none': 'No returns', 'iv.rw.noneSub': 'Create the first one with “New return”', 'iv.rw.number': 'Return #',
  'iv.rw.deleteQ': 'Delete this return?', 'iv.rw.deleteNote': 'Quantities go back to the branch and out of the main warehouse.', 'iv.rw.reason': 'Return reason', 'iv.rw.reasonPh': 'e.g. surplus stock',
  'iv.rw.k30': 'Returns (last 30 days)', 'iv.rw.kBranches': 'Returning branches',
  'iv.dm.new': 'New damaged return', 'iv.dm.sub': 'Record damaged items and deduct them from the branch stock', 'iv.dm.searchPh': 'Search by voucher #, branch, sender or item…', 'iv.dm.formSub': 'Choose the branch, then add the damaged items',
  'iv.dm.voucher': 'Damaged return', 'iv.dm.submit': 'Save and deduct', 'iv.dm.none': 'No damaged returns', 'iv.dm.noneSub': 'Create the first one with “New damaged return”', 'iv.dm.number': 'Voucher #',
  'iv.dm.deleteQ': 'Delete this damaged return?', 'iv.dm.deleteNote': 'Quantities go back to the branch stock.', 'iv.dm.sender': 'Sender name', 'iv.dm.k30': 'Damaged (last 30 days)',
  'iv.ic.new': 'New stocktake', 'iv.ic.sub': 'Count a branch’s stock and set the balance to the real quantity', 'iv.ic.searchPh': 'Search by count #, branch, storage location or item…', 'iv.ic.formSub': 'Choose the branch, then enter the counted quantities',
  'iv.ic.voucher': 'Stocktake', 'iv.ic.submit': 'Save count and update stock', 'iv.ic.none': 'No stocktakes', 'iv.ic.noneSub': 'Create the first one with “New stocktake”', 'iv.ic.number': 'Count #',
  'iv.ic.deleteQ': 'Delete this stocktake?', 'iv.ic.deleteNote': 'Every item’s balance returns to what it was before the count.', 'iv.ic.k30': 'Stocktakes (last 30 days)', 'iv.ic.kItems30': 'Items counted (last 30 days)',
  'iv.ic.kDiff30': 'Items with a difference', 'iv.ic.cannotRevert': 'This old stocktake has no previous balance, so it can’t be deleted',
  'iv.pr.new': 'New production voucher', 'iv.pr.sub': 'Record manufactured products and add them to a branch’s stock', 'iv.pr.searchPh': 'Search by voucher #, product, staff or issue #…',
  'iv.pr.formSub': 'Choose the staff and dates, then add products', 'iv.pr.voucher': 'Production voucher', 'iv.pr.number': 'Voucher #', 'iv.pr.product': 'Products', 'iv.pr.issueNo': 'Issue voucher',
  'iv.pr.none': 'No production vouchers', 'iv.pr.noneSub': 'Create the first one with “New production voucher”', 'iv.pr.k30': 'Production vouchers (last 30 days)', 'iv.pr.kQty30': 'Quantity produced (last 30 days)',
  'iv.pr.kSoon': 'Expiring within 7 days', 'iv.pr.commonDate': 'Production date (all)', 'iv.pr.commonExpiry': 'Expiry date (all)', 'iv.pr.addProducts': 'Add products',
  'iv.pr.itemSearchPh': 'Search by name or code, or scan a barcode…', 'iv.pr.produced': 'Produced items', 'iv.pr.noItemsSub': 'Pick products from the list above', 'iv.pr.origin': 'Origin',
  'iv.pr.ingredients': 'Ingredients', 'iv.pr.needWhole': 'Enter a whole quantity above zero for every product', 'iv.pr.pickIssue': 'Select issue voucher', 'iv.pr.noIssues': 'No production issue vouchers',
  'iv.pr.skip': 'Skip', 'iv.pr.confirm': 'Confirm', 'iv.pr.chooseIssue': 'Pick an issue voucher or press Skip', 'iv.pr.printLabels': 'Print labels', 'iv.pr.printLabel': 'Print label',
  'iv.pr.added': 'added to stock', 'iv.pr.labelFail': 'Couldn’t print the label', 'iv.pr.linkedIssue': 'Linked issue voucher', 'iv.pr.used': 'Materials used',
  'iv.pr.deleteQ': 'Delete this production voucher?', 'iv.pr.deleteNote': 'The produced quantities will be deducted from {branch}.', 'iv.pr.issueGone': 'The issue voucher no longer exists',
  'iv.ps.new': 'Add production staff', 'iv.ps.edit': 'Edit production staff', 'iv.ps.sub': 'Staff that production and issues are recorded against', 'iv.ps.formSub': 'Arabic and English names are required',
  'iv.ps.vouchers': 'Production vouchers', 'iv.ps.none': 'No production staff', 'iv.ps.noneSub': 'Add the first one with “Add production staff”', 'iv.ps.deleteQ': 'Delete this staff member?',
  'iv.ps.inUseNote': 'Old vouchers keep the staff name.',
  'iv.rc.new': 'New receiving voucher', 'iv.rc.sub': 'Record goods received from an outside source', 'iv.rc.searchPh': 'Search by voucher #, source or item…', 'iv.rc.formSub': 'Enter the source, then add items',
  'iv.rc.voucher': 'Receiving voucher', 'iv.rc.submit': 'Save receiving', 'iv.rc.number': 'Voucher #', 'iv.rc.source': 'Source', 'iv.rc.location': 'Storage location', 'iv.rc.addItem': 'Add item',
  'iv.rc.allFields': 'Fill the Arabic and English names, quantity and storage location', 'iv.rc.noItemsSub': 'Fill the fields above and press Add (or Enter in quantity)', 'iv.rc.none': 'No receiving vouchers',
  'iv.rc.noneSub': 'Create the first one with “New receiving voucher”', 'iv.rc.deleteQ': 'Delete this receiving voucher?', 'iv.rc.k30': 'Receiving vouchers (last 30 days)', 'iv.rc.kItems30': 'Items received (last 30 days)',
  'iv.rc.kSources30': 'Sources (last 30 days)',
  'iv.cr.sub': 'Shortage requests sent from the cashier screens', 'iv.cr.searchPh': 'Search by request #, branch, cashier or item…', 'iv.cr.number': 'Request #', 'iv.cr.cashier': 'Cashier',
  'iv.cr.none': 'No requests', 'iv.cr.noneSub': 'Shortage requests from the cashier show up here', 'iv.cr.kTotal': 'Total requests',
  'iv.cr.s.pending': 'Awaiting acceptance', 'iv.cr.s.accepted': 'Awaiting preparation', 'iv.cr.s.sent': 'Sent', 'iv.cr.s.transferred': 'Transferred', 'iv.cr.s.received': 'Received',
  'iv.cr.s.partial_received': 'Partly received', 'iv.cr.s.rejected': 'Rejected',
  'iv.cr.g.sweets': 'Sweets', 'iv.cr.g.tableware': 'Tableware', 'iv.cr.g.supplies': 'Supplies', 'iv.cr.g.other': 'Other', 'iv.cr.group': 'Group',
  'iv.cr.accept': 'Accept request', 'iv.cr.accepted': 'Request accepted', 'iv.cr.deliver': 'Deliver', 'iv.cr.deliverTitle': 'Deliver request', 'iv.cr.fillAll': 'All shortages covered',
  'iv.cr.deliverNote': 'Sent quantities are deducted from {branch}', 'iv.cr.requested': 'Requested', 'iv.cr.sentQty': 'Sent', 'iv.cr.receivedQty': 'Received', 'iv.cr.send': 'Send',
  'iv.cr.sentOk': 'Sent', 'iv.cr.badQty': 'Check the sent quantities', 'iv.cr.pdf': 'PDF report', 'iv.cr.sheet': 'Print delivery sheet', 'iv.cr.details': 'Request details',
  'iv.cr.printFull': 'Print all', 'iv.cr.requester': 'Requested by', 'iv.cr.executor': 'Fulfilled by', 'iv.cr.receiver': 'Received by', 'iv.cr.ack': 'Acknowledgement',
  'iv.cr.ackText': 'I, {name}, acknowledge receiving the items above', 'iv.cr.receivedAt': 'Received at', 'iv.cr.noBarcode': 'This request number can’t make a barcode'
});

/* الأجهزة والكاشير */
Object.assign(I18N.ar, {
  'dv.sub': 'ربط الأجهزة بالفروع وإدارة أكواد الكاشير', 'dv.open': 'الأجهزة المفتوحة', 'dv.id': 'رقم الجهاز', 'dv.label': 'اسم الجهاز',
  'dv.pCashier': 'كاشير', 'dv.pAccounting': 'المحاسبة والمخازن', 'dv.unlinked': 'غير مرتبط', 'dv.isLinked': 'مرتبط', 'dv.thisOne': 'هذا الجهاز',
  'dv.current': 'الجهاز الحالي', 'dv.currentSub': 'اربط هذا الجهاز بفرع حتى يفتح الكاشير عليه بدون رسالة «الجهاز غير معرف»',
  'dv.curBranch': 'الفرع الحالي', 'dv.linkTo': 'ربط الجهاز الحالي بفرع', 'dv.curSave': 'حفظ ربط الجهاز الحالي', 'dv.curClear': 'إلغاء ربط الجهاز الحالي',
  'dv.pickBranch': 'اختر الفرع أولاً', 'dv.linked': 'تم ربط الجهاز بالفرع', 'dv.unlinkedOk': 'تم إلغاء ربط الجهاز', 'dv.unassign': 'إلغاء الربط',
  'dv.none': 'لا توجد أجهزة مفتوحة', 'dv.noneSub': 'يظهر هنا كل جهاز متصل الآن أو مرتبط بفرع',
  'dv.deleteQ': 'حذف الجهاز؟', 'dv.deleteNote': 'يُحذف الجهاز ويُلغى ربطه، ولن يفتح الكاشير عليه حتى يُربط من جديد',
  'dv.cashiers': 'الكاشير', 'dv.cashierName': 'اسم الكاشير', 'dv.cashierCode': 'كود الكاشير', 'dv.addCashier': 'إضافة كاشير', 'dv.editCashier': 'تعديل كاشير',
  'dv.cashierSub': 'يدخل الكاشير بهذا الكود', 'dv.genCode': 'توليد كود', 'dv.codeTaken': 'هذا الكود مستخدم لكاشير آخر',
  'dv.noCashiers': 'لا يوجد كاشير بعد', 'dv.noCashiersSub': 'أضف كاشير أو استورد ملف إكسل', 'dv.deleteCashierQ': 'حذف الكاشير؟',
  'dv.import': 'استيراد كاشير', 'dv.impStep1Sub': 'صف لكل كاشير — الاسم والكود مطلوبان', 'dv.impStep2Sub': 'الأكواد الموجودة مسبقاً أو المكررة في الملف يتم تجاهلها',
  'dv.impExisting': 'كود موجود مسبقاً (تم تجاهله): {n}', 'dv.impInvalid': 'صف ناقص (تم تجاهله): {n}'
});
Object.assign(I18N.en, {
  'dv.sub': 'Link devices to branches and manage cashier codes', 'dv.open': 'Open devices', 'dv.id': 'Device ID', 'dv.label': 'Device name',
  'dv.pCashier': 'Cashier', 'dv.pAccounting': 'Accounting & Inventory', 'dv.unlinked': 'Not linked', 'dv.isLinked': 'Linked', 'dv.thisOne': 'This device',
  'dv.current': 'This device', 'dv.currentSub': 'Link this device to a branch so the cashier opens on it without the “unknown device” message',
  'dv.curBranch': 'Current branch', 'dv.linkTo': 'Link this device to a branch', 'dv.curSave': 'Save this device’s link', 'dv.curClear': 'Unlink this device',
  'dv.pickBranch': 'Choose the branch first', 'dv.linked': 'Device linked to the branch', 'dv.unlinkedOk': 'Device unlinked', 'dv.unassign': 'Unlink',
  'dv.none': 'No open devices', 'dv.noneSub': 'Every device online now or linked to a branch shows here',
  'dv.deleteQ': 'Delete device?', 'dv.deleteNote': 'The device is deleted and unlinked; the cashier won’t open on it until it is linked again',
  'dv.cashiers': 'Cashiers', 'dv.cashierName': 'Cashier name', 'dv.cashierCode': 'Cashier code', 'dv.addCashier': 'Add cashier', 'dv.editCashier': 'Edit cashier',
  'dv.cashierSub': 'The cashier signs in with this code', 'dv.genCode': 'Generate', 'dv.codeTaken': 'Another cashier already uses this code',
  'dv.noCashiers': 'No cashiers yet', 'dv.noCashiersSub': 'Add a cashier or import an Excel file', 'dv.deleteCashierQ': 'Delete cashier?',
  'dv.import': 'Import cashiers', 'dv.impStep1Sub': 'One row per cashier — name and code are required', 'dv.impStep2Sub': 'Codes that already exist or repeat in the file are skipped',
  'dv.impExisting': 'Code already exists (skipped): {n}', 'dv.impInvalid': 'Incomplete row (skipped): {n}'
});

/* المستخدمون */
Object.assign(I18N.ar, {
  'us.sub': 'حسابات الدخول وصلاحياتها — كل مستخدم يدخل بالكود الخاص به', 'us.add': 'إضافة مستخدم', 'us.edit': 'تعديل مستخدم', 'us.name': 'اسم المستخدم', 'us.code': 'كود الدخول',
  'us.searchPh': 'ابحث بالاسم أو الكود', 'us.allRoles': 'كل الوظائف', 'us.none': 'لا يوجد مستخدمون', 'us.noneSub': 'أضف أول مستخدم',
  'us.formSub': 'الاسم وكود الدخول والوظيفة', 'us.codeTaken': 'هذا الكود مستخدم لمستخدم آخر', 'us.builtin': 'مدير النظام الأساسي', 'us.you': 'أنت',
  'us.builtinNote': 'مدير النظام الأساسي لا يُحذف ويبقى مديراً', 'us.selfNote': 'لا يمكنك حذف حسابك أو إزالة صلاحية المدير عنه', 'us.lastManager': 'هذا آخر مدير — أضف مديراً آخر أولاً',
  'us.roleNote_manager': 'يرى كل الصفحات بما فيها الإدارة', 'us.roleNote_cashier': 'لا يرى المخازن والموردين', 'us.roleNote_storekeeper': 'لا يرى صفحات الإدارة',
  'us.deleteQ': 'حذف المستخدم؟', 'us.deleteNote': 'لن يستطيع الدخول بكوده بعد الحذف'
});
Object.assign(I18N.en, {
  'us.sub': 'Sign-in accounts and their access — each user signs in with their own code', 'us.add': 'Add user', 'us.edit': 'Edit user', 'us.name': 'User name', 'us.code': 'Sign-in code',
  'us.searchPh': 'Search by name or code', 'us.allRoles': 'All roles', 'us.none': 'No users', 'us.noneSub': 'Add the first user',
  'us.formSub': 'Name, sign-in code and role', 'us.codeTaken': 'Another user already uses this code', 'us.builtin': 'Built-in system manager', 'us.you': 'You',
  'us.builtinNote': 'The built-in manager can’t be deleted and stays a manager', 'us.selfNote': 'You can’t delete your own account or remove its manager role', 'us.lastManager': 'This is the last manager — add another manager first',
  'us.roleNote_manager': 'Sees every page, administration included', 'us.roleNote_cashier': 'Doesn’t see inventory or suppliers', 'us.roleNote_storekeeper': 'Doesn’t see administration',
  'us.deleteQ': 'Delete user?', 'us.deleteNote': 'They won’t be able to sign in with their code after deletion'
});
Object.assign(I18N.ar, { 'ic.saleOther': 'خُصمت من مخزون ذلك الفرع — للاطلاع', 'ic.saleEarlier': 'فاتورة قبل بداية الفترة — خصمها داخل في الرصيد الافتتاحي' });
Object.assign(I18N.en, { 'ic.saleOther': 'taken from that branch’s stock — for reference', 'ic.saleEarlier': 'invoice before the period — already in the opening balance' });

/* الطاولات */
Object.assign(I18N.ar, {
  'tb.sub': 'طاولات كل فرع مع طلباتها وإيراداتها خلال الفترة', 'tb.add': 'إضافة طاولة', 'tb.edit': 'تعديل طاولة', 'tb.table': 'طاولة', 'tb.number': 'رقم الطاولة',
  'tb.location': 'مكان الطاولة', 'tb.locationPh': 'مثال: الصالة، الجلسة الخارجية', 'tb.orders': 'عدد الطلبات', 'tb.revenue': 'إيراد الطاولة', 'tb.count': 'عدد الطاولات',
  'tb.searchPh': 'ابحث برقم الطاولة أو الفرع أو المكان', 'tb.sort': 'الترتيب', 'tb.s.ordersDesc': 'الطلبات: من الأعلى', 'tb.s.ordersAsc': 'الطلبات: من الأقل',
  'tb.s.revenueDesc': 'الإيراد: من الأعلى', 'tb.s.revenueAsc': 'الإيراد: من الأقل', 'tb.s.number': 'رقم الطاولة', 'tb.virtual': 'من عدد طاولات الفرع',
  'tb.none': 'لا توجد طاولات', 'tb.noneSub': 'أضف طاولات الفروع لمتابعة طلباتها', 'tb.formSub': 'رقم الطاولة لا يتكرر داخل الفرع نفسه', 'tb.exists': 'هذا الرقم موجود في هذا الفرع',
  'tb.renumberNote': 'تغيير الرقم لا يغيّر الفواتير السابقة — تبقى مسجلة على الرقم القديم', 'tb.deleteQ': 'حذف الطاولة؟', 'tb.deleteNote': 'فواتيرها السابقة لا تُحذف',
  'tb.dSearchPh': 'ابحث برقم الفاتورة أو العميل أو رقم الهاتف أو الكاشير', 'tb.allCashiers': 'كل الكاشير', 'tb.allTime': 'كل الفترات', 'tb.session': 'فتح وإغلاق الطاولة',
  'tb.h': 'س', 'tb.m': 'د', 'tb.kProducts': 'إجمالي مبلغ المنتجات', 'tb.kDelivery': 'إجمالي التوصيل', 'tb.kTotal': 'إجمالي المبيعات',
  'tb.noOrders': 'لا توجد فواتير لهذه الطاولة', 'tb.noOrdersSub': 'غيّر الفترة أو الفلاتر'
});
Object.assign(I18N.en, {
  'tb.sub': 'Each branch’s tables with their orders and revenue over the period', 'tb.add': 'Add table', 'tb.edit': 'Edit table', 'tb.table': 'Table', 'tb.number': 'Table number',
  'tb.location': 'Location', 'tb.locationPh': 'e.g. Hall, Outdoor', 'tb.orders': 'Orders', 'tb.revenue': 'Table revenue', 'tb.count': 'Tables',
  'tb.searchPh': 'Search by table number, branch or location', 'tb.sort': 'Sort', 'tb.s.ordersDesc': 'Orders: high to low', 'tb.s.ordersAsc': 'Orders: low to high',
  'tb.s.revenueDesc': 'Revenue: high to low', 'tb.s.revenueAsc': 'Revenue: low to high', 'tb.s.number': 'Table number', 'tb.virtual': 'From the branch’s table count',
  'tb.none': 'No tables', 'tb.noneSub': 'Add the branches’ tables to follow their orders', 'tb.formSub': 'A table number is unique within its branch', 'tb.exists': 'This number already exists in this branch',
  'tb.renumberNote': 'Changing the number doesn’t change past invoices — they stay on the old number', 'tb.deleteQ': 'Delete table?', 'tb.deleteNote': 'Its past invoices are not deleted',
  'tb.dSearchPh': 'Search by invoice, customer, phone or cashier', 'tb.allCashiers': 'All cashiers', 'tb.allTime': 'All time', 'tb.session': 'Table open → close',
  'tb.h': 'h', 'tb.m': 'm', 'tb.kProducts': 'Products total', 'tb.kDelivery': 'Delivery total', 'tb.kTotal': 'Sales total',
  'tb.noOrders': 'No invoices for this table', 'tb.noOrdersSub': 'Change the period or filters'
});
Object.assign(I18N.ar, { 'ic.saleCancelled': 'فاتورة ملغية — للاطلاع' });
Object.assign(I18N.en, { 'ic.saleCancelled': 'cancelled invoice — for reference' });

/* الفروع */
Object.assign(I18N.ar, {
  'br.sub': 'فروع المحل وعناوينها — الفرع الرئيسي هو الذي تُدار منه مواقع التخزين', 'br.add': 'إضافة فرع', 'br.edit': 'تعديل فرع', 'br.name': 'الفرع',
  'br.nameAr': 'الاسم بالعربي', 'br.nameEn': 'الاسم بالإنجليزي', 'br.address': 'العنوان', 'br.main': 'الفرع الرئيسي', 'br.isMain': 'رئيسي',
  'br.formSub': 'اسم الفرع لا يتكرر', 'br.nameTaken': 'يوجد فرع بهذا الاسم', 'br.mainKeep': 'هذا هو الفرع الرئيسي — لتغييره اجعل فرعاً آخر رئيسياً',
  'br.mainMove': 'تفعيله ينقل صفة الرئيسي من الفرع الحالي إلى هذا الفرع', 'br.mainNone': 'لا يوجد فرع رئيسي حالياً — هذا الفرع سيكون الرئيسي',
  'br.mainLocked': 'لا يمكن حذف الفرع الرئيسي — اجعل فرعاً آخر رئيسياً أولاً', 'br.none': 'لا توجد فروع', 'br.noneSub': 'أضف فروع المحل لتظهر في المبيعات والمخزون',
  'br.deleteQ': 'حذف الفرع؟', 'br.deleteNote': 'فواتيره وحركاته السابقة لا تُحذف', 'br.deleteUsed': 'هذا الفرع ما زال مستخدماً — بعد حذفه تبقى هذه البيانات بدون فرع',
  'br.no': 'لا', 'br.uDevices': 'أجهزة مربوطة', 'br.uTables': 'طاولات', 'br.uStock': 'أصناف لها رصيد فيه'
});
Object.assign(I18N.en, {
  'br.sub': 'The shop’s branches and addresses — storage locations are managed at the main branch', 'br.add': 'Add branch', 'br.edit': 'Edit branch', 'br.name': 'Branch',
  'br.nameAr': 'Arabic name', 'br.nameEn': 'English name', 'br.address': 'Address', 'br.main': 'Main branch', 'br.isMain': 'Main',
  'br.formSub': 'Branch names are unique', 'br.nameTaken': 'A branch with this name exists', 'br.mainKeep': 'This is the main branch — to change it, make another branch main',
  'br.mainMove': 'Turning this on moves “main” from the current branch to this one', 'br.mainNone': 'There is no main branch — this branch will be the main one',
  'br.mainLocked': 'The main branch can’t be deleted — make another branch main first', 'br.none': 'No branches', 'br.noneSub': 'Add the shop’s branches to use them in sales and stock',
  'br.deleteQ': 'Delete branch?', 'br.deleteNote': 'Its past invoices and movements are not deleted', 'br.deleteUsed': 'This branch is still in use — after deleting, this data is left without a branch',
  'br.no': 'No', 'br.uDevices': 'Linked devices', 'br.uTables': 'Tables', 'br.uStock': 'Items with stock here'
});

/* أسعار التوصيل */
Object.assign(I18N.ar, {
  'dp.sub': 'يستخدمها الكاشير تلقائياً حسب فرعه ومنطقة العميل', 'dp.save': 'حفظ الأسعار', 'dp.g_mainYarmouk': 'الفرع الرئيسي واليرموك', 'dp.g_abuHasaniya': 'فرع أبو الحصانية',
  'dp.area': 'المنطقة', 'dp.price': 'سعر التوصيل', 'dp.pricePh': 'اكتب السعر', 'dp.source': 'المصدر', 'dp.searchPh': 'ابحث عن منطقة',
  'dp.s_saved': 'محفوظ', 'dp.s_invoices': 'من الفواتير السابقة', 'dp.s_unknown': 'غير معروف', 'dp.fromCashier': 'أضافها الكاشير',
  'dp.kAreas': 'عدد المناطق', 'dp.kKnown': 'أسعار معروفة', 'dp.kMissing': 'بدون سعر', 'dp.changed': '{n} تعديل غير محفوظ',
  'dp.badPrice': 'سعر غير صحيح في «{a}»', 'dp.saved': 'تم حفظ أسعار التوصيل', 'dp.saveFailed': 'تعذر حفظ أسعار التوصيل', 'dp.nothing': 'لا يوجد تغيير للحفظ',
  'dp.discardQ': 'تجاهل التعديلات؟', 'dp.discardNote': 'عندك أسعار لم تُحفظ في هذا القسم — ستضيع إذا انتقلت', 'dp.discard': 'تجاهل وانتقال'
});
Object.assign(I18N.en, {
  'dp.sub': 'The cashier uses them automatically by its branch and the customer’s area', 'dp.save': 'Save prices', 'dp.g_mainYarmouk': 'Main branch & Yarmouk', 'dp.g_abuHasaniya': 'Abu Al-Hasaniya branch',
  'dp.area': 'Area', 'dp.price': 'Delivery price', 'dp.pricePh': 'Enter price', 'dp.source': 'Source', 'dp.searchPh': 'Search area',
  'dp.s_saved': 'Saved', 'dp.s_invoices': 'From past invoices', 'dp.s_unknown': 'Unknown', 'dp.fromCashier': 'Added by cashier',
  'dp.kAreas': 'Areas', 'dp.kKnown': 'Known prices', 'dp.kMissing': 'Without price', 'dp.changed': '{n} unsaved changes',
  'dp.badPrice': 'Invalid price for “{a}”', 'dp.saved': 'Delivery prices saved', 'dp.saveFailed': 'Couldn’t save delivery prices', 'dp.nothing': 'Nothing changed',
  'dp.discardQ': 'Discard changes?', 'dp.discardNote': 'You have unsaved prices in this group — they’ll be lost if you switch', 'dp.discard': 'Discard and switch'
});

/* خصومات */
Object.assign(I18N.ar, {
  'ds.sub': 'أكواد الخصم وخصومات الأصناف وخصم المدير — اضغط أي خصم لعرض فواتيره', 'ds.add': 'إضافة خصم', 'ds.edit': 'تعديل خصم', 'ds.formSub': 'كود خصم للعملاء أو خصم على صنف أو تصنيف',
  'ds.type': 'نوع الخصم', 'ds.code': 'كود خصم', 'ds.product': 'خصم صنف', 'ds.manager': 'خصم المدير', 'ds.managerSub': 'كل فاتورة عليها خصم من الكاشير',
  'ds.codeL': 'كود الخصم', 'ds.audience': 'الفئة', 'ds.aud_all': 'الكل', 'ds.aud_vip': 'VIP', 'ds.aud_vvip': 'VVIP',
  'ds.target': 'الخصم على', 'ds.tProduct': 'صنف', 'ds.tCategory': 'تصنيف', 'ds.choose': 'اختر…', 'ds.start': 'تاريخ البداية', 'ds.end': 'تاريخ النهاية',
  'ds.valueType': 'نوع القيمة', 'ds.vt_percent': 'نسبة %', 'ds.vt_amount': 'مبلغ ثابت', 'ds.discount': 'الخصم',
  'ds.timing': 'وقت التطبيق', 'ds.tm_start': 'من تاريخ البداية', 'ds.tm_expiry': 'قبل انتهاء الصلاحية', 'ds.days': 'عدد الأيام قبل الانتهاء', 'ds.daysShort': 'قبل الانتهاء بـ {n} يوم',
  'ds.usage': 'عدد الاستخدام', 'ds.st_on': 'نشط', 'ds.st_off': 'موقوف', 'ds.st_expired': 'منتهي', 'ds.activate': 'تفعيل', 'ds.deactivate': 'إيقاف',
  'ds.activated': 'تم تفعيل الخصم', 'ds.deactivated': 'تم إيقاف الخصم', 'ds.none': 'لا توجد خصومات', 'ds.noneSub': 'أضف كود خصم أو خصم على صنف',
  'ds.endBefore': 'النهاية قبل البداية', 'ds.badValue': 'اكتب قيمة أكبر من صفر', 'ds.over100': 'النسبة لا تزيد عن 100%', 'ds.codeTaken': 'هذا الكود مستخدم في خصم آخر', 'ds.badDays': 'اكتب عدد أيام صحيح',
  'ds.deleteQ': 'حذف الخصم؟', 'ds.deleteNote': 'الفواتير التي استخدمته لا تتغير',
  'ds.kProducts': 'مبلغ المنتجات', 'ds.kProductsT': 'إجمالي مبلغ المنتجات', 'ds.kDelivery': 'إجمالي التوصيل', 'ds.kTotal': 'إجمالي المبيعات', 'ds.kNet': 'صافي الإيراد',
  'ds.count': '{n} فاتورة · خصم {d}', 'ds.noOrders': 'لا توجد فواتير لهذا الخصم', 'ds.noOrdersSub': 'غيّر الفترة'
});
Object.assign(I18N.en, {
  'ds.sub': 'Discount codes, item discounts and the manager discount — open one to see its invoices', 'ds.add': 'Add discount', 'ds.edit': 'Edit discount', 'ds.formSub': 'A customer code, or a discount on an item or category',
  'ds.type': 'Discount type', 'ds.code': 'Discount code', 'ds.product': 'Item discount', 'ds.manager': 'Manager discount', 'ds.managerSub': 'Every invoice the cashier discounted',
  'ds.codeL': 'Code', 'ds.audience': 'Audience', 'ds.aud_all': 'All', 'ds.aud_vip': 'VIP', 'ds.aud_vvip': 'VVIP',
  'ds.target': 'Applies to', 'ds.tProduct': 'Item', 'ds.tCategory': 'Category', 'ds.choose': 'Choose…', 'ds.start': 'Start date', 'ds.end': 'End date',
  'ds.valueType': 'Value type', 'ds.vt_percent': 'Percent %', 'ds.vt_amount': 'Fixed amount', 'ds.discount': 'Discount',
  'ds.timing': 'Applies', 'ds.tm_start': 'From the start date', 'ds.tm_expiry': 'Before expiry', 'ds.days': 'Days before expiry', 'ds.daysShort': '{n} days before expiry',
  'ds.usage': 'Uses', 'ds.st_on': 'Active', 'ds.st_off': 'Stopped', 'ds.st_expired': 'Expired', 'ds.activate': 'Activate', 'ds.deactivate': 'Stop',
  'ds.activated': 'Discount activated', 'ds.deactivated': 'Discount stopped', 'ds.none': 'No discounts', 'ds.noneSub': 'Add a code or an item discount',
  'ds.endBefore': 'End is before start', 'ds.badValue': 'Enter a value above zero', 'ds.over100': 'Percent can’t exceed 100%', 'ds.codeTaken': 'This code is used by another discount', 'ds.badDays': 'Enter a whole number of days',
  'ds.deleteQ': 'Delete discount?', 'ds.deleteNote': 'Invoices that used it don’t change',
  'ds.kProducts': 'Products', 'ds.kProductsT': 'Products total', 'ds.kDelivery': 'Delivery total', 'ds.kTotal': 'Sales total', 'ds.kNet': 'Net revenue',
  'ds.count': '{n} invoices · {d} discount', 'ds.noOrders': 'No invoices for this discount', 'ds.noOrdersSub': 'Change the period'
});

/* Simple name lists (أنواع الطلب) */
Object.assign(I18N.ar, {
  'nl.nameAr': 'الاسم بالعربي', 'nl.nameEn': 'الاسم بالإنجليزي', 'nl.formSub': 'الاسمان مطلوبان ولا يتكرران', 'nl.taken': 'هذا الاسم موجود',
  'ot.sub': 'أنواع الطلب التي تظهر في الفواتير والتقارير', 'ot.add': 'إضافة نوع طلب', 'ot.edit': 'تعديل نوع طلب', 'ot.none': 'لا توجد أنواع طلب', 'ot.noneSub': 'أضف أنواع الطلب مثل توصيل واستلام',
  'ot.deleteQ': 'حذف نوع الطلب؟', 'ot.deleteNote': 'الفواتير السابقة لا تُحذف'
});
Object.assign(I18N.en, {
  'nl.nameAr': 'Arabic name', 'nl.nameEn': 'English name', 'nl.formSub': 'Both names are required and unique', 'nl.taken': 'This name already exists',
  'ot.sub': 'Order types shown on invoices and reports', 'ot.add': 'Add order type', 'ot.edit': 'Edit order type', 'ot.none': 'No order types', 'ot.noneSub': 'Add order types such as delivery and pickup',
  'ot.deleteQ': 'Delete order type?', 'ot.deleteNote': 'Past invoices are not deleted'
});
Object.assign(I18N.ar, {
  'pmt.sub': 'طرق الدفع التي تظهر في الفواتير والتقارير', 'pmt.add': 'إضافة طريقة دفع', 'pmt.edit': 'تعديل طريقة دفع', 'pmt.none': 'لا توجد طرق دفع', 'pmt.noneSub': 'أضف طرق الدفع مثل كاش وكي نت',
  'pmt.deleteQ': 'حذف طريقة الدفع؟', 'pmt.deleteNote': 'الفواتير السابقة لا تُحذف'
});
Object.assign(I18N.en, {
  'pmt.sub': 'Payment methods shown on invoices and reports', 'pmt.add': 'Add payment method', 'pmt.edit': 'Edit payment method', 'pmt.none': 'No payment methods', 'pmt.noneSub': 'Add payment methods such as cash and KNET',
  'pmt.deleteQ': 'Delete payment method?', 'pmt.deleteNote': 'Past invoices are not deleted'
});

/* يوميات الموظفين */
Object.assign(I18N.ar, {
  'dj.sub': 'يوميات الكاشير من فتحها إلى إغلاقها — اضغط أي يومية لعرض تفاصيلها', 'dj.searchPh': 'ابحث بالموظف أو الكود أو الفرع', 'dj.count': 'عدد اليوميات: {n}',
  'dj.employee': 'الموظف', 'dj.opened': 'فتح اليومية', 'dj.closed': 'إغلاق اليومية', 'dj.opening': 'مبلغ البداية', 'dj.st_open': 'مفتوحة', 'dj.st_closed': 'مغلقة',
  'dj.view': 'التفاصيل', 'dj.print': 'طباعة', 'dj.none': 'لا توجد يوميات محفوظة', 'dj.noneSub': 'تظهر هنا عندما يفتح الكاشير يومية',
  'dj.off': 'يختلف عن الإغلاق', 'dj.offTip': 'أرقام الإغلاق التي حفظها الكاشير لا تطابق فواتير اليومية', 'dj.offTitle': 'أرقام الإغلاق لا تطابق الفواتير',
  'dj.offBody': 'عند الإغلاق حسب الكاشير {c} فاتورة (من {f} إلى {l})، بينما فواتير هذه اليومية {n}. الأرقام هنا محسوبة من الفواتير نفسها.', 'dj.offSaved': 'ما حفظه الكاشير',
  'dj.title': 'يومية الموظف', 'dj.first': 'رقم أول فاتورة', 'dj.last': 'رقم آخر فاتورة', 'dj.invoices': 'عدد الفواتير', 'dj.invoicesH': 'الفواتير',
  'dj.revenue': 'الإيرادات', 'dj.payments': 'مدفوعات', 'dj.paymentsTotal': 'إجمالي المدفوعات', 'dj.noPayments': 'لا توجد مدفوعات',
  'dj.p_cash': 'كاش', 'dj.p_online': 'أونلاين', 'dj.p_knet': 'كي نت', 'dj.p_link': 'رابط دفع', 'dj.p_other': 'أخرى',
  'dj.cancelled': 'الفواتير الملغية', 'dj.cancelledMark': 'ملغية', 'dj.delivered': 'فواتير التوصيل المسلمة للمندوب', 'dj.noDelivered': 'لا توجد فواتير توصيل مسلمة',
  'dj.sameDay': 'فواتير توصيل سيتابعها الكاشير التالي', 'dj.future': 'فواتير توصيل مؤجلة ليوم آخر', 'dj.noneHere': 'لا يوجد',
  'dj.inv': 'الفاتورة', 'dj.pay': 'الدفع', 'dj.value': 'القيمة', 'dj.courier': 'المندوب', 'dj.time': 'موعد التوصيل', 'dj.when': 'موعد توصيلها',
  'dj.am': 'صباحاً', 'dj.pm': 'مساءً', 'dj.noon': 'ظهراً', 'dj.thanks': '***شكراً***'
});
Object.assign(I18N.en, {
  'dj.sub': 'Cashier sessions from opening to closing — open one for its details', 'dj.searchPh': 'Search by employee, code or branch', 'dj.count': 'Sessions: {n}',
  'dj.employee': 'Employee', 'dj.opened': 'Opened', 'dj.closed': 'Closed', 'dj.opening': 'Opening amount', 'dj.st_open': 'Open', 'dj.st_closed': 'Closed',
  'dj.view': 'Details', 'dj.print': 'Print', 'dj.none': 'No saved sessions', 'dj.noneSub': 'They appear here when a cashier opens a session',
  'dj.off': 'Differs from closing', 'dj.offTip': 'The closing figures the cashier saved don’t match the session’s invoices', 'dj.offTitle': 'Closing figures don’t match the invoices',
  'dj.offBody': 'At closing the cashier counted {c} invoices ({f} to {l}), while this session has {n}. The figures here come from the invoices themselves.', 'dj.offSaved': 'Saved by the cashier',
  'dj.title': 'Employee session', 'dj.first': 'First invoice', 'dj.last': 'Last invoice', 'dj.invoices': 'Invoices', 'dj.invoicesH': 'Invoices',
  'dj.revenue': 'Revenue', 'dj.payments': 'Payments', 'dj.paymentsTotal': 'Payments total', 'dj.noPayments': 'No payments',
  'dj.p_cash': 'Cash', 'dj.p_online': 'Online', 'dj.p_knet': 'KNET', 'dj.p_link': 'Payment link', 'dj.p_other': 'Other',
  'dj.cancelled': 'Cancelled invoices', 'dj.cancelledMark': 'cancelled', 'dj.delivered': 'Delivery invoices handed to the courier', 'dj.noDelivered': 'No delivery invoices handed over',
  'dj.sameDay': 'Delivery invoices for the next cashier', 'dj.future': 'Delivery invoices for another day', 'dj.noneHere': 'None',
  'dj.inv': 'Invoice', 'dj.pay': 'Payment', 'dj.value': 'Value', 'dj.courier': 'Courier', 'dj.time': 'Delivery time', 'dj.when': 'Delivery on',
  'dj.am': 'AM', 'dj.pm': 'PM', 'dj.noon': 'noon', 'dj.thanks': '***Thank you***'
});

/* System data download (local-copy.js) */
Object.assign(I18N.ar, {
  'pl.title': 'تحميل بيانات النظام', 'pl.sub': 'يرجى الضغط على تحميل لتحميل بيانات النظام', 'pl.btn': 'تحميل',
  'pl.wait': 'انتظر قليلاً', 'pl.loading': 'جارٍ تحميل بياناتك...', 'pl.done': 'اكتمل التحميل',
  'pl.loaded': 'تم تحميل', 'pl.remaining': 'المتبقي', 'pl.timeLeft': 'الوقت المتبقي', 'pl.of': 'من',
  'pl.mb': 'م.ب', 'pl.kb': 'ك.ب', 'pl.sec': 'ث', 'pl.min': 'د', 'pl.lessSec': 'أقل من ثانية',
  toTop: 'العودة إلى أعلى الصفحة', 'ci.download': 'تحميل صورة الرسم البياني', 'ci.done': 'تم تحميل صورة الرسم البياني', 'ci.failed': 'تعذر إنشاء الصورة، تأكد من الإنترنت', 'ci.made': 'أُنشئت في', printSent: 'تم الإرسال إلى الطابعة', printFailed: 'تعذرت الطباعة المباشرة، اختر الطابعة من النافذة',
  'pl.failed': 'تعذر تحميل البيانات من السيرفر', 'pl.netFailed': 'تعذر الاتصال بالسيرفر، تأكد من الإنترنت', 'pl.retry': 'إعادة المحاولة'
});
Object.assign(I18N.en, {
  'pl.title': 'Download system data', 'pl.sub': 'Press Download to load the system data', 'pl.btn': 'Download',
  'pl.wait': 'Please wait', 'pl.loading': 'Loading your data...', 'pl.done': 'Download complete',
  'pl.loaded': 'Downloaded', 'pl.remaining': 'Remaining', 'pl.timeLeft': 'Time left', 'pl.of': 'of',
  'pl.mb': 'MB', 'pl.kb': 'KB', 'pl.sec': 's', 'pl.min': 'min', 'pl.lessSec': 'under a second',
  toTop: 'Back to top', 'ci.download': 'Download chart image', 'ci.done': 'Chart image downloaded', 'ci.failed': 'Could not create the image — check the internet', 'ci.made': 'Created', printSent: 'Sent to the printer', printFailed: 'Direct printing failed — choose the printer in the dialog',
  'pl.failed': 'Could not load the data from the server', 'pl.netFailed': 'Could not reach the server — check the internet', 'pl.retry': 'Try again'
});
