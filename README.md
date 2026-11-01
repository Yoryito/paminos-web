# PAMINOS · espejo web

Copia publicada de la app **PAMINOS** (registro laboral: horas extra, calendario,
libranzas y nómina), servida con GitHub Pages en
<https://yoryito.github.io/paminos-web/>.

Existe por un motivo concreto: la web principal vive en Cloudflare y, desde
noviembre de 2026, la línea de casa no alcanza las direcciones de internet donde
Cloudflare la sirve (el navegador se quedaba cargando sin fin y acababa
enseñando una copia vieja). Este espejo está en otro sitio al que sí se llega.

**Aquí solo está la app ya compilada**, lo que cualquiera puede descargar al
abrir la web. El código fuente sigue en su repositorio privado.

Los datos NO están aquí: viven en Supabase, cada usuario con los suyos, y la app
los pide al iniciar sesión. La clave que aparece en el código compilado es la
pública (`publishable`), pensada justo para eso; lo que protege los datos son
las políticas RLS de Supabase, que atan cada fila a su dueño.

Para actualizarlo: `npm run build` en el proyecto y copiar el contenido de
`dist/` aquí.
