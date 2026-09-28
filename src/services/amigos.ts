import { db } from "../db";

export interface Amigo {
  id: number;
  nombre: string;
  mail: string;
  activo: number;
  es_vos: number;
  creado_en: string;
}

export function listarActivos(): Amigo[] {
  return db.prepare("SELECT * FROM amigos WHERE activo = 1 ORDER BY es_vos ASC, nombre ASC").all() as Amigo[];
}

export function listarTodos(): Amigo[] {
  return db.prepare("SELECT * FROM amigos ORDER BY nombre ASC").all() as Amigo[];
}

export function buscarPorNombre(nombre: string): Amigo | undefined {
  return db
    .prepare("SELECT * FROM amigos WHERE nombre = ? COLLATE NOCASE")
    .get(nombre) as Amigo | undefined;
}

export function altaAmigo(nombre: string, mail: string): Amigo {
  const info = db
    .prepare("INSERT INTO amigos (nombre, mail, activo) VALUES (?, ?, 1)")
    .run(nombre, mail);
  return db.prepare("SELECT * FROM amigos WHERE id = ?").get(info.lastInsertRowid) as Amigo;
}

export function bajaAmigo(nombre: string): boolean {
  const info = db
    .prepare("UPDATE amigos SET activo = 0 WHERE nombre = ? COLLATE NOCASE")
    .run(nombre);
  return info.changes > 0;
}

export function getDeuda(amigoId: number): number {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'cargo' THEN monto ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN tipo = 'pago' THEN monto ELSE 0 END), 0) AS deuda
       FROM movimientos WHERE amigo_id = ?`
    )
    .get(amigoId) as { deuda: number };
  return row.deuda;
}

export function listarDeudas(): { amigo: Amigo; deuda: number }[] {
  return listarTodos()
    .map((amigo) => ({ amigo, deuda: getDeuda(amigo.id) }))
    .filter((r) => r.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda);
}

export function historial(amigoId: number) {
  return db
    .prepare("SELECT * FROM movimientos WHERE amigo_id = ? ORDER BY creado_en DESC")
    .all(amigoId);
}
