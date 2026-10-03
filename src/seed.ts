import "./db";
import { db } from "./db";

interface AmigoSeed {
  nombre: string;
  mail: string;
  esVos?: boolean;
}

// Editá esta lista con los 6 integrantes reales antes de correr `npm run seed`.
const amigos: AmigoSeed[] = [
  { nombre: "Juan", mail: "glariajuan@gmail.com", esVos: true },
  { nombre: "Tomas", mail: "glariajuan+tomas@gmail.com" },
  { nombre: "Lautaro", mail: "glariajuan+lautaro@gmail.com" },
  { nombre: "Bruno", mail: "glariajuan+bruno@gmail.com" },
  { nombre: "Amigo5", mail: "glariajuan+amigo5@gmail.com" },
  { nombre: "Amigo6", mail: "glariajuan+amigo6@gmail.com" },
];

const insert = db.prepare(
  "INSERT OR IGNORE INTO amigos (nombre, mail, activo, es_vos) VALUES (?, ?, 1, ?)"
);

for (const amigo of amigos) {
  insert.run(amigo.nombre, amigo.mail, amigo.esVos ? 1 : 0);
}

console.log(`Cargados ${amigos.length} amigos.`);
