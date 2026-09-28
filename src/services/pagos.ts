import { db } from "../db";
import { getDeuda } from "./amigos";

/** Marca pago total (sin parciales): salda toda la deuda acumulada del amigo. */
export function marcarPagado(amigoId: number): number {
  const deuda = getDeuda(amigoId);
  if (deuda <= 0) return 0;
  db.prepare("INSERT INTO movimientos (amigo_id, mes_id, tipo, monto) VALUES (?, NULL, 'pago', ?)").run(
    amigoId,
    deuda
  );
  return deuda;
}
