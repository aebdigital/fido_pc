import { calculateRoomPriceWithMaterials } from './priceCalculations';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';

describe('calculateRoomPriceWithMaterials - Window and Door Jamb', () => {
  const mockPriceList = {
    work: [
      { name: 'Window installation', price: 7, unit: '€/m' },
      { name: 'Installation of door jamb', price: 60, unit: '€/pc' }
    ],
    material: [],
    installations: [],
    others: []
  };

  test('should calculate material costs for Window and Door Jamb', () => {
    const room = {
      workItems: [
        {
          id: 'w1',
          propertyId: WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION,
          name: WORK_ITEM_NAMES.WINDOW_INSTALLATION,
          fields: {
            [WORK_ITEM_NAMES.CIRCUMFERENCE]: 3,
            [WORK_ITEM_NAMES.PRICE]: 20
          }
        },
        {
          id: 'd1',
          propertyId: WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION,
          name: WORK_ITEM_NAMES.INSTALLATION_OF_DOOR_JAMB,
          fields: {
            [WORK_ITEM_NAMES.COUNT]: 4,
            [WORK_ITEM_NAMES.PRICE]: 30
          }
        }
      ]
    };

    const result = calculateRoomPriceWithMaterials(room, mockPriceList);

    // 1. Check Work Totals
    // Window work: 3m * 7€/m = 21€
    // Door Jamb work: 4pcs * 60€/pc = 240€
    // Total Work: 261€ + auxiliary (0.65 * 261 = 169.65) = 430.65
    const baseWork = 21 + 240;
    expect(result.baseWorkTotal).toBeCloseTo(baseWork);

    // 2. Check Material Totals
    // Window material: 20€
    // Door Jamb material: 4 * 30€ = 120€
    // Total Material: 140€ + auxiliary (0.10 * 140 = 14) = 154€
    const baseMaterial = 20 + 120;
    expect(result.baseMaterialTotal).toBeCloseTo(baseMaterial);
    expect(result.materialTotal).toBeCloseTo(baseMaterial * 1.1); // +10% aux

    // 3. Check Material Items List
    const windowMaterial = result.materialItems.find(i => i.id === 'w1_window_material');
    expect(windowMaterial).toBeDefined();
    expect(windowMaterial.name).toBe(WORK_ITEM_NAMES.OKNA_DISPLAY_NAME);
    expect(windowMaterial.calculation.materialCost).toBe(20);

    const doorMaterial = result.materialItems.find(i => i.id === 'd1_doorjamb_material');
    expect(doorMaterial).toBeDefined();
    expect(doorMaterial.name).toBe(WORK_ITEM_NAMES.ZARUBNA_DISPLAY_NAME);
    expect(doorMaterial.calculation.materialCost).toBe(120);
  });
});
