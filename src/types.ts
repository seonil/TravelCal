export interface Participant {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  payerId: string;
  amount: number;
  description?: string;
}

export interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
}
