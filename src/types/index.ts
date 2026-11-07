export type User = { username: string; name: string; role: "ADMIN" | "OPERATOR" };
export type Donor = {
  id: string; name: string; rt: string; address: string; phone: string;
  status: "AKTIF" | "NONAKTIF"; createdAt?: string; updatedAt?: string;
};
export type MonthlyTransaction = {
  id: string; donorId: string; year: number; month: number; amount: number;
  note: string; updatedAt?: string;
};
export type DashboardSummary = {
  donorCount: number; activeDonorCount: number; monthlyTotal: number;
  annualTotal: number; distributionTotal: number;
};
