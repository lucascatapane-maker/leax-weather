// 1. Coordinates for LEAX
const LEAX_LAT = 36.8011;
const LEAX_LON = -4.1342;

// 2. Fetch Open-Meteo Data to generate Synthetic AW METAR/TAF
async function fetchLEAXWeather() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LEAX_LAT}&longitude=${LEAX_LON}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m,pressure_msl&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility,cloud_cover&timezone=UTC`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        document.getElementById('leax-metar').innerText = generateAWMETAR(data.current);
        document.getElementById('leax-taf').innerText = generateAWTAF(data.hourly);
    } catch (error) {
        document.getElementById('leax-metar').innerText = "Error loading LEAX data.";
        document.getElementById('leax-taf').innerText = "Error loading LEAX TAF.";
    }
}

// 3. Logic to create a fake METAR based on raw weather numbers
function generateAWMETAR(current) {
    const d = new Date(current.time + "Z");
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hrs = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    const timeStr = `${day}${hrs}${mins}Z`;

    // Convert km/h to Knots
    const wdir = current.wind_direction_10m === 0 ? "000" : String(current.wind_direction_10m).padStart(3, '0');
    const wspd = Math.round(current.wind_speed_10m / 1.852);
    const wgust = Math.round(current.wind_gusts_10m / 1.852);
    
    let windStr = `${wdir}${String(wspd).padStart(2, '0')}`;
    if (wgust > wspd + 5) windStr += `G${String(wgust).padStart(2, '0')}`;
    windStr += "KT";

    let vis = Math.round(current.visibility);
    let visStr = vis >= 9999 ? "9999" : String(vis).padStart(4, '0');

    // Decode WMO weather codes to METAR
    let wx = "";
    const code = current.weather_code;
    if ([45, 48].includes(code)) wx = "FG";
    if ([51, 53, 55].includes(code)) wx = "DZ";
    if ([61, 63, 65].includes(code)) wx = "RA";
    if ([71, 73, 75, 77].includes(code)) wx = "SN";
    if ([80, 81, 82].includes(code)) wx = "SHRA";
    if ([95, 96, 99].includes(code)) wx = "TS";

    // Convert cloud cover % to METAR terms
    let cloud = "";
    if (current.cloud_cover <= 5) cloud = "CLR";
    else if (current.cloud_cover <= 25) cloud = "FEW030";
    else if (current.cloud_cover <= 50) cloud = "SCT030";
    else if (current.cloud_cover <= 87) cloud = "BKN030";
    else cloud = "OVC030"; 

    if (vis >= 9999 && current.cloud_cover <= 5 && wx === "") {
        visStr = "CAVOK";
        cloud = "";
    }

    const t = Math.round(current.temperature_2m);
    const dp = Math.round(current.dew_point_2m);
    const fmtT = (val) => (val < 0 ? `M${String(Math.abs(val)).padStart(2, '0')}` : String(val).padStart(2, '0'));
    
    const qnh = Math.round(current.pressure_msl);

    // Build the string
    let metar = `AW LEAX ${timeStr} AUTO ${windStr} ${visStr} ${wx} ${cloud} ${fmtT(t)}/${fmtT(dp)} Q${qnh}`;
    // Cleanup multiple spaces
    return metar.replace(/\s+/g, ' ').trim(); 
}

// 4. Logic to create a fake TAF from hourly forecast
function generateAWTAF(hourly) {
    const startIndex = 0; // Current hour
    let taf = `AW TAF LEAX (AUTO-GEN)\n`;
    taf += `BASE  : ${getCondition(hourly, startIndex)}\n`;

    // Create BECMG (Becoming) trends for +6h, +12h, and +18h
    [6, 12, 18].forEach(offset => {
        const i = startIndex + offset;
        if (hourly.time[i]) {
            const d = new Date(hourly.time[i] + "Z");
            const day = String(d.getUTCDate()).padStart(2, '0');
            const hr = String(d.getUTCHours()).padStart(2, '0');
            taf += `BECMG ${day}${hr}00Z: ${getCondition(hourly, i)}\n`;
        }
    });
    return taf;
}

function getCondition(hourly, i) {
    const wdir = hourly.wind_direction_10m[i] === 0 ? "000" : String(hourly.wind_direction_10m[i]).padStart(3, '0');
    const wspd = Math.round(hourly.wind_speed_10m[i] / 1.852);
    let vis = Math.round(hourly.visibility[i]);
    let visStr = vis >= 9999 ? "9999" : String(vis).padStart(4, '0');

    let cloud = "";
    if (hourly.cloud_cover[i] <= 5) cloud = "CLR";
    else if (hourly.cloud_cover[i] <= 50) cloud = "SCT030";
    else cloud = "BKN030";

    return `${wdir}${String(wspd).padStart(2, '0')}KT ${visStr} ${cloud}`;
}

// 5. Fetch Official METARs from the US Aviation Weather Center (NOAA) - 100% Free
async function fetchOfficialMETARs() {
    const url = `https://aviationweather.gov/api/data/metar?ids=LEMG,LEGR&format=json`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Find Málaga and Granada
        const lemg = data.find(ob => ob.icaoId === "LEMG");
        const legr = data.find(ob => ob.icaoId === "LEGR");

        document.getElementById('lemg-metar').innerText = lemg ? lemg.rawOb : "No data available";
        document.getElementById('legr-metar').innerText = legr ? legr.rawOb : "No data available";
    } catch (error) {
        document.getElementById('lemg-metar').innerText = "Failed to load NOAA API.";
        document.getElementById('legr-metar').innerText = "Failed to load NOAA API.";
    }
}

// 6. Run everything when page loads
fetchLEAXWeather();
fetchOfficialMETARs();
