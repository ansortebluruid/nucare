import type { DashboardSummary, Donor, MonthlyTransaction, User } from "../types";

const API_URL = import.meta.env.VITE_NUCARE_API_URL as string;
const TOKEN_KEY = "nucare_session";

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

async function request<T>(action: string, payload: Record<string, unknown> = {}, auth = true): Promise<T> {
  if (!API_URL) throw new Error("URL API belum diatur. Isi VITE_NUCARE_API_URL pada file .env.");
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, token: auth ? token : null, ...payload })
  });
  const result = await response.json() as ApiResponse<T>;
  if (!result.ok) throw new Error(result.error || "Permintaan gagal.");
  return result.data as T;
}

export const api = {
  login: async (username: string, password: string) => {
    const result = await request<{ token: string; user: User }>("login", { username, password }, false);
    sessionStorage.setItem(TOKEN_KEY, result.token);
    return result.user;
  },
  logout: async () => {
    try { await request("logout"); } finally { sessionStorage.removeItem(TOKEN_KEY); }
  },
  me: () => request<User>("me"),
  dashboard: (year: number, month: number) => request<DashboardSummary>("dashboard", { year, month }),
  donors: () => request<Donor[]>("listDonors"),
  saveDonor: (donor: Partial<Donor>) => request<Donor>("saveDonor", { donor }),
  deleteDonor: (id: string) => request<boolean>("deleteDonor", { id }),
  transactions: (year: number) => request<MonthlyTransaction[]>("listTransactions", { year }),
  saveTransaction: (transaction: Omit<MonthlyTransaction, "id">) =>
    request<MonthlyTransaction>("saveTransaction", { transaction }),
  rtList: () => request<string[]>("listRT"),
  saveRT: (name: string) => request<string>("saveRT", { name })
};
