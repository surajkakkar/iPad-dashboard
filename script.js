/* ═══════════════════════════════════════════════════
   HOME DASHBOARD · script.js
   Silver Spring, MD
   ═══════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────────────
const CONFIG = {
  // WMATA API key
  wmataKey: 'de51925a8b784c738868a798a5bc4f18',

  // WMATA Station Code for Ballston-MU (Orange + Silver lines)
  stationCode: 'K04',
  stationName: 'BALLSTON-MU',

  // Weather: Open-Meteo is free, no key needed
  // Coordinates: Ballston, Arlington, VA
  lat: 38.8820,
  lon: -77.1114,

  // AQI: Open-Meteo Air Quality (free, no key)
  refreshInterval: 60, // seconds between metro refresh
};

// ─── CLOCK ──────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clock-time').textContent = `${h}:${m}:${s}`;

  const day = days[now.getDay()];
  const date = String(now.getDate()).padStart(2,'0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  document.getElementById('clock-date').textContent = `${day} · ${month} ${date} · ${year}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── WEATHER ─────────────────────────────────────────
const WMO_CODES = {
  0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
  45:'Fog',48:'Icy Fog',51:'Light Drizzle',53:'Drizzle',55:'Heavy Drizzle',
  61:'Light Rain',63:'Rain',65:'Heavy Rain',71:'Light Snow',73:'Snow',
  75:'Heavy Snow',80:'Rain Showers',81:'Rain Showers',82:'Heavy Showers',
  95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'
};
const WMO_ICONS = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌧',55:'🌧',61:'🌦',63:'🌧',65:'🌧',
  71:'🌨',73:'❄️',75:'❄️',80:'🌦',81:'🌧',82:'⛈',
  95:'⛈',96:'⛈',99:'⛈'
};

async function fetchWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}`
      + `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,uv_index`
      + `&hourly=temperature_2m,weather_code,precipitation_probability`
      + `&daily=sunrise,sunset`
      + `&timezone=America%2FNew_York&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=1`;

    const res = await fetch(url);
    const d = await res.json();
    const c = d.current;

    const code = c.weather_code;
    document.getElementById('weather-icon').textContent = WMO_ICONS[code] || '🌡';
    document.getElementById('weather-temp').textContent = `${Math.round(c.temperature_2m)}°`;
    document.getElementById('weather-desc').textContent = WMO_CODES[code] || 'Unknown';
    document.getElementById('feels-like').textContent = `${Math.round(c.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = `${c.relative_humidity_2m}%`;
    document.getElementById('wind').textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    document.getElementById('uv').textContent = Math.round(c.uv_index);

    // Hourly forecast (next 8 hours)
    const nowHour = new Date().getHours();
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const idx = nowHour + i;
      if (idx >= d.hourly.temperature_2m.length) break;
      const temp = Math.round(d.hourly.temperature_2m[idx]);
      const wcode = d.hourly.weather_code[idx];
      const precip = d.hourly.precipitation_probability[idx];
      const hour = idx % 24;
      const label = i === 0 ? 'NOW' : (hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour-12}PM`);
      const block = document.createElement('div');
      block.className = 'hour-block' + (i === 0 ? ' current' : '');
      block.innerHTML = `
        <div class="hour-label">${label}</div>
        <div class="hour-icon">${WMO_ICONS[wcode] || '🌡'}</div>
        <div class="hour-temp">${temp}°</div>
        ${precip > 10 ? `<div class="hour-precip">${precip}%</div>` : '<div class="hour-precip">&nbsp;</div>'}
      `;
      container.appendChild(block);
    }

    // Sun arc
    const sunriseStr = d.daily.sunrise[0]; // e.g. "2025-01-01T07:12"
    const sunsetStr = d.daily.sunset[0];
    const sunrise = new Date(sunriseStr);
    const sunset = new Date(sunsetStr);
    const fmt = t => `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    document.getElementById('sunrise').textContent = fmt(sunrise);
    document.getElementById('sunset').textContent = fmt(sunset);

    const now = Date.now();
    const total = sunset - sunrise;
    const elapsed = now - sunrise;
    const pct = Math.max(0, Math.min(1, elapsed / total));
    // Arc path total length ~200, drive dashoffset
    const arcLen = 200;
    document.getElementById('arc-progress').style.strokeDashoffset = arcLen * (1 - pct);
    // Move sun dot along arc
    const angle = Math.PI * pct;
    const cx = 10 + 100 * pct;
    const cy = 55 - Math.sin(angle) * 65;
    document.getElementById('sun-dot').setAttribute('cx', Math.round(cx * 10) / 10);
    document.getElementById('sun-dot').setAttribute('cy', Math.round(cy * 10) / 10);

  } catch(e) {
    console.warn('Weather fetch failed', e);
    document.getElementById('weather-desc').textContent = 'UNAVAILABLE';
  }
}

// ─── AIR QUALITY ─────────────────────────────────────
async function fetchAQI() {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}`
      + `&current=us_aqi&timezone=America%2FNew_York`;
    const res = await fetch(url);
    const d = await res.json();
    const aqi = d.current.us_aqi;

    document.getElementById('aqi-number').textContent = aqi;

    const pct = Math.min(aqi / 300, 1) * 100;
    document.getElementById('aqi-marker').style.left = `${pct}%`;

    let status, color;
    if      (aqi <= 50)  { status = 'GOOD';           color = '#22c55e'; }
    else if (aqi <= 100) { status = 'MODERATE';        color = '#eab308'; }
    else if (aqi <= 150) { status = 'UNHEALTHY·SENS';  color = '#f97316'; }
    else if (aqi <= 200) { status = 'UNHEALTHY';       color = '#ef4444'; }
    else if (aqi <= 300) { status = 'VERY UNHEALTHY';  color = '#a855f7'; }
    else                 { status = 'HAZARDOUS';        color = '#7c3aed'; }

    document.getElementById('aqi-number').style.color = color;
    document.getElementById('aqi-number').style.textShadow = `0 0 10px ${color}66`;
    document.getElementById('aqi-status').textContent = status;

  } catch(e) {
    console.warn('AQI fetch failed', e);
    document.getElementById('aqi-status').textContent = 'UNAVAILABLE';
  }
}

// ─── WMATA METRO ─────────────────────────────────────
async function fetchMetro() {
  const board = document.getElementById('metro-board');

  // Show WMATA key missing notice without crashing
  if (CONFIG.wmataKey === 'YOUR_WMATA_API_KEY') {
    board.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:11px;color:#64748b;letter-spacing:0.1em;padding:10px 0;">
        <div style="color:#f59e0b;margin-bottom:6px;">⚠ WMATA KEY NOT SET</div>
        <div>Open script.js and set CONFIG.wmataKey to your API key.</div>
        <div style="margin-top:4px;">Get a free key at <span style="color:#06b6d4;">developer.wmata.com</span></div>
      </div>`;
    return;
  }

  try {
    // WMATA Next Train Predictions
    const res = await fetch(
      `https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${CONFIG.stationCode}`,
      { headers: { 'api_key': CONFIG.wmataKey } }
    );
    const data = await res.json();
    const trains = data.Trains || [];

    if (trains.length === 0) {
      board.innerHTML = `<div class="metro-loading"><div class="led-dot"></div><span>NO TRAINS SCHEDULED</span></div>`;
      return;
    }

    board.innerHTML = '';

    trains.slice(0, 6).forEach(t => {
      const eta = t.Min;
      const dest = t.DestinationName || t.Destination || 'UNKNOWN';
      const line = t.Line || 'XX';
      const cars = t.Car ? `${t.Car} CAR` : '';

      let etaClass = 'eta-later';
      let etaDisplay = eta === 'ARR' ? 'ARR' : eta === 'BRD' ? 'BRD' : `${eta} MIN`;
      if (eta === 'ARR' || eta === 'BRD' || eta === '1') etaClass = 'eta-arriving';
      else if (eta === '2' || eta === '3') etaClass = 'eta-soon';

      const row = document.createElement('div');
      row.className = 'train-row';
      row.innerHTML = `
        <div class="line-badge line-${line}">${line}</div>
        <div class="train-dest">${dest.toUpperCase()}</div>
        <div class="train-cars">${cars}</div>
        <div class="train-eta ${etaClass}">${etaDisplay}</div>
      `;
      board.appendChild(row);
    });

    // Update timestamp
    const now = new Date();
    document.getElementById('metro-time').textContent =
      `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  } catch(e) {
    console.warn('Metro fetch failed', e);
    board.innerHTML = `<div class="metro-loading"><div class="led-dot"></div><span>SIGNAL LOST · RETRYING</span></div>`;
  }
}

// ─── INIT & REFRESH ──────────────────────────────────
fetchWeather();
fetchAQI();
fetchMetro();

// Refresh weather + AQI every 10 minutes
setInterval(() => { fetchWeather(); fetchAQI(); }, 10 * 60 * 1000);

// Refresh metro on configured interval
setInterval(fetchMetro, CONFIG.refreshInterval * 1000);

// Station name display
document.getElementById('metro-station-name').textContent = CONFIG.stationName;
