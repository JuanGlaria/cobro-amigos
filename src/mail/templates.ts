import { nombreMes } from "../services/mes";
import { formatoPesos } from "../utils/dinero";
import { config } from "../config";

export function asuntoCuota(anio: number, mes: number): string {
  return `Cuota YouTube Premium — ${nombreMes(mes)} ${anio}`;
}

export function cuerpoCuota(opts: {
  nombre: string;
  anio: number;
  mes: number;
  cuota: number;
  /** Deuda total pendiente del amigo, ya incluye la cuota de este mes. */
  deudaTotalPendiente: number;
}): string {
  const { nombre, mes, cuota, deudaTotalPendiente } = opts;
  const deudaVieja = Math.max(deudaTotalPendiente - cuota, 0);
  const total = deudaTotalPendiente;

  const lineas = [
    `Hola ${nombre}!`,
    "",
    `Cuota de ${nombreMes(mes)} de YouTube Premium: ${formatoPesos(cuota)}.`,
  ];

  if (deudaVieja > 0) {
    lineas.push(`Deuda de meses anteriores: ${formatoPesos(deudaVieja)}.`);
    lineas.push(`Total a pagar: ${formatoPesos(total)}.`);
  } else {
    lineas.push(`Total a pagar: ${formatoPesos(total)}.`);
  }

  lineas.push("");
  if (config.aliasPago) lineas.push(`Alias: ${config.aliasPago}`);
  if (config.cbuPago) lineas.push(`CBU: ${config.cbuPago}`);
  lineas.push("");
  lineas.push("Gracias!");

  return lineas.join("\n");
}
