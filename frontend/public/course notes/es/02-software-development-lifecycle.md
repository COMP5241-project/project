# Ciclo de Vida del Desarrollo de Software (SDLC)

> Destilado de la presentación del curso (57 diapositivas). Requisitos, diseño, implementación, pruebas, despliegue y mantenimiento — incluyendo *verification* vs *validation*, estrategias de despliegue y un caso de estudio de fallo de despliegue.

---

## 1. ¿Qué es el SDLC?

Un proceso estructurado que describe las etapas del desarrollo de software. Desarrollado en los **años 1970** para gestionar sistemas empresariales a gran escala; sigue siendo relevante hoy.

Etapas: **análisis de requisitos → diseño del sistema → implementación → prueba unitaria → pruebas de integración → pruebas de sistema → pruebas de aceptación → despliegue → mantenimiento**.

## 2. Requisitos

### Funcionales vs no funcionales

- **Requisitos funcionales**: definen *qué* debe lograr el sistema (p. ej., "envía un correo de confirmación al crear una cuenta", "permite buscar contenido escribiendo en la barra de búsqueda", "revisar/cambiar/eliminar artículos del carrito antes del checkout", "login con credenciales o redes sociales", "enviar notificaciones", "permitir feedback o calificar productos").
- **Requisitos no funcionales**: definen *qué tan bien* opera el sistema (rendimiento, seguridad, disponibilidad, etc.).

### Recolectar requisitos funcionales

| Método | Propósito |
|---|---|
| Análisis de documentación | Revisar procesos y sistemas existentes para identificar requisitos |
| Observación | Ver a los usuarios en su entorno (flujos, dolores) |
| Entrevistas | Discusiones uno a uno con stakeholders |
| Encuestas y cuestionarios | Datos cuantitativos de una audiencia grande |
| Grupos focales | Perspectivas de un grupo diverso de stakeholders |
| Prototipado | Versiones tempranas para visualizar requisitos y recibir feedback |

La IA puede ayudar (p. ej., resumir reuniones de Zoom en requisitos) — pero **siempre verificar la salida de la IA por corrección, refinarla y confirmarla con el cliente**.

### Elicitación y gestión de requisitos

- **Elicitación**: identificar stakeholders → recolectar información (entrevistas, encuestas, talleres) → documentar.
- **Gestión**: priorización (cuáles son los más esenciales y van primero); gestión de cambios (cambios controlados para evitar *scope creep*); verificación y validación (el sistema cumple todos los requisitos y esos requisitos cumplen su propósito).

### Desafíos y soluciones

Desafíos: los stakeholders no logran comunicar necesidades claramente; prioridades y suposiciones en conflicto; las necesidades de negocio cambian con el tiempo.

- **Hacer mejores preguntas**: empezar por el problema, no por la solución ("¿Qué dolor estamos resolviendo? ¿Cuál es el valor de negocio?"); preguntas abiertas y enfocadas en el proceso ("¿Cómo lo hacen hoy? ¿Qué se rompe? ¿Qué información necesitan para decidir?"); cuestionar suposiciones ("¿Y si faltan datos? ¿Cuáles son las excepciones? ¿Quién decide?"); usar **5 Whys** para llegar a causas raíz, no síntomas.
- **Sintetizar, aclarar y resolver conflictos**: parafrasear y confirmar durante las sesiones ("Lo que oigo es… ¿es correcto?"); convertir declaraciones vagas en requisitos o reglas de negocio **probables y específicas**; usar la técnica **MoSCoW** (Must/Should/Could/Won't) para acordar lo esencial ahora vs después.

## 3. Prototipos y MVP

- **Wireframes**: estructuras gráficas de baja fidelidad de un sitio o app; mapean páginas, secciones e elementos interactivos. **Mockups**: representaciones estáticas pero más realistas del producto final (branding, colores, fuentes, iconografía); herramientas: InVision, Sketch, Figma, Adobe XD, Framer. **Prototipo de alta fidelidad**: el parecido más cercano al producto final; permite probar la reacción a los visuales y al flujo de usuario.
- **Tipos de prototipo**:
  - *Descartable*: construido rápido para recibir feedback y refinar requisitos; se descarta.
  - *Evolucionario*: se refina incrementalmente hasta la versión final.
  - *Incremental*: el producto final se divide en piezas, se desarrollan por separado y se integran al final.
- "No puedo decirte qué quiero, pero lo reconoceré cuando lo vea."

### MVP (Producto Mínimo Viable)

- La validación de mercado es crucial cuando construyes algo único e incierto: crear una versión del producto que permita al equipo **recolectar la máxima cantidad de aprendizaje validado sobre los clientes con el mínimo esfuerzo**.
- *Mínimo*: gastar el menor tiempo y esfuerzo posible. *Viable*: calidad suficiente para evaluar con precisión si los clientes usarán el producto.
- Probar la idea exponiendo una versión temprana a usuarios y clientes objetivo, recolectar datos clave y aprender de ellos. Reduce el riesgo de desarrollar un producto no económicamente viable. Una vez que el MVP está en el mercado, se recogen métricas clave de valor, se crea el siguiente MVP y así sucesivamente.

| Aspecto | Prototipo | MVP |
|---|---|---|
| Propósito | Probar y visualizar concepto, diseño y UX | Entregar funcionalidad central a usuarios |
| Funcionalidad | A menudo no funcional o limitada | Totalmente funcional con features centrales |
| Listo para mercado | No | Sí |
| Enfoque de feedback | Feedback inicial sobre diseño y factibilidad | Feedback real sobre valor y usabilidad |
| Etapa de desarrollo | Temprana, antes del desarrollo completo | Fase de lanzamiento temprano, primera versión usable |
| Objetivo | Validar ideas de diseño y factibilidad técnica | Validar la idea de negocio y atraer usuarios |

## 4. Diseño e implementación

- Los requisitos dicen **qué** debe hacer el sistema; el diseño describe **cómo** lo hace.
- **Entrevista de diseño de sistemas**: evaluación técnica donde el candidato debe diseñar un sistema escalable en una pizarra o lienzo virtual, demostrando su capacidad de razonar sobre requisitos, trade-offs e interacciones de componentes.
- **Ejemplo: chat app con GenAI** — Backend API en Python Flask (lógica de negocio, almacenamiento y recuperación de datos; recibe preguntas del frontend vía llamadas API, las envía al servicio de IA y devuelve respuestas) + frontend React (UI para escribir preguntas y ver respuestas; envía preguntas por solicitudes API y muestra respuestas) + servicio OpenAI Azure (la API GenAI responde con modelos de lenguaje avanzados) + base de datos (almacena interacciones pasadas).
- **Protección de API keys:**
  - En desarrollo: el archivo `.env` guarda claves secretas como variables de entorno locales; `.gitignore` excluye `.env` y otros archivos sensibles del control de versiones, evitando que se suban a repositorios públicos como GitHub. **Las claves secretas y datos sensibles NUNCA deben aparecer en el repositorio remoto.**
  - En producción: las API keys se guardan de forma segura en plataformas en línea (p. ej., la configuración de variables de entorno de Vercel) e inyectadas en la aplicación al desplegar; permanecen ocultas al público y al código frontend.

## 5. Etapas de prueba

- **Pruebas unitarias**: unidades individuales (procedimientos, funciones, métodos, clases) probadas **en aislamiento**; se verifica que cada componente implementa todas las decisiones de diseño de su especificación; es fácil identificar fallos en unidades individuales.
- **Pruebas de integración**: módulos individuales combinados y probados como grupo — aunque un módulo sea correcto y sin bugs, pueden surgir bugs al integrar dos o más módulos (p. ej., un módulo que llama malinterpreta la especificación de interfaz del llamado).
- **Pruebas de sistema**: verifica que el sistema implementa todos los requisitos especificados:
  - *Funcionalidad*: implementa todas las features requeridas.
  - *Robustez*: capacidad de recuperarse de condiciones de error.
  - *Interoperabilidad*: interactuar con sistemas de terceros.
  - *Rendimiento*: throughput, tiempo de respuesta, etc.
  - *Escalabilidad*: comportamiento con escala creciente (p. ej., número de usuarios).
  - *Confiabilidad*: seguir operando de forma fiable por períodos largos.
  - *Documentación*: la guía de usuario es precisa y usable.
- **Pull Request (PR)**: flujo de trabajo donde un desarrollador propone fusionar cambios de una rama en otra, permitiendo que el equipo discuta, revise y apruebe antes de la integración.
- **Prueba de confirmación**: ejecutar los casos de prueba que fallaron la última vez, para verificar el éxito de la acción de corrección.
- **Prueba de regresión**: *regresión* = mal funcionamiento de una función, atributo o feature que antes era correcto. Probar un programa ya probado después de una modificación (fix de bug, nueva feature). Se re-ejecutan los casos existentes para asegurar que no se introdujeron defectos en áreas no cambiadas. Opciones: re-ejecutar todos los casos (la automatización acelera), o seleccionar un subconjunto que alcance o esté relacionado con las sentencias/módulos modificados.
- **Automatización de pruebas**: usar software para controlar la ejecución de pruebas. Un caso de prueba unitaria consiste en código que verifica si otra parte de código (método) funciona como se espera. **JUnit** es un framework de pruebas unitarias para Java. **En Microsoft**: "literalmente corremos más de 60,000 pruebas unitarias en cada pull request" y "las corremos en menos de siete minutos".
- **Prueba de aceptación**: el cliente/usuario final valida el sistema para determinar si el desarrollador creó el sistema correcto según los criterios de aceptación (funcionalidad, rendimiento, seguridad, etc.):
  - **Prueba alfa**: se realiza en las instalaciones del desarrollador, con usuarios y presencia del desarrollador.
  - **Prueba beta**: se realiza en varios sitios de usuarios sin el desarrollador; imita más el uso real del sistema.

### Verificación vs validación

- **Verificación**: evaluar los productos del SDLC para comprobar si vas por el buen camino para crear el producto final (code review, pruebas unitarias, de integración y de sistema). Generalmente la hace el desarrollador, para asegurar que el software cumple los requisitos especificados y está implementado correctamente. **Construir el producto bien** (*build the product right*).
- **Validación**: evaluar el producto para comprobar si cumple las necesidades de usuario/negocio (prototipado, pruebas de aceptación, pruebas de usabilidad, pruebas en producción, A/B testing). **Construir el producto correcto** (*build the right product*).
- La validación genera **nuevos requisitos** para mejorar el software (bucle de feedback).

## 6. Despliegue y entornos

- El software se despliega al entorno del cliente o se libera a mercado/producción.
- **Diferencias dev vs producción**: versiones de OS y librerías distintas; los datos de producción pueden contener casos límite o volúmenes ausentes en dev; el entorno de producción puede tener controles de acceso o firewalls más estrictos; límites de recursos distintos; servicios externos en vivo que se comportan de forma distinta. (Ejemplo: "¿Por qué tu código funciona localmente pero falla para usuarios reales?")

## 7. Mantenimiento

- Modificación de un producto de software **después** del despliegue a producción: corregir bugs y problemas, liberar parches, mejorar producto y rendimiento, liberar nuevas versiones con mejoras.
- **Regla 60/60** (IEEE Software, mayo 2001): el mantenimiento promedia el **60% del costo del ciclo de vida** del software; ~60% del mantenimiento es para **agregar nuevas features** manteniendo el sistema en funcionamiento y sin romper nada. En proyectos *clean slate* (diseñados desde cero), el mantenimiento suele ser más difícil que el desarrollo.
- **ISO/IEC 14764:2006** (guías de mantenimiento):
  - **Correctivo**: corregir defectos encontrados.
  - **Adaptativo**: modificar el software para mantenerse compatible con un entorno cambiante.
  - **Perfectivo**: mejorar rendimiento o mantenibilidad.
  - **Preventivo**: abordar problemas potenciales antes de que se conviertan en problemas.

### Estudio de caso: fallo de despliegue

- **Despliegue inicial (1:00 AM)**: termina el despliegue de una nueva feature; todas las health checks inmediatas pasan; el sistema parece estable.
- **Deterioro sin detectar (3:00 AM)**: dos horas después, las nuevas queries empiezan a cascarse; los tiempos de respuesta se degradan severamente. Comienza el incidente, **sin alarmas**.
- **Descubrimiento (10:00 AM)**: durante siete horas la aplicación es efectivamente inutilizable y el equipo de operaciones no sabe nada. El sistema está caído, pero el incidente aún no "comenzó" para el equipo.
- **Investigación**: los logs de aplicación y BD muestran agotamiento de recursos en los servidores de la app y alta latencia; correlacionan estas métricas con el despliegue de 1:00 AM. **Causa raíz**: la nueva feature introdujo queries ineficientes sin indexación apropiada; esas queries bloquean recursos y causan la ralentización de todo el sistema.
- **Mitigación**: reescribir las queries problemáticas y agregar los índices necesarios (la velocidad depende de la complejidad del código y la habilidad de ingeniería). **Patch v1.1 / staging**: para prevenir regresiones, el parche se prueba en staging; los resultados confirman tiempos de respuesta mejorados sin errores.
- **Despliegue del fix a producción**: el equipo monitorea métricas en tiempo real para confirmar que la carga de BD baja y los tiempos de respuesta se recuperan. **Restauración del servicio a las 9:00 PM**: la aplicación se estabiliza, las quejas de clientes cesan. El incidente se cierra oficialmente **18 horas** después de que comenzó el deterioro.

| Métrica | Definición | En este caso |
|---|---|---|
| **TTD** (Time to Discover) | Tiempo entre el inicio del fallo (3:00 AM) y que el equipo se entere (10:00 AM) | 7 horas |
| **TTM** (Time to Mitigate) | Velocidad operativa del equipo: diagnosticar, arreglar y verificar una vez conocido el problema | ~8 horas (la complejidad de optimizar queries dominó esta ventana) |
| **TTR** (Time to Recover) | Duración total del impacto para el cliente | 18 horas (3:00 AM → 9:00 PM) |

## 8. Disponibilidad

- Proporción de tiempo que el sistema es funcional; medida como porcentaje de uptime. A menudo se describe en "9s" (p. ej., "cuatro 9s" = 99.99%).
- **Disponibilidad = Uptime / (Uptime + Downtime)** = MTTF / (MTTF + MTTR).

| % Uptime | Downtime por semana | Downtime por mes | Downtime por año |
|---|---|---|---|
| 99% | 1.68 h | 7.2 h | 3.65 días |
| 99.9% | 10 min | 43.2 min | 8.76 h |
| 99.95% | 5 min | 21.6 min | 4.38 h |
| 99.99% | 1 min | 4.32 min | 52.56 min |
| 99.999% | 6 s | 26 s | 5.26 min |

- Factores que afectan la disponibilidad: falla de hardware; inestabilidad de red; bugs de software; downtime por mantenimiento; ataques de seguridad (DDoS, malware); cortes de energía; sobrecarga de capacidad; errores de configuración; fallas de terceros; mala copia de seguridad/recuperación.

## 9. Estrategias de despliegue

| Estrategia | Cómo funciona | Consideraciones |
|---|---|---|
| **"Big Bang"** | La nueva versión se lanza de una vez, con downtime del servicio; si falla, se hace rollback a la versión anterior | Riesgosa para apps públicas o críticas; exige desarrollo y pruebas extensas antes; downtime sin rollback fácil |
| **Rolling upgrades** | La nueva versión reemplaza gradualmente a la vieja; ambas coexisten un tiempo | Permite rollback de componentes nuevos incompatibles con los viejos |
| **Blue-Green** | Dos entornos de producción idénticos en paralelo; Blue recibe todo el tráfico; la nueva versión se despliega en Green y se prueba; al aprobarse, el tráfico se enruta de Blue a Green | Si hay problemas tras poner Green en vivo, el tráfico vuelve a Blue |
| **Canary** | Solo una pequeña porción de instancias se actualiza; una fracción de usuarios se enruta a las instancias canary; sin errores, la nueva versión se despliega gradualmente al resto | Reduce el riesgo de introducir una nueva versión en producción |
| **Feature flags** | Controlar la visibilidad y activación de features **sin desplegar nuevo código** | Separa el release del rollout |

### Cómo Big Tech shippea código a producción

1. **Desarrollo y control de versiones**: durante la codificación, los developers usan Git para hacer commits regulares y rastrear cada cambio.
2. **CI/CD**: al hacer commit, un servidor de CI/CD (p. ej., CircleCI) toma el control: automatiza el build, corre pruebas unitarias y hace checks esenciales de calidad de código.
3. **Entornos de prueba**: antes de ir a producción, el código se mueve a entornos QA separados donde el equipo de QA realiza regresión y checks de rendimiento.
4. **Estrategias de rollout**: para asegurar un release fluido a producción, se usan estrategias y herramientas específicas: feature toggles, despliegues canary, A/B testing.
5. **Monitoreo y confiabilidad**: tras estar en vivo, los Site Reliability Engineers (SREs) usan herramientas de monitoreo como Prometheus y Datadog para vigilar de cerca el rendimiento del sistema y resolver problemas emergentes de inmediato.

## 10. Puntos clave

- La calidad de los requisitos decide todo lo posterior; usa técnicas de elicitation, MoSCoW y 5 Whys.
- Prototipo para validar el diseño; MVP para validar la idea de negocio.
- Verificación = construir el producto bien; validación = construir el producto correcto.
- Cuanto antes se encuentre un bug, más barato es arreglarlo; prueba por capas (unitarias → integración → sistema → aceptación).
- El despliegue es una práctica de gestión de riesgo: elige la estrategia según criticidad y necesidad de rollback.
- El mantenimiento domina el costo del ciclo de vida (regla 60/60): diseñar pensando en ello.
- La producción es otro entorno: espera datos, límites y dependencias distintos.
