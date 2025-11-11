# 🕵️ GMT 458 - ÖDEV 2: GeoCrime: Uzamsal Sorgu (GeoGame)

Bu proje, Web GIS prensipleri kullanılarak geliştirilmiş, oyuncuların GeoJSON verileri üzerinde iki aşamalı suç vakasını (Hırsızlık ve Cinayet) çözmeye çalıştığı, **hikayeleştirilmiş** ve **çoklu vaka sistemine** sahip bir GeoGame'dir.

---

## 📊 Veri Kaynakları ve Analitik Metot

Projenin güvenilirliği, resmi ve mekânsal verilere dayanmaktadır.

* **Ana Veri Kaynağı:** Türkiye İstatistik Kurumu (TÜİK) ve ilgili kamu kurumlarının açık veri setleri kullanılarak hazırlanmıştır.
* **Veri Tipi:** İl bazlı **GeoJSON** verisi (Poligonlar) kullanılmaktadır.
* **Veri Kategorileri:** Her il için temel risk göstergeleri mevcuttur:
    * **Eğitim Seviyesi** (Yıl)
    * **Göreli Yoksulluk** (Oran)
    * **Suç Profil Sinyalleri** (Cezaevi Çıkışları)
    * **Nüfus Yoğunluğu**

### Analitik Yaklaşım

Oyun, coğrafi suç prensibine dayanır: Oyuncunun görevi, bu bağımsız risk faktörlerini üst üste getirerek oluşan anomalileri (örneğin, Yüksek Yoksulluk ve Düşük Eğitim seviyesinin çakışması) görsel olarak tespit etmektir.

---

## 🎯 Proje Amacı ve Kritik Bileşenler

| Bileşen | Gereksinim Karşılama | Açıklama |
| :--- | :--- | :--- |
| **İki Aşamalı Vaka** | ✅ Cinayet ve Hırsızlık | Oyuncu, **Mülkiyet Suçu (Vaka 1)** ve **Metropol Gölgesi (Vaka 2)** senaryolarını çözerek analitik esnekliğini gösterir. |
| **Gelişmiş Görselleştirme**| ✅ Korolet ve Renk Tutarlılığı | Tüm veri katmanları, tutarlı bir **Kırmızı-Yeşil risk skalasında** gösterilir. (Kırmızı: Yüksek Risk / Yeşil: Düşük Risk). |
| **Tıklama/Etkileşim Çözümü**| ✅ Stabil Mimari | Sabit Sınır Katmanı (`borderLayer`) kullanılarak, renkli katmanlar açıkken bile illere her zaman tıklanabilirlik sağlanmıştır. |
| **Temporal & High-Score** | ✅ Evet | 60 saniyelik süre ve puana dayalı kaybetme sistemi. |

## 🗺️ Oynanış ve Vaka Senaryoları

### Misyon 1: Zincirleme Kırılma (Hırsızlık Tahmini)

* **Hedef:** Ekonomik baskının ve suç yatkınlığının (Cezaevi Çıkışları) mülkiyet suçunu tetiklediği bölge.

### Misyon 2: Metropol Gölgesi (Cinayet Tahmini)

* **Hedef:** Sosyal baskının ve yüksek nüfus yoğunluğunun şiddet olaylarını artırdığı bölge.

---

## 💻 Kilit Kod Mekanikleri

* **Dinamik Katman Değişimi:** Alt kısımdaki **Kanıt Kartlarına** tıklanarak ilgili GeoJSON dolgu katmanları haritaya eklenir/kaldırılır.
* **Veri Temizleme:** Kod, GeoJSON'dan gelen yerel format hatalarını (virgüllü sayılar gibi) otomatik olarak düzeltir.
* **Bitiş Mantığı:** Puan veya Lisans Puanı sıfıra düştüğünde haritadaki tüm etkileşimler devre dışı bırakılır.