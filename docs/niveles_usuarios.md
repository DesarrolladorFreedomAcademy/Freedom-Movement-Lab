# Sistema de Niveles y Rangos - Freedom Movement Lab

A continuación se proponen diferentes enfoques para nombrar los niveles de los usuarios dentro de la plataforma (desde los que acaban de registrarse hasta los más experimentados).

## Enfoque 1: Clásico Parkour / Traceur
Este enfoque utiliza la terminología directa del deporte para dar autenticidad.
1. **Aprendiz de Movimiento** (Nivel 1 - 0 a 10 horas)
2. **Traceur en Formación** (Nivel 2 - 10 a 30 horas)
3. **Traceur** (Nivel 3 - 30 a 70 horas)
4. **Traceur Avanzado** (Nivel 4 - 70 a 150 horas)
5. **Traceur de Élite** (Nivel 5 - 150+ horas / Título actual del mockup)
6. **Maestro del Movimiento** (Nivel Máximo - Otorgado por instructores)

## Enfoque 2: Progresión "Ninja Urbano" (Más gamificado)
Ideal si se busca una sensación más de videojuego y retención de usuarios.
1. **Explorador Urbano** (Comienzo)
2. **Saltador Ágil** (Básico)
3. **Acróbata Urbano** (Intermedio)
4. **Ninja de Asfalto** (Avanzado)
5. **Fantasma Urbano** (Experto - Fluidez perfecta invisible a los fallos)
6. **Freedom Icon** (Rango más alto, inspirado en la marca)

## Enfoque 3: Flujo y Física (Elegante y técnico)
Centrado en el dominio del cuerpo y la física, resuena bien con una academia estructurada.
1. **Gravedad Cero** (Usuario Nuevo)
2. **Impulso Cinético** (Intermedio)
3. **Dominio Espacial** (Avanzado)
4. **Fluidez Absoluta** (Experto)
5. **Sinergia Total** (Élite)

## Enfoque 4: El Camino "Freedom" (Brand-focused)
Hecho a medida para el nombre del gimnasio "Freedom Movement Lab".
1. **Iniciado Freedom**
2. **Buscador de Libertad**
3. **Agente de Movimiento**
4. **Freedom Runner**
5. **Freedom Master**

💡 **Recomendación para la base de datos (Supabase):**
Se puede guardar el nivel como un número entero (ej. `rango_id: 1`) y calcular el nombre del título dinámicamente en el frontend (Astro) dependiendo de la experiencia total del usuario, tal como está montado ahora mismo con "Traceur de Élite".
