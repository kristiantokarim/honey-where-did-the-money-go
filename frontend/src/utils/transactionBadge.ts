import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { TransactionType } from '../types';

export function getTypeBadge(type?: TransactionType) {
  switch (type) {
    case 'income':
      return { label: 'Income', icon: ArrowDownLeft, bgColor: 'bg-green-100', textColor: 'text-green-700' };
    case 'transfer_out':
      return { label: 'Out', icon: ArrowUpRight, bgColor: 'bg-orange-100', textColor: 'text-orange-700' };
    case 'transfer_in':
      return { label: 'In', icon: ArrowDownLeft, bgColor: 'bg-blue-100', textColor: 'text-blue-700' };
    default:
      return null;
  }
}
