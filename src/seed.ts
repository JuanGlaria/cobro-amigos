import "./db";
import { db } from "./db";

interface AmigoSeed {
  nombre: string;
  mail: string;
  esVos?: boolean;
}

// Editá esta lista con los 6 integrantes reales antes de correr `npm run seed`.
const amigos: AmigoSeed[] = [];

const insert = db.prepare(
  "INSERT OR IGNORE INTO amigos (nombre, mail, activo, es_vos) VALUES (?, ?, 1, ?)"
);

for (const amigo of amigos) {
  insert.run(amigo.nombre, amigo.mail, amigo.esVos ? 1 : 0);
}

console.log(`Cargados ${amigos.length} amigos.`);
