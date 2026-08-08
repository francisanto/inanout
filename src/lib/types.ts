export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  currency: string;
  monthly_savings_target: number;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  opening_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  kind: string;
  color: string | null;
}

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  category: string | null;
  description: string | null;
  notes: string | null;
  payment_method: string | null;
  account_id: string | null;
  to_account_id: string | null;
  person_id: string | null;
  source: string | null;
  is_recurring: boolean;
  borrowing_id: string | null;
  lending_id: string | null;
  debt_id: string | null;
  created_at: string;
}

export interface Borrowing {
  id: string;
  person_id: string | null;
  person_name: string;
  amount: number;
  amount_repaid: number;
  date: string;
  due_date: string | null;
  notes: string | null;
}

export interface Lending {
  id: string;
  person_id: string | null;
  person_name: string;
  amount: number;
  amount_received: number;
  date: string;
  expected_return_date: string | null;
  notes: string | null;
}

export interface Debt {
  id: string;
  name: string;
  provider: string | null;
  type: string;
  total_amount: number;
  paid_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_date: string | null;
  notes: string | null;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  date: string;
  notes: string | null;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  frequency: string;
  start_date: string;
  next_due_date: string;
  payment_method: string | null;
  account_id: string | null;
  active: boolean;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  notes: string | null;
}

export interface SavingsContribution {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  notes: string | null;
}

export interface Reminder {
  id: string;
  type: string;
  enabled: boolean;
}
