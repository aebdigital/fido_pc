import { findPriceListItem } from './priceCalculations';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, WORK_ITEM_SUBTITLES } from '../config/constants';

describe('findPriceListItem', () => {
  const mockPriceList = {
    work: [
      { name: 'Plasterboarding', subtitle: 'partition, simple', price: 50, unit: '€/m²' },
      { name: 'Plasterboarding', subtitle: 'partition, double', price: 70, unit: '€/m²' },
      { name: 'Plasterboarding', subtitle: 'ceiling', price: 100, unit: '€/m²' }
    ],
    material: [],
    installations: [],
    others: []
  };

  test('should correctly match Plasterboarding Ceiling', () => {
    const workItem = {
      propertyId: WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING,
      name: WORK_ITEM_NAMES.PLASTERBOARDING,
      subtitle: 'ceiling',
      // selectedType is undefined for ceiling
    };

    const result = findPriceListItem(workItem, mockPriceList);
    
    expect(result).not.toBeNull();
    expect(result.subtitle).toBe('ceiling');
    expect(result.price).toBe(100);
  });

  test('should correctly match Plasterboarding Partition Simple', () => {
    const workItem = {
      propertyId: WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION,
      name: WORK_ITEM_NAMES.PLASTERBOARDING,
      subtitle: 'partition',
      selectedType: 'Simple'
    };

    const result = findPriceListItem(workItem, mockPriceList);
    
    expect(result).not.toBeNull();
    expect(result.subtitle).toBe('partition, simple');
    expect(result.price).toBe(50);
  });

  test('should correctly match Netting Ceiling', () => {
    const workItem = {
      propertyId: WORK_ITEM_PROPERTY_IDS.NETTING_CEILING,
      name: WORK_ITEM_NAMES.NETTING,
      subtitle: 'ceiling'
    };
    
    // Add Netting items to mock price list
    const nettingMockPriceList = {
        ...mockPriceList,
        work: [
            ...mockPriceList.work,
            { name: 'Netting', subtitle: 'wall', price: 6, unit: '€/m²' },
            { name: 'Netting', subtitle: 'ceiling', price: 8, unit: '€/m²' }
        ]
    };

    const result = findPriceListItem(workItem, nettingMockPriceList);
    
    expect(result).not.toBeNull();
    expect(result.subtitle).toBe('ceiling');
    expect(result.price).toBe(8);
  });
});
