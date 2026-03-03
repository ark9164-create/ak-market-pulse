import { CircuitBreaker } from './circuit-breaker';

const API_KEY = import.meta.env.VITE_FINANCIAL_DATASETS_API_KEY ?? '';

const incomeBreaker = new CircuitBreaker<IncomeStatement[]>({ name: 'findata-income', maxFailures: 3, cooldownMs: 60_000 });
const balanceBreaker = new CircuitBreaker<BalanceSheet[]>({ name: 'findata-balance', maxFailures: 3, cooldownMs: 60_000 });
const cashFlowBreaker = new CircuitBreaker<CashFlowStatement[]>({ name: 'findata-cashflow', maxFailures: 3, cooldownMs: 60_000 });

export interface IncomeStatement {
  ticker: string;
  report_period: string;
  period: string;
  revenue: number;
  cost_of_revenue: number;
  gross_profit: number;
  operating_income: number;
  net_income: number;
  earnings_per_share: number;
  earnings_per_share_diluted: number;
  operating_expense: number;
}

export interface BalanceSheet {
  ticker: string;
  report_period: string;
  period: string;
  total_assets: number;
  total_liabilities: number;
  total_debt: number;
  shareholders_equity: number;
  cash_and_equivalents: number;
}

export interface CashFlowStatement {
  ticker: string;
  report_period: string;
  period: string;
  operating_cash_flow: number;
  capital_expenditure: number;
  free_cash_flow: number;
  dividends_paid: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  if (!API_KEY) throw new Error('VITE_FINANCIAL_DATASETS_API_KEY not set');
  const res = await fetch(`/findata-api${path}`, {
    headers: { 'X-API-KEY': API_KEY },
  });
  if (!res.ok) throw new Error(`Financial Datasets API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function fetchIncomeStatements(ticker: string, period: 'annual' | 'quarterly' = 'annual', limit = 1): Promise<IncomeStatement[]> {
  return incomeBreaker.execute(async () => {
    const data = await apiFetch<{ income_statements: IncomeStatement[] }>(
      `/financials/income-statements/?ticker=${ticker}&period=${period}&limit=${limit}`
    );
    return data.income_statements ?? [];
  });
}

export async function fetchBalanceSheets(ticker: string, period: 'annual' | 'quarterly' = 'annual', limit = 1): Promise<BalanceSheet[]> {
  return balanceBreaker.execute(async () => {
    const data = await apiFetch<{ balance_sheets: BalanceSheet[] }>(
      `/financials/balance-sheets/?ticker=${ticker}&period=${period}&limit=${limit}`
    );
    return data.balance_sheets ?? [];
  });
}

export async function fetchCashFlowStatements(ticker: string, period: 'annual' | 'quarterly' = 'annual', limit = 1): Promise<CashFlowStatement[]> {
  return cashFlowBreaker.execute(async () => {
    const data = await apiFetch<{ cash_flow_statements: CashFlowStatement[] }>(
      `/financials/cash-flow-statements/?ticker=${ticker}&period=${period}&limit=${limit}`
    );
    return data.cash_flow_statements ?? [];
  });
}
