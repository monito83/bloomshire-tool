// src/components/bloomshire/logbook/logbookDemoData.js
// Datos de DEMOSTRACION para desarrollo local (vite dev sin /api) y tests.
// No es contenido real de Leonman: solo ejercita todos los tipos de bloque.
// Se importa de forma dinamica y solo en import.meta.env.DEV, asi no entra al build.

const S_GUIDES = '11111111-1111-4111-8111-111111111111';
const S_ZONES = '22222222-2222-4222-8222-222222222222';
const S_WHISPER = '33333333-3333-4333-8333-333333333333';
const S_DRAFTLIKE = '44444444-4444-4444-8444-444444444444';

export const DEMO_SECTIONS = [
  { id: S_GUIDES, parent_id: null, slug: 'guides', title_en: 'Guides', title_es: 'Guías', description_en: 'Step-by-step walkthroughs.', description_es: 'Recorridos paso a paso.', icon: '📜', sort: 0 },
  { id: S_ZONES, parent_id: null, slug: 'zones', title_en: 'Zones', title_es: 'Zonas', description_en: 'Notes organised by area.', description_es: 'Notas organizadas por zona.', icon: '🗺️', sort: 1 },
  { id: S_WHISPER, parent_id: S_ZONES, slug: 'whisperwood', title_en: 'Whisperwood', title_es: 'Whisperwood', description_en: '', description_es: '', icon: '🌲', sort: 0 },
  { id: S_DRAFTLIKE, parent_id: null, slug: 'cooking', title_en: 'Cooking', title_es: 'Cocina', description_en: 'Recipe tables and quick picks.', description_es: 'Tablas de recetas y elecciones rápidas.', icon: '🍲', sort: 2 }
];

const E1 = 'aaaaaaa1-0000-4000-8000-000000000001';
const E2 = 'aaaaaaa2-0000-4000-8000-000000000002';
const E3 = 'aaaaaaa3-0000-4000-8000-000000000003';

export const DEMO_ENTRIES = [
  {
    id: E1,
    section_id: S_GUIDES,
    slug: 'layout-showcase',
    title_en: 'Sample guide: how an entry looks',
    title_es: 'Guía de ejemplo: cómo se ve una entrada',
    summary_en: 'Demo entry that shows every block type: text, tables, callouts, galleries, video, places and stat cards.',
    summary_es: 'Entrada de demostración con todos los tipos de bloque: texto, tablas, avisos, galerías, video, lugares y tarjetas.',
    tags: ['demo', 'layout'],
    places: ['region:whisperwood', 'sub:moonmere_sub_3_the_lagoon_village'],
    cover_path: null,
    sort: 0,
    author: 'Leonman',
    published_at: '2026-11-05T12:00:00Z',
    updated_at: '2026-11-05T12:00:00Z',
    blocks: [
      { type: 'text', md_en: 'This is **demo content** used while developing locally. Real entries are written by Leonman from the admin panel.\n\nLinks work too: [the cooking section](#logbook/cooking) or an [external page](https://bloomshire.xyz).', md_es: 'Esto es **contenido de demostración** para el desarrollo local. Las entradas reales las escribe Leonman desde el panel de administración.\n\nLos enlaces también funcionan: [la sección de cocina](#logbook/cooking) o una [página externa](https://bloomshire.xyz).' },
      { type: 'statcards', cards: [
        { icon: '⏱️', value: '~15 min', label_en: 'Duration', label_es: 'Duración', hint_en: 'Sample value', hint_es: 'Valor de ejemplo' },
        { icon: '⚡', value: '40', label_en: 'Energy', label_es: 'Energía', hint_en: 'Sample value', hint_es: 'Valor de ejemplo' },
        { icon: '🎁', value: '3', label_en: 'Rewards', label_es: 'Recompensas', hint_en: '', hint_es: '' }
      ] },
      { type: 'heading', level: 2, text_en: 'Before you go', text_es: 'Antes de salir' },
      { type: 'list', ordered: false, items_en: ['Bring **food** for energy.', 'Check the weather first.', 'Empty some bag slots.'], items_es: ['Llevá **comida** para la energía.', 'Revisá el clima primero.', 'Dejá lugar libre en la mochila.'] },
      { type: 'callout', variant: 'tip', title_en: '', title_es: '', md_en: 'Callouts highlight tips, notes and warnings.', md_es: 'Los avisos destacan consejos, notas y advertencias.' },
      { type: 'place', key: 'region:whisperwood', note_en: 'Place blocks link straight to the Mega-Atlas.', note_es: 'Los bloques de lugar llevan directo al Mega-Atlas.' },
      { type: 'gallery', caption_en: 'Galleries number their pictures like the Discord posts ("picture 2").', caption_es: 'Las galerías numeran las imágenes como en Discord («picture 2»).', images: [
        { path: 'items/aloe.png', alt_en: 'Aloe', alt_es: 'Aloe' },
        { path: 'items/amethyst.png', alt_en: 'Amethyst', alt_es: 'Amatista' },
        { path: 'items/amulet.png', alt_en: 'Amulet', alt_es: 'Amuleto' }
      ] },
      { type: 'divider' },
      { type: 'table', md_en: '| Step | What to do | Notes |\n|---|---|---:|\n| 1 | Talk to the villager | sample |\n| 2 | Collect the items | sample |\n| 3 | Return | sample |', md_es: '| Paso | Qué hacer | Notas |\n|---|---|---:|\n| 1 | Hablar con el aldeano | ejemplo |\n| 2 | Juntar los ítems | ejemplo |\n| 3 | Volver | ejemplo |' },
      { type: 'callout', variant: 'warning', title_en: '', title_es: '', md_en: 'Raw HTML is shown as text: <script>alert(1)</script>', md_es: 'El HTML crudo se muestra como texto: <script>alert(1)</script>' }
    ]
  },
  {
    id: E2,
    section_id: S_WHISPER,
    slug: 'english-only-sample',
    title_en: 'English-only sample entry',
    title_es: '',
    summary_en: 'This entry has no Spanish translation, so Spanish readers see the English original.',
    summary_es: '',
    tags: ['demo'],
    places: ['region:whisperwood', 'npc:greta'],
    cover_path: null,
    sort: 0,
    author: 'Leonman',
    published_at: '2026-11-04T12:00:00Z',
    updated_at: '2026-11-04T12:00:00Z',
    blocks: [
      { type: 'text', md_en: 'Spanish is optional per entry and per block; missing parts fall back to English.', md_es: '' },
      { type: 'youtube', id: 'dQw4w9WgXcQ', title_en: 'Sample video (loads only on click)', title_es: '' }
    ]
  },
  {
    id: E3,
    section_id: S_DRAFTLIKE,
    slug: 'quick-picks-sample',
    title_en: 'Quick picks (sample table)',
    title_es: 'Elecciones rápidas (tabla de ejemplo)',
    summary_en: 'Table-heavy layout like the Hearth Cooking PDF.',
    summary_es: 'Diseño con tablas, como el PDF de cocina.',
    tags: ['demo', 'cooking'],
    places: [],
    cover_path: null,
    sort: 0,
    author: 'Leonman',
    published_at: '2026-11-03T12:00:00Z',
    updated_at: '2026-11-03T12:00:00Z',
    blocks: [
      { type: 'table', md_en: '| Goal | Pick |\n|---|---|\n| Sample A | Dish 1 |\n| Sample B | Dish 2 |', md_es: '| Objetivo | Elección |\n|---|---|\n| Ejemplo A | Plato 1 |\n| Ejemplo B | Plato 2 |' },
      { type: 'file', path: 'docs/sample.pdf', label_en: 'Sample PDF', label_es: 'PDF de ejemplo', bytes: 245760 }
    ]
  }
];

export const DEMO_PLACES = [];

export const DEMO_INDEX = {
  ok: true,
  demo: true,
  sections: DEMO_SECTIONS,
  entries: DEMO_ENTRIES.map(({ blocks, ...meta }) => meta),
  places: DEMO_PLACES,
  mediaBase: '/data/bloomshire'
};

export const getDemoEntry = (id) => DEMO_ENTRIES.find((e) => e.id === id) || null;
