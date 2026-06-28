import { User, Bet, Contest, Seller, Settings, SellerRequest, UserRanking, Draw } from '../types';

export const mockMasterUser: User = {
  id: 'demo_leandro',
  uid: 'demo_leandro',
  uids: ['demo_leandro'],
  name: 'Leandro (Administrador)',
  email: 'turcabolao@gmail.com',
  whatsapp: '11999999999',
  role: 'master',
  totalPoints: 88,
  createdAt: { seconds: 1782500000, nanoseconds: 0 }
};

export const mockSellers: Seller[] = [
  {
    id: 'seller_maxx',
    userId: 'user_maxx',
    code: 'MAXX',
    password: '123',
    whatsapp: '11988888888',
    commissionPct: 15,
    totalSales: 450,
    totalCommission: 67.5,
    pixKey: 'maxx@pix.com',
    blocked: false
  },
  {
    id: 'seller_acme',
    userId: 'user_acme',
    code: 'ACME',
    password: '123',
    whatsapp: '11977777777',
    commissionPct: 15,
    totalSales: 600,
    totalCommission: 90.0,
    pixKey: 'acme@pix.com',
    blocked: false
  },
  {
    id: 'seller_alado',
    userId: 'user_alado',
    code: 'ALADO',
    password: '123',
    whatsapp: '11966666666',
    commissionPct: 15,
    totalSales: 300,
    totalCommission: 45.0,
    pixKey: 'alado@pix.com',
    blocked: false
  }
];

export const mockUsers: User[] = [
  mockMasterUser,
  {
    id: 'user_maxx',
    uid: 'user_maxx',
    uids: ['user_maxx'],
    name: 'Marcos MAXX',
    email: 'marcos@maxx.com',
    whatsapp: '11988888888',
    role: 'vendedor',
    totalPoints: 66,
    createdAt: { seconds: 1782500000, nanoseconds: 0 }
  },
  {
    id: 'user_acme',
    uid: 'user_acme',
    uids: ['user_acme'],
    name: 'Ana ACME',
    email: 'ana@acme.com',
    whatsapp: '11977777777',
    role: 'vendedor',
    totalPoints: 86,
    createdAt: { seconds: 1782500000, nanoseconds: 0 }
  },
  {
    id: 'user_alado',
    uid: 'user_alado',
    uids: ['user_alado'],
    name: 'Alberto ALADO',
    email: 'alberto@alado.com',
    whatsapp: '11966666666',
    role: 'vendedor',
    totalPoints: 82,
    createdAt: { seconds: 1782500000, nanoseconds: 0 }
  },
  {
    id: 'user_rodo_mirto',
    uid: 'user_rodo_mirto',
    uids: ['user_rodo_mirto'],
    name: 'RODO MIRTO',
    email: 'rodomirto@gmail.com',
    whatsapp: '11955555555',
    role: 'cliente',
    totalPoints: 88,
    linkedSellerCode: 'MAXX',
    createdAt: { seconds: 1782500000, nanoseconds: 0 }
  },
  {
    id: 'user_russo',
    uid: 'user_russo',
    uids: ['user_russo'],
    name: 'RUSSO',
    email: 'russo@gmail.com',
    whatsapp: '11944444444',
    role: 'cliente',
    totalPoints: 86,
    linkedSellerCode: 'ACME',
    createdAt: { seconds: 1782500000, nanoseconds: 0 }
  }
];

export const mockSettings: Settings = {
  whatsappNumber: '5511999999999',
  poolStartDate: '2026-07-01',
  poolStartTime: '19:00',
  isPoolActive: true,
  maintenanceMode: false,
  maintenanceMessage: 'Sistema em manutenção programada. Voltamos em breve!',
  updatedAt: { seconds: 1782500000, nanoseconds: 0 }
};

export const mockContests: Contest[] = [
  {
    id: 'contest_4',
    number: 4,
    status: 'encerrado',
    createdAt: { seconds: 1782000000, nanoseconds: 0 },
    totalCollected: 1350,
    betPrice: 15,
    prizes: {
      draw1: 'R$ 500,00',
      draw2: 'R$ 300,00',
      draw3: 'R$ 200,00',
      rapidinha1: 'R$ 50,00',
      rapidinha2: 'R$ 50,00',
      rankeada: 'R$ 250,00'
    },
    prizeConfig: {
      fixed10PtsDraw1: 10,
      fixed10PtsDraw2: 10,
      fixed10PtsDraw3: 10,
      fixed25PlusTotal: 50,
      fixed28PlusTotal: 100,
      pctRapidinha: 10,
      pctChampion: 40,
      pctVice: 20,
      pctSeller: 10,
      pctAdmin: 10,
      pctReserve: 10
    },
    displayPrizes: {
      draw1: 500,
      draw2: 300,
      draw3: 200,
      rapidinha: 50,
      champion: 250,
      vice: 100,
      bonus25: 50,
      bonus28: 100
    },
    startDate: '2026-05-20',
    startTime: '20:00',
    draws: [
      {
        id: 'c4_draw_1',
        number: 1,
        status: 'concluido',
        results: [2, 5, 6, 9, 10, 12, 19, 21, 22, 24, 1, 3, 7, 8, 11]
      },
      {
        id: 'c4_draw_2',
        number: 2,
        status: 'concluido',
        results: [5, 6, 7, 9, 10, 18, 19, 22, 23, 24, 2, 4, 8, 11, 15]
      },
      {
        id: 'c4_draw_3',
        number: 3,
        status: 'concluido',
        results: [2, 6, 10, 12, 15, 18, 19, 23, 24, 25, 1, 3, 5, 7, 9]
      }
    ]
  },
  {
    id: 'contest_5',
    number: 5,
    status: 'aberto',
    createdAt: { seconds: 1782500000, nanoseconds: 0 },
    totalCollected: 0,
    betPrice: 15,
    prizes: {
      draw1: 'A definir',
      draw2: 'A definir',
      draw3: 'A definir',
      rapidinha1: 'A definir',
      rapidinha2: 'A definir',
      rankeada: 'A definir'
    },
    prizeConfig: {
      fixed10PtsDraw1: 10,
      fixed10PtsDraw2: 10,
      fixed10PtsDraw3: 10,
      fixed25PlusTotal: 50,
      fixed28PlusTotal: 100,
      pctRapidinha: 10,
      pctChampion: 40,
      pctVice: 20,
      pctSeller: 10,
      pctAdmin: 10,
      pctReserve: 10
    },
    startDate: '2026-07-02',
    startTime: '20:00',
    draws: [
      {
        id: 'c5_draw_1',
        number: 1,
        status: 'pendente',
        results: []
      },
      {
        id: 'c5_draw_2',
        number: 2,
        status: 'pendente',
        results: []
      },
      {
        id: 'c5_draw_3',
        number: 3,
        status: 'pendente',
        results: []
      }
    ]
  }
];

export const mockBets: Bet[] = [
  {
    id: 'bet_1',
    userId: 'user_rodo_mirto',
    userName: 'RODO MIRTO',
    contestId: 'contest_4',
    contestNumber: 4,
    numbers: [2, 5, 6, 9, 10, 12, 19, 21, 22, 24],
    status: 'validado',
    sellerId: 'seller_maxx',
    sellerCode: 'MAXX',
    createdAt: { seconds: 1782001000, nanoseconds: 0 },
    hits: [10, 8, 7]
  },
  {
    id: 'bet_2',
    userId: 'user_russo',
    userName: 'RUSSO',
    contestId: 'contest_4',
    contestNumber: 4,
    numbers: [5, 6, 7, 9, 10, 18, 19, 22, 23, 24],
    status: 'validado',
    sellerId: 'seller_acme',
    sellerCode: 'ACME',
    createdAt: { seconds: 1782002000, nanoseconds: 0 },
    hits: [8, 10, 7]
  },
  {
    id: 'bet_3',
    userId: 'user_rodo_mirto',
    userName: 'RODO MIRTO',
    contestId: 'contest_5',
    contestNumber: 5,
    numbers: [2, 5, 6, 9, 10, 12, 19, 21, 22, 24],
    status: 'validado',
    sellerId: 'seller_maxx',
    sellerCode: 'MAXX',
    createdAt: { seconds: 1782501000, nanoseconds: 0 },
    hits: [0, 0, 0]
  },
  {
    id: 'bet_4',
    userId: 'user_russo',
    userName: 'RUSSO',
    contestId: 'contest_5',
    contestNumber: 5,
    numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
    status: 'pendente',
    sellerId: 'seller_acme',
    sellerCode: 'ACME',
    createdAt: { seconds: 1782502000, nanoseconds: 0 },
    hits: [0, 0, 0]
  }
];

export const mockRankings: UserRanking[] = [
  { userId: 'user_rodo_mirto', userName: 'RODO MIRTO', points: 88, position: 1, sellerCode: 'MAXX', numbers: [2, 5, 6, 9, 10, 12, 19, 21, 22, 24] },
  { userId: 'user_russo', userName: 'RUSSO', points: 86, position: 2, sellerCode: 'ACME', numbers: [5, 6, 7, 9, 10, 18, 19, 22, 23, 24] },
  { userId: 'user_maxx', userName: 'Marcos MAXX', points: 66, position: 3, sellerCode: 'MAXX', numbers: [5, 7, 10, 14, 15, 17, 19, 22, 23, 24] }
];

export const mockSellerRequests: SellerRequest[] = [
  {
    id: 'req_1',
    userId: 'guest',
    name: 'José Vendedor',
    email: 'jose@vendas.com',
    whatsapp: '11955554444',
    requestedCode: 'JOSÉ',
    status: 'pendente',
    createdAt: { seconds: 1782505000, nanoseconds: 0 }
  }
];

// LocalStorage helpers
export function getLocalStorageData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
    return defaultValue;
  }
}

export function setLocalStorageData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
}

export function initializeDemoDatabase(force = false): void {
  if (!force && localStorage.getItem('demo_initialized') === 'true') {
    return;
  }

  setLocalStorageData('demo_settings', mockSettings);
  setLocalStorageData('demo_contests', mockContests);
  setLocalStorageData('demo_bets', mockBets);
  setLocalStorageData('demo_sellers', mockSellers);
  setLocalStorageData('demo_users', mockUsers);
  setLocalStorageData('demo_rankings', mockRankings);
  setLocalStorageData('demo_sellerRequests', mockSellerRequests);
  localStorage.setItem('demo_initialized', 'true');
  console.log('Virtual Demo Database Initialized!');
}
