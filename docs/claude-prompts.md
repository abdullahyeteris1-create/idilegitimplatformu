# Claude Prompt Şablonları

İdil Eğitim Platformu üzerinde Claude Code ile çalışırken sık kullanılan istek kalıpları. Her şablon, hangi `.claude/skills/` dosyasını tetiklemesi beklendiği notuyla birlikte verilmiştir.

## Yeni egzersiz / özellik ekleme

> "Education Program sistemine `<egzersiz-adı>` adında yeni bir egzersiz ekle. Katalog kaydı, route allow-list ve gerekiyorsa XP entegrasyonunu yap. Migration gerekiyorsa dosyasını oluştur ama uygulama."

→ tetikler: `feature-builder`, gerekirse `supabase-migration`

## Hata bildirme / bug fix

> "`<özellik/sayfa>` içinde şu hata oluşuyor: `<hata açıklaması>`. Önce hangi sistemde (Assignment mi Education Program mı) olduğunu tespit et, kök nedeni bul, düzelt ve regresyon testi ekle."

→ tetikler: `bug-fix`

## Migration taslağı isteme

> "`<tablo/alan>` için yeni bir Supabase migration dosyası hazırla. Sadece dosyayı oluştur, gerçek projeye uygulama."

→ tetikler: `supabase-migration`

## Kod incelemesi / gözden geçirme

> "Son değişiklikleri gözden geçir: lint, tsc ve testleri çalıştır, iki paralel sistem (Assignment/Education Program) arasında tutarsızlık olup olmadığını kontrol et."

→ tetikler: `project-review`

## Commit hazırlama

> "Değişiklikleri commit et." (yalnızca kullanıcı açıkça istediğinde)

→ tetikler: `commit-project` — lint/tsc/test geçmeden commit önerilmez, push otomatik yapılmaz.

## Genel proje sorusu

> "`<sistem/dosya>` nasıl çalışıyor, XP nasıl hesaplanıyor, hangi sistemde olduğumu nasıl anlarım?"

→ doğrudan `CLAUDE.md` içindeki dizin haritası ve "İki paralel görev sistemi" bölümüne bak.
