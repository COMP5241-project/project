# Prácticas de Desarrollo de Software Asistido por IA

> Destilado de la presentación del curso (44 diapositivas). Flujos prácticos para trabajar con agentes de codificación: ingeniería de contexto, archivos AGENTS.md, desarrollo guiado por especificaciones, *agent skills* y evidencia sobre productividad con IA.

---

## 1. Monorepo vs polyrepo

- **Monorepo**: un solo repositorio Git con el código de múltiples proyectos relacionados (p. ej., `apps/` frontend + backend-api, `services/` microservicios de productos/pedidos/pagos/auth, `packages/` shared-ui + utils, con workspaces en la raíz).
- **Polyrepo (multirepo)**: cada proyecto o servicio vive en su propio repositorio separado.
- Pregunta abierta: ¿cuál enfoque es mejor para codificación asistida por IA?

## 2. Ingeniería de contexto

### ¿Qué ocupa la ventana de contexto de un agente de codificación?

Historia de la conversación · setup del sistema y del agente (prompt de rol, reglas de seguridad, perfil del proyecto) · código y docs (archivos fuente relevantes, README, archivos de guía como `CLAUDE.md`, rules) · instrucciones de la tarea actual y constraints · descripciones de herramientas (schemas de tools/MCP servers/plugins) · salidas de herramientas (JSON, errores, logs) · salida en streaming.

### Anclar el modelo al contexto correcto

- Proveer el contexto correcto (archivos relevantes, contratos, ejemplos) para que el modelo no adivine: metas de alto nivel, ejemplos de buenos patrones, la última versión de una API/librería, SDKs internos, etc.
- **No volcar repositorios enteros** a la ventana de prompt; excluir contexto irrelevante ahorra costos y mejora la precisión de la IA.
- Resumir la librería/doc con ejemplos; prompts más específicos: "Create a streamlit app. Use `st.login()` for authentication".

> **Ingeniería de contexto** = curar cuidadosamente lo que el LLM ve en una sesión de agente de codificación para mejorar calidad, confiabilidad y alineación con las convenciones del proyecto. **Poco contexto** reduce la efectividad; **demasiado** es ruidoso, costoso y puede empeorar el comportamiento.

## 3. Archivos de instrucciones del agente

Un archivo Markdown especial del repositorio que los agentes de codificación **leen automáticamente cada vez**, usando el contexto provisto para generar mejores sugerencias más relevantes. Hace que la IA entienda las metas, el tech stack y las convenciones del proyecto; produzca código que coincida con su estilo y requisitos; y sea menos propensa a errores (usar el framework o librería equivocada, reescribir código que ya existe en el repo).

| Tool | Reglas |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/*.mdc` o `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| Común | `AGENTS.md` en la raíz del repositorio |

### Qué debe contener un archivo de instrucciones

- **Resumen del proyecto**: qué hace, propósito, audiencia principal, features clave.
- **Tech stack**: tecnologías backend y frontend; frameworks, librerías, bases de datos, APIs y herramientas de pruebas; notas breves sobre cómo se usa cada una.
- **Pautas de codificación**: estándares clave; estilo (tabs vs espacios), pruebas requeridas, diseño de API, prácticas de seguridad; reglas específicas por archivo/carpeta.
- **Estructura del proyecto**: carpetas principales y sus propósitos; explicación de subcarpetas (frontend, backend, tests, scripts, docs); ayudar a entender dónde está el código, las pruebas y los recursos.
- **Recursos y herramientas**: scripts o automatizaciones útiles (setup, testing, deployment); herramientas custom, factories o servicios usados en desarrollo; otros archivos (README, config, scripts) que ayudan a trabajar con eficiencia.

### Evidencia (paper: *Evaluating AGENTS.md*)

- Un AGENTS.md **autogenerado reduce la tasa de éxito ~3% y aumenta el costo de inferencia +20%** (los archivos generados por LLM son redundantes con la documentación existente).
- Un AGENTS.md **escrito por humanos solo mejora marginalmente el rendimiento (~4%)**; los agentes respetan las instrucciones, pero los requisitos innecesarios hacen las tareas más difíciles.
- **Qué incluir** — **QUÉ**: tech stack, estructura del proyecto y qué hace cada parte. Crítico para monorepos. **POR QUÉ**: el propósito del proyecto y sus componentes clave; ayuda al agente a entender la intención, no solo la estructura. **CÓMO**: cómo construir, probar y verificar cambios; incluir tooling no obvio (p. ej., `uv` en vez de `pip`, `bun` en vez de `npm`).
- **Qué NO incluir** — overviews detalladas del código o listados de directorios (no ayudan al agente a navegar más rápido; puede descubrir la estructura solo); instrucciones específicas a tareas que solo a veces aplican (como AGENTS.md va en cada sesión, instrucciones no universales diluyen el foco); **contenido autogenerado**: no dejar que el agente escriba su propio AGENTS.md — los datos muestran que hace más daño que bien.

## 4. Prácticas de modelo y flujo de trabajo

- **Elegir el modelo correcto**: no todos los LLMs de codificación son iguales; cada modelo tiene personalidad y fortalezas propias; usar modelos de razonamiento pesado (tipo Claude) para planificación/arquitectura y modelos de alta velocidad para implementación; si un modelo se atasca, cambiar a otro servicio para romper el punto ciego.
- **Plan mode**: crear un plan de implementación detallado **antes** de escribir cualquier código.
- **Trabajar en incrementos pequeños y probables**: prompts grandes y monolíticos llevan a inconsistencia, duplicación y un "desastre enredado"; romper el trabajo en tickets o hitos pequeños; implementar una función, verificarla con pruebas, iterar al siguiente paso; evitar un solo cambio que toque frontend + backend + base de datos a la vez; cuando algo se rompe, se puede probar capa por capa y localizar el problema más rápido. Ejemplo de flujo: 1. frontend con datos mock/falsos; 2. backend REST API validado con un cliente de prueba pequeño; 3. integrar frontend + backend; 4. agregar/integrar la base de datos; 5. refactorizar una vez que el camino end-to-end funcione. ("Hazme un Google Drive.")
- **Commitear a menudo y usar el control de versiones como red de seguridad**: commits frecuentes y pequeños actúan como "puntos de guardado" que permiten rollback rápido cuando el código generado por IA se sale de curso; commitear tras cada pequeña tarea o cambio automatizado exitoso, más de lo habitual en codificación manual; usar ramas/isoladas git worktrees como **sandbox** para experimentos de IA separados, permitiendo sesiones de IA concurrentes sin conflicto.
- **Refactorizar**: la codificación asistida por IA acumula deuda técnica; a medida que el código base crece, se vuelve sucio y difícil de mantener/fixear/agregar features; refactorizar de vez en cuando: dividir funciones largas en unidades pequeñas; dividir módulos grandes en módulos cohesivos; eliminar/fusionar funcionalidad duplicada (**la IA prefiere generar código nuevo en vez de usar el existente**); hacer el código más reutilizable y testeable.
- **"Charlar no es ingeniería"**: el *vibe coding* tradicional (charlar casualmente con la IA) carece de contexto y visión; genera un "castillo de naipes" que funciona inicialmente pero es difícil de mantener, depurar o escalar una vez que la ventana de contexto se cierra.

## 5. Enfoque spec-first y desarrollo guiado por especificaciones (SDD)

- **Error**: lanzarse directo a generar código con prompts vagos. Gastar tiempo iterando la **especificación** con la IA antes de escribir código: requisitos (casos límite y flujos de usuario), arquitectura (tech stack), modelos de datos (schema) y estrategia de pruebas.
- **SDD**: una nueva metodología donde especificaciones formales y detalladas son los "planos ejecutables" y la **fuente primaria de verdad** para agentes de IA autónomos. En SDD, el código se considera un "artefacto derivado" o "intermedio", mientras que la especificación es el producto real (fuente de verdad). Los developers definen el **qué** (requisitos) y el **por qué** (intención) en formato estructurado; la IA maneja el **cómo** (implementación).
- Herramientas como **GitHub Spec Kit** y **AWS Kiro** operacionalizan el SDD a través de un ciclo de vida estructurado que guía al agente.

### Componentes clave de la especificación

- **La Constitución** (`constitution.md`)
- **Spec funcional** (`spec.md`)
- **Plan técnico** (`plan.md`)
- **Archivos de contexto**: como `AGENTS.md` o `SKILL.md`, proveen instrucciones persistentes y "skills" al agente; funcionan como un "README" para agentes de IA.

### La Constitución

Documento de gobernanza que define principios innegociables: tech stack (p. ej., React/Tailwind CSS), siempre correr pruebas antes de commitear, usar TypeScript en modo strict, nunca commitear secrets, etc. Asegura que la IA siga los estándares del equipo en cada tarea.

### Ciclo de vida

1. **Fase 1: Specify (el "qué")** — el developer define user stories, criterios de aceptación, casos límite, requisitos de manejo de errores y métricas de éxito. Excluye la toma de decisiones técnicas para enfocarse puramente en resultados de usuario y valor de negocio.
2. **Fase 2: Plan (el "cómo")** — el agente consume la Spec y propone un Plan Técnico: decide arquitectura, modelos de datos y contratos de API **antes de escribir una línea de código**. El developer revisa el plan para asegurar que coincide con estándares de ingeniería y la Constitución del proyecto.
3. **Fase 3: Generación de tareas atómicas** — el Plan se rompe en tareas pequeñas y testeables. La IA no intenta construir toda la app de una vez; ejecuta **una tarea atómica a la vez**. Esto permite checkpoints donde el humano verifica el progreso contra la Spec.
4. **Fase 4: Implement (ejecución del agente)** — el agente implementa código tarea por tarea. Porque sigue un Plan y una Spec rígidos, el código es consistente. El rol del developer pasa de escribir sintaxis a **verificar la salida contra los criterios de aceptación** definidos en la Fase 1.

### La especificación es la fuente de verdad

- **Spec Drift**: si un agente de IA hace cambios de código sin chequear la spec, el código y la documentación divergen ("drift") de la spec.
- Cuando aparece un bug, se trata como un **requisito faltante**: la Spec se actualiza para ser más explícita y fixear el problema permanentemente. Esto preserva contexto para agentes futuros y previene regresiones que a menudo ocurren cuando humanos parchean código a mano.
- Al agregar features, no solo se parchea el código: se **actualiza la Spec** con la nueva lógica; la IA identifica el delta, actualiza el Plan (nuevos modelos de datos y servicios), genera nuevas Tareas e implementa los cambios de forma segura sin romper la lógica existente.

## 6. Agent Skills

- Los agentes de IA son cada vez más capaces, pero a menudo **carecen del contexto** que necesitan para hacer trabajo real de forma confiable. Las **skills** empaquetan conocimiento procedural y contexto específico del equipo en **carpetas portables y versionadas, cargadas bajo demanda**.
- **Expertise de dominio**: capturar conocimiento especializado (revisión legal, pipelines de datos, formato de presentaciones) como instrucciones reutilizables.
- **Workflows repetibles**: convertir tareas de múltiples pasos en procedimientos consistentes y auditables.
- **Reuso entre productos**: construir una skill una vez y usarla en cualquier agente compatible con skills.

### Crear presentaciones HTML (ejemplo de skill)

Pregunta: "Make me a pitch deck…". La skill (`frontend-slides/SKILL.md`) contiene: workflow para generar slide decks; referencias de estilo, CSS, plantillas HTML, patrones de motion; scripts para extraer, desplegar o exportar.

| Paso | Qué ocurre |
|---|---|
| 0 · Detect | La IA primero descubre qué tipo de trabajo pides: construir una presentación desde cero, convertir un PowerPoint existente, o mejorar HTML slides que ya tienes |
| 1 · Content | Hace un puñado de preguntas simples de una vez: para qué es el deck, cuánto debe durar, si tus palabras están listas, si la gente lo verá en vivo o lo leerá solo. Si compartes imágenes, las revisa y estructura el outline alrededor de lo usable |
| 2 · Style | En vez de pedirte que describas un look con palabras, construye **tres slides de apertura de muestra** para que elijas viendo. Eliges la dirección que te gusta o pides mezclar piezas de más de una preview |
| 3 · Generate | Ensambles la presentación completa en **un archivo HTML** — tu contenido más el diseño elegido — que abre en cualquier navegador sin install ni build step |
| 4 · PPT | Solo si empezaste desde PowerPoint: extrae texto e imágenes de los slides, verifica contigo que no faltó nada importante, y continúa con los mismos pasos de elegir estilo y construir |
| 5 · Deliver | Abre el archivo terminado, muestra cómo moverte entre slides, y activa **click-to-edit** de texto en el navegador para ajustar wording sin tocar código |
| 6 · Share | Paso final opcional: si quieres un link para compartir online o un PDF para adjuntar, puede publicar el deck o exportar una copia estática |

Scripts de referencia: `extract-pptx.py` (extrae texto, imágenes y notas de PowerPoint), `deploy.sh` (empaqueta y publica el deck a Vercel), `export-pdf.sh` (captura headless de cada slide a PDF).

### Estructura de Agent Skills

- **Una skill es un manual que enseña al agente a completar una tarea específica.** Una skill es una **carpeta que contiene un archivo SKILL.md** — metadata más instrucciones — y agrupa scripts, materiales de referencia, plantillas y otros recursos.

```
my-skill/
├── SKILL.md      # requerido: metadata + instrucciones
├── scripts/      # opcional: código ejecutable
├── references/   # opcional: documentación
├── assets/       # opcional: plantillas, recursos
└── ...           # cualquier archivo o carpeta adicional
```

- Ejemplo: una skill `website-ui-design` con reglas como "no usar gradientes azul-morado", "no usar iconos emoji — usar SVG", "nav bar superior con efecto frosted-glass", "hero con fondo de imagen y overlay semi-transparente", "H1 con fuente display especificada", "botones con color de acento de marca".
- **Rutas de skills según el agente**: `.cursor/skills/` (extensión solo Cursor), `.claude/skills/` (Claude Code), `.github/skills/` (GitHub Copilot), `.opencode/skills/` (OpenCode), `.agents/skills` (común a muchos agentes).

### Cuando SKILL.md crece demasiado

- Si hay muchos estilos de UI y siguen surgiendo: **sacar cada estilo a su propio archivo** (`minimalist.md`, `tech-style.md`, `fresh-style.md`). SKILL.md se vuelve un resumen con pointers; la IA lee SKILL.md primero y solo carga el archivo de referencia relevante para la tarea (p. ej., "Minimalist blog → read `references/minimalist.md`").
- **Scripts**: la IA puede invocar un script probado para hacer cálculos, transformar archivos, validar datos o interactuar con tools de forma predecible (p. ej., `python scripts/generate_image.py --style tech`).

### Progressive disclosure (revelación progresiva)

1. **Parte 1 — Metadata**: name y description de SKILL.md, siempre cargados al arranque.
2. **Parte 2 — Instructions**: reglas y workflows de SKILL.md, cargados vía revelación progresiva.
3. **Parte 3 — Carpetas opcionales**: `scripts/`, `references/`, `assets/` — cargadas bajo demanda.

Mecánica: el agente envía al LLM un **catálogo de nombres y descripciones** de skills; el cuerpo de instrucciones permanece en el archivo hasta que la IA lo solicite. Cuando pides "develop a beautiful blog website", el LLM coincide tu request con `website-ui-design`.

### Composable sobre monolítico

- **Debug aislado**: cuando una skill enfocada falla, sabes exactamente qué archivo y parámetros se rompieron; los prompts monolíticos contienen reglas en conflicto, haciendo el diagnóstico imposible.
- **Upgrades compuestos**: actualizar una sub-skill actualiza automáticamente cada workflow padre que la usa; los prompts monolíticos llevan a "duplicate rule rot".
- **Alta reutilización de código**: arquitectura plug-and-play; una vez que una herramienta técnica se construye y se guarda como skill, cualquier subagente o prompt puede dispararla al instante.
- Colecciones notables: skills de ingeniería de software de **Matt Pocock** (aihero.dev/skills) y de **Addy Osmani** (github.com/addyosmani/agent-skills), organizadas por etapas Define → Plan → Build → Verify → Review → Ship (p. ej., `interview-me`, `idea-refine`, `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `doubt-driven-development`, `frontend-ui-engineering`, `api-and-interface-design`, `browser-testing-with-devtools`, `debugging-and-error-recovery`, `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `observability-and-instrumentation`, `shipping-and-launch`).

## 7. Evidencia: estudio MERT (2025)

Ensayo controlado aleatorizado con developers experimentados en **246 tareas reales de codificación**:

- Mientras los developers **esperaban** que la IA los acelerara un **24%**, **tardaron un 19% más** al completar issues usando herramientas de IA.
- Los **tiempos de code review aumentaron 91%** en equipos con adopción pesada de IA.
- Los **tamaños de pull requests crecieron 154%**.
- "Mientras nos sentimos productivos apretando Tab y aceptando sugerencias, también estamos acumulando código que no entendemos del todo."

## 8. Skills críticas en la era de la IA

- **Entender la arquitectura del sistema y por qué el código funciona importa más que producirlo.**
- ¿Cómo aseguras que la IA no esté implementando features que rompan o cambien el comportamiento de features existentes? ¿Cómo aseguras que la arquitectura y el código generado sean escalables, flexibles y mantenibles?
- **Pedirle a la IA que explique el código generado**: "Explain this code line by line in plain language." / "What assumptions is this making? What could go wrong?" / "What are the edge cases and failure modes here?"
- **No subas/aceptes código que no puedas explicar.**
- Evaluación crítica a través del code review: revisar el código generado por IA específicamente para hallar flaws, problemas de seguridad y violaciones de arquitectura.
- **Practicar regularmente sin IA**: las tareas que la IA maneja (boilerplate, bugs simples, generación de pruebas) pueden ser ejercicios de aprendizaje en vez de atajos de producción.
