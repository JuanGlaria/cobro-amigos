import { db } from "../db";
import { enviarMail } from "../mail";
import { asuntoCuota, cuerpoCuota } from "../mail/templates";
import { getDeuda } from "./amigos";
import { marcarMesEnviado, Mes } from "./mes";
import { logger } from "../utils/logger";

interface MailEnvio {
  id: number;
  mes_id: number;
  amigo_id: number;
  enviado: number;
  intentos: number;
}

interface Amigo {
  id: number;
  nombre: string;
  mail: string;
}

/** Manda los mails pendientes de un mes confirmado. No corta ante un fallo puntual. */
export async function enviarMailsDelMes(mes: Mes): Promise<{ ok: number; fallidos: number }> {
  const pendientes = db
    .prepare(
      `SELECT me.*, a.nombre AS amigo_nombre, a.mail AS amigo_mail
       FROM mail_envios me JOIN amigos a ON a.id = me.amigo_id
       WHERE me.mes_id = ? AND me.enviado = 0`
    )
    .all(mes.id) as (MailEnvio & { amigo_nombre: string; amigo_mail: string })[];

  let ok = 0;
  let fallidos = 0;

  for (const envio of pendientes) {
    try {
      const deudaTotalPendiente = getDeuda(envio.amigo_id);
      const cuerpo = cuerpoCuota({
        nombre: envio.amigo_nombre,
        anio: mes.anio,
        mes: mes.mes,
        cuota: mes.cuota_persona!,
        deudaTotalPendiente,
      });
      await enviarMail(envio.amigo_mail, asuntoCuota(mes.anio, mes.mes), cuerpo);
      db.prepare(
        "UPDATE mail_envios SET enviado = 1, enviado_en = datetime('now'), intentos = intentos + 1 WHERE id = ?"
      ).run(envio.id);
      ok++;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      logger.error(`fallo mail a ${envio.amigo_nombre}:`, mensaje);
      db.prepare(
        "UPDATE mail_envios SET intentos = intentos + 1, ultimo_error = ? WHERE id = ?"
      ).run(mensaje, envio.id);
      fallidos++;
    }
  }

  if (fallidos === 0) marcarMesEnviado(mes.id);

  return { ok, fallidos };
}
