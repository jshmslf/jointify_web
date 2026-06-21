import api from '../api';

// ── Summary / Reports ──────────────────────────────────────────────────────
export async function getSummary(year: number, month: number) {
  const res = await api.get(`/reports/summary?year=${year}&month=${month}`);
  return res.data;
}
export async function getSpending(year: number, month?: number) {
  const q = month ? `?year=${year}&month=${month}` : `?year=${year}`;
  const res = await api.get(`/reports/spending${q}`);
  return res.data;
}
export async function getFairShare(year: number, month?: number) {
  const q = month ? `?year=${year}&month=${month}` : `?year=${year}`;
  const res = await api.get(`/reports/fair-share${q}`);
  return res.data;
}
export async function getNetWorth() {
  const res = await api.get('/reports/net-worth');
  return res.data;
}

// ── Accounts ───────────────────────────────────────────────────────────────
export async function getAccounts() {
  const res = await api.get('/accounts');
  return res.data;
}
export async function createAccount(data: { name: string; type: string; ownership: string; openingBalance: number; currency: string }) {
  const res = await api.post('/accounts', data);
  return res.data;
}
export async function updateAccount(id: string, data: Partial<{ name: string; type: string; ownership: string; currency: string }>) {
  const res = await api.patch(`/accounts/${id}`, data);
  return res.data;
}
export async function deleteAccount(id: string) {
  const res = await api.delete(`/accounts/${id}`);
  return res.data;
}

// ── Transactions ───────────────────────────────────────────────────────────
export async function getTransactions(params?: { type?: string; ownership?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  const res = await api.get(`/transactions${q ? `?${q}` : ''}`);
  return res.data;
}
export async function getTransaction(id: string) {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
}
export async function createTransaction(data: object) {
  const res = await api.post('/transactions', data);
  return res.data;
}
export async function deleteTransaction(id: string) {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
}

// ── Debts ──────────────────────────────────────────────────────────────────
export async function getDebts() {
  const res = await api.get('/debts');
  return res.data;
}
export async function createDebt(data: object) {
  const res = await api.post('/debts', data);
  return res.data;
}
export async function updateDebt(id: string, data: object) {
  const res = await api.patch(`/debts/${id}`, data);
  return res.data;
}
export async function deleteDebt(id: string) {
  const res = await api.delete(`/debts/${id}`);
  return res.data;
}

// ── Goals ──────────────────────────────────────────────────────────────────
export async function getGoals() {
  const res = await api.get('/goals');
  return res.data;
}
export async function createGoal(data: object) {
  const res = await api.post('/goals', data);
  return res.data;
}
export async function updateGoal(id: string, data: object) {
  const res = await api.patch(`/goals/${id}`, data);
  return res.data;
}
export async function deleteGoal(id: string) {
  const res = await api.delete(`/goals/${id}`);
  return res.data;
}

// ── Budgets ────────────────────────────────────────────────────────────────
export async function getBudgets(params?: { periodType?: string; periodYear?: string; periodMonth?: string }) {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  const res = await api.get(`/budgets${q ? `?${q}` : ''}`);
  return res.data;
}
export async function createBudget(data: object) {
  const res = await api.post('/budgets', data);
  return res.data;
}
export async function updateBudget(id: string, data: object) {
  const res = await api.patch(`/budgets/${id}`, data);
  return res.data;
}
export async function deleteBudget(id: string) {
  const res = await api.delete(`/budgets/${id}`);
  return res.data;
}

// ── Couple ─────────────────────────────────────────────────────────────────
export async function getCouple() {
  const res = await api.get('/couples/me');
  return res.data;
}
export async function sendInvite(identifier: string) {
  const res = await api.post('/couples/invite', { identifier });
  return res.data;
}
export async function getSentInvitation() {
  const res = await api.get('/couples/sent');
  return res.data;
}
export async function getIncomingInvitations() {
  const res = await api.get('/couples/invitations');
  return res.data;
}
export async function respondToInvitation(token: string, action: 'accept' | 'decline') {
  const res = await api.post('/couples/respond', { token, action });
  return res.data;
}
export async function cancelInvitation(token: string) {
  const res = await api.delete(`/couples/invite/${token}`);
  return res.data;
}

// ── Notifications ──────────────────────────────────────────────────────────
export async function getNotifications(status?: string) {
  const res = await api.get(`/notifications${status ? `?status=${status}` : ''}`);
  return res.data;
}
export async function markNotificationRead(id: string) {
  const res = await api.patch(`/notifications/${id}`);
  return res.data;
}
export async function markAllNotificationsRead() {
  const res = await api.post('/notifications/mark-all-read');
  return res.data;
}
