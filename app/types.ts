export interface Savings {
    id: number;
    name: string;
    amount: number;
    date: string;
  }
  
// Type definition for a record in the Expenses table
export interface Expense {
  id: number;
  name: string;
  amountUSD: number;
  amountARS: number;
  date: string;
}

// Type definition for a record in the Income table
export interface Income {
  id: number;
  name: string;
  amountUSD: number;
  amountARS: number;
  date: string;
}

// Type definition for a record in the GrossIncome table
export interface GrossIncome {
  id: number;
  amountUSD: number;
  amountARS: number;
  date: string;
}

// Type definition for a record in the Portfolio table
export interface PortfolioValue {
  priceARS: number;
  priceUSD: number;
  date: string;
}

export interface PortfolioItem {
  symbol: string;
  description: string;
  type: string;
  amount: number;
  ppcARS: number;
  ppcUSD: number;
  lastPriceARS: number;
  lastPriceUSD: number;
  date?: string;       // optional if you store a date column
}

// Type definition for a record in the Operations table
export interface Operation {
  id: number;
  numero: number;
  fecha: string;
  tipo: string;
  simbolo: string;
  cantidad: number;
  priceARS: number;
  priceUSD: number;
}