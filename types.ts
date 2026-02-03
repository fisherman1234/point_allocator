import { LucideIcon } from 'lucide-react';

export type Ecosystem = 'Chase' | 'Bilt' | 'Citi' | 'Amazon';

export interface CardCategory {
  id: string;
  label: string;
  multiplier: number;
  icon: LucideIcon;
  accepts: string[];
}

export interface CardCredit {
  id: string;
  label: string;
  faceValue: number;
  defaultUserValue: number;
}

export interface CardConfig {
  id: string;
  name: string;
  annualFee: number;
  ecosystem: Ecosystem;
  color: string;
  icon: LucideIcon;
  categories: CardCategory[];
  credits?: CardCredit[];
}

export interface SpendCategoryDefinition {
  id: string;
  label: string;
  type: string;
  defaultAmount: number;
  icon: LucideIcon;
  color: string;
}

export interface SimulationHistoryRow {
  month: number;
  startCash: number;
  earnedCash: number;
  milestoneBonusCash: number;
  redeemedCash: number;
  cashForRent: number;
  cashForAccelerator: number;
  cashForLyft: number;
  cashForBoost: number;
  endCash: number;
  
  monthlyChase: number;
  monthlyCiti: number;
  monthlyAmazon: number;
  monthlyBiltSpend: number;
  monthlyBiltRent: number;
  acceleratorBonus: number;
  grossBiltPoints: number;
  
  cspAnniversaryBonus: number;
  boostBonusChase: number;
  boostBonusCiti: number;
  boostBonusBilt: number;

  Chase: number;
  Bilt: number;
  Citi: number;
  Amazon: number;
  BiltCashBalance: number;
}

export interface SimulationResult {
  monthlySpend: number;
  monthlyPointsBase: number;
  annualTotals: {
    Chase: number;
    Bilt: number;
    Citi: number;
    Amazon: number;
  };
  history: SimulationHistoryRow[];
  finalBiltCash: number;
  totalBiltCashRedeemed: number;
  totalRentPointsEarned: number;
  acceleratorActivations: number;
  totalLyftRedeemed: number;
  totalCSPAnniversaryBonus: number;
}

export interface Scenario {
  id: number;
  name: string;
  allocations: Record<string, string>; // spendId -> cardId
  activeCardIds: string[];
  useBiltCashForRent: boolean;
  useBiltAccelerator: boolean;
  useLyftCredit: boolean;
}

export interface ScenarioData extends Scenario {
  scenarioActiveCards: CardConfig[];
  simulation: SimulationResult;
  monthlyPointsDisplay: number;
  annualTotalPoints: number;
  annualAmazonCash: number;
  annualBiltCash: number;
  annualTotalCash: number;
  annualTotalValue: number;
  annualFees: number;
  annualCredits: number;
  annualNetFees: number;
  valChase: number;
  valBilt: number;
  valCiti: number;
  totalPointsVal: number;
}

export interface BoostSettings {
  Chase: number | null;
  Citi: number | null;
  Bilt: number | null;
}