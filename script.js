// =======================================================================
// A. GLOBAL TANIMLAR VE AYARLAR
// =======================================================================
var vakaDurumu = { can: 3, puan: 100, sure: 60 }; // 🚨 BAŞLANGIÇ PUANI 100
var timer; 
var ANOMALI_IL_ADI = "ADANA"; 

var geoJsonLayer; 
var overlayMaps = {}; 
let averageData = {}; 
let currentLayer = null; 
var borderLayer = null; 

// SÜTUN VE DOSYA ADLARI
const GEOJSON_FILE = 'geogame.geojson'; 
const COLUMNS = {
    IL_ADI: 'adm1_tr',
    EGITIM: 'EĞİTİMS', // Kırık/Kısaltılmış alan adı
    CEZAEVI: 'CEZAEVİND',
    YOKSULLUK: 'YOKSULLUKO',
    NUFUS: 'İLLEREGÖ'
};

// VAKA HİKAYELERİ (Modal içeriği)
const caseFiles = {
    CASE_ADANA: {
        title: "VAKA #001: HIRSIZLIK",
        narrative: `Dedektif, yüksek değerli mülkleri hedef alan hırsızlık dalgası yaşandı. Olay yerleri, sosyal kontrolün düşük olduğu ve yüksek finansal zorluk yaşanan bölgeler ve eğitim seviyesinin düşük olduğu bölgeler olabilir. Görev, bu üç risk sinyalinin (Yüksek Cezaevi Çıkışı, Yüksek Yoksulluk, Düşük Eğitim) mantıksal olarak en yoğun olduğu ilimizi bularak, bir sonraki olası suç mahalli profilini doğrulamalıdır.`,
        anomaly: "ADANA"
    }
};

// Haritayı başlat
var map = L.map('map').setView([39.9, 32.8], 6); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// ------------------------------------------------------------------------
// B. GEOJSON YÜKLEME VE VERİ İŞLEME
// ------------------------------------------------------------------------

// GÜVENİLİR SAYI DÖNÜŞÜMÜ FONKSİYONU (NaN Hatalarını Çözer)
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
    let totals = { [COLUMNS.EGITIM]: 0, [COLUMNS.YOKSULLUK]: 0, [COLUMNS.CEZAEVI]: 0 }; 
    const count = features.length;

    features.forEach(feature => {
        const props = feature.properties;
        totals[COLUMNS.EGITIM] += cleanAndParseFloat(props[COLUMNS.EGITIM]) || 0;
        totals[COLUMNS.YOKSULLUK] += cleanAndParseFloat(props[COLUMNS.YOKSULLUK]) || 0;
        totals[COLUMNS.CEZAEVI] += parseInt(props[COLUMNS.CEZAEVI]) || 0; 
    });

    averageData[COLUMNS.EGITIM] = totals[COLUMNS.EGITIM] / count;
    averageData[COLUMNS.YOKSULLUK] = totals[COLUMNS.YOKSULLUK] / count;
    averageData[COLUMNS.CEZAEVI] = totals[COLUMNS.CEZAEVI] / count;
}

async function fetchAndLoadGeoJSON() {
    try {
        L.DomUtil.get('vaka-metni').innerHTML = "GeoJSON verisi yükleniyor...";
        
        const response = await fetch(GEOJSON_FILE);
        if (!response.ok) {
            throw new Error(`Dosya yüklenemedi: ${response.statusText}. 'geogame.geojson' dosyasını kontrol edin.`);
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
        console.error("KRİTİK HATA: GeoJSON yükleme başarısız!", error);
        L.DomUtil.get('vaka-metni').innerHTML = "KRİTİK HATA: Veri yükleme başarısız! Konsolu kontrol edin.";
    }
}

fetchAndLoadGeoJSON();

// =======================================================================
// C. STİL VE KOROLET FONKSİYONLARI 
// =======================================================================

function getColor(d) { 
    d = parseFloat(d); 
    return d > 10.5 ? '#1a9850' : d > 9.5  ? '#a6d96a' : d > 8.5  ? '#fee08b' : d > 7.5  ? '#f46d43' : '#d73027'; 
}

function getYoksullukColor(d) {
    d = parseFloat(d);
    return d > 12 ? '#d73027' : d > 9  ? '#f46d43' : d > 6  ? '#fee08b' : d > 3  ? '#a6d96a' : '#1a9850';
}

function getCezaeviColor(d) {
    d = parseInt(d);
    return d > 10000 ? '#d73027' : d > 7500  ? '#f46d43' : d > 5000  ? '#fee08b' : d > 2500  ? '#a6d96a' : '#1a9850';
}

function styleBorders(feature) {
    return { fillColor: 'transparent', color: '#888', weight: 1.5, fillOpacity: 0 };
}

function style(feature) { 
    const egitimYili = cleanAndParseFloat(feature.properties[COLUMNS.EGITIM]); 
    if (isNaN(egitimYili)) { return { fillColor: '#888888', weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.0, interactive: false }; }
    return { fillColor: getColor(egitimYili), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function styleYoksulluk(feature) { 
    var yoksullukOrani = cleanAndParseFloat(feature.properties[COLUMNS.YOKSULLUK]);
    return { fillColor: getYoksullukColor(yoksullukOrani), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function styleCezaevi(feature) { 
    var cezaeviSayisi = parseInt(feature.properties[COLUMNS.CEZAEVI]);
    return { fillColor: getCezaeviColor(cezaeviSayisi), weight: 0.1, opacity: 0.1, color: 'transparent', fillOpacity: 0.7, interactive: false };
}

function loadGeoJsonLayer(data) {
    // 1. SABİT SINIR KATMANINI OLUŞTUR (Mouseover ve Tıklamayı yönetir)
    borderLayer = L.geoJson(data, { 
        style: styleBorders,
        onEachFeature: function(feature, layer) {
            layer.on({
                mouseover: function(e) {
                    e.target.setStyle({ color: '#00FFFF', weight: 3 }); 
                    updateClueCards(feature.properties); 
                    L.DomUtil.get('vaka-metni').innerHTML = 'KANIT YÜKLENİYOR: ' + feature.properties[COLUMNS.IL_ADI]; 
                },
                mouseout: function(e) {
                    borderLayer.resetStyle(e.target); 
                    L.DomUtil.get('vaka-metni').innerHTML = 
                        `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">VAKA DOSYASINI İNCELEMEK İÇİN TIKLAYINIZ</a>`;
                },
                click: function(e) { 
                    checkPrediction(e);
                    showRawDataModal(e.target.feature.properties); 
                }
            });
        }
    }).addTo(map);

    // 2. DİNAMİK VERİ KATMANLARINI OLUŞTUR (Sadece renklendirme için)
    geoJsonLayer = L.geoJson(data, { style: style });
    var yoksullukLayer = L.geoJson(data, { style: styleYoksulluk });
    var cezaeviLayer = L.geoJson(data, { style: styleCezaevi });
    
    // Menüye ekle
    overlayMaps["Eğitim Risk Skoru (Ana)"] = geoJsonLayer;
    overlayMaps["Kanıt: Yoksulluk Oranı"] = yoksullukLayer;
    overlayMaps["Kanıt: Cezaevi Çıkışları"] = cezaeviLayer;

    var bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) { map.fitBounds(bounds); }
}

function switchMapLayer(layerName) {
    const cardElement = document.getElementById(`kart-${(layerName === 'EGITIM') ? 1 : (layerName === 'CEZAEVI') ? 2 : 3}`);
    
    if (currentLayer) { map.removeLayer(currentLayer); }
    
    let newLayer;
    if (layerName === 'EGITIM') {
        newLayer = overlayMaps["Eğitim Risk Skoru (Ana)"];
    } else if (layerName === 'CEZAEVI') {
        newLayer = overlayMaps["Kanıt: Cezaevi Çıkışları"];
    } else if (layerName === 'YOKSULLUK') {
        newLayer = overlayMaps["Kanıt: Yoksulluk Oranı"];
    }

    if (newLayer) {
        newLayer.addTo(map); 
        currentLayer = newLayer; 
        
        document.querySelectorAll('.ipucu-karti').forEach(card => card.classList.remove('active'));
        cardElement.classList.add('active');
    }
}

// =======================================================================
// D. OYUN YÖNETİMİ VE MODAL FONKSİYONLARI
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
    const currentCase = caseFiles.CASE_ADANA; 
    
    document.getElementById('case-title').innerHTML = currentCase.title;
    document.getElementById('case-narrative').innerHTML = currentCase.narrative;
    
    clearInterval(timer); 
}

function closeCaseFile() {
    document.getElementById('case-modal').style.display = 'none';
    startTimer(); 
}

function initGame() {
    L.DomUtil.get('puan').innerHTML = vakaDurumu.puan;
    L.DomUtil.get('can').innerHTML = vakaDurumu.can;
    L.DomUtil.get('sure').innerHTML = vakaDurumu.sure;

    L.DomUtil.get('vaka-metni').innerHTML = 
        `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">VAKA DOSYASINI İNCELEMEK İÇİN TIKLAYINIZ</a>`;
    
    document.querySelectorAll('.ipucu-karti').forEach(card => card.classList.remove('active'));
}

function startTimer() {
    clearInterval(timer); 
    timer = setInterval(() => {
        vakaDurumu.sure--;
        L.DomUtil.get('sure').innerHTML = vakaDurumu.sure; 
        if (vakaDurumu.sure <= 0) { clearInterval(timer); vakaDurumu.can -= 1; resetVaka(60); }
    }, 1000); 
}

// script.js dosyanızda resetVaka fonksiyonunu bulun ve değiştirin:

function resetVaka(yeniSure) {
    vakaDurumu.sure = yeniSure;
    
    // 🚨 KAYIP KONTROLÜ: Can veya Puan 0 veya altına düşerse kaybet
    if (vakaDurumu.can <= 0 || vakaDurumu.puan <= 0) {
        if (vakaDurumu.puan < 0) { vakaDurumu.puan = 0; }
        
        showToast(`GÖREV İPTAL! Puanınız veya canınız kalmadı. Final Puanınız: ${vakaDurumu.puan}`, 'error', 5000);
        
        // KRİTİK: TIKLAMA OLAYLARINI HARİTADAN KALDIRMA
        if (borderLayer) {
             borderLayer.eachLayer(layer => layer.off('click')); // Tüm click olaylarını devre dışı bırak
             borderLayer.eachLayer(layer => layer.off('mouseover')); // Mouseover olaylarını da devre dışı bırak
             layer.off('mouseout');
        }
        
        // Aktif katmanı kaldır
        if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }
        
        // Tekrar Başlatma Butonunu Göster
        L.DomUtil.get('can').innerHTML = 0; 
        L.DomUtil.get('vaka-metni').innerHTML = 
            `<a onclick="window.location.reload()" style="color: red; text-decoration: underline; cursor: pointer;">YENİ OYUNA BAŞLAMAK İÇİN TIKLAYINIZ</a>`;
            
        return; // Oyunu durdur
    }
    
    // --- OYUN DEVAM EDERSE BU KISIM ÇALIŞIR ---
    
    if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }

    // Stili ve arayüzü sıfırla
    if (borderLayer) borderLayer.eachLayer(l => l.setStyle(styleBorders(l.feature))); 
    document.querySelectorAll('.ipucu-karti').forEach(card => card.classList.remove('active'));

    L.DomUtil.get('can').innerHTML = vakaDurumu.can;
    L.DomUtil.get('vaka-metni').innerHTML = 
        `<a onclick="openCaseFile()" style="color: inherit; text-decoration: none;">YENİ VAKA BAŞLATILDI. TIKLAYINIZ.</a>`;
    openCaseFile(); 
}
// =======================================================================
// E. ETKİLEŞİM, PUANLAMA VE İPUCU KARTLARI
// =======================================================================

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    
    if (!container) { 
        console.error("HATA: #toast-container bulunamadı!");
        return; 
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10); 

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
    
    document.getElementById('data-il-adi').innerHTML = `Ham Veri Dosyası: ${properties[COLUMNS.IL_ADI]}`;
    document.getElementById('raw-nufus').innerHTML = properties[COLUMNS.NUFUS] ? parseInt(properties[COLUMNS.NUFUS]).toLocaleString() : 'N/A';
    document.getElementById('raw-egitim').innerHTML = properties[COLUMNS.EGITIM] ? cleanAndParseFloat(properties[COLUMNS.EGITIM]).toFixed(1) + ' Yıl' : 'N/A';
    document.getElementById('raw-cezaevi').innerHTML = properties[COLUMNS.CEZAEVI] ? parseInt(properties[COLUMNS.CEZAEVI]).toLocaleString() + ' Kişi' : 'N/A';
    document.getElementById('raw-yoksulluk').innerHTML = properties[COLUMNS.YOKSULLUK] ? cleanAndParseFloat(properties[COLUMNS.YOKSULLUK]).toFixed(2) + ' %' : 'N/A';
}

function closeRawDataModal() {
    document.getElementById('raw-data-modal').style.display = 'none';
}

function checkPrediction(e) {
    var clickedArea = e.target.feature.properties;
    clearInterval(timer); 
    
    if (clickedArea[COLUMNS.IL_ADI] === ANOMALI_IL_ADI) { 
        var puanCarpan = Math.floor(vakaDurumu.sure * 2); 
        vakaDurumu.puan += 100 + puanCarpan;

        e.target.setStyle({ weight: 5, color: '#00FF00', fillOpacity: 1 }); 
        showToast(`VAKA ÇÖZÜMLENDİ! Puan +${100 + puanCarpan}.`, 'success', 3000);
        
        setTimeout(() => resetVaka(60), 3000); 
    } else {
        const puanKaybi = 20;
        vakaDurumu.puan -= puanKaybi;
        vakaDurumu.can -= 1;
        
        e.target.setStyle({ fillColor: '#FF0000', color: 'red', weight: 4 }); 
        showToast(`HATALI TAHMİN! Puan (-${puanKaybi}) ve Lisans Puanı (-1).`, 'error', 3000);
        
        // KRİTİK KONTROL
        if (vakaDurumu.can > 0 && vakaDurumu.puan > 0) { startTimer(); } else { resetVaka(0); }
    }
    L.DomUtil.get('puan').innerHTML = vakaDurumu.puan;
    L.DomUtil.get('can').innerHTML = vakaDurumu.can;
    
    showRawDataModal(clickedArea); 
}

function updateClueCards(properties) {
    const egitimVal = cleanAndParseFloat(properties[COLUMNS.EGITIM]);
    const cezaeviVal = parseInt(properties[COLUMNS.CEZAEVI]) || 0;
    const yoksullukVal = cleanAndParseFloat(properties[COLUMNS.YOKSULLUK]);
    
    const egitimHint = egitimVal > averageData[COLUMNS.EGITIM] ? 
        `Üstünde (${egitimVal.toFixed(1)} Yıl) - RİSK DÜŞÜK` : 
        `Altında (${egitimVal.toFixed(1)} Yıl) - RİSK YÜKSEK`;

    const cezaeviHint = cezaeviVal > averageData[COLUMNS.CEZAEVI] ?
        `Yüksek Profil (${cezaeviVal.toLocaleString()} Kişi) - KRİTİK RİSK` :
        `Düşük Profil (${cezaeviVal.toLocaleString()} Kişi) - TAKİP NORMAL`;
        
    const yoksullukHint = yoksullukVal > averageData[COLUMNS.YOKSULLUK] ?
        `Üstünde (%${yoksullukVal.toFixed(1)}) - FİNANSAL ZORLUK` :
        `Altında (%${yoksullukVal.toFixed(1)}) - FİNANSAL GÜVENDE`;

    L.DomUtil.get('ipucu-egitim').innerHTML = isNaN(egitimVal) ? 'VERİ HATALI' : egitimHint;
    L.DomUtil.get('ipucu-cezaevi').innerHTML = cezaeviHint;
    L.DomUtil.get('ipucu-yoksulluk').innerHTML = isNaN(yoksullukVal) ? 'VERİ HATALI' : yoksullukHint;
}

function onEachFeature(feature, layer) {
    // Bu fonksiyon artık kullanılmıyor, tüm olaylar borderLayer'a aktarıldı.
}


