export const schema = `
CREATE TABLE IF NOT EXISTS amigos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  mail TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  es_vos INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  precio_propuesto REAL,
  cuota_propuesta REAL,
  precio_total REAL,
  cuota_persona REAL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'esperando_confirmacion', 'confirmado', 'enviado')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  confirmado_en TEXT,
  UNIQUE (anio, mes)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amigo_id INTEGER NOT NULL REFERENCES amigos(id),
  mes_id INTEGER REFERENCES meses(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'pago')),
  monto REAL NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mail_envios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mes_id INTEGER NOT NULL REFERENCES meses(id),
  amigo_id INTEGER NOT NULL REFERENCES amigos(id),
  enviado INTEGER NOT NULL DEFAULT 0,
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_error TEXT,
  enviado_en TEXT,
  UNIQUE (mes_id, amigo_id)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_amigo ON movimientos(amigo_id);
CREATE INDEX IF NOT EXISTS idx_mail_envios_mes ON mail_envios(mes_id);
`;
