-- 旧仕様: DailyReport.cashTotalYen に「精算現金 max(0, 実点−底銭)」を保存していた。
-- 新仕様: 「レジ実点（底銭込）」をそのまま保存する。
-- 既存行を移行する場合、バックアップ後に一度だけ実行してください（底銭が歴代で変わっていると誤差が出ます）。
UPDATE DailyReport
SET cashTotalYen = cashTotalYen + (
  SELECT registerFloatAmount FROM AppSettings WHERE id = 'default' LIMIT 1
);
