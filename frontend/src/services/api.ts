import axios from 'axios'

// In Docker development, use the service name 'app' to communicate between containers
// In local development, use localhost
// In production, use relative paths (proxied by nginx)
const getApiBaseUrl = () => {
  // Check if we're in Docker development environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // If running in browser and trying to reach Docker backend
  if (window.location.hostname === 'localhost' && window.location.port === '3001') {
    return 'http://localhost:3000/api'
  }
  
  // Default to relative API path (works with proxy)
  return '/api'
}

const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
}

export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  create: (data: { name: string; balance: number; currency: string }) =>
    api.post('/accounts', data),
  update: (id: number, data: Partial<{ name: string; balance: number; currency: string }>) =>
    api.put(`/accounts/${id}`, data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
  getTotalBalance: () => api.get('/accounts/total-balance'),
}

export const transactionsAPI = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  create: (data: {
    accountId: number
    amount: number
    type: 'income' | 'expense'
    description: string
    transactionDate?: string
  }) => api.post('/transactions', data),
  update: (id: number, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  bulkCreate: (transactions: any[]) => api.post('/transactions/bulk', { transactions }),
}

export const recurringAPI = {
  getAll: () => api.get('/recurring-payments'),
  create: (data: {
    accountId: number
    amount: number
    type: 'income' | 'expense'
    description: string
    frequency: 'weekly' | 'monthly' | 'yearly'
    startDate: string
    dayOfMonth?: number
    dayOfWeek?: number
  }) => api.post('/recurring-payments', data),
  update: (id: number, data: any) => api.put(`/recurring-payments/${id}`, data),
  delete: (id: number) => api.delete(`/recurring-payments/${id}`),
  getUpcoming: (days: number) => api.get(`/recurring-payments/upcoming?days=${days}`),
  executePayment: (executionId: number, data: { actualAmount: number; notes?: string }) =>
    api.post(`/recurring-payments/executions/${executionId}`, data),
}

export const goalsAPI = {
  getAll: () => api.get('/goals'),
  create: (data: {
    title: string
    targetAmount: number
    minBalance?: number
    targetDate: string
    description?: string
    parentGoalId?: number
  }) => api.post('/goals', data),
  update: (id: number, data: any) => api.put(`/goals/${id}`, data),
  delete: (id: number) => api.delete(`/goals/${id}`),
  getProgress: () => api.get('/goals/progress'),
  achieve: (id: number) => api.post(`/goals/${id}/achieve`),
}

export const dailySpendingAPI = {
  getConfigs: () => api.get('/daily-spending/configs'),
  createConfig: (data: {
    name: string
    periodType: 'toSalary' | 'customDays'
    periodValue?: number
    includeSalary: boolean
    includeRecurringIncome: boolean
    includeRecurringExpenses: boolean
    selectedGoalIds: number[]
    emergencyBuffer: number
  }) => api.post('/daily-spending/configs', data),
  activateConfig: (id: number) => api.post(`/daily-spending/configs/${id}/activate`),
  calculate: () => api.get('/daily-spending/calculate'),
}

export const analyticsAPI = {
  getIncomeExpenseTrends: (params: { period: string; months: number }) =>
    api.get('/analytics/income-expense-trends', { params }),
  getSpendingPatterns: (params: { months: number }) =>
    api.get('/analytics/spending-patterns', { params }),
  getFinancialSummary: () => api.get('/analytics/financial-summary'),
  getForecasts: (params: { monthsAhead: number }) =>
    api.get('/analytics/forecasts', { params }),
  getCashFlow: (params: { months: number }) =>
    api.get('/analytics/cash-flow', { params }),
}

export const snapshotsAPI = {
  getAll: (params?: any) => api.get('/snapshots', { params }),
  create: (data: { accountId: number; notes?: string }) =>
    api.post('/snapshots', data),
  getTrends: (params: { days: number }) =>
    api.get('/snapshots/trends', { params }),
  compare: (data: { snapshotId1: number; snapshotId2: number }) =>
    api.post('/snapshots/compare', data),
}

export const salaryAPI = {
  getAll: () => api.get('/salary'),
  create: (data: {
    accountId: number
    expectedAmount: number
    description: string
    startDay: number
    endDay: number
    frequency: 'monthly'
  }) => api.post('/salary', data),
  getUpcoming: (params: { months: number }) =>
    api.get('/salary/upcoming', { params }),
  confirmReceipt: (receiptId: number, data: { actualAmount: number; notes?: string }) =>
    api.post(`/salary/receipts/${receiptId}/confirm`, data),
}

export default api
