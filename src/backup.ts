import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { config } from "./config";
import { logger } from "./utils/logger";

fs.mkdirSync(config.backupDir, { recursive: true });

const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const destino = path.join(config.backupDir, `cobro-amigos-${fecha}.db`);

db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
logger.info("backup creado:", destino);

const limite = Date.now() - config.backupDiasRetencion * 24 * 60 * 60 * 1000;
for (const archivo of fs.readdirSync(config.backupDir)) {
  const ruta = path.join(config.backupDir, archivo);
  const stat = fs.statSync(ruta);
  if (stat.mtimeMs < limite) {
    fs.unlinkSync(ruta);
    logger.info("backup viejo borrado:", ruta);
  }
}
