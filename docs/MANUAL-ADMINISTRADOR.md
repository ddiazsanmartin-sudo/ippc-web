# Manual del administrador del sitio

Guía para quien actualiza el sitio web de la Iglesia Presbiteriana «Pacto de Cristo» (community manager).
No necesitas saber programar.

---

## 1. Entrar al panel

1. Abre en tu navegador: **https://[dominio del sitio]/admin/** (dominio *por definir*).
2. Si aparece una pantalla de Cloudflare pidiendo tu correo, escríbelo y copia el código que te llegará por correo.
3. Presiona **«Iniciar sesión con GitHub»** y entra con tu cuenta de GitHub (con verificación en dos pasos activada).
4. Verás el menú del panel a la izquierda.

> Usa siempre tu propia cuenta. No compartas contraseñas ni códigos.

---

## 2. Qué puedes editar

### 2.1 Página de inicio

| Campo | Para qué sirve | Consejo |
| --- | --- | --- |
| **Aviso destacado** | Barra azul en la parte superior de todas las páginas | Márcalo como «Mostrar aviso» solo cuando haya algo importante. Máximo 140 caracteres. El enlace puede ser una página del sitio (ej. `/actividades`) o una dirección que empiece con `https://` |
| **Versículo de portada** | La frase grande sobre la foto principal | Texto y referencia por separado (ej. «Apocalipsis 7:17») |
| **Foto de portada** | Imagen de fondo de la portada | Ver §4. Siempre completa la «Descripción de la imagen» |
| **Texto de bienvenida** | Título y texto bajo la portada | Deja una línea en blanco para separar párrafos |
| **Identidad** | Las tarjetas «Reformada», «Confesional»… | Entre 1 y 6 elementos |

### 2.2 Datos generales y horarios

Nombre de la iglesia, lema, dirección, correo, teléfono, redes sociales y **horarios de culto**.

- La hora se escribe en formato 24 horas: `11:00`, `20:30`.
- El **primer horario** de la lista es el culto principal: aparece destacado en la portada.
- Las redes sociales deben empezar con `https://`.
- Latitud y longitud son para el mapa: en Google Maps, haz clic derecho sobre el templo y copia los números.

### 2.3 Actividades

El calendario congregacional. Las tres próximas aparecen en la portada.

1. Entra a **Actividades → Nueva actividad**.
2. Completa título, fecha y hora de inicio (y de término si corresponde), categoría, lugar y un resumen corto.
3. La descripción completa es opcional.
4. Presiona **Guardar**.

Las actividades que ya pasaron **se ocultan solas**; no necesitas borrarlas.

### 2.4 Sermones

Cada sermón enlaza a su video de YouTube. El más reciente aparece en la portada.

**Cómo obtener el código del video:**

1. Abre el video en YouTube y copia el enlace. Se ve así: `https://www.youtube.com/watch?v=AbCdEfGhIjK`
2. El código son los **11 caracteres** que van después de `watch?v=` → `AbCdEfGhIjK`.
3. Si el enlace es corto (`https://youtu.be/AbCdEfGhIjK`), el código es lo que va después de la última `/`.
4. Pega solo esos 11 caracteres en el campo **«Código del video de YouTube»**.

### 2.5 Ministerios y pastorales

Las tarjetas de la página «Vida de iglesia». Cada una lleva nombre, descripción breve, horario opcional y una foto con su
descripción. El campo **Orden** define la posición (1 aparece primero).

### 2.6 Recursos y lecturas

Documentos, enlaces y libros de la página «Recursos». Puedes subir un **PDF** o poner un enlace externo (`https://`).
Si no hay ninguno, el sitio mostrará «disponible próximamente».

---

## 3. Qué NO se edita desde el panel (y por qué)

Los textos de **Quiénes somos**, **Qué creemos** y **Culto y sacramentos** expresan la doctrina y la identidad de la
iglesia. Por decisión de diseño no están en el panel: cualquier cambio lo aprueba el Consistorio y lo realiza el equipo
técnico. Si detectas un error en esas páginas, avísale al equipo técnico (§7).

---

## 4. Buenas prácticas para fotos

- **Horizontales** y de al menos **1600 píxeles de ancho** para la portada; las demás pueden ser más pequeñas.
- Fotos nítidas, con buena luz. Evita capturas de pantalla y fotos con texto encima.
- No te preocupes por el peso del archivo: el panel reduce y convierte la foto antes de subirla (también acepta las
  fotos HEIC del iPhone), y el sitio la vuelve a optimizar al publicarla.
- Se aceptan JPG, PNG, WebP, HEIC y AVIF. **No se aceptan archivos SVG** (por seguridad).
- **Describe siempre la imagen** en el campo de descripción (texto alternativo), por ejemplo: «Niños pintando en la
  Escuela Dominical junto a su maestra». Lo usan personas ciegas y los buscadores.
- **Consentimiento:** publica fotos de personas solo con su autorización. En el caso de **niños y niñas**, se necesita
  la autorización de sus padres o tutores. Ante la duda, elige otra foto.

---

## 5. Qué pasa cuando guardas

1. El cambio queda registrado (con tu nombre y la fecha).
2. El sistema revisa automáticamente que todo esté correcto.
3. Si está todo bien, **el sitio se actualiza solo en unos 2 minutos**.
4. Si algo no cumple las reglas (por ejemplo, una hora mal escrita), **el sitio no cambia** —sigue mostrando la versión
   anterior— y el equipo técnico recibe el aviso para ayudarte.

> El panel también te avisa antes de guardar si un campo es demasiado largo o tiene un formato incorrecto.

¿Te equivocaste? Ningún cambio se pierde: el equipo técnico puede volver a cualquier versión anterior.

---

## 6. Despublicar una actividad sin borrarla

1. Abre la actividad.
2. Desmarca **«Publicado»**.
3. Guarda.

La actividad desaparece del sitio pero queda guardada en el panel como borrador. Para volver a mostrarla, marca
«Publicado» otra vez.

Para ocultar el aviso de la barra superior, desmarca **«Mostrar aviso»** en Página de inicio.

---

## 7. Si algo falla

| Problema | Qué hacer |
| --- | --- |
| No puedo entrar al panel | Verifica que entras con tu cuenta de GitHub y que tienes la verificación en dos pasos. Si persiste, contacta al equipo técnico. |
| Guardé hace más de 10 minutos y el sitio no cambió | Probablemente un dato no pasó la revisión. Contacta al equipo técnico indicando qué editaste. |
| Subí una foto equivocada | Reemplázala en la misma entrada y guarda. |
| Veo un error en un texto doctrinal | Avisa al equipo técnico; ese contenido se corrige con aprobación del Consistorio. |
| El formulario de contacto no llega | Avisa al equipo técnico. |

**Contacto del equipo técnico:** *por definir* (nombre, correo y teléfono).
