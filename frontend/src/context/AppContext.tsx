import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiAnalytics, ApiReceipt, ApiUser } from '../services/api';

export interface Transaction {
  id: string;
  merchant: string;
  date: string;
  category: string;
  subcategory?: string;
  amount: number;
  items?: { name: string; price: number; category: string }[];
  receiptUri?: string;
}

export interface Budget { category: string; limit: number; spent: number; icon: string; color: string }
export type NotificationType = 'budget_warning' | 'budget_exceeded' | 'spending_alert' | 'receipt_saved' | 'recommendation' | 'weekly_insight' | 'monthly_report';
export interface AppNotification { id: string; type: NotificationType; title: string; message: string; timestamp: string; isRead: boolean; route?: string }

interface AppContextType {
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  transactions: Transaction[];
  budgets: Budget[];
  analytics: ApiAnalytics | null;
  monthlyBudgetLimit: number;
  notifications: AppNotification[];
  unreadCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Budget) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const colors = ['#5E548E', '#9F86C0', '#BE95C4', '#E0B1CB', '#231942'];

function toTransaction(receipt: ApiReceipt): Transaction {
  return {
    id: receipt._id,
    merchant: receipt.storeName || 'Unknown store',
    date: new Date(receipt.receiptDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    category: receipt.items?.[0]?.category || 'OTHER',
    subcategory: receipt.items?.[0]?.subcategory,
    amount: receipt.total / 100,
    items: (receipt.items || []).map((item) => ({ name: item.name, price: item.price / 100, category: item.category })),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const loadData = async (authToken: string) => {
    const [me, receiptData, analyticsData] = await Promise.all([
      api.me(authToken), api.receipts(authToken), api.analytics(authToken),
    ]);
    setUser(me.user);
    setTransactions(receiptData.receipts.map(toTransaction));
    setAnalytics(analyticsData);
  };

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await api.getToken();
        if (storedToken) {
          await loadData(storedToken);
          setToken(storedToken);
        }
      } catch {
        await api.clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const authenticate = async (result: { user: ApiUser; token: string }) => {
    await api.saveToken(result.token);
    setToken(result.token);
    setUser(result.user);
    await loadData(result.token);
  };

  const login = async (email: string, password: string) => authenticate(await api.login(email, password));
  const register = async (name: string, email: string, password: string) => authenticate(await api.register(name, email, password));

  const logout = async () => {
    if (token) await api.logout(token).catch(() => undefined);
    await api.clearToken();
    setToken(null); setUser(null); setTransactions([]); setAnalytics(null);
  };

  const refreshData = async () => {
    if (!token) return;
    try { await loadData(token); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load data'); }
  };

  const budgets = useMemo<Budget[]>(() => (user?.budgets || []).map((budget, index) => ({
    category: budget.category,
    limit: budget.monthlyLimit / 100,
    spent: (analytics?.categoryBreakdown.find((item) => item.category === budget.category)?.amount || 0) / 100,
    icon: 'wallet-outline',
    color: colors[index % colors.length],
  })), [user, analytics]);

  const monthlyBudgetLimit = useMemo(() => budgets.reduce((sum, budget) => sum + budget.limit, 0), [budgets]);
  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    budgets.forEach((budget) => {
      const percentage = budget.limit ? (budget.spent / budget.limit) * 100 : 0;
      if (percentage >= 100) list.push({ id: `budget-exceeded-${budget.category}`, type: 'budget_exceeded', title: `${budget.category} budget exceeded`, message: `${budget.category} spending has exceeded its configured limit.`, timestamp: 'Now', isRead: readNotificationIds.includes(`budget-exceeded-${budget.category}`), route: '/(tabs)/budgets' });
      else if (percentage >= 80) list.push({ id: `budget-warning-${budget.category}`, type: 'budget_warning', title: `${budget.category} budget almost reached`, message: `${budget.category} has used ${Math.round(percentage)}% of its configured limit.`, timestamp: 'Now', isRead: readNotificationIds.includes(`budget-warning-${budget.category}`), route: '/(tabs)/budgets' });
    });
    return list;
  }, [budgets, readNotificationIds]);

  const addTransaction = (_tx: Transaction) => { void refreshData(); };
  const deleteTransaction = async (id: string) => { if (token) await api.deleteReceipt(token, id); await refreshData(); };
  const addBudget = async (budget: Budget) => {
    if (!token) return;
    const next = [...(user?.budgets || []).filter((item) => item.category !== budget.category), { category: budget.category.toUpperCase(), monthlyLimit: Math.round(budget.limit * 100) }];
    const result = await api.updateBudgets(token, next);
    setUser((previous) => previous ? { ...previous, budgets: result.budgets } : previous);
  };

  const value = {
    user, token, isLoading, error, transactions, budgets, analytics, monthlyBudgetLimit, notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead).length,
    login, register, logout, refreshData, addTransaction, deleteTransaction, addBudget,
    markAsRead: (id: string) => setReadNotificationIds((current) => current.includes(id) ? current : [...current, id]),
    markAllAsRead: () => setReadNotificationIds(notifications.map((notification) => notification.id)),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
