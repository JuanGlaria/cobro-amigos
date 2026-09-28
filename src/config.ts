import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

export const config = {
  gmailUser: required("GMAIL_USER"),
  gmailAppPassword: required("GMAIL_APP_PASSWORD"),
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  telegramChatId: required("TELEGRAM_CHAT_ID"),
  aliasPago: process.env.ALIAS_PAGO ?? "",
  cbuPago: process.env.CBU_PAGO ?? "",
  dbPath: path.resolve(process.env.DB_PATH ?? "./data/cobro-amigos.db"),
  backupDir: path.resolve(process.env.BACKUP_DIR ?? "./backups"),
  backupDiasRetencion: Number(process.env.BACKUP_DIAS_RETENCION ?? 14),
  timezone: process.env.TZ ?? "America/Argentina/Buenos_Aires",
};
