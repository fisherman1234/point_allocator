import React, { useState } from 'react';
import { SpendCategoryDefinition, CardConfig } from '../types';
import { GripVertical, ChevronDown, ChevronRight, X, Gift } from 'lucide-react';
import { DEFAULT_SPEND_CATS } from '../constants';
import { getCardCategoryId } from '../services/simulationService';

interface DraggableSpendChipProps {
  cat: SpendCategoryDefinition;
  value: number;
  compact?: boolean;
}

export const DraggableSpendChip: React.FC<DraggableSpendChipProps> = ({ cat, value, compact = false }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('categoryId', cat.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      className={`${cat.color} ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} rounded-lg border font-medium cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 shadow-sm hover:shadow-md transition-all select-none`}
    >
      <div className="flex items-center gap-1.5">
        {!compact && <GripVertical size={14} className="opacity-50" />}
        <cat.icon size={14} />
        <span>{cat.label}</span>
      </div>
      <span className="font-bold bg-white/50 px-1.5 rounded ml-2">
        ${value?.toLocaleString()}
      </span>
    </div>
  );
};

interface CardDropZoneProps {
  card: CardConfig;
  allocations: Record<string, string>;
  spendValues: Record<string, number>;
  onDrop: (catId: string, cardId: string) => void;
  onRemove: (catId: string) => void;
}

export const CardDropZone: React.FC<CardDropZoneProps> = ({ card, allocations, spendValues, onDrop, onRemove }) => {
  const [isOver, setIsOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const assignedCats = DEFAULT_SPEND_CATS.filter(cat => allocations[cat.id] === card.id);
  const totalAssignedSpend = assignedCats.reduce((sum, cat) => sum + (spendValues[cat.id] || 0), 0);
  
  let cardPoints = 0;
  assignedCats.forEach(cat => {
    const targetCatId = getCardCategoryId(card.id, cat.type);
    const categoryConfig = card.categories.find(c => c.id === targetCatId);
    cardPoints += ((spendValues[cat.id] || 0) * (categoryConfig ? categoryConfig.multiplier : 1));
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const categoryId = e.dataTransfer.getData('categoryId');
    if (categoryId) {
      onDrop(categoryId, card.id);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative bg-white rounded-xl border transition-all duration-200 ${
        isOver ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02] shadow-lg z-10' : 'border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div 
        className={`${card.color} px-4 py-3 text-white flex items-center justify-between rounded-t-xl cursor-pointer gap-3`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? <ChevronDown size={16} className="flex-shrink-0" /> : <ChevronRight size={16} className="flex-shrink-0" />}
          <card.icon size={18} className="flex-shrink-0" />
          <h3 className="font-bold text-sm truncate" title={card.name}>{card.name}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold px-2 py-0.5 bg-white/20 rounded-full whitespace-nowrap">
            {cardPoints.toLocaleString()} {card.ecosystem === 'Amazon' ? 'pts' : 'pts'}
          </div>
        </div>
      </div>

      {/* Drop Body */}
      <div className={`p-3 space-y-2 min-h-[60px] ${isOver ? 'bg-blue-50/50' : 'bg-slate-50/30'} ${!isExpanded && assignedCats.length === 0 ? 'hidden' : ''}`}>
        {assignedCats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            <span>Drop spend here</span>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedCats.map(cat => (
              <div key={cat.id} className="relative group">
                <DraggableSpendChip cat={cat} value={spendValues[cat.id]} compact />
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(cat.id); }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                  title="Unassign"
                  aria-label="Remove category"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-3 bg-white rounded-b-xl">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Point Breakdown</div>
          {card.categories.map(cat => {
            const bucketTotal = assignedCats
              .filter(c => getCardCategoryId(card.id, c.type) === cat.id)
              .reduce((sum, c) => sum + (spendValues[c.id] || 0), 0);
            
            return (
              <div key={cat.id} className="flex justify-between items-center text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <cat.icon size={12} /> {cat.label}
                </span>
                <span className="font-mono">
                  ${bucketTotal.toLocaleString()} <span className="text-slate-400">x{cat.multiplier}</span>
                </span>
              </div>
            );
          })}
          
          {/* CSP 10% Anniversary Bonus */}
          {card.id === 'csp' && (
             <div className="flex justify-between items-center text-xs text-orange-600 mt-2 pt-2 border-t border-slate-50 font-medium">
                <span className="flex items-center gap-1.5">
                  <Gift size={12} /> 10% bonus
                </span>
                <span className="font-mono">
                  +{(totalAssignedSpend * 0.1).toLocaleString(undefined, {maximumFractionDigits: 0})} pts
                </span>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
