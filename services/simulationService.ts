import { CARDS, DEFAULT_SPEND_CATS } from '../constants';
import { BoostSettings, CardConfig, SimulationResult } from '../types';

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
  availableCards: CardConfig[]
): SimulationResult => {
  const rent = typeof rentInput === 'string' ? parseInt(rentInput || '0') : rentInput;
  const minProtectedBalance = typeof minBalanceInput === 'string' ? parseFloat(minBalanceInput || '0') : minBalanceInput;
  const initialCash = typeof initialCashInput === 'string' ? parseFloat(initialCashInput || '0') : initialCashInput;

  // 1. Calculate Monthly Base Points & Spend based on Allocations
  const monthlyPoints = { Chase: 0, Bilt: 0, Citi: 0, Amazon: 0 };
  const monthlySpend = { Chase: 0, Bilt: 0, Citi: 0, Amazon: 0 };
  let monthlyBiltSpend = 0; 
  let monthlyBiltCashEarned = 0;
  
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

        const points = amount * multiplier;
        
        monthlyPoints[card.ecosystem] += points;
        monthlySpend[card.ecosystem] += amount;

        if (card.ecosystem === 'Bilt') {
          monthlyBiltSpend += amount;
          monthlyBiltCashEarned += amount * 0.04; // 4% cash back rate on spend
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

  // 3. Month-by-Month Loop
  for (let month = 1; month <= 12; month++) {
    const startCash = currentBiltCashBalance;
    let cashSpentOnAccelerator = 0;
    let acceleratorBonusPoints = 0;
    let cashSpentOnLyft = 0;
    let cashSpentOnWalgreens = 0;
    let cashSpentOnBoost = 0;
    
    // Track points added this month specifically for boosts
    let chasePointsThisMonth = 0;
    let citiPointsThisMonth = 0;
    let biltPointsThisMonth = 0;
    let cspAnniversaryBonus = 0;

    // --- PHASE 1: Accelerator & Spend Processing (Consumption Loop) ---
    // Rule: Burn for Rent/Lyft/Walgreens/MinBal must be reserved before buying accelerator packs.
    const estimatedRentCost = (useBiltCash && rent > 0) ? (rent * 0.03) : 0;
    const estimatedLyftCost = useLyftCredit ? 10 : 0;
    const estimatedWalgreensCost = useWalgreensCredit ? 10 : 0;
    const reservedCash = minProtectedBalance + estimatedRentCost + estimatedLyftCost + estimatedWalgreensCost;

    // Base Points from Spend
    cumulative.Chase += monthlyPoints.Chase;
    chasePointsThisMonth += monthlyPoints.Chase;

    cumulative.Citi += monthlyPoints.Citi;
    citiPointsThisMonth += monthlyPoints.Citi;

    cumulative.Amazon += monthlyPoints.Amazon;
    
    // Bilt Base + Accelerator
    let biltBasePoints = monthlyPoints.Bilt;
    let remainingSpendToProcess = monthlyBiltSpend;

    while (remainingSpendToProcess > 0) {
      // 1. If we have active capacity, use it
      if (acceleratorSpendRemaining > 0) {
        const amount = Math.min(remainingSpendToProcess, acceleratorSpendRemaining);
        acceleratorBonusPoints += amount * 1; // 1x Bonus
        acceleratorSpendRemaining -= amount;
        remainingSpendToProcess -= amount;
      } 
      // 2. If no capacity, check if we should/can activate a new pack
      else {
        // Can we afford it?
        const availableCash = currentBiltCashBalance - reservedCash;
        // Rules: Must have option enabled, not hit annual limit (5), and have cash > $200
        if (useAccelerator && acceleratorActivations < 5 && availableCash >= 200) {
          // Buy Pack
          currentBiltCashBalance -= 200;
          cashSpentOnAccelerator += 200;
          acceleratorActivations++;
          acceleratorSpendRemaining += 5000;
          // Continue loop -> next iteration will consume from this new capacity
        } else {
          // Cannot buy pack (no money, or limit reached, or disabled)
          // Stop processing bonus for the rest of this month's spend
          break; 
        }
      }
    }

    biltBasePoints += acceleratorBonusPoints;
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
        
        biltBasePoints += pointsEarned;
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
    grossBiltPointsEarned += biltBasePoints;
    const milestoneBonusCash = (Math.floor(grossBiltPointsEarned / 25000) - Math.floor(previousGrossPoints / 25000)) * 50;

    if (milestoneBonusCash > 0) {
      currentBiltCashBalance += milestoneBonusCash;
    }

    cumulative.Bilt += biltBasePoints;
    biltPointsThisMonth += biltBasePoints;

    // --- PHASE 6: BOOST EVENTS ---
    let boostBonusChase = 0;
    let boostBonusCiti = 0;
    let boostBonusBilt = 0;
    
    if (boostSettings) {
      // Chase Boost: 25% on points accumulated until now
      if (boostSettings.Chase === month) {
        boostBonusChase = cumulative.Chase * 0.25;
        cumulative.Chase += boostBonusChase;
      }
      
      // Citi Boost: 25% on points accumulated until now
      if (boostSettings.Citi === month) {
        boostBonusCiti = cumulative.Citi * 0.25;
        cumulative.Citi += boostBonusCiti;
      }

      // Bilt Boost: Burn $75 for 50% points bonus. Allows dipping below min balance.
      if (boostSettings.Bilt === month) {
        // Need absolute minimum of $75
        if (currentBiltCashBalance >= 75) {
          cashSpentOnBoost = 75;
          currentBiltCashBalance -= 75;
          
          boostBonusBilt = cumulative.Bilt * 0.5;
          cumulative.Bilt += boostBonusBilt;
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
      monthlyAmazon: monthlyPoints.Amazon,
      monthlyBiltSpend: monthlyPoints.Bilt,
      monthlyBiltRent: rentPointsThisMonth,
      acceleratorBonus: acceleratorBonusPoints,
      grossBiltPoints: grossBiltPointsEarned,
      
      cspAnniversaryBonus,
      boostBonusChase,
      boostBonusCiti,
      boostBonusBilt,

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
    totalCSPAnniversaryBonus
  };
};