# 🌟 Bloomshire Tool (Community Hub)

Herramienta comunitaria integral para **Bloomshire**:
- 🗺️ **Mega-Atlas HD**: Explorador de zonas, tiendas, puertas y 67 NPCs con retratos oficiales e información de regalos.
- 📦 **Buscador Universal de Ítems**: Enciclopedia con los 359 ítems del juego, precios, recetas y dónde conseguirlos.
- 🔨 **Crafteo & Cocina**: Recetario completo con mini-sprites de ingredientes requeridos.
- ⚖️ **Calculadora de Arbitraje**: Comparativa de margen de ganancia entre venta de materia prima vs cocina vs crafteo.
- 📊 **Calculadora de XP**: Estimación de tiempos y puntos por nivel de habilidad (1 a 10).
- 📜 **Guía de Misiones**: Mapa de ruta y desglose paso a paso de los 24 capítulos del Libro 1 y misiones secundarias.


## 🛠️ Generación de Catálogos y Fuentes del Juego

Los catálogos canónicos se generan mediante el script:
```bash
npm run build:rules
```

Este comando ejecuta `scripts/build_rules.mjs` y sincroniza:
1. `public/data/bloomshire/rules.json`, `src/data/rules.json` y `extension/rules.json`
2. `public/data/bloomshire/calc_data.json` (los 57 cultivos con XP, tiempos y precios oficiales)
3. `public/data/bloomshire/inventory_catalog.json` (74 ítems con valores de liquidación)
4. `extension/content_hook.js` (`SEEDS_INFO` con los 57 cultivos y tiempos en minutos)

### Origen de las Fuentes Oficiales
El generador busca los módulos del cliente oficial del juego (`catalog.js`, `rules.js`, `orders.js`) en las siguientes rutas locales (resueltas automáticamente):
- `scratch/game_sources_live/game/` (módulos descargados de los bundles oficiales en `https://bloomshire.xyz/play/v/<buildHash>/game/`)
- `game-sources/game/` o `game-sources/` (fuentes locales canónicas)

Por directiva de seguridad y propiedad intelectual, las fuentes crudas del juego están excluidas del control de versiones mediante `.gitignore`.
