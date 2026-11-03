// content_bridge.js - ISOLATED world bridge for bloomshire.xyz
(function () {
  if (window.__bloomshire_bridge_loaded) return;
  window.__bloomshire_bridge_loaded = true;

  console.log('[Bloomshire Companion Bridge] ISOLATED world bridge active');

  let latestBloomshireState = null;
  let latestRawSave = null;

  // Diccionario canónico de ítems (Inglés -> Español)
  const ITEM_NAMES_ES = {
    'Carrot': 'Zanahorias',
    'Parsnip': 'Chirivía',
    'Spring Onion': 'Cebollín',
    'Wheat': 'Trigo',
    'Potato': 'Papa',
    'Cabbage': 'Repollo',
    'Onion': 'Cebolla',
    'Marigold': 'Caléndula (Marigold)',
    'Broccoli': 'Brócoli',
    'Rice': 'Arroz',
    'Sunflower': 'Girasol',
    'Corn': 'Maíz',
    'Cucumber': 'Pepino',
    'Tomato': 'Tomate',
    'Adzuki Bean': 'Judía Adzuki',
    'Green Beans': 'Judías Verdes',
    'Blackberry': 'Mora',
    'Eggplant': 'Berenjena',
    'Bell Pepper': 'Pimiento',
    'Hot Pepper': 'Pimiento Picante',
    'Green Pepper': 'Pimiento Verde',
    'Red Pepper': 'Pimiento Rojo',
    'Yellow Pepper': 'Pimiento Amarillo',
    'Strawberry': 'Fresa',
    'Blueberry': 'Arándano',
    'Grapes': 'Uvas',
    'Star Fruit': 'Fruta Estrella',
    'Watermelon': 'Sandía',
    'Pumpkin': 'Calabaza',
    'Golden Pumpkin': 'Calabaza Dorada',
    'Sapphire Blueberry': 'Arándano Zafiro',
    'Diamond Strawberry': 'Fresa Diamante',
    'Sunfire Pepper': 'Pimiento Fuego Solar',
    'Wood White': 'Blanca de Madera',
    'Pike': 'Lucio',
    'Pike Fish': 'Lucio',
    'Carp': 'Carpa',
    'Salmon': 'Salmón',
    'Trout': 'Trucha',
    'Catfish': 'Pez Gato',
    'Ghost Catfish': 'Pez Gato Fantasma',
    'Golden Fish': 'Pez Dorado',
    'Wood': 'Madera',
    'Stone': 'Piedra',
    'Copper Ore': 'Mena de Cobre',
    'Copper Bar': 'Lingote de Cobre',
    'Topaz': 'Topacio',
    'Sapphire': 'Zafiro',
    'Emerald': 'Esmeralda',
    'Ruby': 'Rubí',
    'Quartz': 'Cuarzo',
    'Rose Quartz': 'Cuarzo Rosa',
    'Silvercap Mushroom': 'Seta Silvercap',
    'Glowcap Mushroom': 'Seta Glowcap'
  };

  // Definición de las 10 habilidades canónicas de catalog.js
  const ALL_SKILLS_DEFS = [
    { key: 'farming', label: 'Cultivo', icon: '🌾', gated: true },
    { key: 'woodcutting', label: 'Tala', icon: '🪓', gated: true },
    { key: 'fishing', label: 'Pesca', icon: '🎣', gated: true },
    { key: 'foraging', label: 'Recolección', icon: '🌿', gated: true },
    { key: 'cooking', label: 'Cocina', icon: '🍲', gated: true },
    { key: 'crafting', label: 'Artesanía', icon: '🧱', gated: true },
    { key: 'mining', label: 'Minería', icon: '⛏️', gated: true },
    { key: 'combat', label: 'Combate', icon: '⚔️', gated: true },
    { key: 'husbandry', label: 'Ganadería', icon: '🐔', gated: false },
    { key: 'exploration', label: 'Exploración', icon: '📖', gated: false }
  ];

  const GATED_SKILLS = ['farming', 'woodcutting', 'mining', 'fishing', 'foraging', 'cooking', 'combat', 'crafting'];

  // Catálogo base de capítulos Book One (Season 0) y secundarias con pasos canónicos
  const KNOWN_QUESTS = {
  "bk01": {
    "id": "bk01",
    "name": "Cap. 1: Sopa",
    "rawName": "Soup",
    "chain": "story",
    "chapter": 1,
    "giver": "Marlow",
    "location": "🎯 Cap. 1: Sopa",
    "coords": {
      "label": "🎯 Cap. 1: Sopa",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con el hombre en la casa",
        "text": "El anciano está aquí en la casa contigo. Acércate a él y presiona E para hablar.",
        "where": "🎯 Cap. 1: Sopa",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 1: Sopa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff01": {
    "id": "bk01",
    "name": "Cap. 1: Sopa",
    "rawName": "Soup",
    "chain": "story",
    "chapter": 1,
    "giver": "Marlow",
    "location": "🎯 Cap. 1: Sopa",
    "coords": {
      "label": "🎯 Cap. 1: Sopa",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con el hombre en la casa",
        "text": "El anciano está aquí en la casa contigo. Acércate a él y presiona E para hablar.",
        "where": "🎯 Cap. 1: Sopa",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 1: Sopa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk02": {
    "id": "bk02",
    "name": "Cap. 2: Zanahorias",
    "rawName": "Carrots",
    "chain": "story",
    "chapter": 2,
    "giver": "Marlow",
    "location": "🎯 Cap. 2: Zanahorias",
    "coords": {
      "label": "🎯 Cap. 2: Zanahorias",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Encuentra a Marlow afuera de la puerta",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta. El campo es el terreno de tierra desnuda al oeste de la casa.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Remueve la tierra del campo",
        "text": "El campo es el terreno de tierra desnuda al oeste de la casa. Toma la azada y presiona Space. Un golpe voltea toda una hilera.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Planta las semillas de zanahoria",
        "text": "Toma las semillas en tu mano desde la barra rápida, párate sobre la tierra removida y presiona Space.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Dile a Marlow que las semillas ya están sembradas",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff02": {
    "id": "bk02",
    "name": "Cap. 2: Zanahorias",
    "rawName": "Carrots",
    "chain": "story",
    "chapter": 2,
    "giver": "Marlow",
    "location": "🎯 Cap. 2: Zanahorias",
    "coords": {
      "label": "🎯 Cap. 2: Zanahorias",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Encuentra a Marlow afuera de la puerta",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta. El campo es el terreno de tierra desnuda al oeste de la casa.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Remueve la tierra del campo",
        "text": "El campo es el terreno de tierra desnuda al oeste de la casa. Toma la azada y presiona Space. Un golpe voltea toda una hilera.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Planta las semillas de zanahoria",
        "text": "Toma las semillas en tu mano desde la barra rápida, párate sobre la tierra removida y presiona Space.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Dile a Marlow que las semillas ya están sembradas",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 2: Zanahorias",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 2: Zanahorias",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk03": {
    "id": "bk03",
    "name": "Cap. 3: Primera Cosecha",
    "rawName": "First Harvest",
    "chain": "story",
    "chapter": 3,
    "giver": "Marlow",
    "location": "🎯 Cap. 3: Primera Cosecha",
    "coords": {
      "label": "🎯 Cap. 3: Primera Cosecha",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 60
    },
    "steps": [
      {
        "step": 1,
        "name": "Riega las zanahorias",
        "text": "Lleva la regadera a tus zanahorias al oeste de la casa y presiona Space. Si ha llovido, eso también cuenta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Marlow qué hacer mientras crecen",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca un pez cerca de la isla",
        "text": "Párate en la orilla de la isla, de cara al agua, con la caña en mano. Mantén presionado Space para lanzar.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Cosecha una zanahoria con la hoz",
        "text": "Cuando las zanahorias hayan crecido, párate junto a ellas con la hoz en la mano y presiona Space.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Guarda algo en un cofre en la casa",
        "text": "Los cofres están en la casa, dos junto a la chimenea, un cajón, y uno junto a la cama. Presiona E en uno y arrastra algo adentro.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Siéntate con Marlow",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff03": {
    "id": "bk03",
    "name": "Cap. 3: Primera Cosecha",
    "rawName": "First Harvest",
    "chain": "story",
    "chapter": 3,
    "giver": "Marlow",
    "location": "🎯 Cap. 3: Primera Cosecha",
    "coords": {
      "label": "🎯 Cap. 3: Primera Cosecha",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 60
    },
    "steps": [
      {
        "step": 1,
        "name": "Riega las zanahorias",
        "text": "Lleva la regadera a tus zanahorias al oeste de la casa y presiona Space. Si ha llovido, eso también cuenta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Marlow qué hacer mientras crecen",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca un pez cerca de la isla",
        "text": "Párate en la orilla de la isla, de cara al agua, con la caña en mano. Mantén presionado Space para lanzar.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Cosecha una zanahoria con la hoz",
        "text": "Cuando las zanahorias hayan crecido, párate junto a ellas con la hoz en la mano y presiona Space.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Guarda algo en un cofre en la casa",
        "text": "Los cofres están en la casa, dos junto a la chimenea, un cajón, y uno junto a la cama. Presiona E en uno y arrastra algo adentro.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Siéntate con Marlow",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 3: Primera Cosecha",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 3: Primera Cosecha",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk04": {
    "id": "bk04",
    "name": "Cap. 4: El Cruce",
    "rawName": "The Crossing",
    "chain": "story",
    "chapter": 4,
    "giver": "Marlow",
    "location": "🎯 Cap. 4: El Cruce",
    "coords": {
      "label": "🎯 Cap. 4: El Cruce",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con Marlow",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 4: El Cruce",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 4: El Cruce",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Rema hasta Bloomshire",
        "text": "El bote de remos está amarrado en la orilla sur de la isla, debajo de la casa. Párate junto a él y presiona E.",
        "where": "🎯 Cap. 4: El Cruce",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 4: El Cruce",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff04": {
    "id": "bk04",
    "name": "Cap. 4: El Cruce",
    "rawName": "The Crossing",
    "chain": "story",
    "chapter": 4,
    "giver": "Marlow",
    "location": "🎯 Cap. 4: El Cruce",
    "coords": {
      "label": "🎯 Cap. 4: El Cruce",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con Marlow",
        "text": "Marlow está parado junto al camino, justo afuera de tu puerta.",
        "where": "🎯 Cap. 4: El Cruce",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 4: El Cruce",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Rema hasta Bloomshire",
        "text": "El bote de remos está amarrado en la orilla sur de la isla, debajo de la casa. Párate junto a él y presiona E.",
        "where": "🎯 Cap. 4: El Cruce",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 4: El Cruce",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk05": {
    "id": "bk05",
    "name": "Cap. 5: Al Que Marlow Sacó",
    "rawName": "The One Marlow Pulled Out",
    "chain": "story",
    "chapter": 5,
    "giver": "Marlow",
    "location": "🎯 Cap. 5: Al Que Marlow Sacó",
    "coords": {
      "label": "🎯 Cap. 5: Al Que Marlow Sacó",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 100
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Marlow en el muelle",
        "text": "Marlow está en el muelle donde llegó el bote, en el extremo sur del pueblo, junto al río.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Conoce a Maren, Fenwick y Tamsin",
        "text": "Maren vive al oeste del río, al norte del puente. El puesto de Fenwick está al norte de la plaza. La Panadería está junto al puente.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Encuentra la nueva casa de Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff05": {
    "id": "bk05",
    "name": "Cap. 5: Al Que Marlow Sacó",
    "rawName": "The One Marlow Pulled Out",
    "chain": "story",
    "chapter": 5,
    "giver": "Marlow",
    "location": "🎯 Cap. 5: Al Que Marlow Sacó",
    "coords": {
      "label": "🎯 Cap. 5: Al Que Marlow Sacó",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 100
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Marlow en el muelle",
        "text": "Marlow está en el muelle donde llegó el bote, en el extremo sur del pueblo, junto al río.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Conoce a Maren, Fenwick y Tamsin",
        "text": "Maren vive al oeste del río, al norte del puente. El puesto de Fenwick está al norte de la plaza. La Panadería está junto al puente.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Encuentra la nueva casa de Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 5: Al Que Marlow Sacó",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 5: Al Que Marlow Sacó",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk06": {
    "id": "bk06",
    "name": "Cap. 6: Pan y Aserrín",
    "rawName": "Bread and Sawdust",
    "chain": "story",
    "chapter": 6,
    "giver": "Marlow",
    "location": "🎯 Cap. 6: Pan y Aserrín",
    "coords": {
      "label": "🎯 Cap. 6: Pan y Aserrín",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 200
    },
    "steps": [
      {
        "step": 1,
        "name": "Pregúntale a Marlow sobre un día de trabajo",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Conoce a los tenderos",
        "text": "Hazel, Bram y Pell están al este de la plaza. Odette está al oeste. La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Un día de trabajo en el pueblo",
        "text": "La tienda de Hazel está justo al este de la plaza. Los campos del pueblo están al norte de la plaza, junto al invernadero.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Cuéntale a Marlow cómo te fue",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff06": {
    "id": "bk06",
    "name": "Cap. 6: Pan y Aserrín",
    "rawName": "Bread and Sawdust",
    "chain": "story",
    "chapter": 6,
    "giver": "Marlow",
    "location": "🎯 Cap. 6: Pan y Aserrín",
    "coords": {
      "label": "🎯 Cap. 6: Pan y Aserrín",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 200
    },
    "steps": [
      {
        "step": 1,
        "name": "Pregúntale a Marlow sobre un día de trabajo",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Conoce a los tenderos",
        "text": "Hazel, Bram y Pell están al este de la plaza. Odette está al oeste. La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Un día de trabajo en el pueblo",
        "text": "La tienda de Hazel está justo al este de la plaza. Los campos del pueblo están al norte de la plaza, junto al invernadero.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Cuéntale a Marlow cómo te fue",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 6: Pan y Aserrín",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 6: Pan y Aserrín",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk07": {
    "id": "bk07",
    "name": "Cap. 7: El Paseo de los Fundadores",
    "rawName": "The Founders' Walk",
    "chain": "story",
    "chapter": 7,
    "giver": "Ansel",
    "location": "🎯 Cap. 7: El Paseo de los Fundadores",
    "coords": {
      "label": "🎯 Cap. 7: El Paseo de los Fundadores",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 150
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Ansel en la capilla",
        "text": "Ansel cuida la vieja capilla, al noroeste de la plaza, pasando el huerto.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recorre el Paseo de los Fundadores",
        "text": "El Paseo de los Fundadores va hacia el sur desde el Salón de los Fundadores, junto al puerto, en el extremo sur del pueblo.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Rosa sobre los doce",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff07": {
    "id": "bk07",
    "name": "Cap. 7: El Paseo de los Fundadores",
    "rawName": "The Founders' Walk",
    "chain": "story",
    "chapter": 7,
    "giver": "Ansel",
    "location": "🎯 Cap. 7: El Paseo de los Fundadores",
    "coords": {
      "label": "🎯 Cap. 7: El Paseo de los Fundadores",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 150
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Ansel en la capilla",
        "text": "Ansel cuida la vieja capilla, al noroeste de la plaza, pasando el huerto.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recorre el Paseo de los Fundadores",
        "text": "El Paseo de los Fundadores va hacia el sur desde el Salón de los Fundadores, junto al puerto, en el extremo sur del pueblo.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Rosa sobre los doce",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 7: El Paseo de los Fundadores",
        "npc": "Ansel",
        "coords": {
          "label": "🎯 Cap. 7: El Paseo de los Fundadores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk08": {
    "id": "bk08",
    "name": "Cap. 8: Rima de Saltar la Cuerda",
    "rawName": "Skipping Rhyme",
    "chain": "story",
    "chapter": 8,
    "giver": "Greta",
    "location": "🎯 Cap. 8: Rima de Saltar la Cuerda",
    "coords": {
      "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Greta en la escuela",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Mabel sobre la rima",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Habla con Nixie en el estanque",
        "text": "Nixie está en el estanque, justo al sur de la plaza. Párate junto al agua y presiona E.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Nixie un trozo de Cuarzo",
        "text": "El Cuarzo está en la Mina Vieja, la mina en Stonepeak al este del pueblo, rompe las vetas pálidas. Nixie está en el estanque al sur de la plaza.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Quartz",
            "name": "Cuarzo",
            "needed": 1,
            "grown": false
          }
        ]
      }
    ]
  },
  "ff08": {
    "id": "bk08",
    "name": "Cap. 8: Rima de Saltar la Cuerda",
    "rawName": "Skipping Rhyme",
    "chain": "story",
    "chapter": 8,
    "giver": "Greta",
    "location": "🎯 Cap. 8: Rima de Saltar la Cuerda",
    "coords": {
      "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Greta en la escuela",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Mabel sobre la rima",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Habla con Nixie en el estanque",
        "text": "Nixie está en el estanque, justo al sur de la plaza. Párate junto al agua y presiona E.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Nixie un trozo de Cuarzo",
        "text": "El Cuarzo está en la Mina Vieja, la mina en Stonepeak al este del pueblo, rompe las vetas pálidas. Nixie está en el estanque al sur de la plaza.",
        "where": "🎯 Cap. 8: Rima de Saltar la Cuerda",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Cap. 8: Rima de Saltar la Cuerda",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Quartz",
            "name": "Cuarzo",
            "needed": 1,
            "grown": false
          }
        ]
      }
    ]
  },
  "bk09": {
    "id": "bk09",
    "name": "Cap. 9: La Bahía",
    "rawName": "The Bay",
    "chain": "story",
    "chapter": 9,
    "giver": "Jory",
    "location": "🎯 Cap. 9: La Bahía",
    "coords": {
      "label": "🎯 Cap. 9: La Bahía",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400,
      "shards": 5
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca cinco peces en la bahía",
        "text": "La bahía está en el extremo sur del mapa, pasando el sur del pueblo y el Valle del Sur. Pesca desde el muelle o el Muelle Largo.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Observa el agua desde el final del muelle por la noche",
        "text": "El final del Muelle Largo, en la bahía, en el extremo sur. Solo de noche.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Jory lo que viste",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff09": {
    "id": "bk09",
    "name": "Cap. 9: La Bahía",
    "rawName": "The Bay",
    "chain": "story",
    "chapter": 9,
    "giver": "Jory",
    "location": "🎯 Cap. 9: La Bahía",
    "coords": {
      "label": "🎯 Cap. 9: La Bahía",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400,
      "shards": 5
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca cinco peces en la bahía",
        "text": "La bahía está en el extremo sur del mapa, pasando el sur del pueblo y el Valle del Sur. Pesca desde el muelle o el Muelle Largo.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Observa el agua desde el final del muelle por la noche",
        "text": "El final del Muelle Largo, en la bahía, en el extremo sur. Solo de noche.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Jory lo que viste",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Cap. 9: La Bahía",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Cap. 9: La Bahía",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk10": {
    "id": "bk10",
    "name": "Cap. 10: Día de Mercado",
    "rawName": "Market Day",
    "chain": "story",
    "chapter": 10,
    "giver": "Otto",
    "location": "🎯 Cap. 10: Día de Mercado",
    "coords": {
      "label": "🎯 Cap. 10: Día de Mercado",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Dale a Ivy una caléndula que cultivaste, de parte de Otto",
        "text": "Cultiva una caléndula y llévasela a Ivy. Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 1,
            "grown": true
          }
        ]
      },
      {
        "step": 4,
        "name": "Cuéntale a Otto lo que dijo Ivy",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff10": {
    "id": "bk10",
    "name": "Cap. 10: Día de Mercado",
    "rawName": "Market Day",
    "chain": "story",
    "chapter": 10,
    "giver": "Otto",
    "location": "🎯 Cap. 10: Día de Mercado",
    "coords": {
      "label": "🎯 Cap. 10: Día de Mercado",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Dale a Ivy una caléndula que cultivaste, de parte de Otto",
        "text": "Cultiva una caléndula y llévasela a Ivy. Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 1,
            "grown": true
          }
        ]
      },
      {
        "step": 4,
        "name": "Cuéntale a Otto lo que dijo Ivy",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 10: Día de Mercado",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 10: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk11": {
    "id": "bk11",
    "name": "Cap. 11: Cerezas Grises",
    "rawName": "Grey Cherries",
    "chain": "story",
    "chapter": 11,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara en el huerto",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Mira los árboles grises",
        "text": "El huerto está al norte de la plaza. El rincón gris está al noroeste de este.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Hollis sobre lo gris",
        "text": "Hollis cuida a los animales en el lado este del pueblo.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Dile a Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Lleva a Ansel y a Hugo con Maren",
        "text": "Ansel cuida la vieja capilla, al noroeste de la plaza, pasando el huerto. Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Vuelve con Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff11": {
    "id": "bk11",
    "name": "Cap. 11: Cerezas Grises",
    "rawName": "Grey Cherries",
    "chain": "story",
    "chapter": 11,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara en el huerto",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Mira los árboles grises",
        "text": "El huerto está al norte de la plaza. El rincón gris está al noroeste de este.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Hollis sobre lo gris",
        "text": "Hollis cuida a los animales en el lado este del pueblo.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Dile a Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Lleva a Ansel y a Hugo con Maren",
        "text": "Ansel cuida la vieja capilla, al noroeste de la plaza, pasando el huerto. Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Vuelve con Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk12": {
    "id": "bk12",
    "name": "Cap. 12: La Ronda de Otto",
    "rawName": "Otto's Round",
    "chain": "story",
    "chapter": 12,
    "giver": "Otto",
    "location": "🎯 Cap. 12: La Ronda de Otto",
    "coords": {
      "label": "🎯 Cap. 12: La Ronda de Otto",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 500,
      "shards": 10
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Enciende tres lámparas después del anochecer",
        "text": "La lámpara del camino del muelle está en el extremo sur del pueblo, la de la capilla al noroeste, la del camino del oeste donde el camino sale hacia el bosque.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Ahuyenta al lobo gris en Whisperwood",
        "text": "Los lobos grises cazan en Whisperwood, al oeste del pueblo. Espada en mano, Space para atacar.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Otto sobre el lobo",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff12": {
    "id": "bk12",
    "name": "Cap. 12: La Ronda de Otto",
    "rawName": "Otto's Round",
    "chain": "story",
    "chapter": 12,
    "giver": "Otto",
    "location": "🎯 Cap. 12: La Ronda de Otto",
    "coords": {
      "label": "🎯 Cap. 12: La Ronda de Otto",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 500,
      "shards": 10
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Enciende tres lámparas después del anochecer",
        "text": "La lámpara del camino del muelle está en el extremo sur del pueblo, la de la capilla al noroeste, la del camino del oeste donde el camino sale hacia el bosque.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Ahuyenta al lobo gris en Whisperwood",
        "text": "Los lobos grises cazan en Whisperwood, al oeste del pueblo. Espada en mano, Space para atacar.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Otto sobre el lobo",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Cap. 12: La Ronda de Otto",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Cap. 12: La Ronda de Otto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk13": {
    "id": "bk13",
    "name": "Cap. 13: Whisperwood",
    "rawName": "Whisperwood",
    "chain": "story",
    "chapter": 13,
    "giver": "Cole",
    "location": "🎯 Cap. 13: Whisperwood",
    "coords": {
      "label": "🎯 Cap. 13: Whisperwood",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Tala cinco árboles en el Lote de Madera",
        "text": "El Lote de Madera es la arboleda cercada justo al norte del taller de Pell, en el pueblo.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Encuentra al gris en el Bosque Profundo",
        "text": "El Bosque Profundo es la parte oscura al oeste de Whisperwood. El claro gris está a mitad de camino, al oeste del claro de los leñadores.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Cole lo que encontraste",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff13": {
    "id": "bk13",
    "name": "Cap. 13: Whisperwood",
    "rawName": "Whisperwood",
    "chain": "story",
    "chapter": 13,
    "giver": "Cole",
    "location": "🎯 Cap. 13: Whisperwood",
    "coords": {
      "label": "🎯 Cap. 13: Whisperwood",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Tala cinco árboles en el Lote de Madera",
        "text": "El Lote de Madera es la arboleda cercada justo al norte del taller de Pell, en el pueblo.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Encuentra al gris en el Bosque Profundo",
        "text": "El Bosque Profundo es la parte oscura al oeste de Whisperwood. El claro gris está a mitad de camino, al oeste del claro de los leñadores.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cuéntale a Cole lo que encontraste",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Cap. 13: Whisperwood",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 13: Whisperwood",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk14": {
    "id": "bk14",
    "name": "Cap. 14: El Claro Escondido",
    "rawName": "The Hidden Glade",
    "chain": "story",
    "chapter": 14,
    "giver": "Cole",
    "location": "🎯 Cap. 14: El Claro Escondido",
    "coords": {
      "label": "🎯 Cap. 14: El Claro Escondido",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400
    },
    "steps": [
      {
        "step": 1,
        "name": "Busca en el claro escondido",
        "text": "El claro escondido está al norte del Bosque Profundo, al noroeste de Whisperwood, un anillo de columnas antiguas alrededor de un suelo de piedra.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale el calco a Rosa",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pregúntale a Juniper sobre el claro",
        "text": "La Botica está en el extremo oeste del pueblo, en el camino principal antes del bosque.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff14": {
    "id": "bk14",
    "name": "Cap. 14: El Claro Escondido",
    "rawName": "The Hidden Glade",
    "chain": "story",
    "chapter": 14,
    "giver": "Cole",
    "location": "🎯 Cap. 14: El Claro Escondido",
    "coords": {
      "label": "🎯 Cap. 14: El Claro Escondido",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 400
    },
    "steps": [
      {
        "step": 1,
        "name": "Busca en el claro escondido",
        "text": "El claro escondido está al norte del Bosque Profundo, al noroeste de Whisperwood, un anillo de columnas antiguas alrededor de un suelo de piedra.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale el calco a Rosa",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pregúntale a Juniper sobre el claro",
        "text": "La Botica está en el extremo oeste del pueblo, en el camino principal antes del bosque.",
        "where": "🎯 Cap. 14: El Claro Escondido",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Cap. 14: El Claro Escondido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk15": {
    "id": "bk15",
    "name": "Cap. 15: El Mapa Viejo",
    "rawName": "The Old Map",
    "chain": "story",
    "chapter": 15,
    "giver": "Rosa",
    "location": "🎯 Cap. 15: El Mapa Viejo",
    "coords": {
      "label": "🎯 Cap. 15: El Mapa Viejo",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Ve qué encontró Rosa",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale el mapa a Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Muéstrale el mapa a Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cocina cinco platillos para el camino",
        "text": "Cualquier estufa sirve, la Panadería está junto al puente, o la tuya en la casa de la isla.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Dile a Tamsin que estás listo",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff15": {
    "id": "bk15",
    "name": "Cap. 15: El Mapa Viejo",
    "rawName": "The Old Map",
    "chain": "story",
    "chapter": 15,
    "giver": "Rosa",
    "location": "🎯 Cap. 15: El Mapa Viejo",
    "coords": {
      "label": "🎯 Cap. 15: El Mapa Viejo",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Ve qué encontró Rosa",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale el mapa a Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Muéstrale el mapa a Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Seguir con la historia",
        "text": "Nada que hacer aquí, sigue tu camino.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Cocina cinco platillos para el camino",
        "text": "Cualquier estufa sirve, la Panadería está junto al puente, o la tuya en la casa de la isla.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Dile a Tamsin que estás listo",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "🎯 Cap. 15: El Mapa Viejo",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 Cap. 15: El Mapa Viejo",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk16": {
    "id": "bk16",
    "name": "Cap. 16: Todos los Colores",
    "rawName": "Every Colour",
    "chain": "story",
    "chapter": 16,
    "giver": "Maren",
    "location": "🎯 Cap. 16: Todos los Colores",
    "coords": {
      "label": "🎯 Cap. 16: Todos los Colores",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Toma el Camino Viejo hacia el oeste",
        "text": "El Camino Viejo sale por el extremo oeste de Whisperwood, al final del camino principal que atraviesa el bosque.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Despierta las doce figuras pálidas",
        "text": "Se alzan alrededor del viejo empedrado. «La estrella roja asciende»: primero la roja, y luego en el orden en que corren los colores del círculo.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Entra al centro del círculo",
        "text": "Los doce están despiertos, y el centro del viejo empedrado brilla. Párate en él y presiona E.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff16": {
    "id": "bk16",
    "name": "Cap. 16: Todos los Colores",
    "rawName": "Every Colour",
    "chain": "story",
    "chapter": 16,
    "giver": "Maren",
    "location": "🎯 Cap. 16: Todos los Colores",
    "coords": {
      "label": "🎯 Cap. 16: Todos los Colores",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Toma el Camino Viejo hacia el oeste",
        "text": "El Camino Viejo sale por el extremo oeste de Whisperwood, al final del camino principal que atraviesa el bosque.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Despierta las doce figuras pálidas",
        "text": "Se alzan alrededor del viejo empedrado. «La estrella roja asciende»: primero la roja, y luego en el orden en que corren los colores del círculo.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Entra al centro del círculo",
        "text": "Los doce están despiertos, y el centro del viejo empedrado brilla. Párate en él y presiona E.",
        "where": "🎯 Cap. 16: Todos los Colores",
        "npc": "Maren",
        "coords": {
          "label": "🎯 Cap. 16: Todos los Colores",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk17": {
    "id": "bk17",
    "name": "Cap. 17: Cambio de Hogar",
    "rawName": "Home Changed",
    "chain": "story",
    "chapter": 17,
    "giver": "Marlow",
    "location": "🎯 Cap. 17: Cambio de Hogar",
    "coords": {
      "label": "🎯 Cap. 17: Cambio de Hogar",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "shards": 25
    },
    "steps": [
      {
        "step": 1,
        "name": "Camina a casa, a Bloomshire",
        "text": "El Camino Viejo lleva de vuelta desde el sur de los Campos del Sueño hacia Whisperwood, y el pueblo más allá.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Ve con Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Ve con Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff17": {
    "id": "bk17",
    "name": "Cap. 17: Cambio de Hogar",
    "rawName": "Home Changed",
    "chain": "story",
    "chapter": 17,
    "giver": "Marlow",
    "location": "🎯 Cap. 17: Cambio de Hogar",
    "coords": {
      "label": "🎯 Cap. 17: Cambio de Hogar",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "shards": 25
    },
    "steps": [
      {
        "step": 1,
        "name": "Camina a casa, a Bloomshire",
        "text": "El Camino Viejo lleva de vuelta desde el sur de los Campos del Sueño hacia Whisperwood, y el pueblo más allá.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Ve con Marlow",
        "text": "La nueva casa de Marlow está al oeste del río, al sur del camino principal, cerca de los huertos.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Ve con Maren",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "🎯 Cap. 17: Cambio de Hogar",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 Cap. 17: Cambio de Hogar",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk18": {
    "id": "bk18",
    "name": "Cap. 18: Estanque de Marven",
    "rawName": "Marven's Pool",
    "chain": "story",
    "chapter": 18,
    "giver": "Marven",
    "location": "🌊 Estanque de Marven (Moonmere)",
    "coords": {
      "label": "🌊 Estanque de Marven (Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_7_marven_s_pool",
      "wx": 6416,
      "wy": 3636,
      "worldRect": [
        6144,
        3480,
        544,
        312
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Sube a Moonmere",
        "text": "Moonmere es el lago al norte del pueblo. Camina hacia el norte desde la plaza hasta llegar al agua.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Encuentra a Marven en su estanque",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca cuarenta peces en Moonmere",
        "text": "Pesca en cualquier parte de Moonmere. El muelle largo de la laguna y la orilla del prado son buenos lugares.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pesca en las orillas lejanas, sesenta más",
        "text": "Marven quiere que se pesque en cada rincón del lago. Prueba en la cornisa de las cataratas, el Círculo de Piedra y la orilla del prado.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Marven tres Bagres Fantasma",
        "text": "El Bagre Fantasma solo pica en Moonmere, de noche. El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Ghost Catfish",
            "name": "Bagre Fantasma",
            "needed": 3,
            "grown": false
          }
        ]
      },
      {
        "step": 6,
        "name": "Escucha a Marven mañana",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas. Pidió un día para pensarlo.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      }
    ]
  },
  "ff18": {
    "id": "bk18",
    "name": "Cap. 18: Estanque de Marven",
    "rawName": "Marven's Pool",
    "chain": "story",
    "chapter": 18,
    "giver": "Marven",
    "location": "🌊 Estanque de Marven (Moonmere)",
    "coords": {
      "label": "🌊 Estanque de Marven (Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_7_marven_s_pool",
      "wx": 6416,
      "wy": 3636,
      "worldRect": [
        6144,
        3480,
        544,
        312
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Sube a Moonmere",
        "text": "Moonmere es el lago al norte del pueblo. Camina hacia el norte desde la plaza hasta llegar al agua.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Encuentra a Marven en su estanque",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca cuarenta peces en Moonmere",
        "text": "Pesca en cualquier parte de Moonmere. El muelle largo de la laguna y la orilla del prado son buenos lugares.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pesca en las orillas lejanas, sesenta más",
        "text": "Marven quiere que se pesque en cada rincón del lago. Prueba en la cornisa de las cataratas, el Círculo de Piedra y la orilla del prado.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Marven tres Bagres Fantasma",
        "text": "El Bagre Fantasma solo pica en Moonmere, de noche. El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Ghost Catfish",
            "name": "Bagre Fantasma",
            "needed": 3,
            "grown": false
          }
        ]
      },
      {
        "step": 6,
        "name": "Escucha a Marven mañana",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas. Pidió un día para pensarlo.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      }
    ]
  },
  "bk19": {
    "id": "bk19",
    "name": "Cap. 19: Las Piedras en el Lago",
    "rawName": "The Stones in the Lake",
    "chain": "story",
    "chapter": 19,
    "giver": "Marven",
    "location": "🌊 Estanque de Marven (Moonmere)",
    "coords": {
      "label": "🌊 Estanque de Marven (Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_7_marven_s_pool",
      "wx": 6416,
      "wy": 3636,
      "worldRect": [
        6144,
        3480,
        544,
        312
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Lee las cuatro piedras marcadas de noche",
        "text": "Una piedra marcada en cada lado del Círculo de Piedra, en medio de Moonmere. Hay piedras de paso que salen desde el prado. De noche.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Dale a Rosa los cuatro calcos",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Stone Rubbing",
            "name": "Calco de Piedra",
            "needed": 4,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Vuelve a ver a Rosa mañana",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal. Pidió un día entero con los calcos.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Recolecta cuarenta cosas que crecen silvestres",
        "text": "Hay hongos en el bosque y alrededor del lago. Juniper quiere saber que puedes encontrar cosas antes de hacerte una linterna.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Juniper veinte Hongos Casquete Luminoso",
        "text": "Los Casquetes Luminosos crecen alrededor de Moonmere y en Whisperwood. La Botica está en el extremo oeste del pueblo, en el camino principal antes del bosque.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 20,
            "grown": false
          }
        ]
      }
    ]
  },
  "ff19": {
    "id": "bk19",
    "name": "Cap. 19: Las Piedras en el Lago",
    "rawName": "The Stones in the Lake",
    "chain": "story",
    "chapter": 19,
    "giver": "Marven",
    "location": "🌊 Estanque de Marven (Moonmere)",
    "coords": {
      "label": "🌊 Estanque de Marven (Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_7_marven_s_pool",
      "wx": 6416,
      "wy": 3636,
      "worldRect": [
        6144,
        3480,
        544,
        312
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Lee las cuatro piedras marcadas de noche",
        "text": "Una piedra marcada en cada lado del Círculo de Piedra, en medio de Moonmere. Hay piedras de paso que salen desde el prado. De noche.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Dale a Rosa los cuatro calcos",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Stone Rubbing",
            "name": "Calco de Piedra",
            "needed": 4,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Vuelve a ver a Rosa mañana",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal. Pidió un día entero con los calcos.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Recolecta cuarenta cosas que crecen silvestres",
        "text": "Hay hongos en el bosque y alrededor del lago. Juniper quiere saber que puedes encontrar cosas antes de hacerte una linterna.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Juniper veinte Hongos Casquete Luminoso",
        "text": "Los Casquetes Luminosos crecen alrededor de Moonmere y en Whisperwood. La Botica está en el extremo oeste del pueblo, en el camino principal antes del bosque.",
        "where": "🌊 Estanque de Marven (Moonmere)",
        "npc": "Marven",
        "coords": {
          "label": "🌊 Estanque de Marven (Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_7_marven_s_pool",
          "wx": 6416,
          "wy": 3636,
          "worldRect": [
            6144,
            3480,
            544,
            312
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 20,
            "grown": false
          }
        ]
      }
    ]
  },
  "bk20": {
    "id": "bk20",
    "name": "Cap. 20: Nixie",
    "rawName": "Nixie",
    "chain": "story",
    "chapter": 20,
    "giver": "Nixie",
    "location": "🎯 Cap. 20: Nixie",
    "coords": {
      "label": "🎯 Cap. 20: Nixie",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Nixie quiere hablar contigo",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Marven sobre Nixie",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Cocina veinte platillos",
        "text": "Cocina en cualquier estufa. La Panadería está junto al puente, o usa la tuya en la isla.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Llévale a Nixie diez platillos que cocinaste",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "food:*",
            "name": "food:*",
            "needed": 10,
            "grown": false
          }
        ]
      },
      {
        "step": 5,
        "name": "Toma lo que Nixie te dé",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff20": {
    "id": "bk20",
    "name": "Cap. 20: Nixie",
    "rawName": "Nixie",
    "chain": "story",
    "chapter": 20,
    "giver": "Nixie",
    "location": "🎯 Cap. 20: Nixie",
    "coords": {
      "label": "🎯 Cap. 20: Nixie",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Nixie quiere hablar contigo",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Marven sobre Nixie",
        "text": "El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Cocina veinte platillos",
        "text": "Cocina en cualquier estufa. La Panadería está junto al puente, o usa la tuya en la isla.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Llévale a Nixie diez platillos que cocinaste",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "food:*",
            "name": "food:*",
            "needed": 10,
            "grown": false
          }
        ]
      },
      {
        "step": 5,
        "name": "Toma lo que Nixie te dé",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Cap. 20: Nixie",
        "npc": "Nixie",
        "coords": {
          "label": "🎯 Cap. 20: Nixie",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk21": {
    "id": "bk21",
    "name": "Cap. 21: La Laguna",
    "rawName": "The Lagoon",
    "chain": "story",
    "chapter": 21,
    "giver": "Sylmare",
    "location": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
    "coords": {
      "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "shards": 10
    },
    "steps": [
      {
        "step": 1,
        "name": "Encuentra al portavoz de la laguna",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale a Sylmare el peine y la linterna",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Pearl Comb",
            "name": "Peine de Perlas",
            "needed": 1,
            "grown": false
          },
          {
            "id": "Glowcap Lantern",
            "name": "Farol de Casquete Luminoso",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Llévale a Miralys treinta pescados para los secaderos",
        "text": "Miralys repara redes junto a la canoa, en el camino este del pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 30,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Llévale caléndulas a Elyria para la fuente",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 20,
            "grown": true
          }
        ]
      },
      {
        "step": 5,
        "name": "Ahuyenta a los slimes y atrapamoscas de la orilla",
        "text": "Están a lo largo de las orillas de Moonmere, más densas en el prado del lado sur.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Dile a Virella que la orilla está despejada",
        "text": "Virella vigila junto al muelle largo que va hacia el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 7,
        "name": "Llévale a Sylmare lo que necesitan los senderos",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 80,
            "grown": false
          },
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 40,
            "grown": false
          },
          {
            "id": "gold",
            "name": "gold",
            "needed": 15000,
            "grown": false
          }
        ]
      },
      {
        "step": 8,
        "name": "Escucha lo que decidió la laguna",
        "text": "Sylmare está junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff21": {
    "id": "bk21",
    "name": "Cap. 21: La Laguna",
    "rawName": "The Lagoon",
    "chain": "story",
    "chapter": 21,
    "giver": "Sylmare",
    "location": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
    "coords": {
      "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "shards": 10
    },
    "steps": [
      {
        "step": 1,
        "name": "Encuentra al portavoz de la laguna",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Muéstrale a Sylmare el peine y la linterna",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Pearl Comb",
            "name": "Peine de Perlas",
            "needed": 1,
            "grown": false
          },
          {
            "id": "Glowcap Lantern",
            "name": "Farol de Casquete Luminoso",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Llévale a Miralys treinta pescados para los secaderos",
        "text": "Miralys repara redes junto a la canoa, en el camino este del pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 30,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Llévale caléndulas a Elyria para la fuente",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 20,
            "grown": true
          }
        ]
      },
      {
        "step": 5,
        "name": "Ahuyenta a los slimes y atrapamoscas de la orilla",
        "text": "Están a lo largo de las orillas de Moonmere, más densas en el prado del lado sur.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Dile a Virella que la orilla está despejada",
        "text": "Virella vigila junto al muelle largo que va hacia el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 7,
        "name": "Llévale a Sylmare lo que necesitan los senderos",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 80,
            "grown": false
          },
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 40,
            "grown": false
          },
          {
            "id": "gold",
            "name": "gold",
            "needed": 15000,
            "grown": false
          }
        ]
      },
      {
        "step": 8,
        "name": "Escucha lo que decidió la laguna",
        "text": "Sylmare está junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
        "npc": "Sylmare",
        "coords": {
          "label": "🧜‍♀️ Sylmare (Portavoz de la Laguna)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk22": {
    "id": "bk22",
    "name": "Cap. 22: Agua gris",
    "rawName": "Grey Water",
    "chain": "story",
    "chapter": 22,
    "giver": "Virella",
    "location": "🌊 Virella (Muelle Oeste de Moonmere)",
    "coords": {
      "label": "🌊 Virella (Muelle Oeste de Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 4968,
      "wy": 2636,
      "worldRect": [
        4900,
        2550,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Virella",
        "text": "Virella vigila junto al muelle largo que va hacia el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Vigila las aguas profundas de noche",
        "text": "Vigila desde las piedras de paso que llevan al Círculo de Piedra desde el prado de la orilla sur. De noche.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca en el agua profunda, sesenta más",
        "text": "Para estar listo para algo tan grande necesitas horas en el agua. En cualquier parte de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Sigue al gris",
        "text": "Alrededor de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Muéstrale a Marven la escama gris",
        "text": "El Bagre Fantasma solo pica en Moonmere, de noche. El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Grey Scale",
            "name": "Escama Gris",
            "needed": 1,
            "grown": false
          },
          {
            "id": "Ghost Catfish",
            "name": "Bagre Fantasma",
            "needed": 5,
            "grown": false
          }
        ]
      },
      {
        "step": 6,
        "name": "Dile a Virella lo que dijo Marven",
        "text": "Virella vigila junto al muelle largo que lleva al pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff22": {
    "id": "bk22",
    "name": "Cap. 22: Agua gris",
    "rawName": "Grey Water",
    "chain": "story",
    "chapter": 22,
    "giver": "Virella",
    "location": "🌊 Virella (Muelle Oeste de Moonmere)",
    "coords": {
      "label": "🌊 Virella (Muelle Oeste de Moonmere)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 4968,
      "wy": 2636,
      "worldRect": [
        4900,
        2550,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Virella",
        "text": "Virella vigila junto al muelle largo que va hacia el pueblo de la laguna, al oeste de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Vigila las aguas profundas de noche",
        "text": "Vigila desde las piedras de paso que llevan al Círculo de Piedra desde el prado de la orilla sur. De noche.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pesca en el agua profunda, sesenta más",
        "text": "Para estar listo para algo tan grande necesitas horas en el agua. En cualquier parte de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Sigue al gris",
        "text": "Alrededor de Moonmere.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Muéstrale a Marven la escama gris",
        "text": "El Bagre Fantasma solo pica en Moonmere, de noche. El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Grey Scale",
            "name": "Escama Gris",
            "needed": 1,
            "grown": false
          },
          {
            "id": "Ghost Catfish",
            "name": "Bagre Fantasma",
            "needed": 5,
            "grown": false
          }
        ]
      },
      {
        "step": 6,
        "name": "Dile a Virella lo que dijo Marven",
        "text": "Virella vigila junto al muelle largo que lleva al pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "🌊 Virella (Muelle Oeste de Moonmere)",
        "npc": "Virella",
        "coords": {
          "label": "🌊 Virella (Muelle Oeste de Moonmere)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 4968,
          "wy": 2636,
          "worldRect": [
            4900,
            2550,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "bk23": {
    "id": "bk23",
    "name": "Cap. 23: Visión Lunar",
    "rawName": "Moonsight",
    "chain": "story",
    "chapter": 23,
    "giver": "Elyria",
    "location": "✨ Elyria (Fuente de Conchas)",
    "coords": {
      "label": "✨ Elyria (Fuente de Conchas)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Elyria",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recolecta cincuenta cosas que crecen silvestres",
        "text": "Cualquier cosa que crezca silvestre, en cualquier lugar. Le gusta la gente que se fija.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale la ofrenda a Elyria",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 25,
            "grown": false
          },
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 25,
            "grown": true
          }
        ]
      },
      {
        "step": 4,
        "name": "Lleva la ofrenda al santuario de noche",
        "text": "El santuario del Hada de la Luna es el pequeño cenador en la isla del lado este de Moonmere. Nada hasta allí.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Descubre qué te muestra la luna",
        "text": "De noche, con la bendición del Hada de la Luna. Tres lugares alrededor del lago brillan ahora para ti.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Llévale a Elyria los tres versos",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Gate Song Verse",
            "name": "Verso de la Canción de la Puerta",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "ff23": {
    "id": "bk23",
    "name": "Cap. 23: Visión Lunar",
    "rawName": "Moonsight",
    "chain": "story",
    "chapter": 23,
    "giver": "Elyria",
    "location": "✨ Elyria (Fuente de Conchas)",
    "coords": {
      "label": "✨ Elyria (Fuente de Conchas)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Elyria",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recolecta cincuenta cosas que crecen silvestres",
        "text": "Cualquier cosa que crezca silvestre, en cualquier lugar. Le gusta la gente que se fija.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale la ofrenda a Elyria",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 25,
            "grown": false
          },
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 25,
            "grown": true
          }
        ]
      },
      {
        "step": 4,
        "name": "Lleva la ofrenda al santuario de noche",
        "text": "El santuario del Hada de la Luna es el pequeño cenador en la isla del lado este de Moonmere. Nada hasta allí.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Descubre qué te muestra la luna",
        "text": "De noche, con la bendición del Hada de la Luna. Tres lugares alrededor del lago brillan ahora para ti.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 6,
        "name": "Llévale a Elyria los tres versos",
        "text": "Elyria canta junto a la fuente de conchas en el pueblo de la laguna, al oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Gate Song Verse",
            "name": "Verso de la Canción de la Puerta",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "bk24": {
    "id": "bk24",
    "name": "Cap. 24: La Canción de la Puerta",
    "rawName": "The Gate Song",
    "chain": "story",
    "chapter": 24,
    "giver": "Elyria",
    "location": "✨ Elyria (Fuente de Conchas)",
    "coords": {
      "label": "✨ Elyria (Fuente de Conchas)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 2500,
      "shards": 30
    },
    "steps": [
      {
        "step": 1,
        "name": "Escucha cantar a Elyria",
        "text": "Elyria canta junto a la fuente de conchas, en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Maren sobre un festival",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Tamsin veinte platillos para el banquete",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "food:*",
            "name": "food:*",
            "needed": 20,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Llévale cuarenta caléndulas a Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 40,
            "grown": true
          }
        ]
      },
      {
        "step": 5,
        "name": "Llévale a Hugo sesenta trigos para el pan",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wheat",
            "name": "Trigo",
            "needed": 60,
            "grown": true
          }
        ]
      },
      {
        "step": 6,
        "name": "Llévale a Otto casquetes luminosos y Oro para los faroles",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 20,
            "grown": false
          },
          {
            "id": "gold",
            "name": "gold",
            "needed": 10000,
            "grown": false
          }
        ]
      },
      {
        "step": 7,
        "name": "Dile a Sylmare que el pueblo ya viene",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 8,
        "name": "Encuentra a Elyria antes del festival",
        "text": "Elyria canta junto a la fuente de conchas, en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 9,
        "name": "Ve al festival en la fuente de noche",
        "text": "La fuente de conchas está en medio del pueblo de la laguna, en el lado oeste de Moonmere. De noche.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 10,
        "name": "Habla con Maren después del festival",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "ff24": {
    "id": "bk24",
    "name": "Cap. 24: La Canción de la Puerta",
    "rawName": "The Gate Song",
    "chain": "story",
    "chapter": 24,
    "giver": "Elyria",
    "location": "✨ Elyria (Fuente de Conchas)",
    "coords": {
      "label": "✨ Elyria (Fuente de Conchas)",
      "regionId": "moonmere",
      "subZoneId": "moonmere_sub_1_lagoon_village",
      "wx": 5152,
      "wy": 2698,
      "worldRect": [
        5050,
        2600,
        200,
        200
      ]
    },
    "reward": {
      "gold": 2500,
      "shards": 30
    },
    "steps": [
      {
        "step": 1,
        "name": "Escucha cantar a Elyria",
        "text": "Elyria canta junto a la fuente de conchas, en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Maren sobre un festival",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Tamsin veinte platillos para el banquete",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "food:*",
            "name": "food:*",
            "needed": 20,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Llévale cuarenta caléndulas a Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 40,
            "grown": true
          }
        ]
      },
      {
        "step": 5,
        "name": "Llévale a Hugo sesenta trigos para el pan",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wheat",
            "name": "Trigo",
            "needed": 60,
            "grown": true
          }
        ]
      },
      {
        "step": 6,
        "name": "Llévale a Otto casquetes luminosos y Oro para los faroles",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 20,
            "grown": false
          },
          {
            "id": "gold",
            "name": "gold",
            "needed": 10000,
            "grown": false
          }
        ]
      },
      {
        "step": 7,
        "name": "Dile a Sylmare que el pueblo ya viene",
        "text": "Sylmare está junto a la fuente de conchas, en el pueblo de la laguna, en el lado oeste de Moonmere.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 8,
        "name": "Encuentra a Elyria antes del festival",
        "text": "Elyria canta junto a la fuente de conchas, en el pueblo de la laguna, al oeste de Moonmere. Vuelve mañana.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 9,
        "name": "Ve al festival en la fuente de noche",
        "text": "La fuente de conchas está en medio del pueblo de la laguna, en el lado oeste de Moonmere. De noche.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 10,
        "name": "Habla con Maren después del festival",
        "text": "La casa de Maren está en la ribera oeste del río, al norte del puente.",
        "where": "✨ Elyria (Fuente de Conchas)",
        "npc": "Elyria",
        "coords": {
          "label": "✨ Elyria (Fuente de Conchas)",
          "regionId": "moonmere",
          "subZoneId": "moonmere_sub_1_lagoon_village",
          "wx": 5152,
          "wy": 2698,
          "worldRect": [
            5050,
            2600,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_storehouse": {
    "id": "g_storehouse",
    "name": "El Almacén",
    "rawName": "The Storehouse",
    "chain": "game",
    "chapter": null,
    "giver": "Marlow",
    "location": "🎯 El Almacén",
    "coords": {
      "label": "🎯 El Almacén",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 50
    },
    "steps": [
      {
        "step": 1,
        "name": "Pon algo en tu cofre del Almacén",
        "text": "El Almacén está en el lado este del pueblo, al sur del Banco. Adentro, presiona E junto a tu cofre y arrastra algo hacia él.",
        "where": "🎯 El Almacén",
        "npc": "Marlow",
        "coords": {
          "label": "🎯 El Almacén",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_fish": {
    "id": "g_fish",
    "name": "Una Línea en el Agua",
    "rawName": "A Line in the Water",
    "chain": "game",
    "chapter": null,
    "giver": "Wren",
    "location": "🎯 Una Línea en el Agua",
    "coords": {
      "label": "🎯 Una Línea en el Agua",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 150
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Wren",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Una Línea en el Agua",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Una Línea en el Agua",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pesca diez peces",
        "text": "Cualquier agua con peces, el río que cruza el pueblo, el estanque, la bahía al sur.",
        "where": "🎯 Una Línea en el Agua",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Una Línea en el Agua",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale tres peces a Wren",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Una Línea en el Agua",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Una Línea en el Agua",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_cook": {
    "id": "g_cook",
    "name": "La Cocina de Tamsin",
    "rawName": "Tamsin's Kitchen",
    "chain": "game",
    "chapter": null,
    "giver": "Tamsin",
    "location": "🎯 La Cocina de Tamsin",
    "coords": {
      "label": "🎯 La Cocina de Tamsin",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 120
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Tamsin",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "🎯 La Cocina de Tamsin",
        "npc": "Tamsin",
        "coords": {
          "label": "🎯 La Cocina de Tamsin",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Cocina tres platos",
        "text": "Párate junto a la estufa en la Panadería y presiona E. El Pescado Frito necesita una Carpa.",
        "where": "🎯 La Cocina de Tamsin",
        "npc": "Tamsin",
        "coords": {
          "label": "🎯 La Cocina de Tamsin",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Tamsin algo que hayas cocinado",
        "text": "La Panadería está en la orilla oeste, justo junto al puente, al norte del camino principal.",
        "where": "🎯 La Cocina de Tamsin",
        "npc": "Tamsin",
        "coords": {
          "label": "🎯 La Cocina de Tamsin",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "food:*",
            "name": "food:*",
            "needed": 1,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_forage": {
    "id": "g_forage",
    "name": "Lo Que Crece Silvestre",
    "rawName": "What Grows Wild",
    "chain": "game",
    "chapter": null,
    "giver": "Juniper",
    "location": "🎯 Lo Que Crece Silvestre",
    "coords": {
      "label": "🎯 Lo Que Crece Silvestre",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 180
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Juniper",
        "text": "La Botica está en el extremo oeste del pueblo, en el camino principal antes del bosque.",
        "where": "🎯 Lo Que Crece Silvestre",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Lo Que Crece Silvestre",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recoge cinco hongos silvestres",
        "text": "A la sombra de Whisperwood, al oeste del pueblo. Presiona E junto a un hongo.",
        "where": "🎯 Lo Que Crece Silvestre",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Lo Que Crece Silvestre",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale tres sombrerillos plateados a Juniper",
        "text": "La Botica está en el extremo oeste del pueblo.",
        "where": "🎯 Lo Que Crece Silvestre",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Lo Que Crece Silvestre",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Silvercap Mushroom",
            "name": "Hongo Sombrerillo Plateado",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_wood": {
    "id": "g_wood",
    "name": "Madera",
    "rawName": "Timber",
    "chain": "game",
    "chapter": null,
    "giver": "Cole",
    "location": "🎯 Madera",
    "coords": {
      "label": "🎯 Madera",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 150
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Madera",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Tala cinco árboles en el Lote de Madera",
        "text": "El Lote de Madera es la arboleda cercada justo al norte del taller de Pell, en el pueblo. Con el hacha en mano, presiona Space junto a un árbol.",
        "where": "🎯 Madera",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale quince maderas a Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Madera",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 15,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_woodlot": {
    "id": "g_woodlot",
    "name": "El Lote de Madera",
    "rawName": "The Woodlot",
    "chain": "game",
    "chapter": null,
    "giver": "Pell",
    "location": "🎯 El Lote de Madera",
    "coords": {
      "label": "🎯 El Lote de Madera",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 350
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Pell",
        "text": "El taller de Pell está en el camino del este, pasando la Herrería.",
        "where": "🎯 El Lote de Madera",
        "npc": "Pell",
        "coords": {
          "label": "🎯 El Lote de Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Tala los seis árboles del Lote de Madera",
        "text": "El Lote de Madera es la arboleda cercada justo al norte del taller de Pell, en el pueblo.",
        "where": "🎯 El Lote de Madera",
        "npc": "Pell",
        "coords": {
          "label": "🎯 El Lote de Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve cuando hayan crecido, y tálalos todos de nuevo",
        "text": "El Lote de Madera es la arboleda cercada justo al norte del taller de Pell, en el pueblo. Un árbol talado ahí vuelve a ser árbol en seis horas.",
        "where": "🎯 El Lote de Madera",
        "npc": "Pell",
        "coords": {
          "label": "🎯 El Lote de Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Llévale veinte maderas a Pell",
        "text": "El taller de Pell está en el camino del este, pasando la Herrería.",
        "where": "🎯 El Lote de Madera",
        "npc": "Pell",
        "coords": {
          "label": "🎯 El Lote de Madera",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 20,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_mine": {
    "id": "g_mine",
    "name": "Piedra y Mineral",
    "rawName": "Stone and Ore",
    "chain": "game",
    "chapter": null,
    "giver": "Bram",
    "location": "🔨 Bram (La Herrería)",
    "coords": {
      "label": "🔨 Bram (La Herrería)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5600,
      "wy": 4500,
      "worldRect": [
        5500,
        4400,
        200,
        200
      ]
    },
    "reward": {
      "gold": 150
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Bram en la Herrería",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Rompe cinco rocas",
        "text": "Stonepeak, al este del pueblo. Pico en mano, presiona Space junto a una roca.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale diez piedras a Bram",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 10,
            "grown": false
          }
        ]
      }
    ]
  },
  "g_combat": {
    "id": "g_combat",
    "name": "Espada y Arco",
    "rawName": "Blade and Bow",
    "chain": "game",
    "chapter": null,
    "giver": "Bram",
    "location": "🔨 Bram (La Herrería)",
    "coords": {
      "label": "🔨 Bram (La Herrería)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5600,
      "wy": 4500,
      "worldRect": [
        5500,
        4400,
        200,
        200
      ]
    },
    "reward": {
      "gold": 200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Bram sobre el combate",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Derrota a tres criaturas salvajes",
        "text": "Allá afuera, en lo salvaje, Whisperwood al oeste, Stonepeak al este.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Bram",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_market": {
    "id": "g_market",
    "name": "Las Reglas de Rowan",
    "rawName": "Rowan's Rules",
    "chain": "game",
    "chapter": null,
    "giver": "Rowan",
    "location": "🎯 Las Reglas de Rowan",
    "coords": {
      "label": "🎯 Las Reglas de Rowan",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 100
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rowan en el Mercado Cubierto",
        "text": "El Mercado Cubierto está justo al sur de la plaza.",
        "where": "🎯 Las Reglas de Rowan",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Las Reglas de Rowan",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pon algo a la venta en un puesto",
        "text": "En el Mercado Cubierto, al sur de la plaza. Habla con Rowan y elige algo para vender.",
        "where": "🎯 Las Reglas de Rowan",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Las Reglas de Rowan",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_orders": {
    "id": "g_orders",
    "name": "El Tablón de Pedidos",
    "rawName": "The Order Board",
    "chain": "game",
    "chapter": null,
    "giver": "Odette",
    "location": "🛒 Odette (Tienda General)",
    "coords": {
      "label": "🛒 Odette (Tienda General)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5280,
      "wy": 4420,
      "worldRect": [
        5180,
        4320,
        200,
        200
      ]
    },
    "reward": {
      "gold": 100
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Odette",
        "text": "La Tienda General está justo al oeste de la plaza.",
        "where": "🛒 Odette (Tienda General)",
        "npc": "Odette",
        "coords": {
          "label": "🛒 Odette (Tienda General)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5280,
          "wy": 4420,
          "worldRect": [
            5180,
            4320,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Entrega un pedido en la Tienda General",
        "text": "En la Tienda General, al oeste de la plaza, habla con Odette y abre la pestaña de Pedidos.",
        "where": "🛒 Odette (Tienda General)",
        "npc": "Odette",
        "coords": {
          "label": "🛒 Odette (Tienda General)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5280,
          "wy": 4420,
          "worldRect": [
            5180,
            4320,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_bank": {
    "id": "g_bank",
    "name": "Dinero en el Banco",
    "rawName": "Money in the Bank",
    "chain": "game",
    "chapter": null,
    "giver": "Farthing",
    "location": "🎯 Dinero en el Banco",
    "coords": {
      "label": "🎯 Dinero en el Banco",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 50
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Farthing en el Banco",
        "text": "El Banco está en el lado este del pueblo.",
        "where": "🎯 Dinero en el Banco",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Dinero en el Banco",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pon algo de Oro en el Banco",
        "text": "En el Banco, al este del pueblo, habla con Farthing.",
        "where": "🎯 Dinero en el Banco",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Dinero en el Banco",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "g_explore": {
    "id": "g_explore",
    "name": "El Paisaje de la Tierra",
    "rawName": "The Lay of the Land",
    "chain": "game",
    "chapter": null,
    "giver": "Rosa",
    "location": "🎯 El Paisaje de la Tierra",
    "coords": {
      "label": "🎯 El Paisaje de la Tierra",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 250
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rosa",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 El Paisaje de la Tierra",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 El Paisaje de la Tierra",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Recorre cada rincón del valle",
        "text": "Whisperwood está al oeste, Moonmere río arriba al norte, Stonepeak al este, el Valle del Sur y la bahía al sur.",
        "where": "🎯 El Paisaje de la Tierra",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 El Paisaje de la Tierra",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Cuéntale a Rosa lo que viste",
        "text": "Rosa lee en la orilla oeste, junto al río, al sur del camino principal.",
        "where": "🎯 El Paisaje de la Tierra",
        "npc": "Rosa",
        "coords": {
          "label": "🎯 El Paisaje de la Tierra",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_fenwick": {
    "id": "sd_fenwick",
    "name": "Secundaria: Cartas para el Valle",
    "rawName": "Letters for the Valley",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Fenwick",
    "location": "🎯 Secundaria: Cartas para el Valle",
    "coords": {
      "label": "🎯 Secundaria: Cartas para el Valle",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Fenwick en el correo",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Dale su carta a Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Greta",
            "name": "Carta para Greta",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Dale su carta a Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Hugo",
            "name": "Carta para Hugo",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Dale su carta a Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Lena",
            "name": "Carta para Lena",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 5,
        "name": "Vuelve con Fenwick",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "s_fenwick": {
    "id": "sd_fenwick",
    "name": "Secundaria: Cartas para el Valle",
    "rawName": "Letters for the Valley",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Fenwick",
    "location": "🎯 Secundaria: Cartas para el Valle",
    "coords": {
      "label": "🎯 Secundaria: Cartas para el Valle",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Fenwick en el correo",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Dale su carta a Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Greta",
            "name": "Carta para Greta",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 3,
        "name": "Dale su carta a Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Hugo",
            "name": "Carta para Hugo",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 4,
        "name": "Dale su carta a Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Letter for Lena",
            "name": "Carta para Lena",
            "needed": 1,
            "grown": false
          }
        ]
      },
      {
        "step": 5,
        "name": "Vuelve con Fenwick",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: Cartas para el Valle",
        "npc": "Fenwick",
        "coords": {
          "label": "🎯 Secundaria: Cartas para el Valle",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_hugo": {
    "id": "sd_hugo",
    "name": "Secundaria: Grano para el Molino",
    "rawName": "Grist for the Mill",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Hugo",
    "location": "🎯 Secundaria: Grano para el Molino",
    "coords": {
      "label": "🎯 Secundaria: Grano para el Molino",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Grano para el Molino",
        "npc": "Hugo",
        "coords": {
          "label": "🎯 Secundaria: Grano para el Molino",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale veinte trigos a Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Grano para el Molino",
        "npc": "Hugo",
        "coords": {
          "label": "🎯 Secundaria: Grano para el Molino",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wheat",
            "name": "Trigo",
            "needed": 20,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_hugo": {
    "id": "sd_hugo",
    "name": "Secundaria: Grano para el Molino",
    "rawName": "Grist for the Mill",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Hugo",
    "location": "🎯 Secundaria: Grano para el Molino",
    "coords": {
      "label": "🎯 Secundaria: Grano para el Molino",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Grano para el Molino",
        "npc": "Hugo",
        "coords": {
          "label": "🎯 Secundaria: Grano para el Molino",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale veinte trigos a Hugo",
        "text": "Hugo está junto al huerto, al noroeste de la plaza.",
        "where": "🎯 Secundaria: Grano para el Molino",
        "npc": "Hugo",
        "coords": {
          "label": "🎯 Secundaria: Grano para el Molino",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wheat",
            "name": "Trigo",
            "needed": 20,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_lena": {
    "id": "sd_lena",
    "name": "Secundaria: El Jardín de Lena",
    "rawName": "Lena's Garden",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Lena",
    "location": "❄️ Lena (Jardín de Invierno)",
    "coords": {
      "label": "❄️ Lena (Jardín de Invierno)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 4962,
      "wy": 4870,
      "worldRect": [
        4900,
        4800,
        150,
        150
      ]
    },
    "reward": {
      "gold": 900,
      "items": [
        [
          "seed:24",
          5
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Lena doce repollos que hayas cultivado",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": [
          {
            "id": "Cabbage",
            "name": "Repollo",
            "needed": 12,
            "grown": true
          }
        ]
      }
    ]
  },
  "s_lena": {
    "id": "sd_lena",
    "name": "Secundaria: El Jardín de Lena",
    "rawName": "Lena's Garden",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Lena",
    "location": "❄️ Lena (Jardín de Invierno)",
    "coords": {
      "label": "❄️ Lena (Jardín de Invierno)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 4962,
      "wy": 4870,
      "worldRect": [
        4900,
        4800,
        150,
        150
      ]
    },
    "reward": {
      "gold": 900,
      "items": [
        [
          "seed:24",
          5
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Lena doce repollos que hayas cultivado",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": [
          {
            "id": "Cabbage",
            "name": "Repollo",
            "needed": 12,
            "grown": true
          }
        ]
      }
    ]
  },
  "sd_mabel": {
    "id": "sd_mabel",
    "name": "Secundaria: El Estanque Menguante",
    "rawName": "The Shrinking Pond",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Mabel",
    "location": "🎯 Secundaria: El Estanque Menguante",
    "coords": {
      "label": "🎯 Secundaria: El Estanque Menguante",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Mabel",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Secundaria: El Estanque Menguante",
        "npc": "Mabel",
        "coords": {
          "label": "🎯 Secundaria: El Estanque Menguante",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Mabel quince piedras y diez maderas",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Secundaria: El Estanque Menguante",
        "npc": "Mabel",
        "coords": {
          "label": "🎯 Secundaria: El Estanque Menguante",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 15,
            "grown": false
          },
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 10,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_mabel": {
    "id": "sd_mabel",
    "name": "Secundaria: El Estanque Menguante",
    "rawName": "The Shrinking Pond",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Mabel",
    "location": "🎯 Secundaria: El Estanque Menguante",
    "coords": {
      "label": "🎯 Secundaria: El Estanque Menguante",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 300
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Mabel",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Secundaria: El Estanque Menguante",
        "npc": "Mabel",
        "coords": {
          "label": "🎯 Secundaria: El Estanque Menguante",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Mabel quince piedras y diez maderas",
        "text": "El estanque está justo al sur de la plaza, junto al Mercado Cubierto.",
        "where": "🎯 Secundaria: El Estanque Menguante",
        "npc": "Mabel",
        "coords": {
          "label": "🎯 Secundaria: El Estanque Menguante",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 15,
            "grown": false
          },
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 10,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_ivy": {
    "id": "sd_ivy",
    "name": "Secundaria: Una Flor para Cada Mesa",
    "rawName": "A Flower for Every Table",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Ivy",
    "location": "🎯 Secundaria: Una Flor para Cada Mesa",
    "coords": {
      "label": "🎯 Secundaria: Una Flor para Cada Mesa",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Secundaria: Una Flor para Cada Mesa",
        "npc": "Ivy",
        "coords": {
          "label": "🎯 Secundaria: Una Flor para Cada Mesa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale quince caléndulas a Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Secundaria: Una Flor para Cada Mesa",
        "npc": "Ivy",
        "coords": {
          "label": "🎯 Secundaria: Una Flor para Cada Mesa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 15,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_ivy": {
    "id": "sd_ivy",
    "name": "Secundaria: Una Flor para Cada Mesa",
    "rawName": "A Flower for Every Table",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Ivy",
    "location": "🎯 Secundaria: Una Flor para Cada Mesa",
    "coords": {
      "label": "🎯 Secundaria: Una Flor para Cada Mesa",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Secundaria: Una Flor para Cada Mesa",
        "npc": "Ivy",
        "coords": {
          "label": "🎯 Secundaria: Una Flor para Cada Mesa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale quince caléndulas a Ivy",
        "text": "Ivy vende flores justo al sur de la plaza.",
        "where": "🎯 Secundaria: Una Flor para Cada Mesa",
        "npc": "Ivy",
        "coords": {
          "label": "🎯 Secundaria: Una Flor para Cada Mesa",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 15,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_wren": {
    "id": "sd_wren",
    "name": "Secundaria: Redes para el Puerto",
    "rawName": "Nets for the Harbour",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Wren",
    "location": "🎯 Secundaria: Redes para el Puerto",
    "coords": {
      "label": "🎯 Secundaria: Redes para el Puerto",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 500
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Wren",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Secundaria: Redes para el Puerto",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Secundaria: Redes para el Puerto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Wren diez pescados y cinco maderas",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Secundaria: Redes para el Puerto",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Secundaria: Redes para el Puerto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 10,
            "grown": false
          },
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_wren": {
    "id": "sd_wren",
    "name": "Secundaria: Redes para el Puerto",
    "rawName": "Nets for the Harbour",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Wren",
    "location": "🎯 Secundaria: Redes para el Puerto",
    "coords": {
      "label": "🎯 Secundaria: Redes para el Puerto",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 500
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Wren",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Secundaria: Redes para el Puerto",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Secundaria: Redes para el Puerto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Wren diez pescados y cinco maderas",
        "text": "La cabaña de Wren está junto a los muelles del sur.",
        "where": "🎯 Secundaria: Redes para el Puerto",
        "npc": "Wren",
        "coords": {
          "label": "🎯 Secundaria: Redes para el Puerto",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 10,
            "grown": false
          },
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_cole": {
    "id": "sd_cole",
    "name": "Secundaria: La Pila de Leña de Cole",
    "rawName": "Cole's Woodpile",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Cole",
    "location": "🎯 Secundaria: La Pila de Leña de Cole",
    "coords": {
      "label": "🎯 Secundaria: La Pila de Leña de Cole",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Secundaria: La Pila de Leña de Cole",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Secundaria: La Pila de Leña de Cole",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale cuarenta maderas a Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Secundaria: La Pila de Leña de Cole",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Secundaria: La Pila de Leña de Cole",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 40,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_cole": {
    "id": "sd_cole",
    "name": "Secundaria: La Pila de Leña de Cole",
    "rawName": "Cole's Woodpile",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Cole",
    "location": "🎯 Secundaria: La Pila de Leña de Cole",
    "coords": {
      "label": "🎯 Secundaria: La Pila de Leña de Cole",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Secundaria: La Pila de Leña de Cole",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Secundaria: La Pila de Leña de Cole",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale cuarenta maderas a Cole",
        "text": "Cole trabaja junto a los campos del invernadero, al norte de la plaza.",
        "where": "🎯 Secundaria: La Pila de Leña de Cole",
        "npc": "Cole",
        "coords": {
          "label": "🎯 Secundaria: La Pila de Leña de Cole",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 40,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_juniper": {
    "id": "sd_juniper",
    "name": "Secundaria: Los Estantes de Juniper",
    "rawName": "Juniper's Shelves",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Juniper",
    "location": "🎯 Secundaria: Los Estantes de Juniper",
    "coords": {
      "label": "🎯 Secundaria: Los Estantes de Juniper",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Juniper",
        "text": "La Botica está en el extremo oeste del pueblo.",
        "where": "🎯 Secundaria: Los Estantes de Juniper",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Secundaria: Los Estantes de Juniper",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Juniper diez sombrerillos plateados y cinco casquetes luminosos",
        "text": "La Botica está en el extremo oeste del pueblo.",
        "where": "🎯 Secundaria: Los Estantes de Juniper",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Secundaria: Los Estantes de Juniper",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Silvercap Mushroom",
            "name": "Hongo Sombrerillo Plateado",
            "needed": 10,
            "grown": false
          },
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_juniper": {
    "id": "sd_juniper",
    "name": "Secundaria: Los Estantes de Juniper",
    "rawName": "Juniper's Shelves",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Juniper",
    "location": "🎯 Secundaria: Los Estantes de Juniper",
    "coords": {
      "label": "🎯 Secundaria: Los Estantes de Juniper",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Juniper",
        "text": "La Botica está en el extremo oeste del pueblo.",
        "where": "🎯 Secundaria: Los Estantes de Juniper",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Secundaria: Los Estantes de Juniper",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Juniper diez sombrerillos plateados y cinco casquetes luminosos",
        "text": "La Botica está en el extremo oeste del pueblo.",
        "where": "🎯 Secundaria: Los Estantes de Juniper",
        "npc": "Juniper",
        "coords": {
          "label": "🎯 Secundaria: Los Estantes de Juniper",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Silvercap Mushroom",
            "name": "Hongo Sombrerillo Plateado",
            "needed": 10,
            "grown": false
          },
          {
            "id": "Glowcap Mushroom",
            "name": "Hongo Casquete Luminoso",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_dara": {
    "id": "sd_dara",
    "name": "Secundaria: Reparando la Cerca",
    "rawName": "Mending the Fence",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Dara veinticinco maderas y quince piedras",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 25,
            "grown": false
          },
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 15,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_dara": {
    "id": "sd_dara",
    "name": "Secundaria: Reparando la Cerca",
    "rawName": "Mending the Fence",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Dara veinticinco maderas y quince piedras",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": [
          {
            "id": "Wood",
            "name": "Madera",
            "needed": 25,
            "grown": false
          },
          {
            "id": "Stone",
            "name": "Piedra",
            "needed": 15,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_colour": {
    "id": "sd_colour",
    "name": "Secundaria: El color ha vuelto",
    "rawName": "Colour Back",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pon tus manos sobre los árboles grises",
        "text": "El rincón gris está al noroeste del huerto, al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Dile a Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "s_colour": {
    "id": "sd_colour",
    "name": "Secundaria: El color ha vuelto",
    "rawName": "Colour Back",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Dara",
    "location": "🍎 Dara (Huerto de Cerezos)",
    "coords": {
      "label": "🍎 Dara (Huerto de Cerezos)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5120,
      "wy": 3800,
      "worldRect": [
        5000,
        3700,
        240,
        200
      ]
    },
    "reward": {},
    "steps": [
      {
        "step": 1,
        "name": "Habla con Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pon tus manos sobre los árboles grises",
        "text": "El rincón gris está al noroeste del huerto, al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Dile a Dara",
        "text": "Dara cuida el huerto al norte de la plaza.",
        "where": "🍎 Dara (Huerto de Cerezos)",
        "npc": "Dara",
        "coords": {
          "label": "🍎 Dara (Huerto de Cerezos)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5120,
          "wy": 3800,
          "worldRect": [
            5000,
            3700,
            240,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_greta": {
    "id": "sd_greta",
    "name": "Secundaria: La Mesa de la Naturaleza",
    "rawName": "The Nature Table",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Greta",
    "location": "🎯 Secundaria: La Mesa de la Naturaleza",
    "coords": {
      "label": "🎯 Secundaria: La Mesa de la Naturaleza",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Atrapa tres mariposas con una red para insectos",
        "text": "Hazel vende una red para insectos. Las mariposas salen por los prados en los días buenos.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "s_greta": {
    "id": "sd_greta",
    "name": "Secundaria: La Mesa de la Naturaleza",
    "rawName": "The Nature Table",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Greta",
    "location": "🎯 Secundaria: La Mesa de la Naturaleza",
    "coords": {
      "label": "🎯 Secundaria: La Mesa de la Naturaleza",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 700
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Atrapa tres mariposas con una red para insectos",
        "text": "Hazel vende una red para insectos. Las mariposas salen por los prados en los días buenos.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Greta",
        "text": "La escuela de Greta está al noreste del pueblo.",
        "where": "🎯 Secundaria: La Mesa de la Naturaleza",
        "npc": "Greta",
        "coords": {
          "label": "🎯 Secundaria: La Mesa de la Naturaleza",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_otto": {
    "id": "sd_otto",
    "name": "Secundaria: Sopa para el Farolero",
    "rawName": "Soup for the Lamplighter",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Otto",
    "location": "🎯 Secundaria: Sopa para el Farolero",
    "coords": {
      "label": "🎯 Secundaria: Sopa para el Farolero",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 800
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Cocina cinco tazones de Sopa de Chirivía",
        "text": "Cualquier estufa sirve, la de la Panadería o la tuya. Cada tazón lleva cuatro chirivías.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Otto cinco tazones de Sopa de Chirivía",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Parsnip Soup",
            "name": "Sopa de Chirivía",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_otto": {
    "id": "sd_otto",
    "name": "Secundaria: Sopa para el Farolero",
    "rawName": "Soup for the Lamplighter",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Otto",
    "location": "🎯 Secundaria: Sopa para el Farolero",
    "coords": {
      "label": "🎯 Secundaria: Sopa para el Farolero",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 800
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Otto",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Cocina cinco tazones de Sopa de Chirivía",
        "text": "Cualquier estufa sirve, la de la Panadería o la tuya. Cada tazón lleva cuatro chirivías.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Otto cinco tazones de Sopa de Chirivía",
        "text": "Otto está junto a Semillas y Útiles, justo al este de la plaza.",
        "where": "🎯 Secundaria: Sopa para el Farolero",
        "npc": "Otto",
        "coords": {
          "label": "🎯 Secundaria: Sopa para el Farolero",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Parsnip Soup",
            "name": "Sopa de Chirivía",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_jory": {
    "id": "sd_jory",
    "name": "Secundaria: La Gran Pesca",
    "rawName": "The Big Catch",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Jory",
    "location": "🎯 Secundaria: La Gran Pesca",
    "coords": {
      "label": "🎯 Secundaria: La Gran Pesca",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pesca quince peces",
        "text": "Cualquier agua con peces sirve: el río, el estanque, la bahía o el lago.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale cinco pescados a Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_jory": {
    "id": "sd_jory",
    "name": "Secundaria: La Gran Pesca",
    "rawName": "The Big Catch",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Jory",
    "location": "🎯 Secundaria: La Gran Pesca",
    "coords": {
      "label": "🎯 Secundaria: La Gran Pesca",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pesca quince peces",
        "text": "Cualquier agua con peces sirve: el río, el estanque, la bahía o el lago.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale cinco pescados a Jory",
        "text": "Jory se sienta junto al río, al suroeste de la plaza.",
        "where": "🎯 Secundaria: La Gran Pesca",
        "npc": "Jory",
        "coords": {
          "label": "🎯 Secundaria: La Gran Pesca",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "fish:*",
            "name": "fish:*",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_bram": {
    "id": "sd_bram",
    "name": "Secundaria: Mineral para la Herrería",
    "rawName": "Ore for the Forge",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Bram",
    "location": "🔨 Bram (La Herrería)",
    "coords": {
      "label": "🔨 Bram (La Herrería)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5600,
      "wy": 4500,
      "worldRect": [
        5500,
        4400,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "items": [
        [
          "Repair Kit",
          1
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Bram",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Bram veinte Mena de Cobre y cinco Mineral de Hierro",
        "text": "La Herrería está al este de la plaza. El cobre está en las cuevas de Stonepeak, el hierro más profundo, desde el nivel 5 de Minería.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Copper Ore",
            "name": "Mena de Cobre",
            "needed": 20,
            "grown": false
          },
          {
            "id": "Iron Ore",
            "name": "Mineral de Hierro",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_bram": {
    "id": "sd_bram",
    "name": "Secundaria: Mineral para la Herrería",
    "rawName": "Ore for the Forge",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Bram",
    "location": "🔨 Bram (La Herrería)",
    "coords": {
      "label": "🔨 Bram (La Herrería)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5600,
      "wy": 4500,
      "worldRect": [
        5500,
        4400,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000,
      "items": [
        [
          "Repair Kit",
          1
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Bram",
        "text": "La Herrería está al este de la plaza.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Bram veinte Mena de Cobre y cinco Mineral de Hierro",
        "text": "La Herrería está al este de la plaza. El cobre está en las cuevas de Stonepeak, el hierro más profundo, desde el nivel 5 de Minería.",
        "where": "🔨 Bram (La Herrería)",
        "npc": "Bram",
        "coords": {
          "label": "🔨 Bram (La Herrería)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5600,
          "wy": 4500,
          "worldRect": [
            5500,
            4400,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Copper Ore",
            "name": "Mena de Cobre",
            "needed": 20,
            "grown": false
          },
          {
            "id": "Iron Ore",
            "name": "Mineral de Hierro",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_rhys": {
    "id": "sd_rhys",
    "name": "Secundaria: Plagas en los Campos",
    "rawName": "Pests in the Fields",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Rhys",
    "location": "🎯 Secundaria: Plagas en los Campos",
    "coords": {
      "label": "🎯 Secundaria: Plagas en los Campos",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rhys",
        "text": "Rhys trabaja los campos del invernadero al norte de la plaza, junto a Cole.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Derrota a quince criaturas salvajes",
        "text": "Allá afuera, en lo salvaje, Whisperwood al oeste, Stonepeak al este.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Rhys",
        "text": "Rhys trabaja los campos del invernadero al norte de la plaza, junto a Cole.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "s_rhys": {
    "id": "sd_rhys",
    "name": "Secundaria: Plagas en los Campos",
    "rawName": "Pests in the Fields",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Rhys",
    "location": "🎯 Secundaria: Plagas en los Campos",
    "coords": {
      "label": "🎯 Secundaria: Plagas en los Campos",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rhys",
        "text": "Rhys trabaja los campos del invernadero al norte de la plaza, junto a Cole.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Derrota a quince criaturas salvajes",
        "text": "Allá afuera, en lo salvaje, Whisperwood al oeste, Stonepeak al este.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Rhys",
        "text": "Rhys trabaja los campos del invernadero al norte de la plaza, junto a Cole.",
        "where": "🎯 Secundaria: Plagas en los Campos",
        "npc": "Rhys",
        "coords": {
          "label": "🎯 Secundaria: Plagas en los Campos",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_clara": {
    "id": "sd_clara",
    "name": "Secundaria: Huevos para la Panadería",
    "rawName": "Eggs for the Bakery",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Clara",
    "location": "🥖 Clara / Panadería",
    "coords": {
      "label": "🥖 Clara / Panadería",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5400,
      "wy": 4440,
      "worldRect": [
        5300,
        4320,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Clara",
        "text": "Clara está afuera de la Panadería, en la orilla oeste junto al puente.",
        "where": "🥖 Clara / Panadería",
        "npc": "Clara",
        "coords": {
          "label": "🥖 Clara / Panadería",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5400,
          "wy": 4440,
          "worldRect": [
            5300,
            4320,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale doce huevos a Clara",
        "text": "Clara está afuera de la Panadería, junto al puente. Las gallinas ponen huevos en la Granja de Hollin, al sur del pueblo.",
        "where": "🥖 Clara / Panadería",
        "npc": "Clara",
        "coords": {
          "label": "🥖 Clara / Panadería",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5400,
          "wy": 4440,
          "worldRect": [
            5300,
            4320,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Egg",
            "name": "Huevo",
            "needed": 12,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_clara": {
    "id": "sd_clara",
    "name": "Secundaria: Huevos para la Panadería",
    "rawName": "Eggs for the Bakery",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Clara",
    "location": "🥖 Clara / Panadería",
    "coords": {
      "label": "🥖 Clara / Panadería",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5400,
      "wy": 4440,
      "worldRect": [
        5300,
        4320,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Clara",
        "text": "Clara está afuera de la Panadería, en la orilla oeste junto al puente.",
        "where": "🥖 Clara / Panadería",
        "npc": "Clara",
        "coords": {
          "label": "🥖 Clara / Panadería",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5400,
          "wy": 4440,
          "worldRect": [
            5300,
            4320,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale doce huevos a Clara",
        "text": "Clara está afuera de la Panadería, junto al puente. Las gallinas ponen huevos en la Granja de Hollin, al sur del pueblo.",
        "where": "🥖 Clara / Panadería",
        "npc": "Clara",
        "coords": {
          "label": "🥖 Clara / Panadería",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5400,
          "wy": 4440,
          "worldRect": [
            5300,
            4320,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Egg",
            "name": "Huevo",
            "needed": 12,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_jasper": {
    "id": "sd_jasper",
    "name": "Secundaria: Tablones para los Botes",
    "rawName": "Planks for the Boats",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Jasper",
    "location": "🎯 Secundaria: Tablones para los Botes",
    "coords": {
      "label": "🎯 Secundaria: Tablones para los Botes",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jasper",
        "text": "Jasper repara botes en los muelles del sur, cerca de la desembocadura del río.",
        "where": "🎯 Secundaria: Tablones para los Botes",
        "npc": "Jasper",
        "coords": {
          "label": "🎯 Secundaria: Tablones para los Botes",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Jasper quince tablones y cinco cuerdas",
        "text": "Jasper está en los muelles del sur. Haz tablones y cuerda en la mesa de trabajo de Pell, en la Carpintería del camino del este.",
        "where": "🎯 Secundaria: Tablones para los Botes",
        "npc": "Jasper",
        "coords": {
          "label": "🎯 Secundaria: Tablones para los Botes",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wooden Plank",
            "name": "Tabla de Madera",
            "needed": 15,
            "grown": false
          },
          {
            "id": "Rope",
            "name": "Cuerda",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_jasper": {
    "id": "sd_jasper",
    "name": "Secundaria: Tablones para los Botes",
    "rawName": "Planks for the Boats",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Jasper",
    "location": "🎯 Secundaria: Tablones para los Botes",
    "coords": {
      "label": "🎯 Secundaria: Tablones para los Botes",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Jasper",
        "text": "Jasper repara botes en los muelles del sur, cerca de la desembocadura del río.",
        "where": "🎯 Secundaria: Tablones para los Botes",
        "npc": "Jasper",
        "coords": {
          "label": "🎯 Secundaria: Tablones para los Botes",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Jasper quince tablones y cinco cuerdas",
        "text": "Jasper está en los muelles del sur. Haz tablones y cuerda en la mesa de trabajo de Pell, en la Carpintería del camino del este.",
        "where": "🎯 Secundaria: Tablones para los Botes",
        "npc": "Jasper",
        "coords": {
          "label": "🎯 Secundaria: Tablones para los Botes",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Wooden Plank",
            "name": "Tabla de Madera",
            "needed": 15,
            "grown": false
          },
          {
            "id": "Rope",
            "name": "Cuerda",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_farthing": {
    "id": "sd_farthing",
    "name": "Secundaria: El Libro Mayor Perdido",
    "rawName": "The Missing Ledger",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Farthing",
    "location": "🎯 Secundaria: El Libro Mayor Perdido",
    "coords": {
      "label": "🎯 Secundaria: El Libro Mayor Perdido",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 800
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Farthing",
        "text": "El Banco está en el lado este del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Odette en la Tienda General",
        "text": "La Tienda General está justo al oeste de la plaza.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Quill en la Casa de Cambio",
        "text": "La Casa de Cambio está al sureste de la plaza, al oeste del Banco.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pregúntale a Fenwick en el correo",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Farthing las tres páginas",
        "text": "El Banco está en el lado este del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Ledger Page",
            "name": "Página del Libro Mayor",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_farthing": {
    "id": "sd_farthing",
    "name": "Secundaria: El Libro Mayor Perdido",
    "rawName": "The Missing Ledger",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Farthing",
    "location": "🎯 Secundaria: El Libro Mayor Perdido",
    "coords": {
      "label": "🎯 Secundaria: El Libro Mayor Perdido",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 800
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Farthing",
        "text": "El Banco está en el lado este del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Pregúntale a Odette en la Tienda General",
        "text": "La Tienda General está justo al oeste de la plaza.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Pregúntale a Quill en la Casa de Cambio",
        "text": "La Casa de Cambio está al sureste de la plaza, al oeste del Banco.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 4,
        "name": "Pregúntale a Fenwick en el correo",
        "text": "Fenwick lleva el correo justo al norte de la plaza del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 5,
        "name": "Llévale a Farthing las tres páginas",
        "text": "El Banco está en el lado este del pueblo.",
        "where": "🎯 Secundaria: El Libro Mayor Perdido",
        "npc": "Farthing",
        "coords": {
          "label": "🎯 Secundaria: El Libro Mayor Perdido",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Ledger Page",
            "name": "Página del Libro Mayor",
            "needed": 3,
            "grown": false
          }
        ]
      }
    ]
  },
  "sd_rowan": {
    "id": "sd_rowan",
    "name": "Secundaria: Día de Mercado",
    "rawName": "Market Day",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Rowan",
    "location": "🎯 Secundaria: Día de Mercado",
    "coords": {
      "label": "🎯 Secundaria: Día de Mercado",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rowan",
        "text": "El Mercado Cubierto está justo al sur de la plaza.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Monta tres puestos en el Mercado Cubierto",
        "text": "En el Mercado Cubierto, al sur de la plaza. Habla con Rowan y elige algo para vender.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Rowan",
        "text": "El Mercado Cubierto está justo al sur de la plaza.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "s_rowan": {
    "id": "sd_rowan",
    "name": "Secundaria: Día de Mercado",
    "rawName": "Market Day",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Rowan",
    "location": "🎯 Secundaria: Día de Mercado",
    "coords": {
      "label": "🎯 Secundaria: Día de Mercado",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 600
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Rowan",
        "text": "El Mercado Cubierto está justo al sur de la plaza.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Monta tres puestos en el Mercado Cubierto",
        "text": "En el Mercado Cubierto, al sur de la plaza. Habla con Rowan y elige algo para vender.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Vuelve con Rowan",
        "text": "El Mercado Cubierto está justo al sur de la plaza.",
        "where": "🎯 Secundaria: Día de Mercado",
        "npc": "Rowan",
        "coords": {
          "label": "🎯 Secundaria: Día de Mercado",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      }
    ]
  },
  "sd_willa": {
    "id": "sd_willa",
    "name": "Secundaria: Flores para las Abejas",
    "rawName": "Flowers for the Bees",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Willa",
    "location": "🎯 Secundaria: Flores para las Abejas",
    "coords": {
      "label": "🎯 Secundaria: Flores para las Abejas",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900,
      "items": [
        [
          "Honey",
          2
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Willa",
        "text": "Willa tiene sus colmenas en la parte alta del pueblo, al este del huerto.",
        "where": "🎯 Secundaria: Flores para las Abejas",
        "npc": "Willa",
        "coords": {
          "label": "🎯 Secundaria: Flores para las Abejas",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Willa quince caléndulas que cultivaste",
        "text": "Willa tiene sus colmenas en la parte alta del pueblo, al este del huerto.",
        "where": "🎯 Secundaria: Flores para las Abejas",
        "npc": "Willa",
        "coords": {
          "label": "🎯 Secundaria: Flores para las Abejas",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 15,
            "grown": true
          }
        ]
      }
    ]
  },
  "s_willa": {
    "id": "sd_willa",
    "name": "Secundaria: Flores para las Abejas",
    "rawName": "Flowers for the Bees",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Willa",
    "location": "🎯 Secundaria: Flores para las Abejas",
    "coords": {
      "label": "🎯 Secundaria: Flores para las Abejas",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5200,
      "wy": 4400,
      "worldRect": [
        5100,
        4300,
        200,
        200
      ]
    },
    "reward": {
      "gold": 900,
      "items": [
        [
          "Honey",
          2
        ]
      ]
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Willa",
        "text": "Willa tiene sus colmenas en la parte alta del pueblo, al este del huerto.",
        "where": "🎯 Secundaria: Flores para las Abejas",
        "npc": "Willa",
        "coords": {
          "label": "🎯 Secundaria: Flores para las Abejas",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale a Willa quince caléndulas que cultivaste",
        "text": "Willa tiene sus colmenas en la parte alta del pueblo, al este del huerto.",
        "where": "🎯 Secundaria: Flores para las Abejas",
        "npc": "Willa",
        "coords": {
          "label": "🎯 Secundaria: Flores para las Abejas",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5200,
          "wy": 4400,
          "worldRect": [
            5100,
            4300,
            200,
            200
          ]
        },
        "items": [
          {
            "id": "Marigold",
            "name": "Caléndula",
            "needed": 15,
            "grown": true
          }
        ]
      }
    ]
  },
  "sd_lena_winter": {
    "id": "sd_lena_winter",
    "name": "Secundaria: El Jardín de Invierno",
    "rawName": "The Winter Garden",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Lena",
    "location": "❄️ Lena (Jardín de Invierno)",
    "coords": {
      "label": "❄️ Lena (Jardín de Invierno)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 4962,
      "wy": 4870,
      "worldRect": [
        4900,
        4800,
        150,
        150
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Alcanza el nivel 4 de Cultivo",
        "text": "Cosecha cultivos de cualquier tipo para subir Cultivo. La col rizada de invierno requiere Cultivo nivel 4.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Lena quince coles rizadas de invierno que cultivaste",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": [
          {
            "id": "Winter Kale",
            "name": "Col de Invierno",
            "needed": 15,
            "grown": true
          }
        ]
      }
    ]
  },
  "s_lena_winter": {
    "id": "sd_lena_winter",
    "name": "Secundaria: El Jardín de Invierno",
    "rawName": "The Winter Garden",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Lena",
    "location": "❄️ Lena (Jardín de Invierno)",
    "coords": {
      "label": "❄️ Lena (Jardín de Invierno)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 4962,
      "wy": 4870,
      "worldRect": [
        4900,
        4800,
        150,
        150
      ]
    },
    "reward": {
      "gold": 1200
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Lena",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Alcanza el nivel 4 de Cultivo",
        "text": "Cosecha cultivos de cualquier tipo para subir Cultivo. La col rizada de invierno requiere Cultivo nivel 4.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": []
      },
      {
        "step": 3,
        "name": "Llévale a Lena quince coles rizadas de invierno que cultivaste",
        "text": "Lena cuida los jardines al suroeste del pueblo, cerca de la casa de Marlow.",
        "where": "❄️ Lena (Jardín de Invierno)",
        "npc": "Lena",
        "coords": {
          "label": "❄️ Lena (Jardín de Invierno)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 4962,
          "wy": 4870,
          "worldRect": [
            4900,
            4800,
            150,
            150
          ]
        },
        "items": [
          {
            "id": "Winter Kale",
            "name": "Col de Invierno",
            "needed": 15,
            "grown": true
          }
        ]
      }
    ]
  },
  "sd_elsie": {
    "id": "sd_elsie",
    "name": "Secundaria: Miel para las Pinturas",
    "rawName": "Honey for the Paints",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Elsie",
    "location": "🎨 Elsie (Pintora)",
    "coords": {
      "label": "🎨 Elsie (Pintora)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5350,
      "wy": 4700,
      "worldRect": [
        5200,
        4600,
        250,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Elsie",
        "text": "Elsie pinta junto al camino principal, al oeste de la Tienda General.",
        "where": "🎨 Elsie (Pintora)",
        "npc": "Elsie",
        "coords": {
          "label": "🎨 Elsie (Pintora)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5350,
          "wy": 4700,
          "worldRect": [
            5200,
            4600,
            250,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale cinco miel a Elsie",
        "text": "Elsie pinta junto al camino principal, al oeste de la Tienda General. Las colmenas se guardan en la Granja de Hollin.",
        "where": "🎨 Elsie (Pintora)",
        "npc": "Elsie",
        "coords": {
          "label": "🎨 Elsie (Pintora)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5350,
          "wy": 4700,
          "worldRect": [
            5200,
            4600,
            250,
            200
          ]
        },
        "items": [
          {
            "id": "Honey",
            "name": "Miel",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  },
  "s_elsie": {
    "id": "sd_elsie",
    "name": "Secundaria: Miel para las Pinturas",
    "rawName": "Honey for the Paints",
    "chain": "sidequest",
    "chapter": null,
    "giver": "Elsie",
    "location": "🎨 Elsie (Pintora)",
    "coords": {
      "label": "🎨 Elsie (Pintora)",
      "regionId": "bloomshire_town",
      "subZoneId": "bloomshire_town_sub_1_bloomshire",
      "wx": 5350,
      "wy": 4700,
      "worldRect": [
        5200,
        4600,
        250,
        200
      ]
    },
    "reward": {
      "gold": 1000
    },
    "steps": [
      {
        "step": 1,
        "name": "Habla con Elsie",
        "text": "Elsie pinta junto al camino principal, al oeste de la Tienda General.",
        "where": "🎨 Elsie (Pintora)",
        "npc": "Elsie",
        "coords": {
          "label": "🎨 Elsie (Pintora)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5350,
          "wy": 4700,
          "worldRect": [
            5200,
            4600,
            250,
            200
          ]
        },
        "items": []
      },
      {
        "step": 2,
        "name": "Llévale cinco miel a Elsie",
        "text": "Elsie pinta junto al camino principal, al oeste de la Tienda General. Las colmenas se guardan en la Granja de Hollin.",
        "where": "🎨 Elsie (Pintora)",
        "npc": "Elsie",
        "coords": {
          "label": "🎨 Elsie (Pintora)",
          "regionId": "bloomshire_town",
          "subZoneId": "bloomshire_town_sub_1_bloomshire",
          "wx": 5350,
          "wy": 4700,
          "worldRect": [
            5200,
            4600,
            250,
            200
          ]
        },
        "items": [
          {
            "id": "Honey",
            "name": "Miel",
            "needed": 5,
            "grown": false
          }
        ]
      }
    ]
  }
};

// Aliases canónicos para s_* y sd_*
  ['marlow', 'hollis', 'wren', 'juniper', 'bram', 'tamsin', 'pell', 'hazel', 'hugo', 'mabel', 'lena', 'clara', 'elsie'].forEach(k => {
    if (KNOWN_QUESTS['sd_' + k] && !KNOWN_QUESTS['s_' + k]) {
      KNOWN_QUESTS['s_' + k] = KNOWN_QUESTS['sd_' + k];
    }
    if (KNOWN_QUESTS['s_' + k] && !KNOWN_QUESTS['sd_' + k]) {
      KNOWN_QUESTS['sd_' + k] = KNOWN_QUESTS['s_' + k];
    }
  });
  if (KNOWN_QUESTS['bk18'] && !KNOWN_QUESTS['ff18']) {
    KNOWN_QUESTS['ff18'] = KNOWN_QUESTS['bk18'];
  }
  if (KNOWN_QUESTS['bk19'] && !KNOWN_QUESTS['ff19']) {
    KNOWN_QUESTS['ff19'] = KNOWN_QUESTS['bk19'];
  }
  [20, 21, 22, 23, 24].forEach(n => {
    if (KNOWN_QUESTS['bk' + n] && !KNOWN_QUESTS['ff' + n]) {
      KNOWN_QUESTS['ff' + n] = KNOWN_QUESTS['bk' + n];
    }
  });

  function translateQuestText(txt) {
    if (!txt || typeof txt !== 'string') return '';
    return txt
      .replace(/The Hidden Glade/gi, 'El Claro Escondido')
      .replace(/Look at the arch (of|de) roots/gi, 'Examina el arco de raíces en Whisperwood')
      .replace(/Talk to /gi, 'Habla con ')
      .replace(/Return to /gi, 'Regresa con ')
      .replace(/Bring /gi, 'Lleva ')
      .replace(/Harvest /gi, 'Cosecha ')
      .replace(/Plant /gi, 'Planta ')
      .replace(/Chase off the grey wolf/gi, 'Ahuyenta al lobo gris')
      .replace(/in Whisperwood/gi, 'en Whisperwood');
  }

  // Algoritmo exacto de rules.js (Energy.#walk + THE REWORK 2026-10-26)
  function computeLiveEnergyAndBed(saveEnergy, saveRoot, liveEnergyOverride) {
    const now = Date.now();
    const maxE = 150;
    const regenRate = 1 / (3 * 60000); // +1 energía cada 3 minutos (VIP / 10 Founding Farmers)

    if (typeof saveEnergy === 'number') {
      const val = typeof liveEnergyOverride === 'number' ? liveEnergyOverride : Math.floor(Math.min(maxE, Math.max(0, saveEnergy)));
      return {
        currentEnergy: val,
        rawEnergyObj: null,
        energyMeta: {
          recovering: false,
          recoverMinutesLeft: 0,
          canRest: val < maxE,
          sleepExhausted: false,
          nextRestMinutes: 0,
          bedWaitText: 'Lista (450/450⚡)',
          sleepLeft: 450,
          sleepADay: 450,
          usedSleepToday: 0,
          foodEatenHalfDay: 0,
          foodCapHalfDay: 90,
          regenPer3Min: 1
        }
      };
    }

    const e = (saveEnergy && typeof saveEnergy === 'object') ? saveEnergy : {};
    let v = typeof e.v === 'number' ? e.v : maxE;
    let t = (typeof e.at === 'number' && e.at > 0) ? e.at : now;
    const r = (e.recovery && typeof e.recovery === 'object') ? e.recovery : null;
    // VIP activo para 10 Founding Farmers o save.vipUntil
    const vipTo = Math.max(saveRoot?.vipUntil ?? 0, saveRoot?.perks?.vipUntil ?? 0, now + 86400000);

    let sleptGain = 0;
    const grow = (to, rate) => {
      if (to > t) {
        if (v < maxE) {
          v = Math.min(maxE, v + rate * (to - t));
        }
        t = to;
      }
    };
    const idle = (to) => {
      if (vipTo > t) {
        grow(Math.min(to, vipTo), regenRate);
      }
      if (to > t) t = to;
    };

    if (r && typeof r.from === 'number' && typeof r.until === 'number' && typeof r.rate === 'number') {
      idle(Math.min(now, r.from));
      const before = v;
      grow(Math.min(now, r.until), r.rate);
      sleptGain = Math.max(0, v - before);
    }
    idle(now);
    if (v < maxE && maxE - v < 1e-3) v = maxE;
    const ceiling = Math.max(maxE, typeof e.v === 'number' ? e.v : 0);
    const exactVal = Math.max(0, Math.min(ceiling, v));
    const currentEnergy = Math.floor(Math.max(
      exactVal,
      typeof liveEnergyOverride === 'number' ? liveEnergyOverride : 0
    ));

    // Cuota diaria de sueño (THE REWORK 2026-10-26: 3 barras = 450⚡ por día UTC para VIP/Founders)
    const utcDay = Math.floor(now / 86400000);
    const sleepADay = 450;
    let usedSleepToday = (e.slept && e.slept.day === utcDay)
      ? (Number(e.slept.n) || 0)
      : (typeof e.sleepLeft === 'number' ? Math.max(0, sleepADay - e.sleepLeft) : 0);
    if (r) {
      const rDay = r.day ?? Math.floor((r.from || now) / 86400000);
      if (rDay === utcDay) usedSleepToday += sleptGain;
    }
    const sleepLeft = typeof e.sleepLeft === 'number'
      ? Math.max(0, Math.round(e.sleepLeft))
      : Math.max(0, Math.round(sleepADay - usedSleepToday));

    const recovering = Boolean(r && now < (r.until || 0) && exactVal < maxE - 1e-3);
    const recoverMinutesLeft = recovering ? Math.max(1, Math.ceil((r.until - now) / 60000)) : 0;

    // Si agotó los 450⚡ de sueño del día UTC, espera hasta la próxima medianoche UTC (00:00 UTC)
    const sleepExhausted = sleepLeft <= 0;
    const msToNextUtcMidnight = ((utcDay + 1) * 86400000) - now;
    const nextRestMinutes = sleepExhausted ? Math.max(1, Math.ceil(msToNextUtcMidnight / 60000)) : 0;
    const canRest = !recovering && !sleepExhausted && currentEnergy < maxE;

    const hoursWait = Math.floor(nextRestMinutes / 60);
    const minsWait = nextRestMinutes % 60;
    const bedWaitText = recovering
      ? `Recuperando (${recoverMinutesLeft}m)`
      : sleepExhausted
        ? `${hoursWait}h ${minsWait}m`
        : `Lista (${sleepLeft}/${sleepADay}⚡)`;

    // Comida por medio día UTC (12h): 90⚡ para VIP/Founders (60% de 150)
    const utcHalf = Math.floor(now / 43200000);
    const foodEatenHalfDay = (e.eaten && e.eaten.half === utcHalf) ? Math.round(Number(e.eaten.n) || 0) : 0;
    const foodCapHalfDay = 90;

    return {
      currentEnergy,
      rawEnergyObj: {
        v: e.v,
        at: e.at,
        recovery: e.recovery || null,
        slept: e.slept || null,
        eaten: e.eaten || null
      },
      energyMeta: {
        recovering,
        recoverMinutesLeft,
        canRest,
        sleepExhausted,
        nextRestMinutes,
        bedWaitText,
        sleepLeft,
        sleepADay,
        usedSleepToday: Math.round(usedSleepToday),
        foodEatenHalfDay,
        foodCapHalfDay,
        regenPer3Min: 1
      }
    };
  }

  function parseSave(save) {
    if (!save || typeof save !== 'object') return null;
    latestRawSave = save;

    const purse = save.purse || {};
    const gold = typeof purse.gold === 'number' ? purse.gold : (typeof save.gold === 'number' ? save.gold : (latestBloomshireState?.gold ?? 0));
    const shards = typeof purse.shards === 'number' ? purse.shards : (typeof save.shards === 'number' ? save.shards : (latestBloomshireState?.shards ?? 0));
    const avyn = typeof purse.avyn === 'number' ? purse.avyn : (typeof save.avyn === 'number' ? save.avyn : (latestBloomshireState?.avyn ?? 0));
    const bank = typeof purse.bank === 'number' ? purse.bank : (latestBloomshireState?.bank ?? 0);

    // 1. ENERGÍA EXACTA (#walk + +1 cada 3m VIP) Y MONITOR DE CAMA (450⚡/día UTC + Reset 00:00 UTC)
    const maxE = 150;
    const rawEnergyInput = save._liveEnergyObj || (save.energy && typeof save.energy === 'object' ? save.energy : (typeof save.energy === 'number' ? { v: save.energy } : {}));
    const { currentEnergy: energy, rawEnergyObj, energyMeta } = computeLiveEnergyAndBed(
      rawEnergyInput,
      save,
      typeof save._liveEnergy === 'number' ? save._liveEnergy : undefined
    );

    // 2. LAS 10 HABILIDADES REALES Y FÓRMULA OFICIAL DE CATALOG.JS: Math.round(100 * (L - 1) ** 2.7)
    const xpFor = (L) => (L <= 1 ? 0 : Math.round(100 * (L - 1) ** 2.7));
    const calcSkillProgress = (xpVal) => {
      const rawXp = Math.max(0, typeof xpVal === 'number' ? xpVal : (typeof xpVal?.xp === 'number' ? xpVal.xp : 0));
      let L = 1;
      while (L < 30 && rawXp >= xpFor(L + 1)) L++;
      const base = xpFor(L);
      const next = L >= 30 ? base : xpFor(L + 1);
      const into = Math.max(0, Math.round(rawXp - base));
      const need = Math.max(1, Math.round(next - base));
      const pct = L >= 30 ? 100 : Math.min(100, Math.round((into / need) * 100));
      return {
        xp: Math.round(rawXp),
        level: L,
        rawLevel: L,
        effectiveLevel: L,
        into,
        need,
        nextLevelXp: next,
        pct
      };
    };

    let farmingLevel = 5;
    let skillsBreakdown = {};
    let skillsMeta = {
      minSkillKey: 'foraging',
      minSkillName: 'Recolección y Cocina',
      minSkillsList: ['Recolección', 'Cocina'],
      minSkillLevel: 2,
      maxAllowedLevel: 5,
      isFarmingCapped: true
    };

    if (save.skills && typeof save.skills === 'object') {
      ALL_SKILLS_DEFS.forEach(def => {
        const val = save.skills[def.key] ?? 0;
        const prog = calcSkillProgress(val);
        skillsBreakdown[def.key] = {
          ...prog,
          key: def.key,
          label: def.label,
          icon: def.icon,
          gated: def.gated
        };
      });

      // La regla de los 3 niveles (SKILL_GAP = 3) solo evalúa las 8 GATED_SKILLS (excluye husbandry y exploration)
      let minLvl = 30;
      GATED_SKILLS.forEach(k => {
        const lvl = skillsBreakdown[k]?.rawLevel ?? 1;
        if (lvl < minLvl) minLvl = lvl;
      });
      if (minLvl === 30) minLvl = 1;

      const minSkillsObjs = ALL_SKILLS_DEFS.filter(d => d.gated && (skillsBreakdown[d.key]?.rawLevel ?? 1) === minLvl);
      const minSkillsLabels = minSkillsObjs.map(d => d.label);
      const maxAllowed = Math.min(30, minLvl + 3);

      const farmRaw = skillsBreakdown.farming?.rawLevel || 5;
      farmingLevel = Math.max(1, Math.min(farmRaw, maxAllowed));

      ALL_SKILLS_DEFS.forEach(def => {
        const sk = skillsBreakdown[def.key];
        if (!sk) return;
        if (def.gated) {
          sk.effectiveLevel = Math.min(sk.rawLevel, maxAllowed);
          sk.isLowestGated = sk.rawLevel === minLvl;
          sk.capped = sk.rawLevel >= maxAllowed && sk.rawLevel > minLvl;
        } else {
          sk.effectiveLevel = sk.rawLevel;
          sk.isLowestGated = false;
          sk.capped = false;
        }
      });

      skillsMeta = {
        minSkillKey: minSkillsObjs[0]?.key || 'foraging',
        minSkillName: minSkillsLabels.length > 0 ? minSkillsLabels.join(' y ') : 'Recolección',
        minSkillsList: minSkillsLabels,
        minSkillLevel: minLvl,
        maxAllowedLevel: maxAllowed,
        rawFarmingLevel: farmRaw,
        isFarmingCapped: farmRaw >= maxAllowed
      };
    } else if (typeof save.level === 'number' && save.level > 0) {
      farmingLevel = save.level;
    }

    // 3. EXTRAER INVENTARIO (hotbar, bag, chests)
    const inventory = [];
    const inv = save.inventory || {};
    const pushSlot = (slot, area) => {
      if (!slot || !slot.id) return;
      const id = String(slot.id);
      const qty = typeof slot.n === 'number' ? slot.n : (typeof slot.qty === 'number' ? slot.qty : 1);
      if (qty <= 0) return;
      const found = inventory.find(x => x.id.toLowerCase() === id.toLowerCase() && x.area === area);
      if (found) {
        found.qty += qty;
      } else {
        inventory.push({ id, name: id, qty, area, tier: slot.tier || null });
      }
    };

    if (Array.isArray(inv.hotbar)) inv.hotbar.forEach(s => pushSlot(s, 'hotbar'));
    if (Array.isArray(inv.bag)) inv.bag.forEach(s => pushSlot(s, 'bag'));

    // Chests del jugador (inv.chests o save.chests)
    const allChests = inv.chests || save.chests || {};
    if (allChests && typeof allChests === 'object') {
      Object.entries(allChests).forEach(([cId, cSlots]) => {
        const slotsList = Array.isArray(cSlots) ? cSlots : (cSlots && typeof cSlots === 'object' ? Object.values(cSlots) : []);
        slotsList.forEach(s => pushSlot(s, `chest:${cId}`));
      });
    }

    // Stash / Storehouse de Bloomshire (Cofre del Pueblo oficial: inv.stash / save.stash / storehouse / storage)
    const stashCandidates = [
      inv.stash,
      save.stash,
      inv.storehouse,
      save.storehouse,
      inv.town,
      save.town,
      inv.storage,
      save.storage,
      inv.communityChest,
      save.communityChest
    ];

    stashCandidates.forEach(cand => {
      if (!cand) return;
      const slotsList = Array.isArray(cand) ? cand : (typeof cand === 'object' ? Object.values(cand) : []);
      slotsList.forEach(s => {
        if (s && (s.id || s.item)) pushSlot(s, 'chest:storehouse');
      });
    });

    console.log('[Bloomshire Companion Bridge] Diagnóstico detallado de almacenamiento:', {
      invChestsKeys: inv.chests ? Object.keys(inv.chests) : null,
      saveChestsKeys: save.chests ? Object.keys(save.chests) : null,
      invStashCount: Array.isArray(inv.stash) ? inv.stash.length : (inv.stash ? Object.keys(inv.stash).length : 0),
      saveStashCount: Array.isArray(save.stash) ? save.stash.length : (save.stash ? Object.keys(save.stash).length : 0),
      hasStorehouse: Boolean(inv.storehouse || save.storehouse),
      hasStorage: Boolean(inv.storage || save.storage),
      rawKeysInInv: Object.keys(inv),
      totalExtractedItems: inventory.length
    });

    if (inventory.length === 0 && save.pack && typeof save.pack === 'object') {
      for (const [id, val] of Object.entries(save.pack)) {
        const qty = typeof val === 'number' ? val : (val?.n ?? 0);
        if (qty > 0) inventory.push({ id, name: id, qty, area: 'pack' });
      }
    }

    const finalInventory = (inventory.length > 0) ? inventory : (latestBloomshireState?.inventory || []);

    // 4. ÓRDENES ACTIVAS DE ODETTE (save.orders.list y save.orders.done)
    const activeOrders = [];
    const rawOrdersList = Array.isArray(save.orders?.list)
      ? save.orders.list
      : (Array.isArray(save.orders) ? save.orders : []);
    const doneIds = new Set(Array.isArray(save.orders?.done) ? save.orders.done : []);

    if (rawOrdersList.length > 0) {
      rawOrdersList.forEach((o, idx) => {
        if (o && o.item) {
          const rawItem = String(o.item);
          const itemName = ITEM_NAMES_ES[rawItem] || rawItem;
          activeOrders.push({
            id: o.id || `ord_${idx}`,
            item: itemName,
            rawItem,
            n: o.n || o.amount || 1,
            gold: o.gold || o.payoutGold || 0,
            xp: o.xp || o.xpReward || 0,
            skill: o.skill || 'farming',
            done: doneIds.has(o.id) || Boolean(o.done)
          });
        }
      });
    }

    // 5. EXTRACTOR REAL DE MISIONES (save.quests + catálogo dinámico)
    const questCatalogMap = {};
    if (Array.isArray(save._questCatalog)) {
      save._questCatalog.forEach(q => {
        if (q && q.id) questCatalogMap[q.id] = q;
      });
    }

    const questsState = (save.quests && typeof save.quests === 'object' && !Array.isArray(save.quests))
      ? save.quests
      : {};

    const activeQuestsList = [];
    const completedQuestsList = [];
    let highestBookChapterDone = 0;
    let currentBookChapter = 10;

    Object.entries(questsState).forEach(([qId, qVal]) => {
      if (!qVal || typeof qVal !== 'object') return;
      const normalizedId = qId.toLowerCase().trim();
      const serverDef = questCatalogMap[qId] || questCatalogMap[normalizedId];
      const fallbackDef = KNOWN_QUESTS[normalizedId]
        || KNOWN_QUESTS[normalizedId.replace(/^sd_/, 's_')]
        || KNOWN_QUESTS[normalizedId.replace(/^s_/, 'sd_')]
        || KNOWN_QUESTS[qId];

      const isBook = normalizedId.startsWith('bk') || normalizedId.startsWith('ff');
      const chapNum = isBook ? (parseInt(normalizedId.replace(/^(bk|ff)/, ''), 10) || 0) : null;

      const rawTitle = fallbackDef?.name || serverDef?.name || `Misión ${qId.toUpperCase()}`;
      const title = translateQuestText(rawTitle);
      let stepIdx = typeof qVal.step === 'number' ? qVal.step : 0;

      // Obtener la definición de pasos canónica (SIEMPRE CLONADA PARA NO MUTAR EL OBJETO EN MEMORIA)
      const baseSteps = (fallbackDef?.steps && fallbackDef.steps.length > 0) ? fallbackDef.steps : (serverDef?.steps || []);
      const stepsArr = baseSteps.map(s => ({
        ...s,
        items: Array.isArray(s.items) ? s.items.map(it => ({ ...it })) : []
      }));
      const totalSteps = stepsArr.length;

      // Resolución 100% DINÁMICA y AUTOMATIZADA:
      // Jamás limitar stepIdx a totalSteps - 1. Si el jugador avanza a un paso no catalogado previamente,
      // generamos dinámicamente los pasos para que los anteriores se marquen completados y el nuevo quede activo solo.
      if (typeof qVal.step === 'number') {
        stepIdx = Math.max(0, qVal.step);
      } else if ((normalizedId === 'sd_bram' || normalizedId === 's_bram') && Array.isArray(qVal.parts)) {
        const nextIncomplete = qVal.parts.findIndex(p => p !== true);
        if (nextIncomplete >= 0) stepIdx = nextIncomplete;
      }

      // AUTO-AVANCE DE PASOS DE NIVEL:
      // Si el paso actual exige alcanzar un nivel de habilidad (ej: Nivel 4 de Cultivo)
      // y el jugador ya tiene ese nivel o más, auto-avanzar al siguiente paso.
      while (stepIdx < stepsArr.length) {
        const curS = stepsArr[stepIdx];
        const combined = ((curS?.name || '') + ' ' + (curS?.text || '')).toLowerCase();
        
        let reqLevel = null;
        let reqSkill = null;

        if (curS?.kind === 'level' && curS?.n) {
          reqLevel = curS.n;
          reqSkill = curS.skill;
        } else {
          const match = combined.match(/(?:nivel|level)\s*(\d+)\s*(?:de\s*)?([a-zA-Záéíóúñ]+)/i);
          if (match) {
            reqLevel = parseInt(match[1], 10);
            const skWord = match[2].toLowerCase();
            if (skWord.includes('cultiv') || skWord.includes('farm')) reqSkill = 'farming';
            else if (skWord.includes('miner') || skWord.includes('mine')) reqSkill = 'mining';
            else if (skWord.includes('pesc') || skWord.includes('fish')) reqSkill = 'fishing';
            else if (skWord.includes('tal') || skWord.includes('wood')) reqSkill = 'woodcutting';
            else if (skWord.includes('cocin') || skWord.includes('cook')) reqSkill = 'cooking';
          }
        }

        if (reqLevel && reqSkill) {
          const currentSkillLvl = skillsBreakdown[reqSkill]?.level || (reqSkill === 'farming' ? farmingLevel : 1);
          if (currentSkillLvl >= reqLevel) {
            stepIdx++;
            continue;
          }
        }
        break;
      }

      // Si el juego está en un paso que excede los conocidos, expandir stepsArr dinámicamente
      while (stepsArr.length <= stepIdx) {
        const nextStepNum = stepsArr.length + 1;
        const dynamicName = (nextStepNum === stepIdx + 1 && (qVal.stepName || qVal.stepText || qVal.text || qVal.name))
          ? (qVal.stepName || qVal.stepText || qVal.text || qVal.name)
          : `Paso ${nextStepNum}: Continúa la misión`;
        const dynamicText = (nextStepNum === stepIdx + 1 && (qVal.text || qVal.desc || qVal.objective))
          ? (qVal.text || qVal.desc || qVal.objective)
          : `Objetivo en curso. Consulta el panel de misiones en el juego (M) o habla con ${fallbackDef?.giver || 'el personaje'}.`;
        
        stepsArr.push({
          step: nextStepNum,
          name: dynamicName,
          text: dynamicText,
          where: fallbackDef?.location || 'Ver indicador de misión en el mapa (M)',
          npc: fallbackDef?.giver || 'Vecino de Bloomshire',
          coords: fallbackDef?.coords || null,
          items: []
        });
      }

      const currentStepDef = stepsArr[stepIdx] || (stepIdx > 0 && stepsArr.length > 0 ? stepsArr[stepsArr.length - 1] : null);

      const rawStepName = currentStepDef?.name || (totalSteps > 0 ? `Paso ${stepIdx + 1}` : fallbackDef?.hint || `Paso ${stepIdx + 1}`);
      const rawStepText = currentStepDef?.text || currentStepDef?.where || fallbackDef?.hint || serverDef?.summary || `Paso ${stepIdx + 1}`;

      const targetN = currentStepDef?.targetN || currentStepDef?.n || currentStepDef?.count || null;
      const progN = typeof qVal.n === 'number' ? qVal.n : (typeof qVal.fish === 'number' ? qVal.fish : (typeof qVal.progress === 'number' ? qVal.progress : 0));
      let stepText = translateQuestText(rawStepText);
      if ((normalizedId === 'bk21' || normalizedId === 'ff21') && stepIdx === 2) {
        stepText = `Pesca 30 peces en la Laguna (fish ${progN}/30)`;
      } else if (targetN && targetN > 1) {
        stepText = `${stepText} (${progN}/${targetN})`;
      }
      const whereHint = translateQuestText(currentStepDef?.where || fallbackDef?.location || fallbackDef?.hint || 'Pulsa M en el juego para ver el rombo de misión.');
      const coords = currentStepDef?.coords || fallbackDef?.coords || null;
      const stepItems = currentStepDef?.items || [];
      const giver = fallbackDef?.giver || fallbackDef?.npc || 'Vecino de Bloomshire';

      if (qVal.done || qVal.skipped) {
        if (isBook && chapNum > highestBookChapterDone) {
          highestBookChapterDone = chapNum;
        }
        completedQuestsList.push({
          id: qId,
          normalizedId,
          name: title,
          chapter: chapNum,
          doneAt: qVal.done || null,
          isMainStory: isBook
        });
      } else {
        if (isBook && chapNum) {
          currentBookChapter = chapNum;
        }
        activeQuestsList.push({
          id: qId,
          normalizedId,
          name: title,
          title,
          chapter: chapNum,
          step: stepIdx + 1,
          stepIdx,
          totalSteps: totalSteps > 0 ? totalSteps : (stepIdx + 1),
          stepName: rawStepName,
          objective: stepText,
          stepText,
          where: whereHint,
          coords,
          giver,
          stepItems,
          allSteps: stepsArr,
          progressN: progN,
          targetN,
          isMainStory: isBook
        });
      }
    });

    // Ordenar: historia principal primero
    activeQuestsList.sort((a, b) => (b.isMainStory ? 1 : 0) - (a.isMainStory ? 1 : 0));

    if (activeQuestsList.length === 0 && highestBookChapterDone > 0) {
      currentBookChapter = highestBookChapterDone;
    }

    const primaryActiveQuest = activeQuestsList[0];
    const activeQuestLabel = primaryActiveQuest
      ? `${primaryActiveQuest.name} — ${primaryActiveQuest.objective}`
      : (highestBookChapterDone >= 17
        ? 'Libro 1 Completado — Moonmere Desbloqueado'
        : `Libro 1: Cap. ${currentBookChapter} en curso`);

    const isMoonmereChapter = currentBookChapter >= 18;
    const effectiveDone = Math.max(highestBookChapterDone, isMoonmereChapter ? (currentBookChapter - 1) : 0);
    const moonmereProgress = {
      currentChapter: currentBookChapter,
      completedChapters: effectiveDone,
      targetChapter: 24,
      totalChaptersRequired: 24,
      unlocked: highestBookChapterDone >= 17 || currentBookChapter >= 18,
      moonmereUnlocked: highestBookChapterDone >= 17 || currentBookChapter >= 18,
      moonmereIndex: isMoonmereChapter ? (currentBookChapter - 17) : 0,
      totalMoonmereChapters: 7,
      chaptersRemaining: Math.max(0, 24 - effectiveDone)
    };

    const snapshot = {
      game: 'bloomshire',
      wallet: (function() {
        let detected = save.wallet || save.account || null;
        if (!detected) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              const v = localStorage.getItem(k) || '';
              if (k.startsWith('bloomshire.gameWallet.') || v.includes('0x')) {
                const m = v.match(/0x[a-fA-F0-9]{40}/);
                if (m) { detected = m[0]; break; }
              }
            }
          } catch (_) {}
        }
        if (!detected) {
          try { detected = localStorage.getItem('bloomshire_wallet'); } catch (_) {}
        }
        return detected || '0xD3E0147850EC171EED26C2A28A23Eb29424d89d5';
      })(),
      gold,
      currentEnergy: energy,
      maxEnergy: maxE,
      rawEnergyObj,
      energyMeta,
      shards,
      avyn,
      bank,
      farmingLevel,
      farmersCount: 10,
      inventory: finalInventory,
      activeOrders: activeOrders.length > 0 ? activeOrders : (latestBloomshireState?.activeOrders || []),
      activeQuest: activeQuestLabel,
      activeQuestsList,
      completedQuestsCount: completedQuestsList.length,
      moonmereProgress,
      activeCrops: save._activeCrops || [],
      liveProductionPots: save._liveProductionPots || [],
      dailyTasks: save._dailyTasks || save.tasks || save.dailyTasks || [],
      marketTrades: save._marketTrades || null,
      serverTimeOffset: save._serverTimeOffset || 0,
      activeGameBuild: save._activeGameBuild || "2c7e9a3532e5",
      skills: save.skills || {},
      skillsBreakdown,
      skillsMeta,
      timestamp: Date.now()
    };

    latestBloomshireState = snapshot;
    return snapshot;
  }

  function isExtensionContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome?.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function sendSnapshotToBackground(parsed, force = false) {
    if (!parsed) return;
    if (!isExtensionContextValid()) return;
    try {
      const res = chrome.runtime.sendMessage({
        type: 'BLOOMSHIRE_STATE_UPDATE',
        force: Boolean(force),
        data: parsed
      }, () => {
        // Consumir lastError para que Chrome no lo marque en rojo en Extensiones
        try { const _ = chrome.runtime?.lastError; } catch (_) {}
      });
      if (res && typeof res.catch === 'function') {
        res.catch(() => { });
      }
    } catch (err) {
      // Silencioso ante recargas o desconexión
      return;
    }
  }

  // Escuchar mensajes de content_hook.js asegurando mismo contexto de ventana
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === '__BLOOMSHIRE_RAW_STATE' && event.data.payload) {
      const parsed = parseSave(event.data.payload);
      if (parsed) {
        console.log('[Bloomshire Companion Bridge] Estado extraído con éxito:', {
          gold: parsed.gold,
          energy: parsed.currentEnergy,
          bed: parsed.energyMeta?.bedWaitText,
          level: parsed.farmingLevel,
          items: parsed.inventory.length,
          orders: parsed.activeOrders.length,
          quest: parsed.activeQuest
        });
        sendSnapshotToBackground(parsed, Boolean(event.data.force));
      }
    } else if (event.data?.type === '__BLOOMSHIRE_MAP_IMAGE' && event.data.payload) {
      const mapPayload = event.data.payload;
      try {
        chrome.runtime.sendMessage({
          type: 'BLOOMSHIRE_MAP_UPDATE',
          payload: mapPayload
        }, () => {
          try { const _ = chrome.runtime?.lastError; } catch (_) {}
        });
      } catch (err) { }
      // Notificar actualización de mapa de forma desacoplada sin inflar el snapshot general
      if (latestBloomshireState) {
        sendSnapshotToBackground({
          ...latestBloomshireState,
          timestamp: Date.now()
        }, false);
      }
    }
  });

  // Recalcular energía pasiva VIP (+1 cada 3m) y reloj de cama cada 20s sin hacer fetch extra
  setInterval(() => {
    if (!latestRawSave || !latestBloomshireState) return;
    const prevE = latestBloomshireState.currentEnergy;
    const prevBed = latestBloomshireState.energyMeta?.bedWaitText;
    const updated = parseSave(latestRawSave);
    if (updated && (updated.currentEnergy !== prevE || updated.energyMeta?.bedWaitText !== prevBed)) {
      sendSnapshotToBackground(updated, false);
    }
  }, 20000);

  // Escuchar petición de sync forzada desde background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'TRIGGER_FORCE_SYNC') {
      console.log('[Bloomshire Companion Bridge] TRIGGER_FORCE_SYNC recibido');
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      sendResponse({ ok: true });
      return false;
    }
    
    if (message && message.type === 'FETCH_MARKET_OFFERS_ON_DEMAND') {
      console.log('[Bloomshire Companion Bridge] FETCH_MARKET_OFFERS_ON_DEMAND recibido de background');
      window.postMessage({ type: '__FETCH_MARKET_OFFERS_REQ' }, '*');
      sendResponse({ ok: true });
      return false;
    }

    if (message && message.type === 'TRIGGER_REAL_MAPS_SYNC') {
      console.log('[Bloomshire Companion Bridge] TRIGGER_REAL_MAPS_SYNC recibido');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
