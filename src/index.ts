import "./db";
import { bot, avisarError } from "./bot";
import { iniciarScheduler } from "./scheduler";
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

bot.start();
logger.info("bot corriendo, scheduler activo");
