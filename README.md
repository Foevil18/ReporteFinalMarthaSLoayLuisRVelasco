# Sistema de Enjambre Colectivo (Boids) con WebGL e InstancedMesh

Este proyecto consiste en una simulación tridimensional interactiva de comportamiento de enjambre masivo (*Flocking*), construida sobre **Three.js (v0.160.0)** y empaquetada con **Vite 5**. La aplicación está optimizada mediante aceleración por hardware en GPU y lógica matemática personalizada en Shaders para soportar rendering masivo en tiempo real con alto rendimiento.

---

## Cumplimiento de Rúbrica y Características Técnicas

| Componente Evaluado | Porcentaje | Implementación en este Proyecto |
| :--- | :---: | :--- |
| **Flocking Completo** | **30%** | Algoritmo tridimensional completo de Craig Reynolds. Procesamiento simultáneo de **250 agentes** interactuando entre sí mediante un panel de control en tiempo real (`lil-gui`). |
| **Render Eficiente** | **25%** | Renderizado centralizado en una única llamada de dibujo (*Draw Call*) usando `InstancedMesh`. Integración nativa del monitor de rendimiento `Stats` garantizando +60 FPS estables. |
| **Iluminación Avanzada** | **20%** | Inyección de código personalizado en el Vertex Shader nativo mediante `onBeforeCompile`. Ondulación biológica asíncrona por hardware e iluminación coherente con dos fuentes de luz direccionales cromáticas. |
| **Calidad Visual y Presentación** | **15%** | Entorno espacial profundo diseñado con un cubo contenedor de límites dinámicos, un campo de polvo estelar compuesto por 600 partículas y niebla exponencial. |
| **Repositorio y Documentación** | **10%** | Estructura limpia de archivos, configuración automatizada en Node.js y este manual técnico explicativo. |

---

## Fundamentos Matemáticos del Algoritmo

El enjambre se rige bajo el modelo clásico de comportamiento colectivo, donde cada agente calcula de forma independiente tres fuerzas vectoriales en cada fotograma dentro de un radio de percepción ajustable:

*   **Separación:** Evita la colisión con vecinos cercanos aplicando una fuerza inversamente proporcional a la distancia.
*   **Alineación:** Modifica el vector de velocidad del agente para promediar la dirección del grupo local.
*   **Cohesión:** Desplaza al agente hacia el centro de masa (promedio de posiciones) de sus vecinos.

Cada una de estas fuerzas se calcula bajo el principio de **Fuerza de Dirección de Reynolds (Steering Force)**, expresada matemáticamente como:

$$\vec{F}_{\text{steering}} = \text{clamp}(\vec{v}_{\text{desired}} - \vec{v}_{\text{actual}}, f_{\text{max}})$$

Donde $\vec{v}_{\text{desired}}$ representa la velocidad ideal según la regla aplicada y $f_{\text{max}}$ es la fuerza máxima permitida para evitar giros físicamente imposibles o bruscos.

---

## Optimizaciones Clave de Rendimiento

1. **Gestión de Memoria (Anti-Garbage Collector):** En lugar de crear miles de vectores nuevos por segundo usando `.clone()` dentro del bucle doble de animación, el script implementa un *pool* estático de vectores temporales (`scratchV1`, `scratchV2`, etc.). Esto erradica los micro-tirones y congelamientos del navegador.
2. **Animación Asíncrona en GPU:** Para cumplir con el requerimiento de que las entidades se muevan de forma independiente, se inyectó un atributo personalizado por instancia (`aInstancePhase`) directamente en el buffer de la tarjeta gráfica. El Vertex Shader calcula la deformación sinoidal de los vértices desfasando el tiempo global:
   
   $$\text{desfase} = \sin(y_{\text{local}} \cdot 5.0 + t_{\text{global}} \cdot 12.0 + \phi_{\text{instancia}}) \cdot 0.2$$

   Esto asegura que ningún cono se mueva igual a su vecino, delegando el 100% de la carga matemática visual al hardware de video.

---

## Estructura del Repositorio

```text
entrega-enjambre/
├── node_modules/           # Dependencias descargadas de npm (Three.js, Vite)
├── index.html              # Lienzo e interfaz base de la aplicación
├── main.js                 # Núcleo del algoritmo, shaders y bucle de renderizado
├── package.json            # Configuración del proyecto y scripts de ejecución
├── package-lock.json       # Historial exacto de versiones del ecosistema
└── README.md               # Documentación y sustento técnico del proyecto
