import { calculateShippingByZone } from './kenyaLocations.js';

const INTERNATIONAL_RATE = 2000;
const DEFAULT_RATE = 0;

/**
 * Calculate shipping cost based on country and county
 * @param {Object} params - { country, county }
 * @returns {number} - Shipping cost
 */
export function calculateShipping({ country, county }) {
  if (!country) return DEFAULT_RATE;
  if (country.toLowerCase() !== 'kenya') return INTERNATIONAL_RATE;
  if (!county) return DEFAULT_RATE;

  try {
    const cost = calculateShippingByZone(county);
    return cost || DEFAULT_RATE;
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return DEFAULT_RATE;
  }
}

