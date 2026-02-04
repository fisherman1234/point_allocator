import React, { useState, useMemo, useRef } from 'react';
import { 
  PieChart, Plus, X, Copy, LineChart as LineChartIcon, 
  Trash2, Loader2, XCircle, ChevronUp, ChevronDown, 
  Rocket, Home, DollarSign, ShieldCheck, Trophy, Coins,
  Sparkles, ArrowRightLeft
} from 'lucide-react';

import { CARDS, DEFAULT_SPEND_CATS, INITIAL_RENT, INITIAL_CASH, INITIAL_MIN_BALANCE, ECOSYSTEMS } from './constants';
import { BoostSettings, Scenario, ScenarioData, CardConfig } from './types';
import { simulateYear } from './services/simulationService';
import { DraggableSpendChip, CardDropZone } from './components/DraggableComponents';
import { SimulationCharts } from './components/SimulationCharts';
import { SimulationTable } from './components/SimulationTable';
import { ConfigView } from './components/ConfigView';

export default function App() {
  // --- Global Settings ---
  const [globalSettings, setGlobalSettings] = useState<{
    rent: number | string;
    initialBiltCash: number | string;
    minProtectedBalance: number | string;
  }>({
    rent: INITIAL_RENT,
    initialBiltCash: INITIAL_CASH,
    minProtectedBalance: INITIAL_MIN_BALANCE
  });

  const [activeView, setActiveView] = useState<'simulation' | 'config'>('simulation');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const optimizationRef = useRef<{ cancel: boolean }>({ cancel: false });

  // Credit Value Overrides (Key: cardId-creditId, Value: number)
  const [creditValues, setCreditValues] = useState<Record<string, number>>({});

  // Global Boost Settings
  const [boostSettings, setBoostSettings] = useState<BoostSettings>({
    Chase: null, 
    Citi: null,
    Bilt: null
  });
  
  // Active Cards State (Default: CSR, Ink, Bilt, Citi, Amazon)
  const [globalAvailableCardIds, setGlobalAvailableCardIds] = useState<string[]>(['csr', 'ink', 'bilt', 'citi', 'amazon']);

  // Global Spend Values
  const [spendValues, setSpendValues] = useState<Record<string, number>>(
    DEFAULT_SPEND_CATS.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.defaultAmount }), {} as Record<string, number>)
  );

  const totalMonthlySpend = useMemo(() => {
    const rent = parseInt(globalSettings.rent.toString() || '0');
    const catSpend = Object.values(spendValues).reduce((a: number, b: number) => a + (b || 0), 0);
    return rent + catSpend;
  }, [globalSettings.rent, spendValues]);

  // --- Scenarios State ---
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { 
      id: 1, 
      name: 'QA: Bilt + Amazon', 
      allocations: DEFAULT_SPEND_CATS.reduce((acc, cat) => ({ ...acc, [cat.id]: 'bilt' }), {} as Record<string, string>), 
      activeCardIds: ['bilt', 'amazon'],
      useBiltCashForRent: true,
      useBiltAccelerator: true,
      useSmartOverflow: true,
      useLyftCredit: false,
      useWalgreensCredit: false,
      isDetailsExpanded: false
    },
    { 
      id: 2, 
      name: 'QA: Bilt + Citi', 
      allocations: DEFAULT_SPEND_CATS.reduce((acc, cat) => ({ ...acc, [cat.id]: 'bilt' }), {} as Record<string, string>), 
      activeCardIds: ['bilt', 'citi'],
      useBiltCashForRent: true,
      useBiltAccelerator: true,
      useSmartOverflow: true,
      useLyftCredit: false,
      useWalgreensCredit: false,
      isDetailsExpanded: false
    },
    { 
      id: 3, 
      name: 'QA: Bilt + Citi + Amazon', 
      allocations: DEFAULT_SPEND_CATS.reduce((acc, cat) => ({ ...acc, [cat.id]: 'bilt' }), {} as Record<string, string>), 
      activeCardIds: ['bilt', 'citi', 'amazon'],
      useBiltCashForRent: true,
      useBiltAccelerator: true,
      useSmartOverflow: true,
      useLyftCredit: false,
      useWalgreensCredit: false,
      isDetailsExpanded: false
    }
  ]);
  const [chartScenarioId, setChartScenarioId] = useState<number | null>(null);

  const updateCreditValue = (cardId: string, creditId: string, value: number) => {
    setCreditValues(prev => ({
      ...prev,
      [`${cardId}-${creditId}`]: value
    }));
  };

  // --- Calculations ---
  const scenariosData: ScenarioData[] = useMemo(() => {
    return scenarios.map(scenario => {
      // Calculate active cards for THIS scenario
      // FIX: Ensure we only include cards that are both active in the scenario AND available globally
      // This prevents "hidden" cards (unchecked in Global) from influencing the simulation (e.g., smart overflow)
      const scenarioActiveCards = CARDS.filter(c => 
        scenario.activeCardIds.includes(c.id) && globalAvailableCardIds.includes(c.id)
      );
      
      const simulation = simulateYear(
        scenario.allocations,
        spendValues,
        globalSettings.rent, 
        scenario.useBiltCashForRent, 
        globalSettings.initialBiltCash, 
        scenario.useBiltAccelerator, 
        globalSettings.minProtectedBalance,
        scenario.useLyftCredit,
        scenario.useWalgreensCredit,
        boostSettings,
        scenarioActiveCards,
        scenario.useSmartOverflow
      );
      
      const totalPointsOnly = simulation.annualTotals.Chase + simulation.annualTotals.Bilt + simulation.annualTotals.Citi;
      const amazonCash = simulation.annualTotals.Amazon / 100;
      const biltCash = simulation.finalBiltCash;
      
      const realizableBiltCash = Math.min(100, biltCash);
      
      // Update Total Cash to include realized Lyft & Walgreens value
      const totalCash = amazonCash + realizableBiltCash + simulation.totalLyftRedeemed + simulation.totalWalgreensRedeemed;
      
      const valChase = simulation.annualTotals.Chase * (ECOSYSTEMS.Chase.valuation / 100);
      const valBilt = simulation.annualTotals.Bilt * (ECOSYSTEMS.Bilt.valuation / 100);
      const valCiti = simulation.annualTotals.Citi * (ECOSYSTEMS.Citi.valuation / 100);

      // Calculate Total Points Value for Summary Row
      const totalPointsVal = valChase + valBilt + valCiti;

      // Fees Calculation (based on active cards in THIS scenario)
      const totalFees = scenarioActiveCards.reduce((acc, card) => acc + (card.annualFee || 0), 0);
      
      // Credits Calculation
      const totalCredits = scenarioActiveCards.reduce((acc, card) => {
        const cCredits = card.credits ? card.credits.reduce((sum, cr) => {
           const val = creditValues[`${card.id}-${cr.id}`] ?? cr.defaultUserValue;
           return sum + val;
        }, 0) : 0;
        return acc + cCredits;
      }, 0);

      const annualNetFees = totalFees - totalCredits; 

      const totalDollarEquivalent = totalPointsVal + totalCash - annualNetFees;

      return { 
        ...scenario,
        scenarioActiveCards, // pass down for UI rendering
        simulation,
        monthlyPointsDisplay: Math.round(totalPointsOnly / 12),
        annualTotalPoints: totalPointsOnly,
        annualAmazonCash: amazonCash,
        annualBiltCash: realizableBiltCash, 
        annualTotalCash: totalCash,
        annualTotalValue: totalDollarEquivalent,
        annualFees: totalFees,
        annualCredits: totalCredits,
        annualNetFees: annualNetFees,
        valChase,
        valBilt,
        valCiti,
        totalPointsVal
      };
    });
  }, [scenarios, globalSettings, spendValues, boostSettings, creditValues, globalAvailableCardIds]);

  // --- Handlers ---
  
  const cancelOptimization = () => {
    if (isOptimizing) {
      optimizationRef.current.cancel = true;
      setIsOptimizing(false);
      setOptimizationProgress(0);
    }
  };

  const clearAllScenarios = () => {
    setScenarios([]);
    cancelOptimization();
  };
  
  const generateBoostEvents = () => {
    setBoostSettings({
      Chase: Math.random() < ECOSYSTEMS.Chase.boostProbability ? Math.floor(Math.random() * 12) + 1 : null,
      Citi: Math.random() < ECOSYSTEMS.Citi.boostProbability ? Math.floor(Math.random() * 12) + 1 : null,
      Bilt: Math.random() < ECOSYSTEMS.Bilt.boostProbability ? Math.floor(Math.random() * 12) + 1 : null
    });
  };

  const clearBoostEvents = () => {
    setBoostSettings({ Chase: null, Citi: null, Bilt: null });
  };
  
  const handleDrop = (scenarioId: number, spendCatId: string, cardId: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      if (!s.activeCardIds.includes(cardId)) return s; 
      
      return {
        ...s,
        allocations: { ...s.allocations, [spendCatId]: cardId }
      };
    }));
  };

  const handleRemoveAllocation = (scenarioId: number, spendCatId: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      const newAllocations = { ...s.allocations };
      delete newAllocations[spendCatId];
      return { ...s, allocations: newAllocations };
    }));
  };
  
  const toggleScenarioCard = (scenarioId: number, cardId: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      
      let newActiveIds = [...s.activeCardIds];
      let newAllocations = { ...s.allocations };

      const targetCard = CARDS.find(c => c.id === cardId);
      const isTargetBilt = targetCard?.ecosystem === 'Bilt';

      if (newActiveIds.includes(cardId)) {
        // Remove card
        newActiveIds = newActiveIds.filter(id => id !== cardId);
        // Unassign any categories assigned to this card
        Object.keys(newAllocations).forEach(catId => {
          if (newAllocations[catId] === cardId) {
            delete newAllocations[catId];
          }
        });
      } else {
        // Add card
        // Constraint: Only one Bilt card allowed. If adding one, remove existing.
        if (isTargetBilt) {
            const existingBiltId = newActiveIds.find(id => {
                const c = CARDS.find(card => card.id === id);
                return c?.ecosystem === 'Bilt';
            });
            
            if (existingBiltId) {
                newActiveIds = newActiveIds.filter(id => id !== existingBiltId);
                // Clear allocations for the removed Bilt card
                Object.keys(newAllocations).forEach(catId => {
                    if (newAllocations[catId] === existingBiltId) delete newAllocations[catId];
                });
            }
        }
        
        newActiveIds.push(cardId);
      }
      
      return { ...s, activeCardIds: newActiveIds, allocations: newAllocations };
    }));
  };

  const toggleGlobalCard = (id: string) => {
    setGlobalAvailableCardIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const updateSpendValue = (catId: string, val: string) => {
    setSpendValues(prev => ({ ...prev, [catId]: parseInt(val) || 0 }));
  };

  const updateGlobalSetting = (key: string, value: string) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
  };

  const addScenario = () => {
    const newId = Math.max(0, ...scenarios.map(s => s.id)) + 1;
    // New scenario inherits the GLOBAL available cards as its active set
    setScenarios(prev => [...prev, { 
      id: newId, 
      name: `Scenario ${newId}`, 
      allocations: {}, 
      activeCardIds: [...globalAvailableCardIds],
      useBiltCashForRent: false, 
      useBiltAccelerator: false, 
      useSmartOverflow: false, 
      useLyftCredit: false,
      useWalgreensCredit: false,
      isDetailsExpanded: false
    }]);
  };

  const duplicateScenario = (s: Scenario) => {
    const newId = Math.max(0, ...scenarios.map(sc => sc.id)) + 1;
    setScenarios(prev => [...prev, { 
      ...s, 
      id: newId, 
      name: `${s.name} (Copy)`, 
      allocations: {...s.allocations},
      activeCardIds: [...s.activeCardIds]
    }]);
  };

  const removeScenario = (id: number) => {
    if (scenarios.length > 1) setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const updateScenarioField = (scenarioId: number, field: string, value: any) => {
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId ? { ...s, [field]: value } : s
    ));
  };
  
  const toggleDetails = (scenarioId: number) => {
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId ? { ...s, isDetailsExpanded: !s.isDetailsExpanded } : s
    ));
  };

  const generateOptimization = async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    optimizationRef.current.cancel = false;

    const cats = DEFAULT_SPEND_CATS;
    const availableCards = CARDS.filter(c => globalAvailableCardIds.includes(c.id));
    
    if (availableCards.length === 0) {
      alert("No cards available to optimize!");
      setIsOptimizing(false);
      return;
    }

    const validSubsets: CardConfig[][] = [];
    const totalSubsets = 1 << availableCards.length;
    
    for (let i = 1; i < totalSubsets; i++) {
        const subset: CardConfig[] = [];
        let biltCount = 0;
        
        for (let j = 0; j < availableCards.length; j++) {
            if ((i & (1 << j)) > 0) {
                const c = availableCards[j];
                subset.push(c);
                if (c.ecosystem === 'Bilt') biltCount++;
            }
        }
        
        if (biltCount <= 1) {
            validSubsets.push(subset);
        }
    }
    
    let subsetIdx = 0;
    let allocIdx = 0;
    
    // Result Containers
    let topValueCandidates: any[] = []; // Top 2 Max Overall Value
    let topPointsCandidates: any[] = []; // Top 2 Max Points
    let minFeeValueCandidate: any = null; // Min Fees (Max Value)
    let minFeePointsCandidate: any = null; // Min Fees (Max Points)
    let currentMinFee = Infinity;
    
    const processBatch = () => {
       if (optimizationRef.current.cancel) return;
       const startTime = performance.now();
       const YIELD_THRESHOLD = 12; // ms
       
       while (subsetIdx < validSubsets.length) {
           const subset = validSubsets[subsetIdx];
           const totalAllocations = Math.pow(subset.length, cats.length);
           const subsetFees = subset.reduce((acc, c) => acc + (c.annualFee || 0), 0);
           const subsetCredits = subset.reduce((acc, c) => {
              const cCredits = c.credits ? c.credits.reduce((s, cr) => {
                 const val = creditValues[`${c.id}-${cr.id}`] ?? cr.defaultUserValue;
                 return s + val;
              }, 0) : 0;
              return acc + cCredits;
           }, 0);
           const hasBilt = subset.some(c => c.ecosystem === 'Bilt');
           
           const rentOptions = hasBilt ? [false, true] : [false];
           const accelOptions = hasBilt ? [false, true] : [false];
           const lyftOptions = hasBilt ? [false, true] : [false];
           const walgreensOptions = hasBilt ? [false, true] : [false];
           
           while (allocIdx < totalAllocations) {
                if (allocIdx % 500 === 0 && (performance.now() - startTime > YIELD_THRESHOLD)) {
                    setOptimizationProgress(Math.round((subsetIdx / validSubsets.length) * 100));
                    setTimeout(processBatch, 0);
                    return;
                }

                let temp = allocIdx;
                const alloc: Record<string, string> = {};
                for(let c=0; c<cats.length; c++) {
                    const cardIdx = temp % subset.length;
                    alloc[cats[c].id] = subset[cardIdx].id;
                    temp = Math.floor(temp / subset.length);
                }
                
                rentOptions.forEach(useBiltCashForRent => {
                  accelOptions.forEach(useAccelerator => {
                    // Smart overflow option only matters if accelerator is on
                    const overflowOptions = (useAccelerator) ? [false, true] : [false];

                    overflowOptions.forEach(useSmartOverflow => {
                      lyftOptions.forEach(useLyftCredit => {
                         walgreensOptions.forEach(useWalgreensCredit => {
                           const sim = simulateYear(
                              alloc,
                              spendValues,
                              globalSettings.rent,
                              useBiltCashForRent,
                              globalSettings.initialBiltCash,
                              useAccelerator,
                              globalSettings.minProtectedBalance,
                              useLyftCredit,
                              useWalgreensCredit,
                              boostSettings,
                              subset,
                              useSmartOverflow
                           );
                           
                           const valChase = sim.annualTotals.Chase * (ECOSYSTEMS.Chase.valuation / 100);
                           const valBilt = sim.annualTotals.Bilt * (ECOSYSTEMS.Bilt.valuation / 100);
                           const valCiti = sim.annualTotals.Citi * (ECOSYSTEMS.Citi.valuation / 100);
                           
                           const amazonCash = sim.annualTotals.Amazon / 100;
                           const biltCash = Math.min(100, sim.finalBiltCash);
                           const totalCash = amazonCash + biltCash + sim.totalLyftRedeemed + sim.totalWalgreensRedeemed;
                           
                           const netValue = valChase + valBilt + valCiti + totalCash - subsetFees + subsetCredits;
                           const totalPoints = sim.annualTotals.Chase + sim.annualTotals.Bilt + sim.annualTotals.Citi; // Excluding Amazon to match UI

                           // Candidate Creation Helper
                           const createCandidate = () => ({
                              id: `opt-${subsetIdx}-${allocIdx}-${useBiltCashForRent}-${useAccelerator}-${useLyftCredit}-${useWalgreensCredit}-${useSmartOverflow}`,
                              score: netValue,
                              allocations: { ...alloc },
                              activeCardIds: subset.map(c => c.id),
                              useBiltCashForRent,
                              useBiltAccelerator: useAccelerator,
                              useLyftCredit,
                              useWalgreensCredit,
                              useSmartOverflow,
                              totalPoints,
                              annualFees: subsetFees
                           });

                           // 1. Max Value Logic
                           if (topValueCandidates.length < 2 || netValue > topValueCandidates[topValueCandidates.length-1].score) {
                               const c = createCandidate();
                               topValueCandidates.push(c);
                               topValueCandidates.sort((a, b) => b.score - a.score);
                               if (topValueCandidates.length > 2) topValueCandidates.pop();
                           }
                           
                           // 2. Max Points Logic
                           if (topPointsCandidates.length < 2 || totalPoints > topPointsCandidates[topPointsCandidates.length-1].totalPoints) {
                               const c = createCandidate();
                               topPointsCandidates.push(c);
                               topPointsCandidates.sort((a, b) => b.totalPoints - a.totalPoints);
                               if (topPointsCandidates.length > 2) topPointsCandidates.pop();
                           }

                           // 3. Min Fees Logic
                           if (subsetFees < currentMinFee) {
                               currentMinFee = subsetFees;
                               const c = createCandidate();
                               minFeeValueCandidate = c;
                               minFeePointsCandidate = c;
                           } else if (subsetFees === currentMinFee) {
                               if (!minFeeValueCandidate || netValue > minFeeValueCandidate.score) {
                                   minFeeValueCandidate = createCandidate();
                               }
                               if (!minFeePointsCandidate || totalPoints > minFeePointsCandidate.totalPoints) {
                                   minFeePointsCandidate = createCandidate();
                               }
                           }
                         });
                      });
                    });
                  });
                });
                
                allocIdx++;
           }
           subsetIdx++;
           allocIdx = 0;
       }
       
       setOptimizationProgress(100);
       setIsOptimizing(false);
       
       // Process results into scenarios
       const finalScenariosMap = new Map();

       const addScenarioIfUnique = (candidate: any, label: string) => {
           if (!candidate) return;
           const key = JSON.stringify({ 
               alloc: candidate.allocations, 
               cards: candidate.activeCardIds.sort(),
               bilt: [candidate.useBiltCashForRent, candidate.useBiltAccelerator, candidate.useLyftCredit, candidate.useWalgreensCredit, candidate.useSmartOverflow]
           });

           if (finalScenariosMap.has(key)) {
               const existing = finalScenariosMap.get(key);
               if (!existing.labels.includes(label)) existing.labels.push(label);
           } else {
               finalScenariosMap.set(key, { ...candidate, labels: [label] });
           }
       };

       if (topValueCandidates[0]) addScenarioIfUnique(topValueCandidates[0], "Max Value");
       if (topValueCandidates[1]) addScenarioIfUnique(topValueCandidates[1], "Max Value #2");
       
       if (topPointsCandidates[0]) addScenarioIfUnique(topPointsCandidates[0], "Max Points");
       if (topPointsCandidates[1]) addScenarioIfUnique(topPointsCandidates[1], "Max Points #2");
       
       addScenarioIfUnique(minFeeValueCandidate, "Min Fees (Max Value)");
       addScenarioIfUnique(minFeePointsCandidate, "Min Fees (Max Points)");

       const newScenarios = Array.from(finalScenariosMap.values()).map((item, idx) => ({
          id: idx + 1,
          name: `${item.labels.join(' & ')} ($${item.score.toLocaleString(undefined, {maximumFractionDigits: 0})})`,
          allocations: item.allocations,
          activeCardIds: item.activeCardIds,
          useBiltCashForRent: item.useBiltCashForRent,
          useBiltAccelerator: item.useBiltAccelerator,
          useSmartOverflow: item.useSmartOverflow,
          useLyftCredit: item.useLyftCredit,
          useWalgreensCredit: item.useWalgreensCredit,
          isDetailsExpanded: false
        }));
        
       if (newScenarios.length > 0) {
         setScenarios(newScenarios);
       } else {
         alert("Optimization found no valid scenarios (check spend inputs).");
       }
    };
    
    setTimeout(processBatch, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className="bg-blue-600 text-white p-2 rounded-lg"><PieChart size={20} /></div>
                   <div>
                      <h1 className="text-xl font-extrabold text-slate-900 leading-tight">PointAllocator</h1>
                      {!isHeaderExpanded && activeView === 'simulation' && (
                        <p className="text-xs text-slate-500 font-medium">Config: ${totalMonthlySpend.toLocaleString()}/mo • Rent: ${parseInt(globalSettings.rent.toString()).toLocaleString()}</p>
                      )}
                   </div>
               </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveView('simulation')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeView === 'simulation' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Simulation
                </button>
                <button 
                  onClick={() => setActiveView('config')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeView === 'config' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Card Config
                </button>
            </div>

            <div className="flex items-center gap-3 justify-end">
               {activeView === 'simulation' && (
                 <>
                   {isOptimizing ? (
                     <div className="flex items-center gap-3 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
                       <div className="flex items-center gap-2">
                         <Loader2 size={14} className="animate-spin text-indigo-600" />
                         <span className="text-xs font-bold text-indigo-700">Optimizing... {optimizationProgress}%</span>
                       </div>
                       <button onClick={cancelOptimization} className="text-indigo-400 hover:text-red-500 transition-colors">
                         <XCircle size={16} />
                       </button>
                       <div className="w-24 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${optimizationProgress}%` }} />
                       </div>
                     </div>
                   ) : (
                     <>
                        <button onClick={addScenario} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-full hover:bg-slate-700 transition-colors">
                          <Plus size={14} /> New Scenario
                        </button>
                        <button 
                          onClick={generateOptimization} 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <Sparkles size={14} /> Generate Top Strategies
                        </button>
                     </>
                   )}
                   <div className="h-6 w-px bg-slate-200 mx-1"></div>
                   <button 
                     onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                     className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                     aria-label="Toggle header"
                   >
                     {isHeaderExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </button>
                 </>
               )}
            </div>
          </div>

          {isHeaderExpanded && activeView === 'simulation' && (
            <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
              
              <div className="flex flex-col md:flex-row md:items-start gap-6 pb-6 border-b border-slate-100">
                 <div className="min-w-[200px]">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Average Expenses</h2>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-slate-800">${totalMonthlySpend.toLocaleString()}</span>
                       <span className="text-xs text-slate-500 font-medium">/ mo</span>
                    </div>
                    <div className="text-xs text-slate-400">
                       ${(totalMonthlySpend * 12).toLocaleString()} / yr
                    </div>
                 </div>

                 <div className="flex-grow flex flex-wrap gap-x-8 gap-y-4 items-center">
                    {DEFAULT_SPEND_CATS.map(cat => (
                       <div key={cat.id} className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${cat.color.replace('text-', 'bg-').replace('border-', 'bg-').split(' ')[0]} bg-opacity-20`}>
                             <cat.icon size={16} className={cat.color.split(' ')[1]} />
                          </div>
                          <div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase">{cat.label}</div>
                             <div className="flex items-center">
                                <span className="text-sm text-slate-400 mr-1">$</span>
                                <input 
                                   type="number" 
                                   value={spendValues[cat.id]} 
                                   onChange={(e) => updateSpendValue(cat.id, e.target.value)}
                                   className="w-20 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none font-mono text-slate-800 font-medium"
                                />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

               {/* Row 1.5: Cards Available (Global Portfolio) */}
               <div className="pb-6 border-b border-slate-100">
                 <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cards Available (Global)</h2>
                 <div className="flex flex-wrap gap-4">
                   {CARDS.map(card => (
                     <label key={card.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${globalAvailableCardIds.includes(card.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`}>
                        <input 
                          type="checkbox" 
                          checked={globalAvailableCardIds.includes(card.id)}
                          onChange={() => toggleGlobalCard(card.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                           <div className={`p-1 rounded ${card.color} text-white`}>
                              <card.icon size={12} />
                           </div>
                           <span className={`text-xs font-bold ${globalAvailableCardIds.includes(card.id) ? 'text-slate-800' : 'text-slate-500'}`}>{card.name}</span>
                           <span className="text-[10px] text-slate-400 font-mono">-${card.annualFee}</span>
                        </div>
                     </label>
                   ))}
                 </div>
              </div>

              {/* Row 2: Bilt Settings & Events */}
              <div className="flex flex-col xl:flex-row gap-8">
                 <div className="flex flex-wrap items-center gap-x-8 gap-y-4 xl:border-r xl:border-slate-100 xl:pr-8">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[100px]">Bilt Settings</h2>
                    
                    <div className="flex items-center gap-2">
                        <Home size={16} className="text-slate-400"/>
                        <span className="text-sm font-medium text-slate-600">Rent:</span>
                        <div className="flex items-center">
                          <span className="text-sm text-slate-400 mr-1">$</span>
                          <input 
                              type="number" 
                              value={globalSettings.rent} 
                              onChange={(e) => updateGlobalSetting('rent', e.target.value)}
                              className="w-20 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none font-mono text-slate-800"
                          />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-slate-400"/>
                        <span className="text-sm font-medium text-slate-600">Init Cash:</span>
                        <input 
                          type="number" 
                          value={globalSettings.initialBiltCash} 
                          onChange={(e) => updateGlobalSetting('initialBiltCash', e.target.value)}
                          className="w-16 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none font-mono text-slate-800"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-slate-400"/>
                        <span className="text-sm font-medium text-slate-600">Min Bal:</span>
                        <input 
                          type="number" 
                          value={globalSettings.minProtectedBalance} 
                          onChange={(e) => updateGlobalSetting('minProtectedBalance', e.target.value)}
                          className="w-16 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none font-mono text-slate-800"
                        />
                    </div>
                 </div>

                 <div className="flex items-center gap-x-6 gap-y-4 flex-wrap">
                     <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[100px]">Sim Events</h2>
                     
                     <div className="flex items-center bg-slate-50 rounded-full px-2 py-1 gap-2">
                        <button onClick={generateBoostEvents} className="flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-full hover:bg-slate-50 transition-colors shadow-sm">
                          <Rocket size={12} /> Generate Boost
                        </button>
                        {(boostSettings.Chase || boostSettings.Citi || boostSettings.Bilt) ? (
                          <div className="flex items-center gap-2 text-[10px] font-mono pl-1">
                             <span title="Chase Boost Month" className="text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded border border-blue-100">Ch:M{boostSettings.Chase}</span>
                             <span title="Citi Boost Month" className="text-teal-600 bg-teal-100/50 px-1.5 py-0.5 rounded border border-teal-100">Ci:M{boostSettings.Citi}</span>
                             <span title="Bilt Boost Month" className="text-stone-600 bg-stone-200/50 px-1.5 py-0.5 rounded border border-stone-200">Bi:M{boostSettings.Bilt}</span>
                             <button onClick={clearBoostEvents} className="hover:text-red-500 flex items-center justify-center h-4 w-4 ml-1"><X size={12}/></button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic pr-2">No active boosts</span>
                        )}
                     </div>
                 </div>
                 
                 <div className="ml-auto flex items-center gap-2">
                   <button 
                     onClick={clearAllScenarios} 
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 text-xs font-bold rounded-full transition-colors mr-2"
                   >
                     <Trash2 size={14} /> Clear All
                   </button>
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <main className="flex-grow overflow-x-auto">
        {activeView === 'simulation' ? (
          <div className="h-full min-w-max p-6 flex gap-6 items-start">
            {scenariosData.map(scenario => {
              const unallocatedCats = DEFAULT_SPEND_CATS.filter(cat => !scenario.allocations[cat.id]);

              return (
                <div key={scenario.id} className="w-80 flex-shrink-0 bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden group transition-all hover:shadow-lg hover:border-blue-200/50">
                  
                  {/* Scenario Header */}
                  <div className="p-4 bg-white border-b border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <input 
                        className="font-black text-lg text-slate-800 bg-transparent outline-none w-full"
                        value={scenario.name}
                        onChange={(e) => updateScenarioField(scenario.id, 'name', e.target.value)}
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => duplicateScenario(scenario)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400" aria-label="Duplicate scenario"><Copy size={14}/></button>
                        <button onClick={() => removeScenario(scenario.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400" aria-label="Remove scenario"><X size={14}/></button>
                      </div>
                    </div>

                    {/* Simulation Portfolio Toggle */}
                    <div className="mb-4">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Simulation Portfolio</div>
                      <div className="flex flex-wrap gap-1.5">
                        {globalAvailableCardIds.map(cardId => {
                           const card = CARDS.find(c => c.id === cardId);
                           const isActive = scenario.activeCardIds.includes(cardId);
                           if (!card) return null;
                           return (
                             <button
                               key={cardId}
                               onClick={() => toggleScenarioCard(scenario.id, cardId)}
                               className={`p-1 rounded border transition-all ${isActive ? `${card.color} text-white border-transparent` : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 grayscale'}`}
                               title={card.name}
                               aria-label={`Toggle ${card.name}`}
                             >
                               <card.icon size={12} />
                             </button>
                           );
                        })}
                      </div>
                    </div>
                    
                    {/* Monthly Top Line */}
                    <div className="flex justify-between items-end mb-3">
                       <div className="flex gap-4">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Total Pts (Yr)</div>
                            <div className="text-xl font-black text-slate-800">{scenario.annualTotalPoints.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Net Value</div>
                             <div className="text-xl font-black text-emerald-600">${scenario.annualTotalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                          </div>
                       </div>
                      <button 
                        onClick={() => setChartScenarioId(scenario.id)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 mb-1 transition-colors"
                      >
                        <LineChartIcon size={12} /> Projection
                      </button>
                    </div>

                    {/* Annual Breakdown Block */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 transition-all">
                      <div className="flex justify-between items-center mb-2 cursor-pointer select-none" onClick={() => toggleDetails(scenario.id)}>
                          <div className="flex items-center gap-1.5">
                              <Trophy size={12} className="text-blue-500" />
                              <span className="text-[10px] uppercase font-bold text-slate-500">Annual Breakdown</span>
                          </div>
                          {scenario.isDetailsExpanded ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                      </div>
                      
                      {scenario.isDetailsExpanded && (
                        <div className="space-y-1.5 mb-3 animate-in slide-in-from-top-1 duration-200">
                          {/* Chase */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                              <span className="text-blue-600 font-medium">Chase <span className="text-[10px] text-slate-400 font-normal">({ECOSYSTEMS.Chase.valuation}¢)</span></span>
                              <span className="font-bold text-slate-700 text-right">{scenario.simulation.annualTotals.Chase.toLocaleString()}</span>
                              <span className="text-slate-400 font-mono text-right w-14">${scenario.valChase.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                          </div>
                          {/* Bilt */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                              <span className="text-stone-600 font-medium">Bilt <span className="text-[10px] text-slate-400 font-normal">({ECOSYSTEMS.Bilt.valuation}¢)</span></span>
                              <span className="font-bold text-slate-700 text-right">{scenario.simulation.annualTotals.Bilt.toLocaleString()}</span>
                              <span className="text-slate-400 font-mono text-right w-14">${scenario.valBilt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                          </div>
                          {/* Citi */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                              <span className="text-teal-600 font-medium">Citi <span className="text-[10px] text-slate-400 font-normal">({ECOSYSTEMS.Citi.valuation}¢)</span></span>
                              <span className="font-bold text-slate-700 text-right">{scenario.simulation.annualTotals.Citi.toLocaleString()}</span>
                              <span className="text-slate-400 font-mono text-right w-14">${scenario.valCiti.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                          </div>
                          
                          {/* Total Row */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center pt-1.5 mt-1 border-t border-slate-200/60 bg-white/50 rounded-sm">
                              <span className="text-slate-500 font-bold uppercase text-[10px] pl-1">Total Pts</span>
                              <span className="font-black text-slate-800 text-right">{scenario.annualTotalPoints.toLocaleString()}</span>
                              <span className="text-slate-600 font-mono font-bold text-right w-14">${scenario.totalPointsVal.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                          </div>

                          {/* CSP 10% Anniversary Bonus Note */}
                          {scenario.simulation.totalCSPAnniversaryBonus > 0 && (
                            <div className="flex justify-between text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-1">
                                <span className="font-medium">Includes CSP 10% Bonus</span>
                                <span className="font-bold">+{scenario.simulation.totalCSPAnniversaryBonus.toLocaleString()} pts</span>
                            </div>
                          )}

                          {/* Smart Overflow Gain Note */}
                          {scenario.simulation.totalSmartOverflowGain > 0 && (
                            <div className="flex justify-between text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1">
                                <span className="font-medium flex items-center gap-1"><ArrowRightLeft size={10} /> Smart Overflow Gain</span>
                                <span className="font-bold">+{scenario.simulation.totalSmartOverflowGain.toLocaleString()} pts</span>
                            </div>
                          )}

                          <div className="border-t border-slate-200 my-2"></div>

                          <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-1.5">
                                  <Coins size={12} className="text-emerald-500" />
                                  <span className="text-[10px] uppercase font-bold text-slate-500">Cash ($)</span>
                              </div>
                              <span className="text-xs font-black text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
                                  ${scenario.annualTotalCash.toLocaleString(undefined, {maximumFractionDigits: 0})}
                              </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                              <div className="flex justify-between text-xs">
                                  <span className="text-emerald-600 font-medium">Bilt (Bal)</span>
                                  <span className="font-bold text-slate-700">${scenario.annualBiltCash.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              </div>
                              {scenario.simulation.totalLyftRedeemed > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-pink-600 font-medium">Bilt (Lyft)</span>
                                    <span className="font-bold text-slate-700">${scenario.simulation.totalLyftRedeemed.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                </div>
                              )}
                              {scenario.simulation.totalWalgreensRedeemed > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-red-600 font-medium">Bilt (Walgreens)</span>
                                    <span className="font-bold text-slate-700">${scenario.simulation.totalWalgreensRedeemed.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-xs">
                                  <span className="text-yellow-600 font-medium">Amazon</span>
                                  <span className="font-bold text-slate-700">${scenario.annualAmazonCash.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              </div>
                          </div>

                          <div className="border-t border-slate-200 my-3 pt-2">
                              <div className="space-y-1 mb-2 border-b border-slate-100 pb-2">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fees & Credits</div>
                                  {scenario.scenarioActiveCards.map(card => (
                                      <React.Fragment key={card.id}>
                                          {card.annualFee > 0 && (
                                              <div className="flex justify-between text-xs text-red-500">
                                                  <span>{card.name} Fee</span>
                                                  <span>-${card.annualFee}</span>
                                              </div>
                                          )}
                                          {card.credits?.map((credit) => {
                                              const creditVal = creditValues[`${card.id}-${credit.id}`] ?? credit.defaultUserValue;
                                              return (
                                                <div key={`${card.id}-credit-${credit.id}`} className="flex justify-between text-xs text-emerald-600">
                                                    <span>{card.name} {credit.label}</span>
                                                    <span title={`Face Value: $${credit.faceValue}`}>+${creditVal}</span>
                                                </div>
                                              );
                                          })}
                                      </React.Fragment>
                                  ))}
                                  <div className="flex justify-between text-xs font-bold text-slate-600 pt-1 mt-1 border-t border-slate-100/50">
                                      <span>Total Fees & Credits</span>
                                      <span className={(scenario.annualCredits - scenario.annualFees) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                          {(scenario.annualCredits - scenario.annualFees) >= 0 ? '+' : '-'}${Math.abs(scenario.annualCredits - scenario.annualFees).toLocaleString()}
                                      </span>
                                  </div>
                              </div>
                          </div>
                        </div>
                      )}

                      <div className={`flex justify-between items-center bg-white p-2 rounded border border-indigo-100 shadow-sm ${scenario.isDetailsExpanded ? '' : 'mt-0'}`}>
                          <span className="text-xs font-bold text-indigo-900 uppercase">Net Value</span>
                          <span className="text-sm font-black text-indigo-600">
                              ${scenario.annualTotalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
                          </span>
                      </div>
                    </div>
                  </div>

                  {/* Unallocated Pool */}
                  <div className="p-3 border-b border-slate-200 bg-slate-50/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between">
                      <span>Unallocated Spend</span>
                      <span>{unallocatedCats.length} items</span>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {unallocatedCats.map(cat => (
                        <DraggableSpendChip key={cat.id} cat={cat} value={spendValues[cat.id]} compact />
                      ))}
                      {unallocatedCats.length === 0 && (
                        <div className="w-full text-center text-xs text-slate-400 italic py-2">
                          All spend allocated!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cards List (Drop Zones) */}
                  <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-450px)]">
                    {scenario.scenarioActiveCards.map(card => (
                      <CardDropZone 
                        key={card.id}
                        card={card}
                        allocations={scenario.allocations}
                        spendValues={spendValues}
                        onDrop={(catId, cardId) => handleDrop(scenario.id, catId, cardId)}
                        onRemove={(catId) => handleRemoveAllocation(scenario.id, catId)}
                        biltSettings={card.ecosystem === 'Bilt' ? {
                            rent: scenario.useBiltCashForRent,
                            accelerator: scenario.useBiltAccelerator,
                            smartOverflow: scenario.useSmartOverflow,
                            lyft: scenario.useLyftCredit,
                            walgreens: scenario.useWalgreensCredit
                        } : undefined}
                        onUpdateBiltSetting={(field, val) => updateScenarioField(scenario.id, field, val)}
                      />
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <ConfigView creditValues={creditValues} onUpdateCreditValue={updateCreditValue} />
        )}
      </main>

      {/* Detail View Modal */}
      {chartScenarioId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <LineChartIcon className="text-blue-600" />
                  Annual Projection
                </h3>
              </div>
              <button 
                onClick={() => setChartScenarioId(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50/30 flex flex-col items-center">
              {scenariosData.find(s => s.id === chartScenarioId) && (
                <>
                  <SimulationCharts history={scenariosData.find(s => s.id === chartScenarioId)!.simulation.history} />
                  <div className="w-full">
                    <SimulationTable history={scenariosData.find(s => s.id === chartScenarioId)!.simulation.history} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}