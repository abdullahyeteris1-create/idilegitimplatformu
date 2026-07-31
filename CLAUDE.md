@AGENTS.md

# İdil Eğitim Platformu

Next.js 16 (App Router) + TypeScript + Supabase tabanlı bir eğitim/egzersiz platformu. Öğrenci (`ogrenci`) ve öğretmen (`ogretmen`) panelleri, görsel/bilişsel egzersizler, XP/rozet sistemi ve öğretmenlerin öğrencilere atadığı eğitim programları/görevler içerir.

## Dizin haritası

- `src/app/ogrenci/` — öğrenci paneli: `egitim-programim`, `istatistikler`, `okuma-testlerim`, `rozetlerim`
- `src/app/ogretmen/` — öğretmen paneli: `icerik-yonetimi` (egzersiz içerik yönetimi), `idil-panel/` (ders kayıtları, eğitim programları, ödevler)
- `src/app/egzersizler/` — tekil egzersiz sayfaları (öğrenci tarafından oynanan)
- `src/lib/education-programs/` — yeni "Eğitim Programı" sistemi (görev/program mantığı)
- `src/lib/assignments/` — eski "Assignment" (ödev) sistemi
- `src/lib/xp/` — XP, seviye ve rozet mantığı (`xpBadges.ts`, `xpLevels.ts`, `xpRepository.ts`)
- `supabase/migrations/` — `YYYYMMDDHHMMSS_aciklama.sql` adlandırmasıyla migration dosyaları
- `tests/` — `*.test.mjs`, Node'un yerleşik `--test` koşucusu ile çalışır (Jest/Vitest YOK)

## Kritik: iki paralel görev sistemi

Proje aynı anda iki egzersiz/görev kataloğu sistemi barındırıyor:
- **Assignment (eski)**: `src/lib/assignments/exerciseCatalog.ts`, `assignmentExerciseCatalog.ts`
- **Education Program (yeni)**: `src/lib/education-programs/exerciseCatalog.ts`, `exerciseRouteCatalog.ts`

Bu iki sistem birbirinden bağımsız tutulmalı — özellikle `exerciseRouteCatalog.ts` bilinçli olarak sabit bir allow-list'tir (exercise slug'ının doğrudan URL'e enterpole edilerek injection'a açılmasını önler). Hangi sistemde çalıştığından emin olmadan değişiklik yapma; ikisini birbirine bağımlı hale getirme.

## Test çalıştırma

Jest/Vitest yok. Testler Node'un yerleşik `--test` koşucusu ve özel bir TS-alias loader ile çalışır:

```
npm test
node --experimental-loader ./tests/ts-alias-loader.mjs --test tests/<dosya>.test.mjs
```

Yeni test dosyaları `tests/<alan>-<detay>.test.mjs` kalıbını izler.

## Kısıtlar

- **Migration'ları asla otomatik çalıştırma veya gerçek Supabase projesine apply etme.** Migration dosyası oluşturmak yeterli; uygulama kullanıcının kararıdır.
- **Gerçek veritabanına bağlanıp veri yazma** — salt-okunur MCP sorguları (`list_tables`, `get_advisors` vb.) dışında yazma işlemi yapma.
- **Commit veya push yapma** — kullanıcı açıkça istemedikçe.
- XP işlemlerinde çift ödül/idempotency riskine dikkat et (bkz. migration geçmişindeki `phase_1b`/`phase_1c` düzeltmeleri).

## Skill ve kural referansları

- `.claude/skills/feature-builder/` — yeni egzersiz/özellik eklerken
- `.claude/skills/bug-fix/` — hata ayıklarken
- `.claude/skills/supabase-migration/` — migration dosyası hazırlarken
- `.claude/skills/project-review/` — kod incelemesi/gözden geçirme yaparken
- `.claude/skills/commit-project/` — commit hazırlarken (kullanıcı istediğinde)
- `.claude/rules/database.md` — Supabase/şema kuralları
- `.claude/rules/frontend.md` — Next.js/TS/UI kuralları
- `docs/claude-prompts.md` — hazır prompt şablonları

