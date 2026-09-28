export function parseMonto(texto: string): number | null {
  const limpio = texto
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // saca separador de miles "9.200"
    .replace(",", "."); // coma decimal -> punto
  const monto = Number(limpio);
  if (!Number.isFinite(monto)) return null;
  return monto;
}

export function redondearArriba50(monto: number): number {
  return Math.ceil(monto / 50) * 50;
}

export function formatoPesos(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function difierePorcentaje(actual: number, anterior: number): number {
  if (anterior <= 0) return 0;
  return Math.abs(actual - anterior) / anterior;
}
