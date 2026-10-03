import { InlineKeyboard } from "grammy";
import { Amigo } from "../services/amigos";

export function teclaConfirmarPrecio(): InlineKeyboard {
  return new InlineKeyboard().text("✅ Confirmar", "confirmar_precio").text("❌ Cancelar", "cancelar_precio");
}

export function teclaUsarMismoPrecio(): InlineKeyboard {
  return new InlineKeyboard().text("Usar mismo monto", "usar_mismo_precio");
}

export function teclaPagos(
  deudores: { amigo: Amigo; deuda: number }[],
  seleccionados: Set<number> = new Set()
): InlineKeyboard {
  const teclado = new InlineKeyboard();
  for (const { amigo, deuda } of deudores) {
    const marca = seleccionados.has(amigo.id) ? "☑" : "☐";
    teclado.text(`${marca} ${amigo.nombre} (debe $${deuda})`, `toggle_pago_${amigo.id}`).row();
  }
  teclado.text(`✅ Confirmar pagos (${seleccionados.size})`, "confirmar_pagos");
  return teclado;
}
