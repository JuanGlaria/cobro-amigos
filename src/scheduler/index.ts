import cron from "node-cron";
import { config } from "../config";
import { preguntarPrecioDelMes, recordarPrecioPendiente, preguntarQuienPago } from "../bot";

export function iniciarScheduler(): void {
  // Día 1 de cada mes, 8am: pregunta el precio.
  cron.schedule(
    "0 8 1 * *",
    () => {
      const ahora = new Date();
      preguntarPrecioDelMes(ahora.getFullYear(), ahora.getMonth() + 1);
    },
    { timezone: config.timezone }
  );

  // Cada hora de 9 a 22: si el mes sigue "pendiente", recuerda.
  cron.schedule(
    "0 9-22 * * *",
    () => {
      recordarPrecioPendiente();
    },
    { timezone: config.timezone }
  );

  // Lunes, miércoles y viernes 10am: pregunta quién pagó.
  cron.schedule(
    "0 10 * * 1,3,5",
    () => {
      preguntarQuienPago();
    },
    { timezone: config.timezone }
  );
}
