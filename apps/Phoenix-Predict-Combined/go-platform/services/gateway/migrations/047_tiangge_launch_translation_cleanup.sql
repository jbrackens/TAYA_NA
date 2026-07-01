-- +goose Up
-- Replace inherited asset/price-target translation payloads on migrated DBs
-- with the same launch-safe GTA release copy used by bundled market fallbacks.

UPDATE prediction_markets
SET translations = translations || $json$
{
  "zh-Hans": {
    "title": "GTA VI会在2026年6月前发布吗？",
    "description": "如果Grand Theft Auto VI在2026年5月31日前于美国正式发布，则结算为YES。抢先体验、测试版、泄露或其他预发布形式不计入。"
  },
  "zh-Hant": {
    "title": "GTA VI會在2026年6月前發售嗎？",
    "description": "如果Grand Theft Auto VI在2026年5月31日前於美國正式發售，則結算為YES。搶先體驗、測試版、洩漏或其他預發布形式不計入。"
  },
  "tl": {
    "title": "Mare-release ba ang GTA VI bago mag-June 2026?",
    "description": "Magre-resolve sa YES kung opisyal na mare-release ang Grand Theft Auto VI sa US bago matapos ang May 31, 2026. Hindi kasama ang early access, beta, leaks, o ibang pre-release access."
  },
  "ms": {
    "title": "Adakah GTA VI dikeluarkan sebelum Jun 2026?",
    "description": "Diselesaikan sebagai YES jika Grand Theft Auto VI dikeluarkan secara rasmi di AS sebelum 31 Mei 2026. Akses awal, beta, kebocoran, atau akses pra-keluaran lain tidak dikira."
  },
  "id": {
    "title": "Apakah GTA VI rilis sebelum Juni 2026?",
    "description": "Berakhir YES jika Grand Theft Auto VI resmi dirilis di AS sebelum 31 Mei 2026. Early access, beta, bocoran, atau akses pra-rilis lain tidak dihitung."
  }
}
$json$::jsonb
WHERE ticker IN ('IMP-7D99942B', 'IMP-379D8671');

-- +goose Down
UPDATE prediction_markets
SET translations = translations - 'zh-Hans' - 'zh-Hant' - 'tl' - 'ms' - 'id'
WHERE ticker IN ('IMP-7D99942B', 'IMP-379D8671');
