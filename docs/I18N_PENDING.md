# Textos pendientes de Internacionalización en Datos (PR de Datos)

Este archivo enumera los textos en español que provienen directamente de los archivos JSON de datos del juego (`public/data/bloomshire/`) y que se consumen en las pestañas `CraftTab`, `ItemsTab` y `CalcTab`.

De acuerdo con las reglas de la Fase 8, estos textos **no se modifican en el código JSX ni en los JSON de datos en este PR**, sino que quedan catalogados para ser migrados en una etapa posterior (PR de datos / PR 5):

---

## 1. `public/data/bloomshire/craft_data.json`

| Campo | Descripción | Ejemplo actual en datos |
|---|---|---|
| `item` / `dish` / `craftItem` | Nombres de ítems o platos crafteados en las recetas | `"Barra de Cobre"`, `"Tarta de Manzana"`, `"Kit de Reparación"` |
| `level` | Texto descriptivo del requisito de nivel | `"Nivel 1 (Principiante)"`, `"Misión Especial"` |
| `place` | Nombre de la estación o personaje asociado en el juego | `"Herrería de Bram"`, `"Taller de Tilly"`, `"Molino de Hollin"` |
| `desc` | Descripción de la receta o plato | `"Lingote de cobre fundido a partir de mineral sin refinar y carbón."` |
| `mats` | Cadena compuesta con los nombres de materiales en español | `"Mineral de Cobre x5 + Carbón x1"`, `"Harina x2 + Huevo x1"` |
| `needs[].nameEs` | Nombre en español del ingrediente individual | `"Mineral de Cobre"`, `"Carbón"` |

---

## 2. `public/data/bloomshire/item_encyclopedia.json`

| Campo | Descripción | Ejemplo actual en datos |
|---|---|---|
| `nameEs` | Nombre localizado en español del objeto | `"Zanahoria"`, `"Trucha Tigre"`, `"Pell's Wardrobe"` |
| `skillReq` | Requisito de nivel de habilidad / oficio | `"Cultivo Nv 1"`, `"Pesca Nv 3"`, `"Minería Nv 2"` |
| `howToGet` | Guía de obtención y procedencia en el mapa | `"Cultivo (Farming Nv 1+): Sembrar semilla de Carrot en Parcelas..."` |
| `details` | Notas y condiciones climáticas o estacionales | `"📌 Solo pescable en invierno con caña de bambú en el río"` |
| `usedIn[]` | Lista de recetas y misiones en las que se utiliza el ítem | `"🍳 Cocina (Nv 1): Vegetable Plate (x1)"`, `"📜 Misión \"Fresh for the Bakery\" (s_tamsin): pide x4"` |
| `mapLocation.label` | Etiqueta del punto de interés en el mapa | `"Tienda de Semillas y Herramientas (Hazel)"`, `"Muelle de Pesca de Maren"` |

---

## 3. `public/data/bloomshire/calc_data.json`

| Campo | Descripción | Ejemplo actual en datos |
|---|---|---|
| `name` | Nombre del cultivo o acción de recolección/minería | `"Zanahoria (Carrot)"`, `"Picar Cobre"`, `"Talar Roble"` |
| `seasonLabel` | Etiqueta de la estación del año con emoji | `"Invierno ❄️"`, `"Primavera 🌸"`, `"Todo el Año 🌐"` |
| `tip` | Consejo táctico y recomendación de optimización | `"Mejor relación XP/energía para subir rápido a Nivel 5"` |
| `growTxt` | Texto de tiempo especial si no es numérico | `"Instantáneo"` |

---

## 4. Lugares del código con heurísticas basadas en literales de datos (A refactorizar en PR de datos)

Actualmente existen 3 lugares en la interfaz donde el código decide comportamientos inspeccionando subcadenas en español dentro de los campos de texto de los datos. Funcionan hoy porque los JSON están en español, pero deben reemplazarse por campos canónicos estables en el PR de datos para evitar rupturas al traducir:

1. **`CraftTab.jsx` (~línea 52)**:
   - **Heurística actual**: `r.level.toLowerCase().includes('misi') || r.level.toLowerCase().includes('especial') || r.level.toLowerCase().includes('vip')` para el filtro de recetas especiales/misión.
   - **Reemplazo en PR de datos**: Agregar en `craft_data.json` una clave canónica estable como `isSpecial: true` o `categoryType: "quest" | "special"`.

2. **`CalcTab.jsx` (~línea 34)**:
   - **Heurística actual**: `x.tip && (x.tip.includes('Fundadores') || x.tip.includes('VIP') || x.tip.includes('Misi'))` para filtrar cultivos/acciones de eventos y fundadores.
   - **Reemplazo en PR de datos**: Agregar en `calc_data.json` una clave canónica estable como `isSpecial: true` o `bonusType: "founders" | "quest"`.

3. **`ItemsTab.jsx` (~línea 234)**:
   - **Heurística actual**: `u.includes('Misi') || u.includes('Cap.') || u.includes('Quest')` para dar estilo diferenciado a las insignias de misiones en la lista `usedIn`.
   - **Reemplazo en PR de datos**: Estructurar los elementos de `usedIn` como objetos con campo `kind: "quest" | "recipe"` o usar un identificador canónico en vez de cadenas libres.
