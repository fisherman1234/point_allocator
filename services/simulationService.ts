import { CARDS, DEFAULT_SPEND_CATS, ECOSYSTEMS } from '../constants';
import { BoostSettings, CardConfig, SimulationResult, Ecosystem } from '../types';

// Map a Spend Type (dining, travel, base) to a Card's specific Category ID
export const getCardCategoryId = (cardId: string, spendType: string): string => {
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return 'base';

  if (cardId === 'ink' && spendType === 'travel') return 'travel';
  
  // Default search based on `accepts` array in config
  const match = card.categories.find(cat => cat.accepts && cat.accepts.includes(spendType));
  // If no direct match, default to the last category (usually base)
  return match ? match.id : card.categories[card.categories.length - 1].id;
};

// Helper to find the best multiplier for a given spend type among available cards (excluding one specific card)
const getBestAlternative = (spendType: string, availableCards: CardConfig[], ignoreCardId: string): { multiplier: number, ecosystem: Ecosystem } | null => {
  let best = { multiplier: 0, ecosystem: 'Chase' as Ecosystem };
  let found = false;

  availableCards.forEach(card => {
    if (card.id === ignoreCardId) return;
    
    const catId = getCardCategoryId(card.id, spendType);
    const category = card.categories.find(c => c.id === catId);
    const mult = category ? category.multiplier : 1;

    if (mult > best.multiplier) {
      best = { multiplier: mult, ecosystem: card.ecosystem };
      found = true;
    }
  });

  return found ? best : null;
};

export const simulateYear = (
  allocations: Record<string, string>,
  spendValues: Record<string, number>,
  rentInput: number | string,
  useBiltCash: boolean,
  initialCashInput: number | string,
  useAccelerator: boolean,
  minBalanceInput: number | string,
  useLyftCredit: boolean,
  useWalgreensCredit: boolean,
  boostSettings: BoostSettings,
  availableCards: CardConfig[],
  useSmartOverflow: boolean = false
): SimulationResult => {
  const rent = typeof rentInput === 'string' ? parseInt(rentInput || '0') : rentInput;
  const minProtectedBalance = typeof minBalanceInput === 'string' ? parseFloat(minBalanceInput || '0') : minBalanceInput;
  const initialCash = typeof initialCashInput === 'string' ? parseFloat(initialCashInput || '0') : initialCashInput;

  // 1. Calculate Monthly Base Points & Spend based on Allocations
  const monthlyPoints = { Chase: 0, Bilt: 0, Citi: 0, Amazon: 0 };
  const monthlySpend = { Chase: 0, Bilt: 0, Citi: 0, Amazon: 0 };
  
  // Store granular Bilt spend items for monthly processing
  const biltSpendItems: { id: string, amount: number, type: string, baseMultiplier: number }[] = [];
  
  // Track specific card spend for CSP bonus
  let monthlyCSPSpend = 0;

  // Iterate through all defined spend categories
  DEFAULT_SPEND_CATS.forEach(cat => {
    const assignedCardId = allocations[cat.id];
    if (assignedCardId) {
      // ONLY process if the assigned card is currently in the available/selected cards list
      const card = availableCards.find(c => c.id === assignedCardId);
      if (card) {
        const amount = spendValues[cat.id] || 0;
        
        // Determine which multiplier applies
        const targetCatId = getCardCategoryId(card.id, cat.type);
        const categoryConfig = card.categories.find(c => c.id === targetCatId);
        const multiplier = categoryConfig ? categoryConfig.multiplier : 1;

        if (card.ecosystem === 'Bilt') {
           // For Bilt, we defer calculation to the monthly loop to handle Accelerator/Overflow
           biltSpendItems.push({
             id: cat.id,
             amount: amount,
             type: cat.type,
             baseMultiplier: multiplier
           });
           monthlySpend.Bilt += amount;
        } else {
           // Standard calculation for others
           monthlyPoints[card.ecosystem] += amount * multiplier;
           monthlySpend[card.ecosystem] += amount;
        }

        if (card.id === 'csp') {
            monthlyCSPSpend += amount;
        }
      }
    }
  });

  // 2. Simulation State Initialization
  const history: any[] = [];
  const cumulative = { Chase: 0, Bilt: 0, Citi: 0, Amazon: 0 };
  let currentBiltCashBalance = initialCash;
  let totalBiltCashRedeemed = 0;
  let totalRentPointsEarned = 0;
  let grossBiltPointsEarned = 0; 
  let acceleratorActivations = 0;
  let acceleratorSpendRemaining = 0;
  let totalLyftRedeemed = 0;
  let totalWalgreensRedeemed = 0;
  let totalCSPAnniversaryBonus = 0;
  let totalSmartOverflowGain = 0;

  // Find the active Bilt card ID for comparison logic
  const activeBiltCard = availableCards.find(c => c.ecosystem === 'Bilt');

  // 3. Month-by-Month Loop
  for (let month = 1; month <= 12; month++) {
    const startCash = currentBiltCashBalance;
    let cashSpentOnAccelerator = 0;
    let acceleratorBonusPoints = 0;
    let cashSpentOnLyft = 0;
    let cashSpentOnWalgreens = 0;
    let cashSpentOnBoost = 0;
    
    // Track points added this month
    let chasePointsThisMonth = monthlyPoints.Chase;
    let citiPointsThisMonth = monthlyPoints.Citi;
    let amazonPointsThisMonth = monthlyPoints.Amazon;
    let biltPointsThisMonth = 0;
    let cspAnniversaryBonus = 0;
    let overflowBonusThisMonth = 0;
    let monthlyBiltCashEarned = 0;

    // Track actual executed spend on Bilt this month (excludes overflowed spend)
    let executedBiltSpend = 0;

    // Add standard points for non-Bilt cards
    cumulative.Chase += monthlyPoints.Chase;
    cumulative.Citi += monthlyPoints.Citi;
    cumulative.Amazon += monthlyPoints.Amazon;

    // --- PHASE 1: Bilt Accelerator & Spend Processing (Consumption Loop) ---
    // Rule: Burn for Rent/Lyft/Walgreens/MinBal must be reserved before buying accelerator packs.
    const estimatedRentCost = (useBiltCash && rent > 0) ? (rent * 0.03) : 0;
    const estimatedLyftCost = useLyftCredit ? 10 : 0;
    const estimatedWalgreensCost = useWalgreensCredit ? 10 : 0;
    const reservedCash = minProtectedBalance + estimatedRentCost + estimatedLyftCost + estimatedWalgreensCost;
    
    // Process Bilt Spend Item by Item
    // We prioritize highest multiplier spend or just FIFO? Let's do FIFO for simplicity.
    for (const item of biltSpendItems) {
        let remainingAmount = item.amount;
        
        while (remainingAmount > 0) {
            // Check capacity
            if (acceleratorSpendRemaining > 0) {
                // Have capacity - consume it
                const chunk = Math.min(remainingAmount, acceleratorSpendRemaining);
                
                // Normal Bilt Earning (Base + 1x Boost)
                const points = chunk * (item.baseMultiplier + 1);
                
                cumulative.Bilt += points;
                biltPointsThisMonth += points;
                acceleratorBonusPoints += chunk; // 1x is the bonus part
                monthlyBiltCashEarned += chunk * 0.04;

                acceleratorSpendRemaining -= chunk;
                remainingAmount -= chunk;
                
                executedBiltSpend += chunk;
            } else {
                // No capacity - Try to buy
                const availableCash = currentBiltCashBalance - reservedCash - cashSpentOnAccelerator; // Important to subtract what we just spent this frame
                
                if (useAccelerator && acceleratorActivations < 5 && availableCash >= 200) {
                     // Buy Pack
                    currentBiltCashBalance -= 200;
                    cashSpentOnAccelerator += 200;
                    acceleratorActivations++;
                    acceleratorSpendRemaining += 5000;
                    // Loop continues, will consume capacity next iteration
                } else {
                    // Cannot buy pack.
                    // This spend is "Unboosted".
                    
                    // --- SMART OVERFLOW LOGIC ---
                    let routedToAlt = false;
                    
                    // Only overflow if we have exhausted our ability to buy packs (hit the limit)
                    if (useSmartOverflow && activeBiltCard && acceleratorActivations >= 5) {
                        const alt = getBestAlternative(item.type, availableCards, activeBiltCard.id);
                        // Compare Bilt Base Rate vs Best Alternative Rate
                        if (alt && alt.multiplier > item.baseMultiplier) {
                             // Route this specific chunk to the alternative ecosystem
                             const altPoints = remainingAmount * alt.multiplier;
                             const biltBasePoints = remainingAmount * item.baseMultiplier;
                             const gain = altPoints - biltBasePoints;
                             
                             if (alt.ecosystem === 'Chase') {
                                 cumulative.Chase += altPoints;
                                 chasePointsThisMonth += altPoints;
                             } else if (alt.ecosystem === 'Citi') {
                                 cumulative.Citi += altPoints;
                                 citiPointsThisMonth += altPoints;
                             } else if (alt.ecosystem === 'Amazon') {
                                 cumulative.Amazon += altPoints;
                                 amazonPointsThisMonth += altPoints;
                             }

                             totalSmartOverflowGain += gain;
                             overflowBonusThisMonth += gain;
                             
                             // NOTE: When rerouted, we DO NOT earn Bilt Cash on this spend (user used a different card)
                             // And we DO NOT add to executedBiltSpend
                             
                             routedToAlt = true;
                             remainingAmount = 0; // Done with this item chunk
                        }
                    }

                    if (!routedToAlt) {
                        // Stay on Bilt at Base Rate
                        const points = remainingAmount * item.baseMultiplier;
                        cumulative.Bilt += points;
                        biltPointsThisMonth += points;
                        monthlyBiltCashEarned += remainingAmount * 0.04;
                        executedBiltSpend += remainingAmount;
                        remainingAmount = 0; 
                    }
                }
            }
        }
    }

    // Add earned cash from spend (only the non-overflowed part)
    currentBiltCashBalance += monthlyBiltCashEarned;

    // --- PHASE 2b: CSP Anniversary Bonus (Month 12) ---
    if (month === 12 && monthlyCSPSpend > 0) {
        // 10% of total annual spend points (at 1x rate)
        // Total annual spend on CSP = monthlyCSPSpend * 12
        cspAnniversaryBonus = (monthlyCSPSpend * 12) * 0.10;
        cumulative.Chase += cspAnniversaryBonus;
        chasePointsThisMonth += cspAnniversaryBonus;
        totalCSPAnniversaryBonus = cspAnniversaryBonus;
    }

    // --- PHASE 3: Rent Logic ---
    let rentPointsThisMonth = 0;
    let cashRedeemedThisMonth = 0;

    if (useBiltCash && rent > 0) {
      const maxRentPoints = rent; 
      const cashNeededForMaxPoints = (maxRentPoints / 1000) * 30; 
      // Reserve for Lyft/Walgreens if needed
      const availableForRent = Math.max(0, currentBiltCashBalance - minProtectedBalance - estimatedLyftCost - estimatedWalgreensCost);
      const cashToUse = Math.min(availableForRent, cashNeededForMaxPoints);
      
      if (cashToUse > 0) {
        const pointsEarned = (cashToUse / 30) * 1000;
        rentPointsThisMonth = pointsEarned;
        cashRedeemedThisMonth = cashToUse;
        
        cumulative.Bilt += pointsEarned; // Add to Bilt totals
        biltPointsThisMonth += pointsEarned;
        
        currentBiltCashBalance -= cashToUse;
        totalBiltCashRedeemed += cashToUse;
        totalRentPointsEarned += pointsEarned;
      }
    }

    // --- PHASE 4: Lyft Redemption ($10/mo) ---
    if (useLyftCredit) {
      // Must have enough over protected balance (and reserve for Walgreens)
      const availableForLyft = Math.max(0, currentBiltCashBalance - minProtectedBalance - estimatedWalgreensCost);
      if (availableForLyft >= 10) {
        currentBiltCashBalance -= 10;
        cashSpentOnLyft = 10;
        totalLyftRedeemed += 10;
      }
    }

    // --- PHASE 4b: Walgreens Redemption ($10/mo) - Lower Priority than Lyft ---
    if (useWalgreensCredit) {
        // Must have enough over protected balance
        const availableForWalgreens = Math.max(0, currentBiltCashBalance - minProtectedBalance);
        if (availableForWalgreens >= 10) {
          currentBiltCashBalance -= 10;
          cashSpentOnWalgreens = 10;
          totalWalgreensRedeemed += 10;
        }
      }

    // --- PHASE 5: Milestones ---
    const previousGrossPoints = grossBiltPointsEarned;
    // Gross points usually implies points earned on Bilt card (spend + rent).
    // Does it include boost? Yes. 
    // Does it include rent? Yes.
    // We update this based on what was added to `cumulative.Bilt` this month.
    // Note: If routed to Alt, it doesn't count towards Bilt milestones.
    const biltPointsAddedThisMonth = biltPointsThisMonth; // captured above
    grossBiltPointsEarned += biltPointsAddedThisMonth;
    
    const milestoneBonusCash = (Math.floor(grossBiltPointsEarned / 25000) - Math.floor(previousGrossPoints / 25000)) * 50;

    if (milestoneBonusCash > 0) {
      currentBiltCashBalance += milestoneBonusCash;
    }

    // --- PHASE 6: BOOST EVENTS ---
    let boostBonusChase = 0;
    let boostBonusCiti = 0;
    let boostBonusBilt = 0;
    
    if (boostSettings) {
      // Chase Boost
      if (boostSettings.Chase === month) {
        boostBonusChase = cumulative.Chase * ECOSYSTEMS.Chase.boostValue;
        cumulative.Chase += boostBonusChase;
        chasePointsThisMonth += boostBonusChase;
      }
      
      // Citi Boost
      if (boostSettings.Citi === month) {
        boostBonusCiti = cumulative.Citi * ECOSYSTEMS.Citi.boostValue;
        cumulative.Citi += boostBonusCiti;
        citiPointsThisMonth += boostBonusCiti;
      }

      // Bilt Boost: Burn $75 for 50% points bonus. Allows dipping below min balance.
      if (boostSettings.Bilt === month) {
        // Need absolute minimum of $75
        if (currentBiltCashBalance >= 75) {
          cashSpentOnBoost = 75;
          currentBiltCashBalance -= 75;
          
          boostBonusBilt = cumulative.Bilt * ECOSYSTEMS.Bilt.boostValue;
          cumulative.Bilt += boostBonusBilt;
          biltPointsThisMonth += boostBonusBilt;
        }
      }
    }

    history.push({
      month,
      startCash,
      earnedCash: monthlyBiltCashEarned,
      milestoneBonusCash,
      redeemedCash: cashRedeemedThisMonth + cashSpentOnAccelerator + cashSpentOnLyft + cashSpentOnWalgreens + cashSpentOnBoost,
      cashForRent: cashRedeemedThisMonth,
      cashForAccelerator: cashSpentOnAccelerator,
      cashForLyft: cashSpentOnLyft,
      cashForWalgreens: cashSpentOnWalgreens,
      cashForBoost: cashSpentOnBoost,
      endCash: currentBiltCashBalance,
      
      monthlyChase: chasePointsThisMonth,
      monthlyCiti: citiPointsThisMonth,
      monthlyAmazon: amazonPointsThisMonth,
      monthlyBiltSpend: executedBiltSpend, 
      monthlyBiltRent: rentPointsThisMonth,
      acceleratorBonus: acceleratorBonusPoints,
      grossBiltPoints: grossBiltPointsEarned,
      
      cspAnniversaryBonus,
      boostBonusChase,
      boostBonusCiti,
      boostBonusBilt,
      overflowBonus: overflowBonusThisMonth,

      Chase: cumulative.Chase,
      Bilt: cumulative.Bilt,
      Citi: cumulative.Citi,
      Amazon: cumulative.Amazon,
      BiltCashBalance: currentBiltCashBalance,
    });
  }

  const totalSpendMonthly = Object.values(monthlySpend).reduce((a, b) => a + b, 0);

  return {
    monthlySpend: totalSpendMonthly,
    monthlyPointsBase: Object.values(monthlyPoints).reduce((a, b) => a + b, 0),
    annualTotals: cumulative,
    history,
    finalBiltCash: currentBiltCashBalance,
    totalBiltCashRedeemed,
    totalRentPointsEarned,
    acceleratorActivations,
    totalLyftRedeemed,
    totalWalgreensRedeemed,
    totalCSPAnniversaryBonus,
    totalSmartOverflowGain
  };
};