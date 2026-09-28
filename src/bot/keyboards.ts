import { InlineKeyboard } from "grammy";
import { Amigo } from "../services/amigos";

export function teclaConfirmarPrecio(): InlineKeyboard {
  return new InlineKeyboard().text("✅ Confirmar", "confirmar_precio").text("❌ Cancelar", "cancelar_precio");
}

export function teclaUsarMismoPrecio(): InlineKeyboard {
  return new InlineKeyboard().text("Usar mismo monto", "usar_mismo_precio");
}

export function teclaPagos(deudores: { amigo: Amigo; deuda: number }[]): InlineKeyboard {
  const teclado = new InlineKeyboard();
  for (const { amigo, deuda } of deudores) {
    teclado.text(`${amigo.nombre} (debe $${deuda})`, `pagar_${amigo.id}`).row();
  }
  return teclado;
}
