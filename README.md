[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/BhShQpq1)
# 🕵️ GMT 458 - ÖDEV 2: GeoCrime: Uzamsal Sorgu (GeoGame)

Bu proje, Web GIS prensipleri kullanılarak geliştirilmiş, oyuncuların çok katmanlı coğrafi veri analizi yaparak suç mahallerini tahmin etmeye çalıştığı, **zamana dayalı (temporal)** ve **yüksek skor hedefli (high-score)** bir coğrafi oyundur.

---

## 🎯 Proje Amacı ve Çözülen Problemler

Projenin temel amacı, öğrencilerin **Birden Fazla Veri Katmanını** (Multi-Layer) aynı anda görselleştirme ve analitik olarak kullanma yeteneğini test etmektir.

| Bileşen | Gereksinim Karşılama | Açıklama |
| :--- | :--- | :--- |
| **Vaka Sistemi** | ✅ İki Aşamalı | Oyuncu, **Mülkiyet Suçu (Hırsızlık)** ve **Metropol Gölgesi (Cinayet)** olmak üzere iki ayrı vaka çözmek zorundadır. |
| **Analitik Zorluk**| ✅ Yüksek | Her vaka, farklı risk faktörlerinin kombinasyonunun (Eğitim, Yoksulluk, Cezaevi) çakışmasını gerektirir. |
| **Temporal Component** | ✅ Evet | Oyun, **60 saniyelik** geri sayım sayacı ile sınırlıdır. Hız, puan çarpanı getirir. |
| **High-Score** | ✅ Evet | Yanlış tahminde **-20 Puan** ve **-1 Lisans Puanı** kaybedilir. Skorlar, rekabeti teşvik eder. |
| **Teknolojiler** | ✅ Leaflet, JS (ES6+) | `fetch` API, dinamik katman yönetimi ve özelleştirilmiş Korolet stilleri kullanılmıştır. |

---

## 🚀 Kurulum ve Başlatma

Bu projeyi çalıştırmak için harici bir sunucu (örneğin XAMPP) kurmanıza gerek yoktur. VS Code'daki **Live Server** eklentisi yeterlidir.

1.  **Dosyaları Yerleştirme:** Projenin tüm dosyalarını (`index.html`, `script.js`, `style.css`, `geogame.geojson`) aynı klasöre yerleştirin.
2.  **VS Code'da Açma:** VS Code'da klasörü açın.
3.  **Başlatma:** `index.html` dosyasına sağ tıklayın ve **"Open with Live Server"** seçeneğini seçerek oyunu başlatın.

---

## 🎮 Oynanış ve Vaka Akışı

Oyun, vaka dosyasına tıklanmasıyla başlar ve süre başlar.

### 1. Misyon 1: Zincirleme Kırılma (Hırsızlık)

* **Odak Veri:** Cezaevi Çıkışları, Yoksulluk Oranı.
* **Analiz Mantığı:** Faillerin motivasyonu (Yoksulluk) ve yatkınlığı (Cezaevi çıkışları) nerede en yüksektir?

### 2. Misyon 2: Metropol Gölgesi (Cinayet)

* **Odak Veri:** Eğitim Süresi, Nüfus Yoğunluğu.
* **Analiz Mantığı:** Sosyal baskının (Düşük Eğitim) ve stresin (Yüksek Nüfus) çakıştığı büyük metropolü tespit etme.

### Veri ve Görselleştirme

Oyuncu, ekranın altındaki Kanıt Kartlarına tıklayarak haritanın dolgusunu değiştirir:

| Veri Görseli | Veri Kaynağı | Risk Anlamı |
| :--- | :--- | :--- |
| **Ana Renkler**| `Eğitim Risk Skoru` | **Yeşil** = Düşük Risk; **Kırmızı** = Yüksek Risk |
| **Kart İpuçları**| Mouseover | O ilin verisini (Örn: Eğitim Yılı) Türkiye ortalamasıyla karşılaştırır. |
| **Harita Sınırları**| `borderLayer` | Tıklama olayını daima yakalar, veri katmanı değişse bile sabit kalır. |

---

## 🧩 Kilit Kod Mekanikleri

* **Veri Okuma Güvenliği:** `cleanAndParseFloat` fonksiyonu, GeoJSON'daki hatalı **virgüllü sayıları (`9,3`)** otomatik olarak `9.3` formatına çevirir ve `NaN` hatalarını engeller.
* **Dinamik Katman Yönetimi:** `switchMapLayer` fonksiyonu, katman kontrol menüsü yerine, alt kısımda yer alan kart tıklamalarıyla GeoJSON dolgu katmanlarını dinamik olarak haritaya ekler ve kaldırır.
* **Kayıp Durumu:** `resetVaka` fonksiyonu, Can veya Puan 0'a ulaştığında, tüm harita olaylarını (tıklama, mouseover) kaldırır ve oyuncunun oyuna devam etmesini engeller.
* **Toast Bildirimi:** `showToast` fonksiyonu, tarayıcı uyarılarını (alert) ortadan kaldırarak kullanıcı deneyimini iyileştirir.