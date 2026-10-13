// ==================== КОНСТАНТЫ ====================

const API_BASE = 'http://176.12.75.12:8000';

const REGIONS = [
    { code: 'belgorod_oblast', name: 'Белгородская' },
    { code: 'kursk_oblast', name: 'Курская' },
    { code: 'bryansk_oblast', name: 'Брянская' },
    { code: 'voronezh_oblast', name: 'Воронежская' },
    { code: 'rostov_oblast', name: 'Ростовская' },
    { code: 'moscow_oblast', name: 'Московская' },
    { code: 'moskva', name: 'Москва' },
    { code: 'krasnodar_krai', name: 'Краснодарский' },
    { code: 'crimea', name: 'Крым' },
    { code: 'donetsk', name: 'ДНР' },
    { code: 'lugansk', name: 'ЛНР' },
    { code: 'zaporizhzhia', name: 'Запорожская' },
    { code: 'kherson', name: 'Херсонская' },
];

const THREATS = [
    { code: 'uav', name: 'БПЛА' },
    { code: 'fpv', name: 'FPV-дрон' },
    { code: 'rocket', name: 'Ракета' },
    { code: 'kab', name: 'КАБ' },
    { code: 'balloon', name: 'МВШ' },
    { code: 'bek', name: 'Морской дрон' },
    { code: 'artillery', name: 'Артобстрел' },
];

// ==================== ОПРЕДЕЛЕНИЕ ПЛАТФОРМЫ ====================

let platform = null;
let userData = null;

function detectPlatform() {
    // Telegram
    if (window.Telegram?.WebApp?.initData) {
        platform = 'tg';
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        try {
            userData = JSON.parse(tg.initDataUnsafe.user);
        } catch (e) {
            console.error('TG user parse error', e);
        }
        console.log('Platform: Telegram', userData);
        return true;
    }
    
    // MAX
    if (window.WebApp?.initData) {
        platform = 'max';
        const max = window.WebApp;
        // MAX не требует ready(), но проверим
        try {
            const initData = JSON.parse(max.initData);
            userData = initData.user;
        } catch (e) {
            console.error('MAX user parse error', e);
        }
        console.log('Platform: MAX', userData);
        return true;
    }
    
    return false;
}

// ==================== API ====================

async function apiRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    
    // Для TG отправляем initData
    // Для MAX отправляем initData
    const initData = platform === 'tg'
        ? window.Telegram.WebApp.initData
        : window.WebApp.initData;
    
    const headers = {
        'Content-Type': 'application/json',
        'X-Platform': platform,
        'X-Init-Data': initData,
        ...options.headers,
    };
    
    const resp = await fetch(url, { ...options, headers });
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
    }
    return resp.json();
}

async function loadSettings() {
    return apiRequest('/api/miniapp/settings');
}

async function saveSettings(settings) {
    return apiRequest('/api/miniapp/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
    });
}

// ==================== UI ====================

function renderRegions(selected = []) {
    const container = document.getElementById('regions');
    container.innerHTML = '';
    REGIONS.forEach(r => {
        const row = document.createElement('div');
        row.className = 'toggle-row';
        row.innerHTML = `
            <span class="toggle-label">${r.name}</span>
            <label class="switch">
                <input type="checkbox" data-code="${r.code}" ${selected.includes(r.code) ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        container.appendChild(row);
    });
}

function renderThreats(selected = []) {
    const container = document.getElementById('threats');
    container.innerHTML = '';
    THREATS.forEach(t => {
        const row = document.createElement('div');
        row.className = 'toggle-row';
        row.innerHTML = `
            <span class="toggle-label">${t.name}</span>
            <label class="switch">
                <input type="checkbox" data-code="${t.code}" ${selected.includes(t.code) ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        container.appendChild(row);
    });
}

function renderSeverity(current = 3) {
    const container = document.getElementById('severity');
    container.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
        const btn = document.createElement('button');
        btn.className = 'severity-btn' + (i === current ? ' active' : '');
        btn.textContent = i;
        btn.dataset.value = i;
        btn.onclick = () => {
            document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        container.appendChild(btn);
    }
}

function collectSettings() {
    const regions = Array.from(document.querySelectorAll('#regions input:checked')).map(i => i.dataset.code);
    const threats = Array.from(document.querySelectorAll('#threats input:checked')).map(i => i.dataset.code);
    const severity = parseInt(document.querySelector('.severity-btn.active')?.dataset.value || '3');
    const enabled = document.getElementById('enabled').checked;
    
    return { enabled, regions, threats, signals: [], min_severity: severity };
}

function showStatus(text, type = '') {
    const el = document.getElementById('status');
    el.textContent = text;
    el.className = 'status ' + type;
}

// ==================== ЗАПУСК ====================

async function init() {
    if (!detectPlatform()) {
        document.getElementById('loading').textContent = 'Откройте это приложение через бота в Telegram или MAX';
        return;
    }
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    try {
        const settings = await loadSettings();
        document.getElementById('enabled').checked = settings.enabled !== false;
        renderRegions(settings.regions || []);
        renderThreats(settings.threats || []);
        renderSeverity(settings.min_severity || 3);
    } catch (e) {
        console.error('Load settings error', e);
        renderRegions([]);
        renderThreats([]);
        renderSeverity(3);
    }
    
    document.getElementById('saveBtn').onclick = async () => {
        try {
            showStatus('Сохранение...');
            await saveSettings(collectSettings());
            showStatus('✅ Сохранено', 'success');
        } catch (e) {
            console.error('Save error', e);
            showStatus('❌ Ошибка сохранения', 'error');
        }
    };
}

document.addEventListener('DOMContentLoaded', init);
