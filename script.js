// =======================================================================
// A. GLOBAL DEFINITIONS AND SETTINGS
// =======================================================================
var vakaDurumu = { can: 3, sure: 120 }; // Score removed
var timer;

var geoJsonLayer;
var overlayMaps = {};
let averageData = {};
let currentLayer = null;
var borderLayer = null;

// COLUMN AND FILE NAMES
const GEOJSON_FILE = 'songeojson.geojson';
const COLUMNS = {
    IL_ADI: 'adm1_tr',
    EGITIM: 'EĞİTİMS', // Broken/Abbreviated field name
    CEZAEVI: 'cezaevi_field_2',
    YOKSULLUK: 'YOKSULLUKO',
    NUFUS: 'İLLEREGÖ',
    POLIS_MERKEZ: 'polısmerkezı_field_2',
    ALKOL_MEKAN: 'alkolmekan_field_2'
};

// CASE LIST (Multiple Case System)
const caseList = [
    {
        id: "VAKA_01",
        il: "VAN",
        title: '<span style="color: yellow;">CASE #001: THEFT CRIME</span>',
        narrative:
"<br>Detective, an organized wave of high-value property thefts has emerged across the city.<br>" +
"The crime scenes are notable for weak social control, high economic pressure, and low education levels.<br><br>" +
"MISSION:<br>" +
"Detective, you must pinpoint the province where the three critical risk indicators <br>-High Prison Release, <br>-High Poverty  <br>-Low Education   <br> intersect most intensely," +
"and finalize the profile of the next likely crime scene.<br><br>" +
"Remember detective... You are the only one who can solve this case.<br>"
    },
    {
        id: "VAKA_02",
        il: "KÜTAHYA",
        title: '<span style="color: yellow;">CASE #002: MURDER CRIME',
        narrative:
"<br>Detective, we need you now for a murder case.<br>" +
"Subsequent murder crimes are expected to erupt in areas with high prison releases and high alcohol consumption,<br>" +
"but where police control is weak.<br><br>" +
"MISSION:<br>" +
"Detective, you must confirm the profile of the next likely crime scene by identifying the province where these three risk signals <br>-High Prison Release, <br>-High Number of Alcohol Venues <br>-Low Police Control <br>" +
"logically intersect most intensely.<br><br>" +
"Remember detective... You are the only one who can solve this case."
    }
];


let currentCaseIndex = 0;
let ANOMALI_IL_ADI = caseList[currentCaseIndex].il;

// Initialize the map
var map = L.map('map').setView([39.9, 32.8], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// ------------------------------------------------------------------------
// B. GEOJSON LOADING AND DATA PROCESSING
// ------------------------------------------------------------------------

function cleanAndParseFloat(value) {
    if (value === null || value === undefined || value.toString().trim() === '') {
        return NaN;
    }
    let cleanedValue = value.toString().trim().replace(',', '.');
    cleanedValue = cleanedValue.replace(/[^0-9.-]/g, '');
    return parseFloat(cleanedValue);
}

function calculateAverages(data) {
    const features = data.features;
    let totals = { 
        [COLUMNS.EGITIM]: 0, [COLUMNS.YOKSULLUK]: 0, [COLUMNS.CEZAEVI]: 0,
        [COLUMNS.POLIS_MERKEZ]: 0, [COLUMNS.ALKOL_MEKAN]: 0 
    };
    const count = features.length;

    features.forEach(feature => {
        const props = feature.properties;
        totals[COLUMNS.EGITIM] += cleanAndParseFloat(props[COLUMNS.EGITIM]) || 0;
        totals[COLUMNS.YOKSULLUK] += cleanAndParseFloat(props[COLUMNS.YOKSULLUK]) || 0;
        totals[COLUMNS.CEZAEVI] += parseInt(props[COLUMNS.CEZAEVI]) || 0; 
        totals[COLUMNS.POLIS_MERKEZ] += parseInt(props[COLUMNS.POLIS_MERKEZ]) || 0;
        totals[COLUMNS.ALKOL_MEKAN] += parseInt(props[COLUMNS.ALKOL_MEKAN]) || 0;
    });

    averageData[COLUMNS.EGITIM] = totals[COLUMNS.EGITIM] / count;
    averageData[COLUMNS.YOKSULLUK] = totals[COLUMNS.YOKSULLUK] / count;
    averageData[COLUMNS.CEZAEVI] = totals[COLUMNS.CEZAEVI] / count;
    averageData[COLUMNS.POLIS_MERKEZ] = totals[COLUMNS.POLIS_MERKEZ] / count;
    averageData[COLUMNS.ALKOL_MEKAN] = totals[COLUMNS.ALKOL_MEKAN] / count;
}

async function fetchAndLoadGeoJSON() {
    try {
        L.DomUtil.get('vaka-metni').innerHTML = "Loading GeoJSON data...";
        
        const response = await fetch(GEOJSON_FILE);
        if (!response.ok) {
            throw new Error(`Could not load file: ${response.statusText}. Check 'songeojson.geojson' file.`);
        }
        
        const geojsonData = await response.json();
        
        calculateAverages(geojsonData);
        
        loadGeoJsonLayer(geojsonData); 
        L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);
        
        initGame(); 
        
        if (!sessionStorage.getItem('game_started')) {
            openTutorialModal();
        } else {
            openCaseFile(); 
        }
        
    } catch (error) {
        console.error("CRITICAL ERROR: GeoJSON loading failed!", error);
        L.DomUtil.get('vaka-metni').innerHTML = "CRITICAL ERROR: Data loading failed! Check the console.";
    }
}

fetchAndLoadGeoJSON();

// =======================================================================
// C. STYLE AND COLOR FUNCTIONS 
// =======================================================================

function getColor(d) { // Education Duration (HIGH VALUE = LOW RISK/GREEN)
    d = parseFloat(d); 
    return d > 10.5 ? '#1a9850' : d > 9.5 ? '#a6d96a' : d > 8.5 ? '#fee08b' : d > 7.5 ? '#f46d43' : '#d73027'; 
}

function getYoksullukColor(d) { // Poverty Rate (HIGH VALUE = HIGH RISK/RED)
    d = parseFloat(d);
    return d > 12 ? '#d73027' : d > 9 ? '#f46d43' : d > 6 ? '#fee08b' : d > 3 ? '#a6d96a' : '#1a9850';
}

function getCezaeviColor(d) { // Prison Releases (HIGH VALUE = HIGH RISK/RED)
    d = parseInt(d);
    return d > 10000 ? '#d73027' : d > 7500 ? '#f46d43' : d > 5000 ? '#feb24c' : d > 2500 ? '#a6d96a' : '#1a9850';
}

function styleBorders(feature) {
    return { fillColor: 'transparent', color: '#888', weight: 1.5, fillOpacity: 0 };
}

function style(feature) { // Education Duration Style (Main)
    const egitimYili = cleanAndParseFloat(feature.properties[COLUMNS.EGITIM]); 
    if (isNaN(egitimYili)) { return { fillColor: '#888888', weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.0, interactive: false }; }
    return { fillColor: getColor(egitimYili), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function styleYoksulluk(feature) { // Poverty Style
    var yoksullukOrani = cleanAndParseFloat(feature.properties[COLUMNS.YOKSULLUK]);
    return { fillColor: getYoksullukColor(yoksullukOrani), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function styleCezaevi(feature) { // Prison Style
    var cezaeviSayisi = parseInt(feature.properties[COLUMNS.CEZAEVI]);
    return { fillColor: getCezaeviColor(cezaeviSayisi), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function stylePolisMerkez(feature) { // Police Station Style
    var sayi = parseInt(feature.properties[COLUMNS.POLIS_MERKEZ]);
    return { fillColor: getPolisMerkezColor(sayi), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function styleAlkolMekan(feature) { // Alcohol Venue Style
    var sayi = parseInt(feature.properties[COLUMNS.ALKOL_MEKAN]);
    return { fillColor: getAlkolMekanColor(sayi), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function getPolisMerkezColor(d) {
    d = parseInt(d);
    return d > 100 ? '#1a9850' : d > 50 ? '#a6d96a' : d > 20 ? '#fee08b' : '#f46d43';
}

function getAlkolMekanColor(d) {
    d = parseInt(d);
    return d > 500 ? '#d73027' : d > 200 ? '#f46d43' : d > 50 ? '#fee08b' : '#a6d96a';
}


function loadGeoJsonLayer(data) {
    // 1. CREATE STATIC BORDER LAYER (Manages mouseover and click)
    borderLayer = L.geoJson(data, { 
        style: styleBorders,
        onEachFeature: function(feature, layer) {
            layer.on({
                mouseover: function(e) {
                    e.target.setStyle({ color: '#00FFFF', weight: 3 }); 
                    updateClueCards(feature.properties); 
                    L.DomUtil.get('vaka-metni').innerHTML = 'LOADING EVIDENCE: ' + feature.properties[COLUMNS.IL_ADI]; 
                },
                mouseout: function(e) {
                    borderLayer.resetStyle(e.target); 
                    L.DomUtil.get('vaka-metni').innerHTML = 
                        `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">CLICK TO EXAMINE THE CASE FILE</a>`;
                },
                click: function(e) { 
                    checkPrediction(e);
                    showRawDataModal(e.target.feature.properties); 
                }
            });
        }
    }).addTo(map);

    // 2. CREATE DYNAMIC DATA LAYERS (For coloring only)
    geoJsonLayer = L.geoJson(data, { style: style, interactive: false });
    var yoksullukLayer = L.geoJson(data, { style: styleYoksulluk, interactive: false });
    var cezaeviLayer = L.geoJson(data, { style: styleCezaevi, interactive: false });
    var polisLayer = L.geoJson(data, { style: stylePolisMerkez, interactive: false });
    var alkolLayer = L.geoJson(data, { style: styleAlkolMekan, interactive: false });
    
    // Add to menu
    overlayMaps["Education Risk Score (Main)"] = geoJsonLayer;
    overlayMaps["Evidence: Poverty Rate"] = yoksullukLayer;
    overlayMaps["Evidence: Prison Releases"] = cezaeviLayer;
    overlayMaps["Control: Number of Police Stations"] = polisLayer;
    overlayMaps["Control: Number of Alcohol Venues"] = alkolLayer;

    var bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) { map.fitBounds(bounds); }
}

function switchMapLayer(layerName) {
    const cardElement = document.getElementById(`kart-${(layerName === 'EGITIM') ? 1 : (layerName === 'CEZAEVI') ? 2 : 3}`);
    
    if (currentLayer) { map.removeLayer(currentLayer); }
    
    let newLayer;
    
    // 🚨 CRITICAL UPDATE: CASE-BASED LAYER ASSIGNMENT
    if (currentCaseIndex === 0) { // CASE 1 (Theft): Education, Prison, Poverty
        if (layerName === 'EGITIM') {
            newLayer = overlayMaps["Education Risk Score (Main)"];
        } else if (layerName === 'CEZAEVI') {
            newLayer = overlayMaps["Evidence: Prison Releases"];
        } else if (layerName === 'YOKSULLUK') {
            newLayer = overlayMaps["Evidence: Poverty Rate"];
        }
    } else if (currentCaseIndex === 1) { // CASE 2 (Murder): Prison, Police, Alcohol
        if (layerName === 'EGITIM') {
            newLayer = overlayMaps["Evidence: Prison Releases"]; 
        } else if (layerName === 'CEZAEVI') {
            newLayer = overlayMaps["Control: Number of Police Stations"]; 
        } else if (layerName === 'YOKSULLUK') {
            newLayer = overlayMaps["Control: Number of Alcohol Venues"];
        }
    }

    if (newLayer) {
        newLayer.addTo(map); 
        currentLayer = newLayer; 
        
        document.querySelectorAll('.ipucu-kartlari').forEach(card => card.classList.remove('active'));
        cardElement.classList.add('active');
    }
}

// =======================================================================
// D. GAME MANAGEMENT AND MODAL FUNCTIONS (UPDATED)
// =======================================================================

function openTutorialModal() {
    sessionStorage.setItem('game_started', 'true');
    document.getElementById('tutorial-modal').style.display = 'block';
}

function closeTutorialModal() {
    document.getElementById('tutorial-modal').style.display = 'none';
    openCaseFile(); 
}

function openCaseFile() {
    document.getElementById('case-modal').style.display = 'block';
    const currentCase = caseList[currentCaseIndex]; 
    
    document.getElementById('case-title').innerHTML = currentCase.title;
    document.getElementById('case-narrative').innerHTML = currentCase.narrative;
    
    clearInterval(timer); 
}

function closeCaseFile() {
    document.getElementById('case-modal').style.display = 'none';
    startTimer(); 
}

function initGame() {
    // L.DomUtil.get('puan').innerHTML = vakaDurumu.puan; // Score removed
    L.DomUtil.get('can').innerHTML = vakaDurumu.can;
    L.DomUtil.get('sure').innerHTML = vakaDurumu.sure;

    L.DomUtil.get('vaka-metni').innerHTML = 
        `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">CLICK TO EXAMINE THE CASE FILE</a>`;
    
    document.querySelectorAll('.ipucu-kartlari').forEach(card => card.classList.remove('active'));
}

// New: Game Over State (Lives run out)
function handleGameOver() {
    clearInterval(timer);
    if (borderLayer) {
         borderLayer.eachLayer(layer => layer.off('click')); 
         borderLayer.eachLayer(layer => layer.off('mouseover')); 
         borderLayer.eachLayer(layer => layer.off('mouseout')); 
    }
    if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }
    L.DomUtil.get('can').innerHTML = 0; 
    L.DomUtil.get('vaka-metni').innerHTML = 
        `<a onclick="window.location.reload()" style="color: red; text-decoration: underline; cursor: pointer; font-size: 1.2em;">
             FAILED. CLICK TO START A NEW MISSION.
        </a>`;
}

// New: Proceed to Next Case on Successful Case Resolution
function handleCaseSuccess() {
    currentCaseIndex++;
    
    if (currentCaseIndex < caseList.length) {
        const nextCase = caseList[currentCaseIndex];
        ANOMALI_IL_ADI = nextCase.il; 

        showToast(`SYSTEM UPDATED: LOADING CASE ${nextCase.id}...`, 'success', 2500); 

        if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }
        if (borderLayer) borderLayer.eachLayer(l => l.setStyle(styleBorders(l.feature))); 
        document.querySelectorAll('.ipucu-kartlari').forEach(card => card.classList.remove('active'));
        
        // Case 2 specific card title update
        if (currentCaseIndex === 1) { 
             document.getElementById('kart-1').querySelector('.kart-baslik').innerHTML = "Evidence 1: Prison Releases";
             document.getElementById('kart-2').querySelector('.kart-baslik').innerHTML = "Evidence 2: Number of Police Stations"; 
             document.getElementById('kart-3').querySelector('.kart-baslik').innerHTML = "Evidence 3: Number of Alcohol Venues";

             document.getElementById('ipucu-egitim').innerHTML = 'Data Pending...';
             document.getElementById('ipucu-cezaevi').innerHTML = 'Data Pending...';
             document.getElementById('ipucu-yoksulluk').innerHTML = 'Data Pending...';
        }

        L.DomUtil.get('can').innerHTML = vakaDurumu.can;
        vakaDurumu.sure = 120; // Reset time for new case
        L.DomUtil.get('vaka-metni').innerHTML = 
            `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">CASE ${nextCase.id} STARTED. CLICK HERE.</a>`;
        
        setTimeout(() => { 
            openCaseFile(); 
        }, 2000); 

    } else {
        // ALL CASES SOLVED (VICTORY)
        showToast(`CONGRATULATIONS! ALL CASES SOLVED.`, 'success', 8000); 
        if (borderLayer) borderLayer.eachLayer(layer => layer.off('click')); 
    }
}


function startTimer() {
    clearInterval(timer); 
    timer = setInterval(() => {
        vakaDurumu.sure--;
        L.DomUtil.get('sure').innerHTML = vakaDurumu.sure; 
        if (vakaDurumu.sure <= 0) { 
            clearInterval(timer); 
            
            vakaDurumu.can -= 1; // Decrease life
            L.DomUtil.get('can').innerHTML = vakaDurumu.can; // Update life immediately

            if (vakaDurumu.can > 0) {
                // Failure: Reload the same case
                showToast(`TIME UP! CASE FAILED. Life (-1). Same mission restarting.`, 'error', 5000);
                setTimeout(() => {
                    vakaDurumu.sure = 120; // Reset time
                    L.DomUtil.get('sure').innerHTML = vakaDurumu.sure;
                    // Reset map border styles
                    if (borderLayer) borderLayer.eachLayer(l => l.setStyle(styleBorders(l.feature))); 
                    openCaseFile(); // Open case file (which restarts new timer via closeCaseFile)
                }, 3000);
            } else {
                // Game Over
                showToast(`TIME UP! MISSION ABORTED! No lives remaining.`, 'error', 5000);
                handleGameOver();
            }
        }
    }, 1000); 
}

// The old resetVaka function was completely removed and its logic split into handleCaseSuccess/handleGameOver functions.


// =======================================================================
// E. INTERACTION AND CLUE CARDS (UPDATED)
// =======================================================================

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    
    if (!container) { console.error("ERROR: #toast-container not found!"); return; }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => { toast.classList.add('show'); }, 10); 

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300); 
    }, duration);
}

function showRawDataModal(properties) {
    document.getElementById('raw-data-modal').style.display = 'block';
    
    // 1. Fill Data
    document.getElementById('data-il-adi').innerHTML = `Raw Data File: ${properties[COLUMNS.IL_ADI]}`;
    
    // Basic Four Data
    document.getElementById('raw-nufus').innerHTML = properties[COLUMNS.NUFUS] ? parseInt(properties[COLUMNS.NUFUS]).toLocaleString() : 'N/A';
    document.getElementById('raw-egitim').innerHTML = properties[COLUMNS.EGITIM] ? cleanAndParseFloat(properties[COLUMNS.EGITIM]).toFixed(1) + ' Years' : 'N/A';
    document.getElementById('raw-cezaevi').innerHTML = properties[COLUMNS.CEZAEVI] ? parseInt(properties[COLUMNS.CEZAEVI]).toLocaleString() + ' People' : 'N/A';
    document.getElementById('raw-yoksulluk').innerHTML = properties[COLUMNS.YOKSULLUK] ? cleanAndParseFloat(properties[COLUMNS.YOKSULLUK]).toFixed(2) + ' %' : 'N/A';

    // 🚨 NEWLY ADDED TWO FIELDS (POLICE and ALCOHOL)
    document.getElementById('raw-polis').innerHTML = properties[COLUMNS.POLIS_MERKEZ] ? parseInt(properties[COLUMNS.POLIS_MERKEZ]).toLocaleString() : 'N/A';
    document.getElementById('raw-alkol').innerHTML = properties[COLUMNS.ALKOL_MEKAN] ? parseInt(properties[COLUMNS.ALKOL_MEKAN]).toLocaleString() : 'N/A';
}

function closeRawDataModal() {
    document.getElementById('raw-data-modal').style.display = 'none';
}

function checkPrediction(e) {
    var clickedArea = e.target.feature.properties;
    clearInterval(timer); 
    
    if (clickedArea[COLUMNS.IL_ADI] === ANOMALI_IL_ADI) { 
        // Successful Prediction
        
        e.target.setStyle({ weight: 5, color: '#00FF00', fillOpacity: 1 }); 
        showToast(`CASE SOLVED! ${ANOMALI_IL_ADI} is the correct province.`, 'success', 3000);
        
        // On successful resolution, proceed to the next case
        setTimeout(() => handleCaseSuccess(), 3000); // 🚨 New function call
    } else {
        // Incorrect Prediction
        vakaDurumu.can -= 1; // Decrease life
        
        e.target.setStyle({ fillColor: '#FF0000', color: 'red', weight: 4 }); 
        showToast(`INCORRECT PREDICTION! Life (-1).`, 'error', 3000);
        
        L.DomUtil.get('can').innerHTML = vakaDurumu.can;
        
        if (vakaDurumu.can > 0) { 
             // If life remains, prepare to reattempt the same case
             setTimeout(() => {
                e.target.setStyle(styleBorders(e.target.feature)); // Reset error style
                closeRawDataModal(); // Close raw data modal
                startTimer(); // Restart the timer
             }, 3000);
        } else { 
            handleGameOver(); // Game Over
        }
    }
    
    showRawDataModal(clickedArea); 
}

function updateClueCards(properties) {
    const egitimVal = cleanAndParseFloat(properties[COLUMNS.EGITIM]);
    const cezaeviVal = parseInt(properties[COLUMNS.CEZAEVI]) || 0;
    const yoksullukVal = cleanAndParseFloat(properties[COLUMNS.YOKSULLUK]);
    
    const egitimHint = egitimVal > averageData[COLUMNS.EGITIM] ? 
        `Above (${egitimVal.toFixed(1)} Years) - LOW RISK` : 
        `Below (${egitimVal.toFixed(1)} Years) - HIGH RISK`;

    const cezaeviHint = cezaeviVal > averageData[COLUMNS.CEZAEVI] ?
        `High Profile (${cezaeviVal.toLocaleString()} People) - CRITICAL RISK` :
        `Low Profile (${cezaeviVal.toLocaleString()} People) - NORMAL MONITORING`;
        
    const yoksullukHint = yoksullukVal > averageData[COLUMNS.YOKSULLUK] ?
        `Above (%${yoksullukVal.toFixed(1)}) - FINANCIAL HARDSHIP` :
        `Below (%${yoksullukVal.toFixed(1)}) - FINANCIALLY SECURE`;

    // UPDATE CARD CONTENTS BASED ON CASE
    if (currentCaseIndex === 0) { // CASE 1: Theft
        L.DomUtil.get('ipucu-egitim').innerHTML = isNaN(egitimVal) ? 'DATA ERROR' : `Education: ${egitimHint}`;
        L.DomUtil.get('ipucu-cezaevi').innerHTML = cezaeviHint;
        L.DomUtil.get('ipucu-yoksulluk').innerHTML = isNaN(yoksullukVal) ? 'DATA ERROR' : yoksullukHint;
        
    } else if (currentCaseIndex === 1) { // CASE 2: Murder (With new data)
        const polisVal = parseInt(properties[COLUMNS.POLIS_MERKEZ]) || 0;
        const alkolVal = parseInt(properties[COLUMNS.ALKOL_MEKAN]) || 0;
        const nufusVal = parseInt(properties[COLUMNS.NUFUS]) || 0;

        const polisHint = polisVal > averageData[COLUMNS.POLIS_MERKEZ] ?
            `Police: HIGH Control (${polisVal})` :
            `Police: LOW Control (${polisVal}) - CRITICAL LACK`;
            
        const alkolHint = alkolVal > averageData[COLUMNS.ALKOL_MEKAN] ?
            `Alcohol: HIGH Density (${alkolVal}) - HIGH STRESS` :
            `Alcohol: LOW Density (${alkolVal}) - NORMAL STRESS`;

        // Card 1 (Now Prison Releases)
        L.DomUtil.get('ipucu-egitim').innerHTML = isNaN(egitimVal) ? 'DATA ERROR' : `${cezaeviHint} <br> `;
        // Card 2 (Now Number of Police Stations)
        L.DomUtil.get('ipucu-cezaevi').innerHTML = ` ${polisHint}<br>`;
        // Card 3 (Now Number of Alcohol Venues)
        L.DomUtil.get('ipucu-yoksulluk').innerHTML = isNaN(yoksullukVal) ? 'DATA ERROR' : ` ${alkolHint}<br>`;
    }
}
