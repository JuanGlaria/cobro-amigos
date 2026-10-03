import { db } from "../db";
import { listarActivos, getDeuda } from "./amigos";
import { redondearArriba50 } from "../utils/dinero";

export interface Mes {
  id: number;
  anio: number;
  mes: number;
  precio_propuesto: number | null;
  cuota_propuesta: number | null;
  precio_total: number | null;
  cuota_persona: number | null;
  estado: "pendiente" | "esperando_confirmacion" | "confirmado" | "enviado";
  creado_en: string;
  confirmado_en: string | null;
}

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes: number): string {
  return NOMBRES_MES[mes - 1];
}

export function mesActual(): Mes | undefined {
  return db
    .prepare("SELECT * FROM meses ORDER BY anio DESC, mes DESC LIMIT 1")
    .get() as Mes | undefined;
}

export function ultimoMesConfirmado(): Mes | undefined {
  return db
    .prepare(
      "SELECT * FROM meses WHERE estado IN ('confirmado', 'enviado') ORDER BY anio DESC, mes DESC LIMIT 1"
    )
    .get() as Mes | undefined;
}

export function crearMesSiNoExiste(anio: number, mes: number): Mes {
  const existente = db
    .prepare("SELECT * FROM meses WHERE anio = ? AND mes = ?")
    .get(anio, mes) as Mes | undefined;
  if (existente) return existente;
  const info = db
    .prepare("INSERT INTO meses (anio, mes, estado) VALUES (?, ?, 'pendiente')")
    .run(anio, mes);
  return db.prepare("SELECT * FROM meses WHERE id = ?").get(info.lastInsertRowid) as Mes;
}

const CANTIDAD_PLAN = 6;

export function proponerPrecio(mesId: number, precioTotal: number): Mes {
  const cantidadPersonas = listarActivos().length;
  const cuota = redondearArriba50(precioTotal / CANTIDAD_PLAN);
  db.prepare(
    "UPDATE meses SET precio_propuesto = ?, cuota_propuesta = ?, estado = 'esperando_confirmacion' WHERE id = ?"
  ).run(precioTotal, cuota, mesId);
  return db.prepare("SELECT * FROM meses WHERE id = ?").get(mesId) as Mes;
}

export function cancelarPropuesta(mesId: number): void {
  db.prepare(
    "UPDATE meses SET precio_propuesto = NULL, cuota_propuesta = NULL, estado = 'pendiente' WHERE id = ?"
  ).run(mesId);
}

/**
 * Confirma el precio: genera un cargo por la cuota a cada amigo activo
 * (incluido vos) dentro de una transacción. Idempotente por estado.
 */
export function confirmarMes(mesId: number): Mes {
  const mes = db.prepare("SELECT * FROM meses WHERE id = ?").get(mesId) as Mes;
  if (mes.estado !== "esperando_confirmacion") return mes;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE meses SET precio_total = precio_propuesto, cuota_persona = cuota_propuesta,
       estado = 'confirmado', confirmado_en = datetime('now') WHERE id = ?`
    ).run(mesId);

    const cuota = mes.cuota_propuesta!;
    const insertCargo = db.prepare(
      "INSERT INTO movimientos (amigo_id, mes_id, tipo, monto) VALUES (?, ?, 'cargo', ?)"
    );
    const insertEnvio = db.prepare(
      "INSERT OR IGNORE INTO mail_envios (mes_id, amigo_id) VALUES (?, ?)"
    );
    for (const amigo of listarActivos()) {
      insertCargo.run(amigo.id, mesId, cuota);
      insertEnvio.run(mesId, amigo.id);
    }
  });
  tx();

  return db.prepare("SELECT * FROM meses WHERE id = ?").get(mesId) as Mes;
}

export function marcarMesEnviado(mesId: number): void {
  db.prepare("UPDATE meses SET estado = 'enviado' WHERE id = ?").run(mesId);
}

export function deudaTotalAmigoParaMail(amigoId: number): number {
  return getDeuda(amigoId);
}

export function cancelarMesCompleto(mesId: number): void {
  db.prepare("DELETE FROM mail_envios WHERE mes_id = ?").run(mesId);
  db.prepare("DELETE FROM movimientos WHERE mes_id = ?").run(mesId);
  db.prepare("DELETE FROM meses WHERE id = ?").run(mesId);
}
