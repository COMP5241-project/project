# Desarrollo de software en la era de la IA

> Destilado de la presentación del curso (83 diapositivas). Cómo la IA está transformando el desarrollo de software: *vibe coding*, *agentic coding*, evidencia de productividad, riesgos y las habilidades que importan hoy.

---

## 1. El auge de la codificación asistida por IA

- La Developer Survey 2025 de Stack Overflow describe el panorama actual de la IA en el desarrollo.
- Jensen Huang (CEO de NVIDIA) cree que la IA permitirá que cualquiera se convierta en "programador" mediante interacción natural.
- Casos reales: alguien sin saber programar construyó un software con frontend, backend y base de datos en 12 días; el CEO de Microsoft dice que la IA escribe hasta un 30% de su código (en algunos proyectos, todo); el CEO de Anthropic predijo que en un año todo el código sería generado por IA.
- **Dónde se usa la IA en el SDLC:**
  - **Descubrir** — comprender y navegar rápidamente bases de código nuevas o desconocidas.
  - **Diseñar** — cómplice de pensamiento para planificación y arquitectura: varias opciones de implementación, estrategias de refactorización, planes de corrección; escribir especificaciones.
  - **Construir** — implementar código, escribir y ejecutar pruebas unitarias, redactar commits y mensajes de PR.
  - **Desplegar** — automatizar CI/CD, configurar entornos, gestionar despliegues.
  - **Soportar y escalar** — diagnosticar errores, analizar registros, sugerir correcciones más rápido que el depurado manual; refactorización a gran escala.
- **Paisaje de herramientas**: de consumo (Replit, v0, Lovable, bolt…) y de desarrolladores (GitHub Copilot, Cursor, Windsurf, Claude Code, Antigravity, Trae, Opencode), más herramientas de diseño (Figma, Google Stitch).

## 2. *Vibe coding*

- Acuñado por **Andrej Karpathy**: "entregarse por completo a la corriente… y olvidar que el código existe". Los errores se arreglan pegando el mensaje de error de vuelta, y suele funcionar.
- El practicante dirige por **resultado**, no revisando cada línea manualmente.
- Ya llega a empresas: p. ej., un director de ventas y operaciones sin formación de ingeniería en iCHEF (tecnología para restaurantes, Taiwán) construyó varias mini-herramientas internas con Gemini.
- El *agentic coding* reduce el prototipado de semanas a minutos/horas.

## 3. De LLM a agentes autónomos

Tres niveles de autonomía:

| Nivel | Descripción |
|---|---|
| 1. Reactivo | Puramente reactivo; necesita instrucciones paso a paso de un humano; solo genera respuestas, no completa tareas por ti |
| 2. Colaborativo | Trabaja junto a un humano; maneja prompts complejos, sugiere ideas, automatiza partes del flujo, pero depende de dirección, feedback y aprobación humana |
| 3. Autónomo | Alta autonomía: recibe un objetivo de alto nivel, decide los pasos, usa otros software/herramientas y completa la tarea sin intervención humana continua |

**Escalera de autonomía (de autocompletado a autonomía):**

1. Autocompletado — predicción de tokens en el editor
2. Sugerencias en línea — funciones completas a partir de una firma
3. Generación por chat — describes la función y recibes código funcional
4. Agentes de codificación — ediciones multi-archivo, uso de herramientas, pruebas, bucles de autocorrección
5. Agentes autónomos — clonan repositorios, planifican en sandbox, ejecutan pruebas, envían PRs

## 4. Cómo funcionan los agentes de codificación

- Tres fases: **reunir contexto → actuar → verificar resultados**.
- Familias de herramientas: operaciones de archivo (leer/editar/crear/renombrar), búsqueda (por patrón, regex, explorar la base de código), ejecución (shell, servidores, pruebas, git), web (búsqueda, documentación, mensajes de error).
- Ejemplo: "arregla las pruebas que fallen" → 1. ejecutar la suite para ver qué falla → 2. leer la salida de error → 3. buscar los archivos fuente relevantes → 4. leerlos para entender el código → 5. editarlos → 6. re-ejecutar las pruebas para verificar.
- **Ventana de contexto**: contiene todo lo que el agente sabe de la sesión (instrucciones, archivos leídos, sus propias respuestas). **Subagentes** trabajan en ventanas de contexto separadas para que las lecturas grandes no ocupen la principal; solo regresa el resumen y un pequeño metadatos.

## 5. Ingeniería del arnés (*harness engineering*)

- Caso de OpenAI: **3 ingenieros, 5 meses, ~1 millón de líneas de código, 0 líneas escritas a mano** — lógica de aplicación, pruebas, config de CI, documentación y herramientas, todo escrito por Codex (el agente de codificación de OpenAI). "Humanos dirigen. Agentes ejecutan."
- "El trabajo principal del equipo de ingeniería ya no es escribir código, sino diseñar el entorno, especificar la intención y construir bucles de feedback que permitan a los agentes Codex trabajar de forma confiable."

| Concepto | Gobierna |
|---|---|
| **Ingeniería de prompts** | Lo que dices: redacción, estructura, prompts system/user, ejemplos few-shot |
| **Ingeniería de contexto** | Lo que ve el modelo: información rica y estructurada sobre tu base de código, arquitectura, convenciones e intención |
| **Ingeniería del arnés** | Cómo opera el sistema completo: herramientas, guardarraíles, bucles de feedback, observabilidad, versionado, recuperación de errores |

> **Agente = Modelo + Arnés.**

## 6. Modos de fallo conocidos del código generado por IA

- **El problema del botón morado**: Tailwind usó `bg-indigo-500` como color de ejemplo para botones; por su alta frecuencia en tutoriales y código abierto, la IA asocia estadísticamente "botón" o "UI moderna" con ese morado — las interfaces generadas por IA salen moradas por defecto.
- **Incidentes de seguridad en apps *vibe-coded*:**
  - Un SaaS construido con IA y "cero código escrito a mano" fue atacado: usuarios podían evadir suscripciones, agotar sus API keys y corruptar la base de datos.
  - Tea (app de citas solo para mujeres): su backend quedó completamente desprotegido → **más de 72,000 imágenes privadas y 13,000+ documentos de identidad gubernamentales filtrados**. Los críticos culparon al uso de *vibe coding*: código generado por IA sin revisión que dejó Firebase abierto sin autenticación.
- Huecos de seguridad típicos del código generado por IA: sin rate limiting en intentos de login, API keys inseguras, funciones admin protegidas solo por rutas de frontend, manipulación de BD desde el frontend.
- **El problema del 70% / la última milla**: los no ingenieros llegan al 70% sorprendentemente rápido; el 30% final es una racha de rendimientos decrecientes. El 70% es trabajo *patrón* (caminos establecidos, frameworks comunes); el 30% final exige **seria experiencia humana**: casos límite, refinamiento de arquitectura, mantenibilidad.
- La IA aumenta la **producción** de código pero también la **retrabajo**; GitClear halló que bloques duplicados de 5+ líneas aparecían ~8 veces más en 2024 que en 2022. Las sugerencias de IA tienden a *agregar* código, no a mover, actualizar o eliminar el existente.

## 7. Evidencia de productividad

- **Lo más difícil de la ingeniería de software es entender qué hay que construir** — "el 80% de mi trabajo es llenar los enormes vacíos entre las especificaciones y la realidad; las specs rara vez consideran el legado y los caminos no felices".
- **Estudio de Stanford (~100,000 desarrolladores, 27 empresas, 136 equipos):**
  - **Greenfield** (nuevas bases de código, baja complejidad): la IA aumenta la productividad **~30–40%**.
  - **Brownfield** (bases existentes y maduras, alta complejidad): ganancias muy limitadas, **0–10%**.
  - A mayor tamaño de base de código, la efectividad de la IA cae bruscamente: límites de ventana de contexto, problemas de "señal-ruido", lógica de dominio. Incluso modelos SOTA pierden rendimiento con contextos largos (p. ej., de 90% a 50% en 32k tokens).
- **Brownfield es "remodelar la cocina de una casa donde todavía viven personas"**: no puedes cortar el agua ni la electricidad; derribar muros o cambiar tuberías exige precisión extrema.
- **Programar en el mundo real es desordenado**: la IA brilla en matemática y algoritmos abstractos (GPT-5 sacó puntaje perfecto en la final mundial del ICPC, resolviendo los 12 problemas), pero el mundo real implica traducir requisitos de negocio vagos, gestionar expectativas, entender sistemas legacy y lidiar con factores humanos impredecibles. Desafíos de la IA con código de producción real: ventanas de contexto limitadas (100k–200k tokens, una fracción de una base mediana); interdependencias complejas (BDs, APIs, microservicios, scripts, conocimiento esparcido entre equipos); dificultad con reglas de negocio, casos límite y excepciones humanas; incapacidad de coordinar con humanos para requisitos ambiguos; estados ocultos y complejidad de infraestructura (cachés, colas, sesiones, config dispersa) — puede sugerir refactorizar sin entender dependencias críticas. **La IA falla en escenarios reales desordenados que exigen conocimiento contextual profundo**; los desarrolladores siguen siendo necesarios para dar contexto, dirección y control de calidad.

## 8. Impacto laboral y de carrera

- Anthropic advierte que la IA podría eliminar el **50% de los empleos de entrada de cuello blanco en 1–5 años**; Salesforce anunció que dejará de contratar ingenieros de software (2025).
- **Crisis del desarrollador junior**: la IA automatiza el camino de aprendizaje — las tareas que mejor maneja (boilerplate, bugs simples, generación de pruebas) son exactamente el campo de entrenamiento de los juniors. Hacerles saltar el "sufrimiento" elimina la oportunidad de aprender desde primeros principios. Si dejamos de contratar o formar juniors, llegará una crisis donde nadie entenderá los sistemas a fondo para depurarlos cuando la IA falle.
- Caso del practicante: antes de la IA, delegar una tarea a un practicante exigía que el manager pensara el problema, escribiera requisitos, contexto y specs técnicas, hiciera handoff y luego check-ins, aclaraciones y reviews. Con IA, una vez pensados los requisitos y el diseño, se puede pasar todo directo a la IA para implementación, pruebas e iteración, a menudo más rápido que el ciclo completo de delegación. Mientras la "ejecución" la hace cada vez más la IA, **la habilidad valiosa del practicante deja de ser ejecutar tareas bien especificadas y pasa a ser aprender a definir, acotar y razonar sobre los problemas**.
- La IA hace de la codificación una **habilidad básica**: antes, escribir código era la principal fuente de valor del programador (Java, Python, React, APIs, depuración, features). Hoy la IA convierte requisitos claros en código funcional con gran eficacia (interfaces, bugs, pruebas, refactors). **No saber programar no va a servir, pero solo saber programar tampoco va a ser suficiente.**

### Nuevos roles y bloques de construcción

- **AI Engineer** (construye aplicaciones que usan modelos de IA vía APIs) vs **ML Engineer** (construye las APIs de IA). Requisitos: fundamentos sólidos de ingeniería de software, capacidad de construir aplicaciones confiables y escalables, conocimiento de herramientas y frameworks de IA modernos, foco en UX y aplicaciones prácticas.
- Bloques de construcción de apps GenAI más allá de llamar la API de un LLM: técnicas de prompting, frameworks agénticos, **evals, guardarraíles, RAG, voice stack, programación asíncrona, extracción de datos, embeddings/vector DBs, fine-tuning, uso de graph DB con LLMs, agentes de navegador/computadora, MCP, modelos de razonamiento**…
- **Empleo tech 2023 vs 2026**: 2023 = aprender HTML/CSS → proyectos demo → postular. 2026 = diseño de sistemas + infraestructura cloud + DevOps + redes + optimización de rendimiento + comunicación + APIs LLM + agentes de IA + ingeniería de prompt/contexto… + construir proyectos reales y destacar entre miles de postulantes.
- **Zara Zhang** (humanidades, constructora no técnica): con Claude Code y otros agentes, shippeó productos reales de punta a punta; acumuló **30k+ estrellas de GitHub** (5+ proyectos con 1,000+). Argumenta que la codificación pasa de *profesión* a *habilidad general* como la escritura; que en la era de la IA **hacer la pregunta correcta puede importar más que escribir el código perfecto**; y que se necesitan humanistas: para detectar necesidades, dolores y oportunidades reales de usuarios; sacar ideas de frustraciones, conversaciones y feedback; entender no solo tecnología sino a las personas (sus luchas, escenarios, jobs-to-be-done); y tener juicio, estética y saber distinguir "bueno" de "mejor".

## 9. El nuevo valor humano: de hacer a definir

- **HBR**: "La IA hace fácil construir. Elegir qué construir es más difícil." La IA ejecuta bien, pero no idear. Cuando la IA asume más del "cómo", los humanos somos más responsables del "**qué**" y del "**por qué**". Definir el problema lo suficiente para construir algo rough, y usar ese prototipo para afinar el problema. Evaluar prototipos por las preguntas que plantean, no por cómo de terminados se ven.
- **Mentalidad de producto**: pensar y actuar en términos de resultados de usuario y negocio a lo largo de toda la vida del producto, no solo en completar tareas o features.
- **Mentalidad de producto en el desarrollo**: entender activamente motivaciones, dolores y flujos de los usuarios (no solo leer un doc de requisitos); ver cómo un cambio afecta a todo el producto y ecosistema (rendimiento, UX, mantenibilidad); preguntar "¿qué problema estamos resolviendo?" y "¿es la mejor solución?" antes de implementar; entender cómo el producto gana dinero, qué es el éxito y cómo tus decisiones afectan costo, ingresos y competitividad; explicar trade-offs y restricciones técnicas en lenguaje simple a PMs, diseñadores y stakeholders; cuestionar requisitos poco claros y proponer alternativas.
- **Caso FireCut** (plugin de edición de video con IA para Adobe Premiere Pro y DaVinci Resolve):
  - Suhail recopiló más de 50 problemas que encontró o escuchó. **Cuatro preguntas para filtrar ideas**: *¿El problema es lo suficientemente doloroso? ¿Pueden los usuarios pagar por una solución? ¿Puedo llegar fácilmente a esos usuarios? ¿El mercado está creciendo?*
  - **Usa tu ventaja asimétrica**: puede ser experiencia de industria, idioma, red, reputación o acceso a un grupo de clientes. La ventaja de Suhail no era solo codificar: tenía acceso al equipo de edición de video de su excompañero de Cambridge, Ali Abdaal (YouTuber), potenciales beta users, experiencia de negocio y un canal de distribución entre creadores. Podía entrevistar a editores reales, observar su flujo de trabajo y testear FireCut rápido. Esa investigación llevó a un plugin de Premiere Pro (no una web app aparte): los editores ya trabajaban dentro de Premiere y no querían subidas enormes. **No diseñes desde suposiciones; observa cómo la gente ya trabaja.**
  - **Construye el prototipo más pequeño posible**: la primera versión hacía una sola cosa — detectar y eliminar pausas automáticamente. Un prototipo rough en ~2 días con Python, JavaScript y GPT-4; código sucio pero suficiente para probar el concepto (~200 personas se registraron, ~20 testearon el beta). Iteró casi a diario por seis semanas en lugar de adivinar en privado durante meses. Los usuarios le revelaron qué features importaban, qué era confuso, qué fallaba y por qué algunos se iban. Al principio Suhail hizo producto, investigación, marketing, ventas, soporte y operaciones él solo; solo tras ~$30,000 de ingresos mensuales contrató ingenieros profesionales.
- **Construir se vuelve fácil; la atención no**: las herramientas de IA aceleran el desarrollo, pero no crean más atención ni confianza humana. Como más gente puede shippear productos, la competencia sube y destacar se vuelve más difícil.
- **Analogía del menú de restaurante**: la IA puede diseñar un menú que se vea pulido casi al instante. Pero: ¿es el menú correcto para estos clientes? ¿Les gustará la comida? ¿El diseño combina con la marca? **No hay prueba de paso/fallo para eso.** La dificultad real se desplazó a qué cuenta como "correcto", algo que una máquina no puede decidir sola. *Un menú puede verse increíble y seguir siendo el menú equivocado. No hay test para eso.* La IA abarata la ejecución; la dirección y el juicio siguen viniendo de una persona.
- **El gusto (*taste*)**: "Un agente puede decirte si algo *se ve correcto*, si cumple una spec. No significa que pueda decirte qué es *bueno*. Bueno puede significar bueno en UX, que sea deleitable, que una persona quiera volver. Es lo suficientemente matizado que tomará tiempo a los modelos. Aun si en un año o dos los modelos alcanzan, seguimos necesitando ingenieros que respondan por estos sistemas. Eso no pasa de la noche a la mañana: pasa cuando entiendes un sistema, la gente te confía cosas y tienes ese expertise."

### El nuevo cuello de botella: capacidad de revisión

- Generar código es fácil; **la verificación es lo que diferencia**.
- Escribir buenas pruebas (unit/integration/e2e); leer código críticamente; depurar sistemáticamente.
- **El auge del arquitecto**: el rol del desarrollador evoluciona. Ya no eres juzgado por líneas de código escritas, sino por: **la claridad de tus especificaciones** y **el rigor de tu verificación**.

### De *vibe coding* a *agentic engineering*

El diferenciador clave: **cuánta estructura, verificación y juicio humano rodea la salida de la IA.**

| Dimensión | *Vibe coding* | Codificación asistida estructurada | *Agentic engineering* |
|---|---|---|---|
| Especificación de intención | Prompts casuales en lenguaje natural | Prompts detallados con ejemplos y constraints | Specs formales, docs de arquitectura, memory files |
| Verificación | "¿Parece que funciona?" | Pruebas manuales, spot-checks | Suites automatizadas, puertas CI/CD, jueces LLM |
| Comprensión del código | Mínima; quizá no lea el código generado | Revisión selectiva de caminos críticos | Revisión completa de arquitectura; la IA maneja detalles |
| Manejo de errores | Pegar el error de vuelta a la IA | El dev diagnostica la causa, la IA implementa el fix | Los agentes se auto-diagnostican dentro de límites; humanos en arquitectura |
| Alcance apropiado | Prototipos, scripts, proyectos personales, hackathons | Features dentro de bases establecidas | Sistemas de producción, desarrollo a escala de equipo |
| Perfil de riesgo | Alto; aceptable para código desechable | Moderado; juicio humano en checkpoints clave | Bajo; verificación sistemática en cada etapa |

## 10. Habilidades esenciales en la era de la IA

1. **Saber qué construir y por qué importa** — ¿qué meta sirve este requisito? ¿Es realmente importante? ¿Cuáles son los problemas reales de los usuarios? ¿Qué features valen la pena y por qué?
2. **De implementador a orquestador** — ya no eres solo quien escribe código. El rol humano principal es **orquestar agentes de IA** que escriben código, evaluar su salida, dar dirección estratégica y asegurar que el sistema resuelva los problemas correctos para los stakeholders correctos.
3. **Diseño y descomposición** — ¿cómo debería diseñarse el sistema? ¿Hay una solución más simple? ¿Cómo se descompone el trabajo? ¿Qué partes puede manejar la IA y cuáles requieren mi juicio?
4. **Juzgar si la salida de la IA es utilizable** — code review: ¿por qué el código está escrito así? ¿Es correcto, flexible y mantenible? ¿Los cambios afectarán el funcionamiento del código base existente? ¿Hay un diseño alternativo y mejor según el contexto de negocio? ¿El cambio hará caer el sistema bajo tráfico extremo? ¿Cómo lo pruebo ante fallos catastróficos?
5. **Detectar problemas ocultos**: casos límite sin manejar, fugas de permisos, cuellos de botella de rendimiento, vulnerabilidades ocultas, problemas y deuda técnica, antes de que lleguen a producción.
6. **Desarrollar y mantener aplicaciones de nivel de producción y grandes bases de código** capaces de ser usadas por miles (o más) de usuarios reales. Entender qué pasa después de que el código se shippea: confiabilidad, seguridad, estabilidad, incidentes, costo de mantenimiento a largo plazo.
7. **Habilidades de producto y de stakeholder** — interactuar con stakeholders para identificar sus dolores, recoger feedback sobre prototipos y mejorar iterativamente; construir un sistema que sea realmente útil y que los stakeholders quieran usar, pagar y recomendar. **Las "habilidades de stakeholder" son hoy habilidades centrales de ingeniería**: hablar con stakeholders para entender sus problemas reales; el ingeniero que entiende profundamente a los usuarios y lo traduce en instrucciones precisas para agentes vale mucho más.

> Aunque la IA automatice (parte de / la mayor parte de) las tareas de codificación, construir un buen producto de software que sea realmente útil, desplegado en producción, robusto, escalable y usado de forma fiable por muchos usuarios **no es trivial**.

### Mantenerse competitivo en la era de la IA

- Producir un prototipo "mediocre" es mucho más fácil ahora con IA — **ser mediocre ya no es suficiente**.
- **GitHub como nuevo currículum**: los estudiantes deberían usar IA para construir herramientas, escribir código u organizar conocimiento, y publicar esos proyectos en GitHub o YouTube. Si un proyecto de un estudiante llega a 3,000 estrellas y lo usan cientos de personas, los empleadores lo contratarán por impacto real, saltando el requisito de experiencia de entrada.
- Mejorar habilidades de comunicación y presentación; desarrollar **gusto y juicio**.

### Usar la IA con mentalidad de aprendizaje

- Cuando te dé una respuesta, **interrogarla y preguntarle por qué**.
- Completar tareas tú mismo / construir cosas desde cero (sin IA) para aprender lo básico.
- Entender los fundamentos sigue importando en la era de la IA: codificación, ingeniería de software, arquitectura, diseño de sistemas.
- "La IA puede generarte ese sistema de autenticación. Pero primero intenta construirlo tú. Escribirás peor código, pero entenderás cada línea. Ese conocimiento se capitaliza."
