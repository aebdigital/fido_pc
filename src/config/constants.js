// src/config/constants.js

export const WORK_TYPE_SUFFIXES = [
  ' Simple', ' Double', ' Triple', ' jednoduchý', ' dvojitý', ' trojitý'
];

export const WORK_ITEM_SUBTITLES = {
  PARTITION: ['partition', 'priečka'],
  OFFSET_WALL: ['offset wall', 'predsadená stena'],
  CEILING: ['ceiling', 'strop'],
  WALL: ['wall', 'stena'],
  ABOVE_60CM: ['above 60cm', 'nad 60cm']
};

export const MATERIAL_ITEM_NAMES = {
  ADHESIVE: 'Adhesive',
  PLASTERBOARD: 'Plasterboard',
  SADROKARTON: 'Sádrokartón',
  PAINT: 'Paint',
  TILES: 'Tiles',
  PAVINGS: 'Pavings',
  PARTITION_MASONRY: 'Partition masonry',
  LOAD_BEARING_MASONRY: 'Load-bearing masonry',
  MESH: 'Mesh',
  FACADE_PLASTER: 'Facade Plaster',
  CORNER_BEAD: 'Corner bead',
  PLASTER: 'Plaster',
  PRIMER: 'Primer',
  SELF_LEVELLING_COMPOUND: 'Self-levelling compound',
  SKIRTING_BOARD: 'Soklové lišty',
  SILICONE: 'Silicone',
  FLOATING_FLOOR: 'Floating floor',
  AUXILIARY_AND_FASTENING_MATERIAL: 'Auxiliary and fastening material'
};

export const MATERIAL_ITEM_SUBTITLES = {
  NETTING: 'netting',
  TILING_PAVING: 'tiling and paving'
};

export const WORK_ITEM_NAMES = {
  TILING: 'Tiling',
  OBKLAD: 'Obklad',
  PAVING: 'Paving',
  DLAZBA: 'Dlažba',
  NETTING: 'Netting',
  SIETKOVANIE: 'Sieťkovanie',
  SCAFFOLDING: 'Scaffolding',
  SCAFFOLDING_EN: 'Scaffolding',
  SCAFFOLDING_SK: 'Lešenie',
  LESENIE: 'Lešenie',
  CUSTOM_WORK: 'Custom work and material',
  JOURNEY: 'Journey',
  COMMUTE: 'Commute',
  TOOL_RENTAL: 'Tool rental',
  CORE_DRILL: 'Core Drill',
  LARGE_FORMAT: 'Large Format',
  JOLLY_EDGING: 'Jolly Edging',
  PLINTH: 'Plinth',

  // Field Names (Compound keys used in form state)
  LARGE_FORMAT_ABOVE_60CM_FIELD: 'Large Format_above 60cm',
  JOLLY_EDGING_FIELD: 'Jolly Edging',
  PLINTH_CUTTING_AND_GRINDING_FIELD: 'Plinth_cutting and grinding',
  PLINTH_BONDING_FIELD: 'Plinth_bonding',

  // Subtitles for matching
  ABOVE_60CM: 'above 60cm',
  CUTTING_AND_GRINDING: 'cutting and grinding',
  BONDING: 'bonding',

  // Field labels
  NUMBER_OF_OUTLETS_EN: 'Number of outlets',
  NUMBER_OF_OUTLETS_SK: 'Počet vývodov',
  DISTANCE_EN: 'Distance',
  DISTANCE_SK: 'Vzdialenosť',
  DURATION_EN: 'Duration',
  DURATION_SK: 'Trvanie',
  RENTAL_DURATION: 'Rental duration',

  // Common Field Names
  WIDTH: 'Width',
  HEIGHT: 'Height',
  LENGTH: 'Length',
  DOORS: 'Doors',
  WINDOWS: 'Windows',
  COUNT: 'Count',
  PRICE: 'Price',
  NAME: 'Name',
  QUANTITY: 'Quantity',
  UNIT: 'Unit',
  CIRCUMFERENCE: 'Circumference',

  // Localized work names
  PREPARATORY_AND_DEMOLITION_WORKS: 'Preparatory and demolition works',
  ELECTRICAL_INSTALLATION_WORK: 'Elektroinštalačné práce',
  PLUMBING_WORK: 'Vodoinštalačné práce',
  BRICK_PARTITIONS: 'Brick partitions',
  BRICK_LOAD_BEARING_WALL: 'Brick load-bearing wall',
  PLASTERBOARDING: 'Plasterboarding',
  SADROKARTON: 'Sádrokartón',
  PLASTERING: 'Plastering',
  FACADE_PLASTERING: 'Facade Plastering',
  INSTALLATION_OF_CORNER_BEAD: 'Installation of corner bead',
  PLASTERING_OF_WINDOW_SASH: 'Plastering of window sash',
  PENETRATION_COATING: 'Penetration coating',
  PAINTING: 'Painting',
  LEVELLING: 'Levelling',
  FLOATING_FLOOR: 'Floating floor',
  SKIRTING: 'Lištovanie',
  TILING_UNDER_60CM: 'Tiling under 60cm',
  PAVING_UNDER_60CM: 'Paving under 60cm',
  GROUTING: 'Grouting',
  SILICONING: 'Siliconing',
  SANITARY_INSTALLATIONS: 'Sanitary installations',
  WINDOW_INSTALLATION: 'Window installation',
  INSTALLATION_OF_DOOR_JAMB: 'Installation of door jamb',
  CUSTOM_WORK_AND_MATERIAL: 'Custom work and material',
  AUXILIARY_AND_FINISHING_WORK: 'Auxiliary and finishing work',

  // Slovak specific names for mapping
  MUROVANIE_PRIECOK: 'Murovanie priečok',
  MUROVANIE_NOSNEHO_MURIVA: 'Murovanie nosného muriva',
  SADROKARTONARSKE_PRACE: 'Sadrokartonárske práce',
  OMIETKA: 'Omietka',
  OMIETKA_SPALETY: 'Omietka špalety',
  FASADNE_OMIETKY: 'Fasádne omietky',
  OSADENIE_ROHOVYCH_LIST: 'Osadenie rohových lišt',
  OSADENIE_ROHOVEJ_LISTY: 'Osadenie rohovej lišty',
  PENETRACNY_NATER: 'Penetračný náter',
  MALOVANIE: 'Maľovanie',
  VYROVNAVANIE: 'Vyrovnávanie',
  NIVELACKA: 'Nivelačka',
  PLAVAJUCA_PODLAHA: 'Plávajúca podlaha',
  SOKLOVE_LISTY: 'Soklové lišty',
  OBKLAD_DO_60CM: 'Obklad do 60cm',
  DLAZBA_DO_60_CM: 'Dlažba do 60 cm',
  SILIKONOVANIE: 'Silikónovanie',
  POMOCNE_A_UKONCOVACIE_PRACE: 'Pomocné a ukončovacie práce',

  // Display names for aggregated material items
  OKNA_DISPLAY_NAME: 'Okná',
  ZARUBNA_DISPLAY_NAME: 'Zárubne'
};

export const WORK_ITEM_PROPERTY_IDS = {
  PREPARATORY: 'preparatory',
  WIRING: 'wiring',
  PLUMBING: 'plumbing',
  BRICK_PARTITIONS: 'brick_partitions',
  BRICK_LOAD_BEARING: 'brick_load_bearing',
  PLASTERBOARDING_PARTITION: 'plasterboarding_partition',
  PLASTERBOARDING_OFFSET: 'plasterboarding_offset',
  PLASTERBOARDING_CEILING: 'plasterboarding_ceiling',
  NETTING_WALL: 'netting_wall',
  NETTING_CEILING: 'netting_ceiling',
  PLASTERING_WALL: 'plastering_wall',
  PLASTERING_CEILING: 'plastering_ceiling',
  FACADE_PLASTERING: 'facade_plastering',
  CORNER_BEAD: 'corner_bead',
  WINDOW_SASH: 'window_sash',
  PENETRATION_COATING: 'penetration_coating',
  PAINTING_WALL: 'painting_wall',
  PAINTING_CEILING: 'painting_ceiling',
  LEVELLING: 'levelling',
  FLOATING_FLOOR: 'floating_floor',
  TILING_UNDER_60: 'tiling_under_60',
  PAVING_UNDER_60: 'paving_under_60',
  GROUTING: 'grouting',
  SILICONING: 'siliconing',
  SANITY_INSTALLATION: 'sanitary_installation',
  WINDOW_INSTALLATION: 'window_installation',
  DOOR_JAMB_INSTALLATION: 'door_jamb_installation',
  CUSTOM_WORK: 'custom_work',
  COMMUTE: 'commute',
  RENTALS: 'rentals'
};

export const UNIT_TYPES = {
  HOUR: 'h',
  PIECE: 'pc',
  METER_SQUARE: 'm2',
  METER: 'm',
  KM: 'km',
  DAY: 'day',
  DAYS: 'days',
  PACKAGE: 'pkg'
};

// Default areas for door/window deductions when detailed dimensions not available
export const DEFAULT_AREAS = {
  DOOR: 2,        // 2m² per door
  WINDOW: 1.5     // 1.5m² per window
};

// Material calculation multipliers
export const MATERIAL_MULTIPLIERS = {
  FLOATING_FLOOR: 1.1,  // 10% extra for floating floor
  NETTING: 1.1,         // 10% extra for mesh
  PLASTERBOARDING: {
    PARTITION_SIMPLE: 2,
    PARTITION_DOUBLE: 4,
    PARTITION_TRIPLE: 6,
    OFFSET_SIMPLE: 1,
    OFFSET_DOUBLE: 2,
    CEILING: 1
  }
};

// Complementary work names (for database mapping)
export const COMPLEMENTARY_WORK_NAMES = {
  NETTING: 'Netting',
  PAINTING: 'Painting',
  PLASTERING: 'Plastering',
  TILING_UNDER_60CM: 'Tiling under 60cm',
  PENETRATION_COATING: 'Penetration coating'
};