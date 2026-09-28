import "./db";
import { listarActivos, getDeuda } from "./services/amigos";
import { ultimoMesConfirmado, nombreMes } from "./services/mes";
import { redondearArriba50, formatoPesos } from "./utils/dinero";
import { asuntoCuota, cuerpoCuota } from "./mail/templates";

// Uso: npm run dry-run -- 9200
const monto = Number(process.argv[2]);
if (!monto || monto <= 0) {
  console.error("Uso: npm run dry-run -- <monto>");
  process.exit(1);
}

const anterior = ultimoMesConfirmado();
const ahora = new Date();
const anio = ahora.getFullYear();
const mes = ahora.getMonth() + 1;

const activos = listarActivos();
const cuota = redondearArriba50(monto / activos.length);

console.log(`--- DRY RUN (no escribe nada, no manda mails) ---`);
console.log(`Mes: ${nombreMes(mes)} ${anio}`);
console.log(`Precio total: ${formatoPesos(monto)}  |  Cuota por persona: ${formatoPesos(cuota)}`);
if (anterior?.precio_total) console.log(`Mes anterior: ${formatoPesos(anterior.precio_total)}`);
console.log("");

for (const amigo of activos) {
  const deudaPrevia = getDeuda(amigo.id);
  const deudaTotalPendiente = deudaPrevia + cuota;
  console.log(`> ${amigo.nombre} <${amigo.mail}>`);
  console.log(`  Asunto: ${asuntoCuota(anio, mes)}`);
  console.log(
    cuerpoCuota({ nombre: amigo.nombre, anio, mes, cuota, deudaTotalPendiente })
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n")
  );
  console.log("");
}
