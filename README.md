# cobro-amigos

Bot de Telegram que cobra la cuota mensual de YouTube Premium a los amigos del plan. Vos informás el precio por Telegram, el sistema calcula la cuota, manda los mails y lleva la deuda de cada uno en SQLite.

## Instalación en el server (Ubuntu 24.04, Node 22)

```bash
git clone <tu-repo> ~/projects/cobro-amigos
cd ~/projects/cobro-amigos
npm install
cp .env.example .env
chmod 600 .env
# completá .env — ver CREDENCIALES.md para conseguir cada valor
```

Editá `src/seed.ts` con los 6 amigos reales y cargalos:

```bash
npm run seed
```

Compilá y probá a mano:

```bash
npm run build
node dist/index.js
```

Si anda bien, instalá los servicios:

```bash
sudo cp systemd/*.service systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cobro-amigos.service
sudo systemctl enable --now cobro-amigos-backup.timer
```

## Operación

- Ver logs: `journalctl -u cobro-amigos -f`
- Probar sin tocar nada: `npm run dry-run -- 9200` (imprime qué mandaría, no escribe DB ni manda mails)
- Reenviar un mail puntual: `/reenviar <nombre>` por Telegram
- Ver deudas: `/deudas`
- Ver estado del mes: `/estado`
- Historial de un amigo: `/historial <nombre>`
- Alta/baja: `/altaamigo <nombre> <mail>`, `/bajaamigo <nombre>`
- Reintentar mails que fallaron: `/reintentar`

## Backup y restauración

El timer `cobro-amigos-backup.timer` corre todos los días a las 3am, hace `VACUUM INTO` a `BACKUP_DIR` y borra los backups más viejos que `BACKUP_DIAS_RETENCION` días.

Backup manual: `npm run backup`

Restaurar: parar el service, reemplazar el `.db` activo por el backup elegido, reiniciar.

```bash
sudo systemctl stop cobro-amigos
cp backups/cobro-amigos-2026-09-01.db data/cobro-amigos.db
sudo systemctl start cobro-amigos
```

## Reglas de negocio implementadas

- Cuota fija = precio total ÷ 6 (`CANTIDAD_PLAN` en `src/services/mes.ts`), redondeada hacia arriba al múltiplo de $50. No cambia si hay menos de 6 amigos activos.
- El mes queda "pendiente" hasta que confirmás el precio por Telegram; recién ahí se cargan las deudas y se mandan los mails.
- Sin pagos parciales: marcar pagado salda toda la deuda acumulada del amigo.
- Deuda no pagada se arrastra sola al mes siguiente (no hay lógica especial, es un ledger corrido).
- Baja de un amigo no borra su deuda pendiente.
