/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COLORS = {
  primary: '#00FF00', // Neon Green from PDF
  secondary: '#141414', // Dark background
  accent: '#F27D26', // Orange
  purple: '#A855F7',
  blue: '#3B82F6',
  red: '#EF4444',
  gold: '#FFD700',
  silver: '#C0C0C0',
};

export const BET_PRICE = 10; // Example price
export const SELLER_COMMISSION_PCT = 15;
export const RANKING_GOAL = 150;
export const RANKING_PRIZE = 1000;
