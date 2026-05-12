// ==================== DATA ====================
let cars = JSON.parse(localStorage.getItem('rentprofit_cars') || '[]');

// Migrate old cars from feePercent to feeAmount
cars.forEach(car => {
    if (car.feePercent !== undefined && car.feeAmount === undefined) {
        car.feeAmount = 10;
        delete car.feePercent;
    }
});
let currentCarId = null;
let currentTab = 'rentals';
let carPhotoData = null;

function saveData() {
    localStorage.setItem('rentprofit_cars', JSON.stringify(cars));
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMonthKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2500);
}

// ==================== MODALS ====================
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// ==================== CAR PHOTO UPLOAD ====================
function handleCarPhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        carPhotoData = ev.target.result;
        document.getElementById('carPhotoImg').src = carPhotoData;
        document.getElementById('carPhotoPreview').classList.remove('hidden');
        document.getElementById('carPhotoUpload').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function previewCarPhotoUrl() {
    const url = document.getElementById('carPhotoUrl').value.trim();
    if (url) {
        carPhotoData = url;
        document.getElementById('carPhotoImg').src = url;
        document.getElementById('carPhotoPreview').classList.remove('hidden');
        document.getElementById('carPhotoUpload').classList.add('hidden');
    }
}

function clearCarPhoto() {
    carPhotoData = null;
    document.getElementById('carPhotoImg').src = '';
    document.getElementById('carPhotoPreview').classList.add('hidden');
    document.getElementById('carPhotoUpload').classList.remove('hidden');
    document.getElementById('carPhotoInput').value = '';
    document.getElementById('carPhotoUrl').value = '';
}

// ==================== CREATE CAR ====================
function openCreateCarModal() {
    document.getElementById('carName').value = '';
    document.getElementById('carPhotoUrl').value = '';
    document.getElementById('carPhotoInput').value = '';
    document.getElementById('carFeeAmount').value = '10';
    clearCarPhoto();
    openModal('modalCreateCar');
}

function createCar(e) {
    e.preventDefault();
    const name = document.getElementById('carName').value.trim();
    const feeAmount = parseFloat(document.getElementById('carFeeAmount').value) || 10;
    const photo = carPhotoData || `http://static.photos/automobile/640x360/${Math.floor(Math.random() * 900 + 100)}`;

    const car = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name,
        photo,
        feeAmount,
        rentals: [],
        repairs: [],
        createdAt: new Date().toISOString()
    };

    cars.push(car);
    saveData();
    closeModal('modalCreateCar');
    renderMainView();
    showToast('Автомобиль добавлен');
}

// ==================== RENDER MAIN VIEW ====================
function renderMainView() {
    const grid = document.getElementById('carsGrid');
    const empty = document.getElementById('emptyState');
    const headerStats = document.getElementById('headerStats');

    if (cars.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        headerStats.classList.add('hidden');
        headerStats.classList.remove('sm:flex');
    } else {
        grid.classList.remove('hidden');
        empty.classList.add('hidden');
        headerStats.classList.remove('hidden');
        headerStats.classList.add('sm:flex');
    }

    // Header stats
    const mk = getCurrentMonthKey();
    let totalMonthProfit = 0;
    cars.forEach(car => {
        const monthData = getCarMonthData(car, mk);
        totalMonthProfit += monthData.netProfit;
    });
    document.getElementById('headerMonthProfit').textContent = formatMoney(totalMonthProfit);
    document.getElementById('headerMonthProfit').className = `text-sm font-semibold ${totalMonthProfit >= 0 ? 'text-brand-600' : 'text-red-500'}`;
    document.getElementById('headerCarCount').textContent = cars.length;

    // Cards
    grid.innerHTML = cars.map((car, i) => {
        const mk2 = getCurrentMonthKey();
        const md = getCarMonthData(car, mk2);
        const totalRentals = car.rentals.length;
        const totalHours = car.rentals.reduce((s, r) => s + r.hours, 0);
        
        return `
        <div class="card-hover bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer fade-in" style="animation-delay: ${i * 0.05}s" onclick="openCarDetail('${car.id}')">
            <div class="h-40 bg-gray-200 relative overflow-hidden">
                <img src="${car.photo}" alt="${car.name}" class="w-full h-full object-cover" onerror="this.src='http://static.photos/automobile/640x360/${Math.floor(Math.random() * 900 + 100)}'">
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-lg ${md.netProfit >= 0 ? 'text-brand-700' : 'text-red-600'}">
                    ${md.netProfit >= 0 ? '+' : ''}${formatMoney(md.netProfit)}/мес
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-gray-900 text-sm truncate">${car.name}</h3>
                <div class="flex items-center gap-4 mt-2.5">
                    <div class="flex items-center gap-1 text-xs text-gray-500">
                        <i data-lucide="repeat" class="w-3.5 h-3.5"></i>
                        ${totalRentals} сдач
                    </div>
                    <div class="flex items-center gap-1 text-xs text-gray-500">
                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                        ${totalHours} ч
                    </div>
                    <div class="flex items-center gap-1 text-xs text-gray-500">
                        <i data-lucide="dollar-sign" class="w-3.5 h-3.5"></i>
                        ${formatMoney(car.feeAmount || 0)}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

function getCarMonthData(car, monthKey) {
    const rentals = car.rentals.filter(r => getMonthKey(r.date) === monthKey);
    const repairs = car.repairs.filter(r => getMonthKey(r.date) === monthKey);
    
    const totalIncome = rentals.reduce((s, r) => s + r.totalAmount, 0);
    const totalFee = rentals.reduce((s, r) => s + r.feeAmount, 0);
    const totalRepairCost = repairs.reduce((s, r) => s + r.cost, 0);
    const totalHours = rentals.reduce((s, r) => s + r.hours, 0);
    const netProfit = totalIncome - totalFee - totalRepairCost;

    return { rentals, repairs, totalIncome, totalFee, totalRepairCost, totalHours, netProfit, rentalCount: rentals.length };
}

// ==================== CAR DETAIL ====================
function openCarDetail(carId) {
    currentCarId = carId;
    currentTab = 'rentals';
    showDetailView();
}

function showDetailView() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return showMainView();

    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    document.getElementById('detailView').classList.add('slide-in');

    // Header info
    const imgDiv = document.getElementById('detailCarImage');
    imgDiv.style.backgroundImage = `url(${car.photo})`;
    imgDiv.style.backgroundSize = 'cover';
    imgDiv.style.backgroundPosition = 'center';
    imgDiv.innerHTML = '';
    
    document.getElementById('detailCarName').textContent = car.name;
    document.getElementById('detailCarSub').textContent = `Комиссия: ${formatMoney(car.feeAmount || 0)} за каждую сдачу`;

    updateDetailStats();
    renderCurrentTab();
}

function updateDetailStats() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const mk = getCurrentMonthKey();
    const md = getCarMonthData(car, mk);

    document.getElementById('statMonthProfit').textContent = formatMoney(md.netProfit);
    document.getElementById('statMonthProfit').className = `text-xl font-bold ${md.netProfit >= 0 ? 'text-gray-900' : 'text-red-500'}`;
    document.getElementById('statMonthHours').textContent = `${md.totalHours} ч`;
    document.getElementById('statMonthRentals').textContent = md.rentalCount;
    document.getElementById('statMonthFee').textContent = formatMoney(md.totalFee);
}

function showMainView() {
    currentCarId = null;
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('mainView').classList.remove('hidden');
    renderMainView();
}

// ==================== TABS ====================
function switchTab(tab) {
    currentTab = tab;
    
    ['Rentals', 'Repairs', 'Monthly'].forEach(t => {
        const tabId = 'tab' + t;
        const contentId = 'content' + t;
        document.getElementById(tabId).className = document.getElementById(tabId).className.replace(/tab-(active|inactive)/, '') + (t.toLowerCase() === tab ? ' tab-active' : ' tab-inactive');
        if (t.toLowerCase() === tab) {
            document.getElementById(contentId).classList.remove('hidden');
        } else {
            document.getElementById(contentId).classList.add('hidden');
        }
    });

    renderCurrentTab();
}

function renderCurrentTab() {
    if (currentTab === 'rentals') renderRentals();
    else if (currentTab === 'repairs') renderRepairs();
    else if (currentTab === 'monthly') renderMonthly();
}

// ==================== RENTALS ====================
function renderRentals() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const list = document.getElementById('rentalsList');
    const empty = document.getElementById('rentalsEmpty');

    if (car.rentals.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
    } else {
        list.classList.remove('hidden');
        empty.classList.add('hidden');
    }

    const sorted = [...car.rentals].sort((a, b) => b.date.localeCompare(a.date));

    list.innerHTML = sorted.map(r => `
        <div class="bg-white rounded-xl border border-gray-200 p-4 fade-in">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                        <i data-lucide="calendar-check" class="w-5 h-5 text-brand-600"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-gray-900 text-sm">${formatDate(r.date)}</div>
                        <div class="text-gray-500 text-xs mt-0.5">${r.hours} ч × ${formatMoney(r.ratePerHour)}/ч</div>
                    </div>
                </div>
                <div class="text-right flex items-center gap-4">
                    <div>
                        <div class="font-semibold text-gray-900 text-sm">${formatMoney(r.totalAmount)}</div>
                        <div class="text-xs text-red-500">−${formatMoney(r.feeAmount)} комиссия</div>
                    </div>
                    <button onclick="deleteRental('${r.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span class="text-xs text-gray-400">Чистая прибыль</span>
                <span class="text-sm font-bold text-brand-600">${formatMoney(r.netIncome)}</span>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

// ==================== ADD RENTAL ====================
function openAddRentalModal() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rentalDate').value = today;
    document.getElementById('rentalHours').value = '';
    document.getElementById('rentalRate').value = '';
    updateRentalCalc();

    openModal('modalAddRental');
}

function updateRentalCalc() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const hours = parseFloat(document.getElementById('rentalHours').value) || 0;
    const rate = parseFloat(document.getElementById('rentalRate').value) || 0;
    const feeFixed = car.feeAmount || 0;

    const total = hours * rate;
    const fee = feeFixed;
    const net = total - fee;

    document.getElementById('rentalCalcTotal').textContent = formatMoney(total);
    document.getElementById('rentalCalcFee').textContent = formatMoney(fee);
    document.getElementById('rentalCalcNet').textContent = formatMoney(net);
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'rentalHours' || e.target.id === 'rentalRate') {
        updateRentalCalc();
    }
});

function addRental(e) {
    e.preventDefault();
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const date = document.getElementById('rentalDate').value;
    const hours = parseFloat(document.getElementById('rentalHours').value);
    const ratePerHour = parseFloat(document.getElementById('rentalRate').value);

    const totalAmount = hours * ratePerHour;
    const feeAmount = car.feeAmount || 0;
    const netIncome = totalAmount - feeAmount;

    const rental = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        date,
        hours,
        ratePerHour,
        totalAmount,
        feeAmount: Math.round(feeAmount * 100) / 100,
        netIncome: Math.round(netIncome * 100) / 100
    };

    car.rentals.push(rental);
    saveData();
    closeModal('modalAddRental');
    updateDetailStats();
    renderCurrentTab();
    showToast('Аренда добавлена');
}

function deleteRental(rentalId) {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;
    car.rentals = car.rentals.filter(r => r.id !== rentalId);
    saveData();
    updateDetailStats();
    renderCurrentTab();
    showToast('Запись удалена');
}

// ==================== REPAIRS ====================
function renderRepairs() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const list = document.getElementById('repairsList');
    const empty = document.getElementById('repairsEmpty');

    if (car.repairs.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
    } else {
        list.classList.remove('hidden');
        empty.classList.add('hidden');
    }

    const totalRepairCost = car.repairs.reduce((s, r) => s + r.cost, 0);

    const sorted = [...car.repairs].sort((a, b) => b.date.localeCompare(a.date));

    list.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-red-400"></i>
                <span class="text-sm font-medium text-red-700">Общие затраты на ремонт</span>
            </div>
            <span class="font-bold text-red-600">${formatMoney(totalRepairCost)}</span>
        </div>
    ` + sorted.map(r => `
        <div class="bg-white rounded-xl border border-gray-200 p-4 fade-in">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <i data-lucide="wrench" class="w-5 h-5 text-red-500"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-gray-900 text-sm">${r.description}</div>
                        <div class="text-gray-500 text-xs mt-0.5">${formatDate(r.date)}</div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold text-red-600">−${formatMoney(r.cost)}</span>
                    <button onclick="deleteRepair('${r.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function openAddRepairModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('repairDate').value = today;
    document.getElementById('repairDesc').value = '';
    document.getElementById('repairCost').value = '';
    openModal('modalAddRepair');
}

function addRepair(e) {
    e.preventDefault();
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    const date = document.getElementById('repairDate').value;
    const description = document.getElementById('repairDesc').value.trim();
    const cost = parseFloat(document.getElementById('repairCost').value);

    car.repairs.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        date,
        description,
        cost
    });

    saveData();
    closeModal('modalAddRepair');
    updateDetailStats();
    renderCurrentTab();
    showToast('Затрата на ремонт добавлена');
}

function deleteRepair(repairId) {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;
    car.repairs = car.repairs.filter(r => r.id !== repairId);
    saveData();
    updateDetailStats();
    renderCurrentTab();
    showToast('Запись удалена');
}

// ==================== MONTHLY STATS ====================
function renderMonthly() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;

    // Gather all months from rentals and repairs
    const monthKeys = new Set();
    car.rentals.forEach(r => monthKeys.add(getMonthKey(r.date)));
    car.repairs.forEach(r => monthKeys.add(getMonthKey(r.date)));

    const sortedKeys = [...monthKeys].sort().reverse();

    const list = document.getElementById('monthlyList');

    if (sortedKeys.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <i data-lucide="bar-chart-3" class="w-8 h-8 text-gray-300"></i>
                </div>
                <p class="text-gray-500 text-sm">Пока нет данных для статистики</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    const maxIncome = Math.max(...sortedKeys.map(k => getCarMonthData(car, k).totalIncome), 1);

    list.innerHTML = sortedKeys.map(key => {
        const md = getCarMonthData(car, key);
        const barWidth = Math.max((md.totalIncome / maxIncome) * 100, 3);
        const isCurrentMonth = key === getCurrentMonthKey();

        return `
        <div class="bg-white rounded-xl border ${isCurrentMonth ? 'border-brand-300 ring-1 ring-brand-100' : 'border-gray-200'} p-5 fade-in">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-gray-900 capitalize">${getMonthLabel(key)}</h4>
                    ${isCurrentMonth ? '<span class="bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-md">Текущий</span>' : ''}
                </div>
                <div class="font-bold ${md.netProfit >= 0 ? 'text-brand-600' : 'text-red-500'}">${md.netProfit >= 0 ? '+' : ''}${formatMoney(md.netProfit)}</div>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2.5 mb-4">
                <div class="progress-bar bg-brand-500 h-2.5 rounded-full" style="width: ${barWidth}%"></div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div class="bg-gray-50 rounded-lg p-2">
                    <div class="text-xs text-gray-500">Доход</div>
                    <div class="text-sm font-semibold text-gray-900">${formatMoney(md.totalIncome)}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-2">
                    <div class="text-xs text-gray-500">Комиссия</div>
                    <div class="text-sm font-semibold text-red-500">−${formatMoney(md.totalFee)}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-2">
                    <div class="text-xs text-gray-500">Ремонт</div>
                    <div class="text-sm font-semibold text-red-500">−${formatMoney(md.totalRepairCost)}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-2">
                    <div class="text-xs text-gray-500">Сдач / Часов</div>
                    <div class="text-sm font-semibold text-gray-900">${md.rentalCount} / ${md.totalHours}ч</div>
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// ==================== DELETE CAR ====================
function deleteCurrentCar() {
    const car = cars.find(c => c.id === currentCarId);
    if (!car) return;
    
    if (confirm(`Удалить "${car.name}"? Все данные будут потеряны.`)) {
        cars = cars.filter(c => c.id !== currentCarId);
        saveData();
        showMainView();
        showToast('Автомобиль удалён');
    }
}

// ==================== INIT ====================
function init() {
    renderMainView();
    lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', init);

// Keyboard shortcut: Escape to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});