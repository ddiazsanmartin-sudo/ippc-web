# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad en este sitio, te agradecemos que la reportes de forma privada a
**ip.pactodecristo@gmail.com** (la misma publicada en
[`/.well-known/security.txt`](public/.well-known/security.txt)).

No abras un *issue* público ni divulgues el problema hasta que lo hayamos corregido.

### Qué incluir

- URL o componente afectado (página, `/api/contacto`, panel `/admin`, cabeceras, etc.).
- Descripción del problema y su impacto potencial.
- Pasos para reproducirlo (o una prueba de concepto mínima).
- Si corresponde, tu propuesta de corrección.

### Plazos de respuesta

| Etapa | Plazo objetivo |
| --- | --- |
| Acuse de recibo | 3 días hábiles |
| Evaluación inicial y severidad | 10 días hábiles |
| Corrección de severidad alta o crítica | 30 días |
| Divulgación coordinada | Una vez corregido, de común acuerdo con quien reportó |

### Alcance

Dentro: el código de este repositorio y su despliegue en el dominio oficial (*por definir*).

Fuera: servicios de terceros (Cloudflare, GitHub, Resend, YouTube, OpenStreetMap) —repórtalos a cada proveedor—,
ataques de denegación de servicio, ingeniería social y pruebas que afecten a visitantes o al contenido publicado.

### Buena fe

No emprenderemos acciones contra quien investigue de buena fe, respete este alcance, no acceda a datos de terceros y nos
dé un plazo razonable para corregir antes de divulgar.

Detalle técnico de los controles implementados: [docs/SEGURIDAD.md](docs/SEGURIDAD.md).
