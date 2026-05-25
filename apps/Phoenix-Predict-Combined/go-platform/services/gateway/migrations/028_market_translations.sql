-- +goose Up
ALTER TABLE prediction_markets
    ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE prediction_markets
SET translations = translations || $json$
{
  "zh-Hans": {
    "title": "比特币会在 GTA VI 发布前达到 100 万美元吗？",
    "description": "如果在《Grand Theft Auto VI》在美国正式发布前，Binance 上 Bitcoin (BTCUSDT) 任意 1 分钟 K 线的最终“High”价格达到或超过 1,000,000 美元，本市场将结算为“Yes”。否则，本市场将结算为“No”。\n\n如果两者都未在 2026 年 7 月 31 日美东时间晚上 11:59 前发生，本市场将按 50-50 结算。\n\n就本市场而言，“发布”是指游戏在美国公开可购买或下载。抢先体验、测试版、其他预发布形式或泄露版本不计为正式发布。如果发布仅面向部分主机平台（例如 Xbox Series X/S），则计为发布。\n\nGTA VI 发布的结算来源为 Rockstar Games 或其母公司 Take-Two Interactive 的官方信息。\n\n比特币的结算来源为 Binance，具体为 https://www.binance.com/en/trade/BTC_USDT 上的 BTCUSDT “High”价格，并在顶部栏选择“1m”一分钟 K 线设置。\n\n请注意，本市场结果仅取决于 Binance BTCUSDT 交易对的价格数据。其他交易所、其他交易对或现货市场的价格不会用于本市场结算。"
  },
  "zh-Hant": {
    "title": "比特幣會在 GTA VI 發布前達到 100 萬美元嗎？",
    "description": "如果在《Grand Theft Auto VI》在美國正式發布前，Binance 上 Bitcoin (BTCUSDT) 任意 1 分鐘 K 線的最終「High」價格達到或超過 1,000,000 美元，本市場將結算為「Yes」。否則，本市場將結算為「No」。\n\n如果兩者都未在 2026 年 7 月 31 日美東時間晚上 11:59 前發生，本市場將按 50-50 結算。\n\n就本市場而言，「發布」是指遊戲在美國公開可購買或下載。搶先體驗、測試版、其他預發布形式或洩露版本不計為正式發布。如果發布僅面向部分主機平台（例如 Xbox Series X/S），則計為發布。\n\nGTA VI 發布的結算來源為 Rockstar Games 或其母公司 Take-Two Interactive 的官方資訊。\n\n比特幣的結算來源為 Binance，具體為 https://www.binance.com/en/trade/BTC_USDT 上的 BTCUSDT「High」價格，並在頂部欄選擇「1m」一分鐘 K 線設定。\n\n請注意，本市場結果僅取決於 Binance BTCUSDT 交易對的價格資料。其他交易所、其他交易對或現貨市場的價格不會用於本市場結算。"
  },
  "tl": {
    "title": "Aabot ba ang bitcoin sa $1m bago ilabas ang GTA VI?",
    "description": "Magre-resolve ang market na ito sa \"Yes\" kung ang alinmang Binance 1-minute candle para sa Bitcoin (BTCUSDT) ay may final na \"High\" price na $1,000,000 o mas mataas bago opisyal na ilabas ang Grand Theft Auto VI sa US. Kung hindi, magre-resolve ang market na ito sa \"No\".\n\nKung wala sa dalawang pangyayari ang mangyari bago Hulyo 31, 2026, 11:59 PM ET, magre-resolve ang market na ito sa 50-50.\n\nPara sa market na ito, ang \"release\" ay tumutukoy sa pagiging available ng laro para bilhin o i-download ng publiko sa US. Hindi bibilang ang early access, beta versions, ibang pre-release availability, o leaks bilang opisyal na release. Kung ang release ay para lang sa ilang console (hal. Xbox Series X/S), bibilang ito.\n\nAng resolution source para sa paglabas ng GTA VI ay opisyal na impormasyon mula sa Rockstar Games o sa parent company nitong Take-Two Interactive.\n\nAng resolution source para sa Bitcoin ay Binance, partikular ang BTCUSDT \"High\" prices na available sa https://www.binance.com/en/trade/BTC_USDT, na may chart settings na nakapili sa \"1m\" para sa one-minute candles sa top bar.\n\nPakitandaan na ang outcome ng market na ito ay nakadepende lamang sa price data mula sa Binance BTCUSDT trading pair. Hindi isasaalang-alang para sa resolution ng market na ito ang presyo mula sa ibang exchanges, ibang trading pairs, o spot markets."
  },
  "ms": {
    "title": "Adakah bitcoin akan mencecah $1j sebelum GTA VI dikeluarkan?",
    "description": "Pasaran ini akan diselesaikan sebagai \"Yes\" jika mana-mana lilin 1 minit Binance untuk Bitcoin (BTCUSDT) mempunyai harga akhir \"High\" sebanyak $1,000,000 atau lebih tinggi sebelum Grand Theft Auto VI dikeluarkan secara rasmi di AS. Jika tidak, pasaran ini akan diselesaikan sebagai \"No\".\n\nJika kedua-duanya tidak berlaku sebelum 31 Julai 2026, 11:59 malam ET, pasaran ini akan diselesaikan pada 50-50.\n\nBagi tujuan pasaran ini, \"release\" merujuk kepada permainan tersebut menjadi tersedia secara umum untuk pembelian atau muat turun di AS. Akses awal, versi beta, bentuk pra-keluaran lain, atau kebocoran tidak akan dikira sebagai keluaran rasmi. Jika keluaran hanya untuk konsol tertentu (contohnya Xbox Series X/S), ia akan dikira.\n\nSumber penyelesaian untuk keluaran GTA VI ialah maklumat rasmi daripada Rockstar Games atau syarikat induknya, Take-Two Interactive.\n\nSumber penyelesaian untuk Bitcoin ialah Binance, khususnya harga \"High\" BTCUSDT yang tersedia di https://www.binance.com/en/trade/BTC_USDT, dengan tetapan carta pada \"1m\" untuk lilin satu minit dipilih pada bar atas.\n\nSila ambil perhatian bahawa keputusan pasaran ini bergantung semata-mata pada data harga daripada pasangan dagangan Binance BTCUSDT. Harga daripada bursa lain, pasangan dagangan berbeza, atau pasaran spot tidak akan dipertimbangkan untuk penyelesaian pasaran ini."
  },
  "id": {
    "title": "Apakah bitcoin akan mencapai $1 juta sebelum GTA VI dirilis?",
    "description": "Market ini akan diselesaikan sebagai \"Yes\" jika candle 1 menit Binance mana pun untuk Bitcoin (BTCUSDT) memiliki harga akhir \"High\" sebesar $1.000.000 atau lebih tinggi sebelum Grand Theft Auto VI resmi dirilis di AS. Jika tidak, market ini akan diselesaikan sebagai \"No\".\n\nJika keduanya tidak terjadi sebelum 31 Juli 2026, pukul 11:59 PM ET, market ini akan diselesaikan 50-50.\n\nUntuk tujuan market ini, \"release\" berarti game tersedia secara publik untuk dibeli atau diunduh di AS. Early access, versi beta, bentuk pra-rilis lainnya, atau bocoran tidak akan dihitung sebagai rilis resmi. Jika rilis hanya untuk konsol tertentu (misalnya Xbox Series X/S), itu akan dihitung.\n\nSumber penyelesaian untuk rilis GTA VI adalah informasi resmi dari Rockstar Games atau perusahaan induknya, Take-Two Interactive.\n\nSumber penyelesaian untuk Bitcoin adalah Binance, khususnya harga \"High\" BTCUSDT yang tersedia di https://www.binance.com/en/trade/BTC_USDT, dengan pengaturan grafik \"1m\" untuk candle satu menit dipilih di bar atas.\n\nHarap diperhatikan bahwa hasil market ini hanya bergantung pada data harga dari pasangan perdagangan Binance BTCUSDT. Harga dari exchange lain, pasangan perdagangan berbeda, atau spot market tidak akan dipertimbangkan untuk penyelesaian market ini."
  }
}
$json$::jsonb
WHERE ticker = 'IMP-7D99942B';

-- +goose Down
UPDATE prediction_markets
SET translations = translations - 'zh-Hans' - 'zh-Hant' - 'tl' - 'ms' - 'id'
WHERE ticker = 'IMP-7D99942B';

ALTER TABLE prediction_markets
    DROP COLUMN IF EXISTS translations;
