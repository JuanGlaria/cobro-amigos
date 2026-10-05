import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { config } from "./config";
import { logger } from "./utils/logger";

export function hacerBackup(etiqueta?: string): string {
  fs.mkdirSync(config.backupDir, { recursive: true });

  const ahora = new Date().toISOString();
  const fecha = ahora.slice(0, 10); // YYYY-MM-DD
  const sufijo = etiqueta ? `-${etiqueta}-${ahora.slice(11, 19).replace(/:/g, "")}` : "";
  const destino = path.join(config.backupDir, `cobro-amigos-${fecha}${sufijo}.db`);

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

  return destino;
}

if (require.main === module) hacerBackup();
