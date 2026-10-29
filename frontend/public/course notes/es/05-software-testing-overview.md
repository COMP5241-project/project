# Visión General de Pruebas de Software

> Destilado de la presentación del curso (60 diapositivas). Fundamentos de testing (happy path / edge / negative), testing estático vs dinámico, DRE, pirámide de pruebas, pruebas unit/integration/UI con Playwright, TDD y pruebas de usabilidad.

---

## 1. ¿Qué es probar software?

Una **investigación** realizada para proporcionar a los stakeholders información sobre la calidad del producto o servicio bajo prueba. Facetas de la calidad: satisfacer las necesidades del usuario, conformidad con los requisitos, disposición del cliente a pagar, ausencia de errores y fallas, satisfacción del cliente, aptitud de uso.

### Tres estilos básicos de prueba (ejemplo: app de documentos con LLM)

- **Happy path testing**: verifica que el software funcione correctamente cuando los usuarios siguen el flujo de trabajo previsto con entradas válidas y comportamiento esperado. *Ejemplo*: el usuario sube un `.pdf` soportado dentro de los límites de tamaño; la app lo parsea y lo envía al LLM con éxito.
- **Edge case testing**: se enfoca en entradas extremas pero a menudo válidas, en los límites del comportamiento normal. *Ejemplos*:
  - Subir un PDF exactamente en el máximo de tamaño de Supabase.
  - Subir un archivo con un nombre de archivo muy largo.
  - Enviar un documento que alcance el límite máximo de la ventana de contexto del LLM.
  - El usuario hace clic en "Summarize" varias veces rápidamente antes de que regrese la primera respuesta.
  - El usuario navega fuera a mitad de la subida y regresa a la misma página.
  - Errores de API relacionados: `200 OK` (éxito), `400 Bad Request` (filtro de contenido o request inválida), `429 Too Many Requests` (rate limit), `500 Internal Server Error` (error del lado del servidor).
- **Negative testing**: se enfoca en entradas inválidas y condiciones de error (todo lo que el sistema debería rechazar o manejar con gracia). *Ejemplos*:
  - Subir un tipo de archivo no soportado (`.exe`, `.mp4`, `.zip`).
  - Subir un PDF corrupto/roto que no se puede parsear.
  - Subir un archivo que exceda el límite de tamaño.
  - Excepciones al llamar APIs de LLM.
  - El usuario envía repetidamente requests de resumen al endpoint de la API en un período corto.

## 2. Origen de defectos, tipos de prueba, costo

- Numerosos estudios muestran que la causa principal de defectos de software es la **especificación y el diseño**.
- **Pruebas dinámicas**: detectar la presencia de defectos ejecutando el programa con un conjunto dado de casos de prueba.
- **Pruebas estáticas**: referirse a probar algo que **no está corriendo**; también las piezas no software pueden tener bugs y deberían probarse. P. ej., revisar el código y la documentación (especificación de requisitos, diseño, manual de usuario, plan de pruebas y casos de prueba) para localizar errores.
- **El costo de fixear bugs** crece a medida que se detectan más tarde: detectar el defecto **lo más temprano posible**.

### Requisitos verificables / testeables

> Un requisito es verificable si, y solo si, existe algún proceso finito y costo-eficiente con el cual una persona o máquina puede chequear que el producto de software cumple el requisito.

Los requisitos no verificables incluyen afirmaciones como "works well", "user friendly" y "shall usually happen".

**Ejemplo de NFR testeable**: ~~"El sistema debe ser fácil de usar por el personal médico y organizado de tal forma que se minimicen errores de usuario"~~ → "El personal médico **debe poder usar todas las funciones del sistema después de cuatro horas de entrenamiento**. Después de este entrenamiento, el **número promedio de errores** cometidos por usuarios experimentados **no debe exceder dos por hora de uso** del sistema."

### Defect Removal Efficiency (DRE)

Un buen proceso de pruebas debe: **aumentar** el número de defectos encontrados por el tester y **disminuir** el número de defectos encontrados por los clientes; detectar el defecto **lo más temprano posible**. La DRE mide la efectividad de un proceso o fase de pruebas.

- Estas actividades (requisitos, diseño, codificación, testing, operación) pueden **inyectar** defectos, mientras que las revisiones e inspecciones al final de la fase pueden **removerlos**. La fase de testing es principalmente para remover defectos; también hay chance de introducir defectos cuando los defectos encontrados se fixean incorrectamente.

**DRE = (número de defectos detectados y removidos) / (total de defectos)**

Normalmente se usa el **primer año después del release** para cuantificar el total de defectos. Por ejemplo, si 1000 defectos se detectaron durante el desarrollo y 100 se reportaron dentro del primer año del release, el total de defectos es 1100.

**Ejercicio**: ¿cuál equipo de testing es más efectivo?
- Sistema A: 30 defectos en testing / 70 encontrados por usuarios → DRE = 30/100 = 30%
- Sistema B: 20 en testing / 30 por usuarios → DRE = 20/50 = **40%** → **B es más efectivo**.

## 3. Testing manual vs automatizado

### Testing manual

Un tester humano ejecuta casos de prueba a mano, sin herramientas de automatización. Ejemplo (carrito): navegar a `http://localhost:8080/products` → seleccionar un producto a $19.99 → cambiar cantidad a 2 → "Add to Cart" → seleccionar otro producto a $9.99 (cantidad 1) → "Add to Cart" → "View Cart" → verificar visualmente "3 items" y total "$49.97" (2 × $19.99 + 1 × $9.99), nombres e imágenes correctos, botones clicables.

| Fortalezas | Debilidades |
|---|---|
| Testing de usabilidad: evaluar si la interfaz es intuitiva | Consumidor de tiempo |
| Validación visual: layouts, colores, fuentes, diseño responsive | Propenso a errores (los humanos se equivocan en cálculos) |
| Testing exploratorio: descubrir bugs inesperados probando casos límite | No repetible (distintos testers lo ejecutan de forma distinta) |
| Experiencia de usuario: evaluar el sentir y flujo general | |

### Testing automatizado

Involucra el uso de software para controlar la ejecución de pruebas. Los developers ágiles enfatizan la importancia de las pruebas automatizadas: con ciclos cortos, el testing de regresión manual es casi imposible. **Capas de automatización** (de rápido/barato a lento/caro): **Unit Test → Service-Layer testing → UI testing**.

Maneras de escribir pruebas automatizadas:
- **Hand-scripted tests**: codificación manual de programas de prueba ("scripts") que ejercitan el sistema.
- **Recorded test**: herramientas que monitorean tus interacciones (mayormente a nivel UI) con el SUT mientras lo pruebas a mano; los casos se guardan y se convierten en el script para reejecutar la prueba contra otra versión (o la misma).
- **Uso de GenAI** (p. ej., GitHub Copilot).

## 4. Pruebas unitarias

Una prueba basada en código que verifica la corrección de una pieza pequeña e aislada de funcionalidad (usualmente una función o método) para asegurar que funciona como se espera. Frameworks: **pytest** (Python), **JUnit** (Java), **Jest/Mocha** (JavaScript). Una **aserción** en una prueba unitaria es una declaración que chequea si una condición específica es verdadera; si la condición es falsa, la prueba falla, señalando que el código no se comporta como se esperaba.

**Ejemplo (carrito: 2 × $19.99 + 1 × $9.99 = $49.97)**:

```java
// JUnit Test
class ShoppingCartTest {
  @Test
  void addMultipleItemsToCart() {
    // Arrange
    ShoppingCart cart = new ShoppingCart();
    int expectedItemCount = 3;
    double expectedTotal = 49.97;
    // Act
    cart.addItem(2, 19.99);
    cart.addItem(1, 9.99);
    // Assert
    assertEquals(expectedItemCount, cart.getItemsCount(),
        "Cart should have 3 items after adding.");
    assertEquals(expectedTotal, cart.getTotalAmount(), 0.001,
        "Total amount should be 49.97");
  }
}
```

```python
# Pytest test case
def test_add_multiple_items_to_cart():
    # Arrange
    cart = ShoppingCart()
    expected_item_count = 3
    expected_total = 49.97
    # Act
    cart.add_item(2, 19.99)
    cart.add_item(1, 9.99)
    # Assert
    assert cart.get_items_count() == expected_item_count, \
        "Cart should have 3 items after adding."
    assert abs(cart.get_total_amount() - expected_total) < 0.001, \
        "Total amount should be 49.97"
```

### Arrange, Act, Assert (AAA)

- **Arrange**: configurar todo lo que la prueba necesita — inicializar objetos, configurar dependencias, preparar datos de entrada y definir las condiciones del entorno antes de que algo corra.
- **Act**: ejecutar el método, función o comportamiento específico que se está probando.
- **Assert**: verificar que la salida real coincida con el resultado esperado.

### Dependencias en testing unitario

Esperar IO y servicios externos mata la velocidad del testing. Las pruebas que dependen de servicios externos, bases de datos, redes o APIs de terceros exhiben **fallas intermitentes** cuando esos sistemas son lentos, no están disponibles o devuelven datos distintos.

> **Flaky test**: prueba de software que produce resultados inconsistentes (a veces pasa, a veces falla) sin cambios en el código o el entorno de prueba.

### Mock

Un **mock** es un objeto simulado que imita el comportamiento de dependencias reales en tu código; te permite **controlar valores de retorno y simular errores** sin tocar los sistemas externos reales.

## 5. Pruebas de integración (service layer)

Las pruebas de integración verifican que **múltiples componentes funcionen juntos correctamente**. P. ej., probar si los endpoints de la REST API, la lógica de negocio y la base de datos interactúan adecuadamente.

- **HTTP**: el protocolo con el que la web habla para enviar y recibir información de un lugar a otro.
- Una **REST API** deja que diferentes software hablen entre sí a través de internet usando métodos HTTP simples (GET, POST, PUT, DELETE).
- **Mocking en testing de integración**: la API ejecuta la lógica de negocio y escribe en la base de datos propia de la app; **el servicio de pago externo se mockea** porque la app no lo controla.

## 6. Pruebas de UI / end-to-end (Playwright)

Las pruebas de UI **generan eventos de interfaz** (teclados, clics de mouse) y observan los cambios resultantes en la interfaz. **E2E testing**: probar el flujo completo del usuario en un navegador real.

- **Playwright**: framework de automatización open source desarrollado por Microsoft para pruebas end-to-end en navegadores modernos; lanza instancias reales de navegador (Chromium, Firefox o WebKit).
- **Happy path**: el usuario envía el formulario de pago → la API valida y cobra a Stripe → al éxito: guardar y enviar correo.
  - **Semantic Locator**: encuentra elementos basados en cómo los percibe el usuario ("look for the boxes labeled 'Card Number', 'Expiry Date' y 'CVV'"; "find the button that says 'Pay' y click it").
  - La prueba aserta que un mensaje de éxito es visible y se genera un **Order ID**, probando que el backend procesó la transacción.
  - **Auto-waiting**: las aserciones `expect` reintentan automáticamente los chequeos hasta alcanzar el timeout.
- **Caminos unhappy/inválidos**:
  - *Formulario vacío*: asertar que aparecen errores de campos requeridos al hacer clic en "Pay" sin entrada.
  - *Tarjeta rechazada*: usar un número de tarjeta específico de "declined" y verificar que la UI maneje con gracia el error de la API sin crashing.
- **Layout mobile**: Playwright permite redimensionar la UI programáticamente; asegurar que el formulario de pago sea responsive y los botones no estén cortados en pantallas pequeñas.
- **Modos de Playwright**:
  - **Headed**: abrir el navegador durante el testing y permitir a los developers ver la prueba ejecutarse paso a paso para debugging.
  - **Headless**: las pruebas corren sin ventana de UI; perfecto para pipelines CI/CD rápidos.
- **Playwright y MCP**: MCP (Model Context Protocol) es un protocolo abierto diseñado para permitir la integración sin fricciones entre aplicaciones de LLM y fuentes de datos externas, tools o servicios; permite a un agente de IA **controlar un navegador usando lenguaje natural** sin escribir un nuevo script de Playwright para cada paso.
- **Ejercicio**: clonar `git clone https://github.com/HKPolyUSE/playwright_testing`, abrir en VSCode, configurar el MCP server `microsoft/playwright-mcp` (`npx @playwright/mcp@latest`), iniciar el servidor MCP.
- Ejemplo de test automatizado: función helper `doLogin(page, username, password)`: navegar a home (redirige a login) → verificar redirect → llenar username y password → click login → verificar redirect a la página de todos (`getByRole('textbox', { name: 'Username' })` etc.).

### Ventajas de las pruebas de UI

- La automatización siempre es viable.
- **End-to-end**: ejercitar todas las partes distintas de la aplicación — la interfaz, los servicios subyacentes, hasta la base de datos.
- A menudo se usan para **smoke tests** de alto nivel: pruebas super de alto nivel que verifican que, al menos a nivel básico, el sistema está arriba y funcionando; checar que las aplicaciones estén correctamente desplegadas, correctamente configuradas y que todas las piezas de la arquitectura estén conectadas y cableadas bien.

### Limitaciones de las pruebas de UI

- **Lentas**: órdenes de magnitud más lentas que las pruebas unitarias.
- **Fragilidad**: el test de UI puede ser frágil; se rompe con cambios menores en la UI (p. ej., cambiar el label de un botón de "Submit" a "Confirm" — o fixear un typo — romperá cualquier test hard-coded a buscar la cadena "Submit").
- Un fallo de E2E indica que algo anda mal, pero rara vez **dónde** anda mal.

### Ventajas generales del testing automatizado

- **Rápido**: las herramientas automatizadas ejecutan pruebas significativamente más rápido que usuarios humanos; bueno para load testing, testing masivo aleatorio, etc.
- **Confiabilidad**: las pruebas realizan exactamente las mismas operaciones cada vez, eliminando el error humano.
- **Repetibilidad**: puedes probar cómo reacciona el software bajo ejecución repetida de las mismas operaciones (testing de regresión).

## 7. La forma del testing: cono vs pirámide

- **Ice Cream Cone Testing**: un anti-patrón clásico; la mayoría del testing es manual y toda la automatización se enfoca en la UI en vez de en la lógica de código subyacente; la automatización simplemente imita procesos manuales lentos.
- **Test Pyramid**:
  - **Pruebas unitarias** (base): probar funciones, métodos o clases individuales en aislamiento de dependencias; baratas y rápidas (milisegundos); retroalimentación instantánea al developer.
  - **Pruebas de integración** (medio): verificar que componentes, servicios o módulos distintos funcionen juntos correctamente; prueban endpoints de API, operaciones de base de datos y comunicaciones de servicios.
  - **Pruebas de UI/E2E** (cima): verificar journeys completos del usuario a través de la UI de la aplicación.

## 8. Test-Driven Development (TDD)

- **Camino normal** de desarrollo de software: Develop code → write tests → run tests.
- **TDD**: Write failing automated test → run failing test → develop code to make the test pass → run test → repeat:
  1. Escribir una prueba (fallará).
  2. Escribir el código (código que funcione que pase la prueba).
  3. Refactorizar el código (hacerlo más mantenible).

### "Test first"

Realmente hacemos más que solo escribir una prueba: **pensar los requisitos o el diseño** antes de escribir el código funcional; tomar decisiones de diseño; diseñar la API (la interfaz para acceder a la funcionalidad que se está probando). Al escribir la prueba antes que el código que prueba, nos forzamos a pensar seriamente en cómo queremos que el código sea usado. **Pruebas unitarias bien escritas proporcionan una especificación funcional de tu código** y se convierten en una porción significativa de tu documentación técnica.

### Escribir solo suficiente código

- La prueba que falla señala un **hueco** entre lo que el código hace y lo que esperamos que haga.
- Escribir **solo suficiente código** para hacer pasar la prueba; la implementación puede no ser óptima.
- **Refactorizar**: dar un paso atrás, mirar el diseño y encontrar formas de hacerlo mejor; mejorar el diseño del código **sin alterar su comportamiento externo**.

### Ventajas de TDD

- Las pruebas se escriben antes que el código: un "contrato" para definir el comportamiento correcto.
- Permiten que las expectativas del comportamiento del código **guíen la implementación** (no se trata solo de testing).
- Las pruebas deberían ser automatizadas y servir como **requisitos y documentación**.
- Las pruebas automatizadas se corren con **cada check-in**.
- El equipo puede escribir código para entregar las features de una story sin preocuparse por hacer cambios no intencionados al sistema.
- **Restringe las modificaciones de código de la IA** a solo aquellas que pasan todos los casos de prueba existentes, evitando efectivamente cambios no deseados a funcionalidad ya correcta.

## 9. Testing de usabilidad

Prueba la facilidad con la cual las interfaces de usuario pueden ser usadas, probándolas en usuarios. **Cinco componentes**:

1. **Learnability** (aprendizaje): qué tan fácil es para el usuario completar tareas básicas la primera vez que se encuentra con el diseño.
2. **Efficiency** (eficiencia): qué tan rápido pueden los usuarios experimentados completar tareas.
3. **Memorability** (memorabilidad): cuando los usuarios regresan al diseño después de un período sin usarlo, ¿recuerdan lo suficiente para usarlo efectivamente la siguiente vez, o tienen que volver a aprender todo?
4. **Errors** (errores): cuántos errores cometen los usuarios, qué tan severos son y qué tan fácilmente pueden recuperarse.
5. **Satisfaction** (satisfacción): qué tanto le gusta al usuario usar el sistema.

### Cómo mejorar la usabilidad

- **Probar con usuarios representativos**: invitar a personas que se parezcan a los usuarios previstos (no solo al equipo de diseño); pedirles que intenten tareas realistas usando el diseño.
- **Observar lo que pasa**: ver dónde los usuarios se detienen, cometen errores, se confunden o se traban; anotar qué partes de la experiencia son difíciles; evitar depender solo de impresiones generales de los usuarios.
- **Mejorar primero los problemas más grandes**: usar lo observado para identificar los desafíos de usabilidad más importantes; actualizar el diseño para abordar esos desafíos y volver a probarlo.
- **Iterar a través de los cinco componentes**: considerar learnability, efficiency, memorability, errors y satisfaction.

### Guerrilla user testing

Un método de baja costo de user testing; el término "guerrilla" se refiere a su estilo "out in the wild" (en el mundo real).

### Cómo conducir pruebas de usabilidad

- Tener una computadora lista con el navegador abierto y en la página inicial del sitio.
- El facilitador puede instruir a los sujetos a realizar tareas comunes.
- Hacer preguntas sobre su proceso de pensamiento y decisiones mientras trabajan.
- Anotar comentarios y sugerencias para hacer la tarea más fácil.
- **Proceso**: dejar que los developers/diseñadores observen el proceso; **preguntas de salida**: darles unos minutos a los sujetos para hablar informalmente sobre su experiencia con el facilitador (qué les gustó/no gustó, sugerencias); **el reporte final** — hallazgos y recomendaciones de usabilidad: documentar findings sobre efectividad, eficiencia, tiempo en tareas, errores y satisfacción.

### Identificar sujetos de prueba

- Identificar sujetos posibles, reunir su información de contacto; establecer las semanas de testing, agendar ubicaciones; **los incentivos mejoran mucho la asistencia** (p. ej., almuerzo gratis o certificados de regalo).
- (Tabla de ejemplo: fecha, ubicación, hora, grupo objetivo, facilitador, anotador, sujetos — faculty/staff, alumni, estudiantes prospectivos, personas con discapacidad visual, estudiantes actuales.)
- **Usability labs**: desde un setup simple de una sola sala hasta un setup de sala de observación electrónica.

### Think-aloud

Pedir a los participantes que proporcionen un comentario continuo de su proceso de pensamiento **pensando en voz alta** mientras realizan las tareas; escuchar qué están haciendo, buscando, a qué reaccionan y qué encuentran difícil; animarlos a compartir reacciones y pensamientos; hacer que expresen su confusión, frustración y quizá incluso su deleite; usar prompts suaves como "¿En qué estás pensando ahora?" o "¿Tuviste alguna reacción a eso?".

### Diseño de pruebas de usabilidad

- **Independent Groups Design / Between-Subjects Design** (diseño entre sujetos): cada parte del sitio es probada por un conjunto único de usuarios para descubrir problemas de usabilidad; mitiga los "learning transfer effects" — los participantes potencialmente aprenden a usar el segundo y tercer interfaz más efectivamente basándose en haber usado el primero; puede **enmascarar problemas de usabilidad** asociados con tareas posteriores.
- **Within-Subjects Design** (diseño intra-sujetos): cada sujeto realiza el testing de los tres módulos; **counterbalancing**: el orden de las tareas se aleatoriza o balancea para limitar los efectos de transferencia de aprendizaje; conducir cada sesión con descansos para que los participantes se relajen.

### Datos cualitativos cuantificables (métricas de muestra)

**Medidas de desempeño**:
- Tiempo para completar cada tarea.
- Número y porcentaje de tareas completadas correctamente con y sin prompts/ayuda.
- Número y porcentaje de tareas completadas incorrectamente.
- Conteo de todas las selecciones incorrectas (errores).
- Conteo de elecciones de menú incorrectas.
- Conteo de iconos incorrectos seleccionados.
- Tiempo necesario para recuperarse de errores.
- Conteo de accesos al manual de usuario.
- Tiempo gastado leyendo una sección específica de un manual.
- Conteo de "comentarios negativos".

**Muestras de medidas de rating** (recoger ratings y su justificación sobre):
- Utilidad del producto.
- Qué tan bien el producto coincide con las expectativas.
- Apropiación de las funciones del producto para las tareas del usuario.
- Facilidad de uso en general.
- Facilidad de aprendizaje en general.
- Facilidad de setup e instalación.
- Facilidad de accesibilidad.
- Utilidad del índice, tabla de contenidos, ayuda, gráficos, etc.
- Respuestas del help desk a consultas.
- Facilidad de lectura del texto en la pantalla.

**Muestras de medidas de preferencia** (preferencia y justificación para):
- Un prototipo vs otro prototipo.
- Este producto vs el producto de un competidor.
- El modelo conceptual de este producto vs el modelo antiguo.

**Datos cualitativos puros**:
- "¡Me encantó! ¿Cuándo puedo tener uno?"
- "Wow, estoy muy, muy impresionado."
- "Ustedes lo hicieron de nuevo… todavía no escuchan a los clientes."
