import { 
  CreditCard, Utensils, Plane, Moon, Wallet, Trophy, DollarSign, 
  ShoppingCart, Wifi, Home
} from 'lucide-react';
import { CardConfig, SpendCategoryDefinition } from './types';

export const CARDS: CardConfig[] = [
  {
    id: 'csr',
    name: 'Sapphire Reserve',
    annualFee: 795,
    ecosystem: 'Chase',
    color: 'bg-blue-600',
    icon: CreditCard,
    categories: [
      { id: 'dining', label: 'Dining', multiplier: 3, icon: Utensils, accepts: ['dining', 'dining_evening'] },
      { id: 'airfare', label: 'Airfare', multiplier: 4, icon: Plane, accepts: ['airfare'] },
      { id: 'base', label: 'Other Spend', multiplier: 1, icon: DollarSign, accepts: ['base', 'travel', 'amazon_spend', 'internet'] }, 
    ],
    credits: [
      { label: 'Travel Credit', amount: 300 },
      { label: 'StubHub Credit (Valued)', amount: 200 },
      { label: 'Lyft Credit', amount: 120 },
      { label: 'Apple Subscriptions', amount: 288 },
      { label: 'Dining Credit', amount: 300 },
      { label: 'DoorDash Promos (Valued)', amount: 200 }
    ]
  },
  {
    id: 'csp',
    name: 'Sapphire Preferred',
    annualFee: 95,
    ecosystem: 'Chase',
    color: 'bg-blue-500',
    icon: CreditCard,
    categories: [
      { id: 'dining', label: 'Dining', multiplier: 3, icon: Utensils, accepts: ['dining', 'dining_evening'] },
      { id: 'travel', label: 'Travel', multiplier: 2, icon: Plane, accepts: ['travel', 'airfare'] },
      { id: 'base', label: 'Other Spend', multiplier: 1, icon: DollarSign, accepts: ['base', 'amazon_spend', 'internet'] },
    ]
  },
  {
    id: 'ink',
    name: 'Chase Ink',
    annualFee: 95,
    ecosystem: 'Chase',
    color: 'bg-blue-700',
    icon: Wallet,
    categories: [
      { id: 'travel', label: 'Travel', multiplier: 3, icon: Plane, accepts: ['travel', 'airfare'] },
      { id: 'telecom', label: 'Internet/Phone', multiplier: 3, icon: Wifi, accepts: ['internet'] },
      { id: 'base', label: 'Other Spend', multiplier: 1, icon: DollarSign, accepts: ['base', 'dining', 'dining_evening', 'amazon_spend'] },
    ]
  },
  {
    id: 'bilt',
    name: 'Bilt Palladium',
    annualFee: 495,
    ecosystem: 'Bilt',
    color: 'bg-stone-800',
    icon: Trophy,
    categories: [
      { id: 'general', label: 'Everything', multiplier: 2, icon: DollarSign, accepts: ['base', 'dining', 'dining_evening', 'travel', 'airfare', 'amazon_spend', 'internet'] },
    ]
  },
  {
    id: 'bilt_obsidian',
    name: 'Bilt Obsidian',
    annualFee: 95,
    ecosystem: 'Bilt',
    color: 'bg-neutral-900',
    icon: Trophy,
    categories: [
      { id: 'dining', label: 'Dining', multiplier: 3, icon: Utensils, accepts: ['dining', 'dining_evening'] },
      { id: 'travel', label: 'Travel', multiplier: 2, icon: Plane, accepts: ['travel', 'airfare'] },
      { id: 'base', label: 'Other Spend', multiplier: 1, icon: DollarSign, accepts: ['base', 'amazon_spend', 'internet'] },
    ]
  },
  {
    id: 'bilt_blue',
    name: 'Bilt Blue',
    annualFee: 0,
    ecosystem: 'Bilt',
    color: 'bg-blue-400', 
    icon: Trophy,
    categories: [
      { id: 'general', label: 'Everything', multiplier: 1, icon: DollarSign, accepts: ['base', 'dining', 'dining_evening', 'travel', 'airfare', 'amazon_spend', 'internet'] },
    ]
  },
  {
    id: 'citi',
    name: 'Citi Night',
    annualFee: 495,
    ecosystem: 'Citi',
    color: 'bg-teal-600',
    icon: Moon,
    categories: [
      { id: 'evening', label: 'Evening Spend', multiplier: 6, icon: Moon, accepts: ['dining_evening'] }, 
      { id: 'dining', label: 'Dining', multiplier: 3, icon: Utensils, accepts: ['dining'] },
      { id: 'airfare', label: 'Airfare', multiplier: 1.5, icon: Plane, accepts: ['airfare'] },
      { id: 'base', label: 'Other Spend', multiplier: 1.5, icon: DollarSign, accepts: ['base', 'travel', 'amazon_spend', 'internet'] },
    ],
    credits: [
      { label: 'Best Buy Credit', amount: 200 }
    ]
  },
  {
    id: 'amazon',
    name: 'Amazon Prime',
    annualFee: 0,
    ecosystem: 'Amazon',
    color: 'bg-slate-800', // Dark grey/black for Prime
    icon: ShoppingCart,
    categories: [
      { id: 'prime', label: '5% Amazon/WF', multiplier: 5, icon: ShoppingCart, accepts: ['amazon_spend'] },
      { id: 'dining', label: '2% Dining', multiplier: 2, icon: Utensils, accepts: ['dining', 'dining_evening'] },
      { id: 'base', label: '1% Other', multiplier: 1, icon: DollarSign, accepts: ['base', 'travel', 'airfare', 'internet'] },
    ]
  }
];

export const DEFAULT_SPEND_CATS: SpendCategoryDefinition[] = [
  { id: 'dining_nw', label: 'Dining (Night)', type: 'dining_evening', defaultAmount: 1164, icon: Utensils, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'dining_other', label: 'Dining (Day)', type: 'dining', defaultAmount: 1747, icon: Utensils, color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { id: 'airfare', label: 'Airfare', type: 'airfare', defaultAmount: 500, icon: Plane, color: 'bg-sky-50 text-sky-600 border-sky-100' },
  { id: 'travel', label: 'Travel', type: 'travel', defaultAmount: 1251, icon: Plane, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'internet', label: 'Internet/Phone', type: 'internet', defaultAmount: 75, icon: Wifi, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'amazon_spend', label: 'Amazon/WF', type: 'amazon_spend', defaultAmount: 500, icon: ShoppingCart, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'others', label: 'Others', type: 'base', defaultAmount: 3127, icon: DollarSign, color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const INITIAL_RENT = 3309;
export const INITIAL_CASH = 500;
export const INITIAL_MIN_BALANCE = 100;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
