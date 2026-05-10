export interface FeeTier {
  min: number;
  max: number;
  fee: number;
  type: 'fixed' | 'percentage';
}

/**
 * Calculates the service fee based on dynamic tiered settings
 * @param amount The transaction amount
 * @param tiers Array of fee tiers from admin settings
 * @returns The calculated fee amount
 */
export const calculateServiceFee = (amount: number, tiers: FeeTier[]): number => {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) return 0;
  
  const amountNum = Number(amount) || 0;
  
  // Find the applicable tier based on amount
  const applicableTier = tiers.find(t => {
    const min = Number(t.min) || 0;
    const max = Number(t.max) || 0;
    return amountNum >= min && (max === 0 || amountNum <= max);
  });

  if (!applicableTier) {
    // If no specific tier matches, but there are tiers, 
    // maybe return 0 or the first one as default? 
    // Usually, we should return 0 if no rule matches.
    return 0;
  }

  const feeVal = Number(applicableTier.fee) || 0;

  if (applicableTier.type === 'percentage') {
    return Math.round((amountNum * feeVal) / 100);
  }
  
  return feeVal;
};
