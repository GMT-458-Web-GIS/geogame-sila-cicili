// 1. Haritayı başlatın ve başlangıç görünümünü ayarlayın.
// Haritanın hangi koordinatlarda açılacağını ve zoom seviyesini belirtin.
const map = L.map('map').setView([38.9637, 35.2433], 6); // Türkiye'nin ortasına yakın bir koordinat

// 2. Bir harita katmanı ekleyin (Örn: OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap katkıcıları'
}).addTo(map);

// 3. GeoJSON dosyasını çekin ve haritaya ekleyin
fetch('geogame.geojson') // Dosyanızın adını kullanıyoruz
    .then(response => {
        if (!response.ok) {
            throw new Error('GeoJSON dosyası yüklenemedi: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        // 4. Çekilen GeoJSON verisini haritaya ekleyin
        const geoJsonLayer = L.geoJSON(data, {
            // İsteğe bağlı: Her bir özellik için popup (açılır pencere) tanımlayabilirsiniz
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.name) {
                    layer.bindPopup(feature.properties.name);
                }
            },
            // İsteğe bağlı: Şekillerin stilini değiştirebilirsiniz
            style: function (feature) {
                return {
                    color: '#ff0000',     // Kenar çizgisi rengi
                    weight: 3,            // Kenar çizgisi kalınlığı
                    opacity: 0.8,         // Görünürlük
                    fillColor: '#ffa500', // Dolgu rengi
                    fillOpacity: 0.5      // Dolgu görünürlüğü
                };
            }
        }).addTo(map);

        // İsteğe bağlı: Haritanın görünümünü GeoJSON verisinin sınırlarına göre ayarlayın
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch(error => {
        console.error("GeoJSON yüklenirken bir hata oluştu:", error);
    });
