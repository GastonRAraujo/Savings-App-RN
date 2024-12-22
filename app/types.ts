export interface Savings {
    id: number;
    name: string;
    amount: number;
    date: string;
  }
  
// Type definition for a record in the Expenses table
export interface Expenses {
  id: number;
  name: string;
  amount: number;
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