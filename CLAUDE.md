# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Bot de Telegram (grammy) que cobra mensualmente la cuota de YouTube Premium familiar a los amigos del plan. El dueño informa el precio por Telegram, el sistema calcula la cuota, manda mails (nodemailer/Gmail) y lleva la deuda de cada amigo en SQLite (better-sqlite3). Todo el código, comandos y mensajes están en español (rioplatense).

## Comandos

- `npm run dev` — corre el bot con tsx (`src/index.ts`)
- `npm run build` / `npm start` — compila a `dist/` y corre `dist/index.js` (lo que usa systemd)
- `npm run seed` — carga los amigos desde `src/seed.ts` (editar ahí los datos reales)
- `npm run dry-run -- 9200` — imprime qué mandaría para ese precio sin escribir DB ni mandar mails
- `npm run backup` — backup de la DB (también corre por `systemd/cobro-amigos-backup.timer`)

No hay tests ni linter. Config por `.env` (ver `.env.example` y `CREDENCIALES.md`); `src/config.ts` falla al arrancar si faltan GMAIL_USER, GMAIL_APP_PASSWORD, TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID.

## Arquitectura

- `src/index.ts`: arranca DB, scheduler y `bot.start()`; los errores no capturados se avisan por Telegram (`avisarError`).
- `src/scheduler/`: crons de node-cron (zona `config.timezone`): día 1 a las 8am pregunta el precio, cada hora recuerda si el mes sigue `pendiente`, lun/mié/vie 10am pregunta quién pagó. Los crons llaman funciones exportadas por `src/bot`.
- `src/bot/`: handlers de comandos y callbacks (inline keyboards en `keyboards.ts`). Es la capa de orquestación: llama a los servicios y a `mail`.
- `src/services/`: lógica de negocio sobre SQLite (`mes`, `amigos`, `pagos`, `envios`). `db/schema.ts` define el esquema como string SQL con `CREATE TABLE IF NOT EXISTS` (no hay sistema de migraciones).
- `src/mail/`: transporte y templates de los mails de cobro.
- `src/utils/dinero.ts`: parseo de montos en formato argentino ("9.200", coma decimal), redondeo y formato ARS.

### Modelo de dominio

- Un **mes** (`meses`, único por anio+mes) pasa por estados `pendiente` → `esperando_confirmacion` (precio propuesto) → `confirmado` (se generan cargos) → `enviado` (mails mandados). `confirmarMes` es idempotente por estado y crea en una transacción un `cargo` en `movimientos` y una fila en `mail_envios` por cada amigo activo (incluido el dueño, `es_vos`).
- La **deuda** de un amigo se deriva de `movimientos` (`cargo` suma, `pago` resta); no hay saldo almacenado.
- **Cuota fija**: `cuota = redondearArriba50(precioTotal / 6)` — el divisor es la constante `CANTIDAD_PLAN = 6` en `services/mes.ts`, no la cantidad de amigos activos.
- `mail_envios` (único por mes+amigo) lleva intentos/errores para soportar `/reenviar` y `/reintentar` sin duplicar envíos.
- Comandos de testing/administración: `/iniciarmes`, `/resetear` (+ `/resetear_confirmar`), `/cancelarmes` (borra mes, movimientos y envíos). Los comandos funcionan aunque haya un mes pendiente.

## Despliegue

Ubuntu + systemd (`systemd/*.service|*.timer`), logs con `journalctl -u cobro-amigos -f`. `dist/`, `*.db`, `.env` y `backups/` están en `.gitignore`.
