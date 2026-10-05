import "./db";
import { bot, avisarError, preguntarPrecioDelMes } from "./bot";
import { iniciarScheduler } from "./scheduler";
import { mesActual } from "./services/mes";
import { logger } from "./utils/logger";

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException:", err);
  avisarError(`Error inesperado: ${err.message}`);
});

process.on("unhandledRejection", (err) => {
  logger.error("unhandledRejection:", err);
  avisarError(`Promesa rechazada sin manejar: ${err instanceof Error ? err.message : err}`);
});

iniciarScheduler();

// Si el server estaba apagado el día 1 a las 8am, el cron no corrió: pregunta al arrancar.
const ahora = new Date();
const ultimo = mesActual();
const hayMesActual = ultimo?.anio === ahora.getFullYear() && ultimo?.mes === ahora.getMonth() + 1;
const esperaCronDelDia1 = ahora.getDate() === 1 && ahora.getHours() < 8;
if (!hayMesActual && !esperaCronDelDia1) {
  preguntarPrecioDelMes(ahora.getFullYear(), ahora.getMonth() + 1);
}

bot.start();
logger.info("bot corriendo, scheduler activo");
