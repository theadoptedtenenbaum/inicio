# Inicio — módulo de TizenBrew (v2.0.0)

Pantalla de inicio minimal para la **Samsung UE40NU7125**: retícula 4×2, papel,
tipografía suiza y materialidad iOS. Detecta sola qué apps están instaladas y las abre.

## Cómo funciona

El módulo es de tipo `app` **con `serviceFile`**. La página NO tiene acceso a `tizen`;
el servicio (`service.js`) corre en el Node de TizenBrew y sí lo tiene. La página le
pide todo por HTTP local en `127.0.0.1:8090`:

| Ruta | Qué hace |
|---|---|
| `GET /status` | versión, si `tizen.application` está disponible, errores |
| `GET /apps` | lista de apps instaladas (`getAppsInfo`) → la página resuelve los IDs |
| `GET /launch?id=<appId>` | abre la app; si `launch()` falla prueba `launchAppControl()` |

No hay identificadores escritos a mano: se resuelven al arrancar buscando por nombre.

## Publicar

> **Antes del primer commit**: GitHub → Settings → Emails → *Keep my email addresses
> private* + *Block command line pushes that expose my email*. Si no, el commit guarda
> tu correo real y es público para siempre.

1. github.com → **New repository** → `tizenbrew-inicio` → **Public** → Create.
2. **Add file → Upload files** → arrastra `package.json`, `service.js` y la carpeta `app/`.
3. **Commit changes**.
4. En la TV: abre **TizenBrewNextGeneration** → *Install from GH* → escribe:
   ```
   theadoptedtenenbaum/inicio
   ```

## Diagnóstico en la TV

- Punto de la cabecera: **verde** = servicio OK y `tizen` disponible; **rojo** = servicio caído.
- Al abrir avisa de las apps que no encuentra instaladas.
- Si una app no abre, el servicio ya intenta los dos caminos y devuelve cuál falló.
