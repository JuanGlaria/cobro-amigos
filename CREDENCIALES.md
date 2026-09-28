# Cómo conseguir las credenciales del `.env`

## Gmail (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)

Nodemailer no puede usar tu contraseña normal de Gmail. Necesitás una "contraseña de aplicación".

1. Activá la verificación en 2 pasos en tu cuenta de Google: https://myaccount.google.com/security
2. Andá a https://myaccount.google.com/apppasswords (solo aparece si ya tenés 2FA activado).
3. Elegí un nombre cualquiera (ej. "cobro-amigos") y generá.
4. Google te muestra una contraseña de 16 caracteres, tipo `abcd efgh ijkl mnop`. Esa va en `GMAIL_APP_PASSWORD` (con o sin espacios, funciona igual).
5. `GMAIL_USER` es tu dirección completa de Gmail (`tu_mail@gmail.com`).

No compartas esa contraseña, es equivalente a la de tu cuenta para ese uso puntual. Si alguna vez se filtra, revocala desde la misma página de App Passwords.

## Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)

### Token del bot

1. Abrí Telegram y buscá **@BotFather**.
2. Mandale `/newbot`.
3. Te pide un nombre (display) y un username (tiene que terminar en `bot`, ej. `cobro_amigos_bot`).
4. BotFather te devuelve un token tipo `123456789:ABCdefGhIJKlmNoPQRstuVwxYZ`. Ese es `TELEGRAM_BOT_TOKEN`.
5. Mandale un `/start` a tu bot recién creado desde tu cuenta de Telegram (si no, no te puede escribir).

### Tu chat ID

1. Buscá **@userinfobot** en Telegram y mandale `/start` — te devuelve tu ID numérico. Ese es `TELEGRAM_CHAT_ID`.
   - Alternativa: mandale un mensaje a tu bot nuevo, después abrí en el navegador:
     `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
     y buscá `"chat":{"id": ...}` en la respuesta.
2. El bot ignora cualquier mensaje que no venga de ese chat ID, así que solo vos podés operarlo.

## Alias/CBU (`ALIAS_PAGO`, `CBU_PAGO`)

Van tal cual los usás para que te transfieran. Van en `.env`, no en la base de datos ni en el código, porque no cambian mes a mes.

## Después de completar el `.env`

```bash
chmod 600 .env
```

Así solo tu usuario puede leerlo.
