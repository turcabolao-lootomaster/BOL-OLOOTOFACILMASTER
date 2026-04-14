/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'master' | 'admin' | 'vendedor' | 'cliente';

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  whatsapp?: string;
  accessCode?: string;
  role: UserRole;
  totalPoints: number;
  linkedSellerCode?: string;
  pixKey?: string;
  createdAt: any;
}

export interface Seller {
  id: string;
  userId: string;
  code: string;
  password?: string;
  commissionPct: number;
  totalSales: number;
  totalCommission: number;
  pixKey?: string;
}

export type ContestStatus = 'aberto' | 'em_andamento' | 'encerrado';

export interface Draw {
  id: string;
  number: number;
  status: 'pendente' | 'concluido';
  results: number[];
}

export interface Contest {
  id: string;
  number: number;
  status: ContestStatus;
  draws: Draw[];
  createdAt: any;
  totalCollected?: number;
  betPrice?: number;
  prizes?: {
    draw1: string;
    draw2: string;
    draw3: string;
    rapidinha1: string;
    rapidinha2: string;
    rankeada: string;
  };
  prizeConfig?: {
    fixed10PtsDraw1: number;
    fixed10PtsDraw2: number;
    fixed10PtsDraw3: number;
    fixed25PlusTotal: number;
    fixed27PlusTotal: number;
    pctRapidinha: number;
    pctChampion: number;
    pctVice: number;
    pctSeller: number;
    pctAdmin: number;
    pctReserve: number;
  };
  publicLink?: string;
}

export type BetStatus = 'pendente' | 'validado' | 'rejeitado';

export interface Bet {
  id: string;
  userId: string;
  userName: string;
  contestId: string;
  contestNumber?: number;
  numbers: number[];
  status: BetStatus;
  betName?: string;
  sellerId?: string;
  sellerCode?: string;
  createdAt: any;
  hits?: number[]; // [hits1, hits2, hits3]
  repeat?: boolean;
}

export interface UserRanking {
  userId: string;
  userName: string;
  points: number;
  position: number;
  sellerCode?: string;
  numbers?: number[];
}

export interface Commission {
  id: string;
  sellerId: string;
  betId: string;
  amount: number;
  paid: boolean;
  createdAt: any;
}

export interface Settings {
  whatsappNumber: string;
  updatedAt: any;
}
