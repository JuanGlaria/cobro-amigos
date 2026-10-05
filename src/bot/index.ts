import { Bot } from "grammy";
import { config } from "../config";
import { logger } from "../utils/logger";
import { db } from "../db";
import { parseMonto, redondearArriba50, formatoPesos, difierePorcentaje } from "../utils/dinero";
import {
  crearMesSiNoExiste,
  proponerPrecio,
  cancelarPropuesta,
  confirmarMes,
  ultimoMesConfirmado,
  mesActual,
  nombreMes,
  cancelarMesCompleto,
  CANTIDAD_PLAN,
} from "../services/mes";
import { enviarMailsDelMes } from "../services/envios";
import { hacerBackup } from "../backup";
import {
  listarDeudas,
  altaAmigo,
  bajaAmigo,
  buscarPorNombre,
  historial,
  getDeuda,
} from "../services/amigos";
import { marcarPagado } from "../services/pagos";
import { teclaConfirmarPrecio, teclaPagos } from "./keyboards";

const UMBRAL_DIFERENCIA = 0.3; // 30%

export const bot = new Bot(config.telegramBotToken);

bot.use(async (ctx, next) => {
  if (String(ctx.chat?.id) !== config.telegramChatId) return; // ignora cualquier otro chat
  await next();
});

export async function avisarError(mensaje: string): Promise<void> {
  try {
    await bot.api.sendMessage(config.telegramChatId, `⚠️ ${mensaje}`);
  } catch (err) {
    logger.error("no se pudo avisar error por Telegram:", err);
  }
}

export async function preguntarPrecioDelMes(anio: number, mes: number): Promise<void> {
  crearMesSiNoExiste(anio, mes);
  const anterior = ultimoMesConfirmado();
  const referencia = anterior?.precio_total
    ? ` (el mes pasado fue ${formatoPesos(anterior.precio_total)})`
    : "";
  await bot.api.sendMessage(
    config.telegramChatId,
    `Arrancó el mes de ${nombreMes(mes)}. ¿Cuánto es el total del plan?${referencia}\n` +
      `Mandame el monto, o "OK" para repetir el mismo.`
  );
}

export async function recordarPrecioPendiente(): Promise<void> {
  const mes = mesActual();
  if (!mes || mes.estado !== "pendiente") return;
  await bot.api.sendMessage(config.telegramChatId, `Sigo esperando el precio de ${nombreMes(mes.mes)}. Mandame el monto.`);
}

export async function preguntarQuienPago(): Promise<void> {
  const deudores = listarDeudas();
  if (deudores.length === 0) return;
  await bot.api.sendMessage(config.telegramChatId, "¿Quién pagó? Tildá a los que pagaron y tocá Confirmar.", {
    reply_markup: teclaPagos(deudores),
  });
}

// --- manejo del precio (texto libre: número u "OK") ---
bot.on("message:text").filter(
  (ctx) => {
    const mes = mesActual();
    if (ctx.message.text.startsWith("/")) return false
    return !!mes && mes.estado === "pendiente";
  },
  async (ctx) => {
    const mes = mesActual()!;
    const texto = ctx.message.text.trim();

    let monto: number | null;
    if (/^ok$/i.test(texto)) {
      const anterior = ultimoMesConfirmado();
      if (!anterior?.precio_total) {
        await ctx.reply("No hay precio de un mes anterior para repetir. Mandame el monto.");
        return;
      }
      monto = anterior.precio_total;
    } else {
      monto = parseMonto(texto);
    }

    if (monto === null || !Number.isFinite(monto) || monto <= 0) {
      await ctx.reply("No entendí el monto. Mandalo como 9200, 9.200 o $9200.");
      return;
    }

    const anterior = ultimoMesConfirmado();
    let avisoDiferencia = "";
    if (anterior?.precio_total) {
      const diff = difierePorcentaje(monto, anterior.precio_total);
      if (diff > UMBRAL_DIFERENCIA) {
        avisoDiferencia = `\n⚠️ Difiere más de ${UMBRAL_DIFERENCIA * 100}% del mes pasado (${formatoPesos(
          anterior.precio_total
        )}). Revisá antes de confirmar.`;
      }
    }

    const actualizado = proponerPrecio(mes.id, monto);
    await ctx.reply(
      `Total ${formatoPesos(monto)}, cuota ${formatoPesos(
        actualizado.cuota_propuesta!
      )} por persona (÷${CANTIDAD_PLAN}).${avisoDiferencia}\n¿Confirmo?`,
      { reply_markup: teclaConfirmarPrecio() }
    );
  }
);

bot.callbackQuery("confirmar_precio", async (ctx) => {
  const mes = mesActual();
  if (!mes || mes.estado !== "esperando_confirmacion") {
    await ctx.answerCallbackQuery("No hay nada pendiente de confirmar.");
    return;
  }
  const confirmado = confirmarMes(mes.id);
  await ctx.answerCallbackQuery("Confirmado");
  await ctx.editMessageText(`Confirmado: cuota ${formatoPesos(confirmado.cuota_persona!)} por persona. Mandando mails...`);

  const { ok, fallidos } = await enviarMailsDelMes(confirmado);
  await bot.api.sendMessage(
    config.telegramChatId,
    fallidos === 0
      ? `Listo, se mandaron los ${ok} mails.`
      : `Se mandaron ${ok} mails. ${fallidos} fallaron, quedaron para reintentar con /reintentar.`
  );
});

bot.callbackQuery("cancelar_precio", async (ctx) => {
  const mes = mesActual();
  if (mes) cancelarPropuesta(mes.id);
  await ctx.answerCallbackQuery("Cancelado");
  await ctx.editMessageText("Cancelado. Mandame el monto correcto cuando quieras.");
});

// Selección de pagados por mensaje (messageId -> ids de amigos tildados). Se pierde al reiniciar.
const seleccionPagos = new Map<number, Set<number>>();

bot.callbackQuery(/^toggle_pago_(\d+)$/, async (ctx) => {
  const amigoId = Number(ctx.match[1]);
  const msgId = ctx.callbackQuery.message?.message_id;
  if (msgId === undefined) return;
  const seleccion = seleccionPagos.get(msgId) ?? new Set<number>();
  if (!seleccion.delete(amigoId)) seleccion.add(amigoId);
  seleccionPagos.set(msgId, seleccion);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: teclaPagos(listarDeudas(), seleccion) });
});

bot.callbackQuery("confirmar_pagos", async (ctx) => {
  const msgId = ctx.callbackQuery.message?.message_id;
  const seleccion = (msgId !== undefined && seleccionPagos.get(msgId)) || new Set<number>();
  if (seleccion.size === 0) {
    await ctx.answerCallbackQuery("No tildaste a nadie.");
    return;
  }
  let marcados = 0;
  for (const amigoId of seleccion) {
    if (marcarPagado(amigoId) > 0) marcados++;
  }
  if (msgId !== undefined) seleccionPagos.delete(msgId);
  await ctx.answerCallbackQuery(`Marcados como pagados: ${marcados}`);
  const deudores = listarDeudas();
  if (deudores.length === 0) {
    await ctx.editMessageText("Marcado. Ya no queda nadie debiendo. 🎉");
  } else {
    await ctx.editMessageReplyMarkup({ reply_markup: teclaPagos(deudores) });
  }
});

// --- comandos ---

bot.command("deudas", async (ctx) => {
  const deudores = listarDeudas();
  if (deudores.length === 0) {
    await ctx.reply("Nadie debe nada.");
    return;
  }
  const texto = deudores.map((d) => `${d.amigo.nombre}: ${formatoPesos(d.deuda)}`).join("\n");
  await ctx.reply(texto);
});

bot.command("pagos", async (ctx) => {
  const deudores = listarDeudas();
  if (deudores.length === 0) {
    await ctx.reply("Nadie debe nada.");
    return;
  }
  await ctx.reply("¿Quién pagó? Tildá a los que pagaron y tocá Confirmar.", {
    reply_markup: teclaPagos(deudores),
  });
});

bot.command("estado", async (ctx) => {
  const mes = mesActual();
  if (!mes) {
    await ctx.reply("Todavía no arrancó ningún mes.");
    return;
  }
  const detalle = [
    `${nombreMes(mes.mes)} ${mes.anio}: ${mes.estado}`,
    mes.precio_total ? `Precio: ${formatoPesos(mes.precio_total)}` : "",
    mes.cuota_persona ? `Cuota: ${formatoPesos(mes.cuota_persona)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await ctx.reply(detalle);
});

bot.command("altaamigo", async (ctx) => {
  const args = ctx.match?.toString().trim().split(/\s+/) ?? [];
  const [nombre, mail] = args;
  if (!nombre || !mail) {
    await ctx.reply("Uso: /altaamigo <nombre> <mail>");
    return;
  }
  altaAmigo(nombre, mail);
  await ctx.reply(`Agregado ${nombre}. Entra a repartir a partir del mes que viene.`);
});

bot.command("bajaamigo", async (ctx) => {
  const nombre = ctx.match?.toString().trim();
  if (!nombre) {
    await ctx.reply("Uso: /bajaamigo <nombre>");
    return;
  }
  const ok = bajaAmigo(nombre);
  await ctx.reply(ok ? `${nombre} dado de baja. Si debía algo, sigue en /deudas.` : `No encontré a ${nombre}.`);
});

bot.command("reenviar", async (ctx) => {
  const nombre = ctx.match?.toString().trim();
  const amigo = nombre ? buscarPorNombre(nombre) : undefined;
  if (!amigo) {
    await ctx.reply("Uso: /reenviar <nombre>");
    return;
  }
  const mes = ultimoMesConfirmado();
  if (!mes) {
    await ctx.reply("No hay ningún mes confirmado todavía.");
    return;
  }
  const { enviarMail } = await import("../mail");
  const { asuntoCuota, cuerpoCuota } = await import("../mail/templates");
  try {
    await enviarMail(
      amigo.mail,
      asuntoCuota(mes.anio, mes.mes),
      cuerpoCuota({
        nombre: amigo.nombre,
        anio: mes.anio,
        mes: mes.mes,
        cuota: mes.cuota_persona!,
        deudaTotalPendiente: getDeuda(amigo.id),
      })
    );
    await ctx.reply(`Reenviado a ${amigo.nombre}.`);
  } catch (err) {
    await ctx.reply(`Falló el reenvío: ${err instanceof Error ? err.message : err}`);
  }
});

bot.command("reintentar", async (ctx) => {
  const mes = ultimoMesConfirmado();
  if (!mes) {
    await ctx.reply("No hay mes confirmado pendiente de mails.");
    return;
  }
  const { ok, fallidos } = await enviarMailsDelMes(mes);
  await ctx.reply(fallidos === 0 ? `Listo, se mandaron ${ok} mails.` : `${ok} enviados, ${fallidos} siguen fallando.`);
});

bot.command("historial", async (ctx) => {
  const nombre = ctx.match?.toString().trim();
  const amigo = nombre ? buscarPorNombre(nombre) : undefined;
  if (!amigo) {
    await ctx.reply("Uso: /historial <nombre>");
    return;
  }
  const movs = historial(amigo.id) as { tipo: string; monto: number; creado_en: string }[];
  if (movs.length === 0) {
    await ctx.reply(`${amigo.nombre} no tiene movimientos.`);
    return;
  }
  const texto = movs.map((m) => `${m.creado_en} — ${m.tipo}: ${formatoPesos(m.monto)}`).join("\n");
  await ctx.reply(texto);
});

bot.command("iniciarmes", async (ctx) => {
  const mes = mesActual();
  if (mes && mes.estado !== "enviado") {
    await ctx.reply(`Ya hay un mes en curso (${nombreMes(mes.mes)}, estado: ${mes.estado}). No hace falta iniciar otro.`);
    return;
  }
  const ahora = new Date();
  await preguntarPrecioDelMes(ahora.getFullYear(), ahora.getMonth() + 1);
});


bot.command("resetear", async (ctx) => {
  await ctx.reply(
    "⚠️ Esto borra TODOS los amigos, meses, movimientos y envíos. No se puede deshacer.\n" +
      "Si estás seguro, mandá /resetear_confirmar"
  );
});

bot.command("resetear_confirmar", async (ctx) => {
  let backup: string;
  try {
    backup = hacerBackup("pre-reset");
  } catch (err) {
    logger.error("falló el backup previo al reset:", err);
    await ctx.reply("No pude hacer el backup previo, así que NO reseteé nada.");
    return;
  }
  db.transaction(() => {
    db.exec("DELETE FROM mail_envios");
    db.exec("DELETE FROM movimientos");
    db.exec("DELETE FROM meses");
    db.exec("DELETE FROM amigos");
    db.exec("DELETE FROM sqlite_sequence"); // reinicia los autoincrement a 1
  })();
  await ctx.reply(`Listo, base reseteada. Backup previo: ${backup}\nCorré el seed de nuevo si hace falta.`);
});


bot.command("cancelarmes", async (ctx) => {
  const mes = mesActual();
  if (!mes) {
    await ctx.reply("No hay ningún mes en curso.");
    return;
  }
  if (mes.estado === "confirmado" || mes.estado === "enviado") {
    await ctx.reply("Este mes ya fue confirmado, no se puede cancelar así. Si hace falta corregirlo, avisame y lo vemos.");
    return;
  }
  cancelarMesCompleto(mes.id);
  await ctx.reply("Cancelado. Ya podés agregar/sacar amigos y arrancar de nuevo con /iniciarmes.");
});

bot.catch((err) => {
  logger.error("error en el bot:", err);
});
