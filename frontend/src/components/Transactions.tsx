import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
  TableSortLabel,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  FilterList,
  ExpandMore,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material'
import { transactionsAPI, accountsAPI } from '../services/api'

interface Account {
  id: number
  name: string
  balance: number
  currency: string
}

interface Transaction {
  id: number
  account_id: number
  account: Account
  amount: number
  type: 'income' | 'expense'
  description: string
  transaction_date: string
  created_at: string
  updated_at: string
}

interface TransactionFilters {
  accountId?: number
  type?: 'income' | 'expense' | ''
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  description?: string
}

interface PaginatedResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [pageSize] = useState(20)

  // Sorting
  const [sortBy, setSortBy] = useState('transaction_date')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

  // Form data
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
  })

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    accountId: undefined,
    type: '',
    startDate: '',
    endDate: '',
    minAmount: undefined,
    maxAmount: undefined,
    description: '',
  })

  useEffect(() => {
    loadAccounts()
    loadTransactions()
  }, [currentPage, sortBy, sortOrder])

  useEffect(() => {
    // Reset to first page when filters change
    if (currentPage !== 1) {
      setCurrentPage(1)
    } else {
      loadTransactions()
    }
  }, [filters])

  const loadAccounts = async () => {
    try {
      const response = await accountsAPI.getAll()
      setAccounts(response.data.data || response.data || [])
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== undefined)
        ),
      }

      const response = await transactionsAPI.getAll(params)
      const data: PaginatedResponse = response.data.data || response.data

      setTransactions(data.transactions || [])
      setTotalPages(data.totalPages || 1)
      setTotalTransactions(data.total || 0)
    } catch (error) {
      console.error('Failed to load transactions:', error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const transactionData = {
        accountId: parseInt(formData.accountId),
        amount: parseFloat(formData.amount),
        type: formData.type,
        description: formData.description,
        transactionDate: formData.transactionDate,
      }

      if (editingTransaction) {
        await transactionsAPI.update(editingTransaction.id, transactionData)
      } else {
        await transactionsAPI.create(transactionData)
      }

      setOpen(false)
      setEditingTransaction(null)
      resetForm()
      loadTransactions()
    } catch (error) {
      console.error('Failed to save transaction:', error)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      accountId: transaction.account_id.toString(),
      amount: transaction.amount.toString(),
      type: transaction.type,
      description: transaction.description,
      transactionDate: transaction.transaction_date.split('T')[0],
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsAPI.delete(id)
        loadTransactions()
      } catch (error) {
        console.error('Failed to delete transaction:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      accountId: '',
      amount: '',
      type: 'expense',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0],
    })
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortOrder('DESC')
    }
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const clearFilters = () => {
    setFilters({
      accountId: undefined,
      type: '',
      startDate: '',
      endDate: '',
      minAmount: undefined,
      maxAmount: undefined,
      description: '',
    })
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== undefined).length
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Transactions</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{ mr: 2 }}
          >
            Filters
            {getActiveFiltersCount() > 0 && (
              <Chip
                label={getActiveFiltersCount()}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm()
              setOpen(true)
            }}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {/* Filters Accordion */}
      <Accordion expanded={filtersOpen} onChange={() => setFiltersOpen(!filtersOpen)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Filter Transactions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Account</InputLabel>
                <Select
                  value={filters.accountId || ''}
                  label="Account"
                  onChange={(e) =>
                    setFilters({ ...filters, accountId: e.target.value ? Number(e.target.value) : undefined })
                  }
                >
                  <MenuItem value="">All Accounts</MenuItem>
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type || ''}
                  label="Type"
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Amount"
                value={filters.minAmount || ''}
                onChange={(e) =>
                  setFilters({ ...filters, minAmount: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max Amount"
                value={filters.maxAmount || ''}
                onChange={(e) =>
                  setFilters({ ...filters, maxAmount: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Description"
                value={filters.description || ''}
                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button variant="outlined" onClick={clearFilters} fullWidth>
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Transactions Table */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''}
            </Typography>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'transaction_date'}
                      direction={sortBy === 'transaction_date' ? sortOrder.toLowerCase() as 'asc' | 'desc' : 'desc'}
                      onClick={() => handleSort('transaction_date')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'description'}
                      direction={sortBy === 'description' ? sortOrder.toLowerCase() as 'asc' | 'desc' : 'desc'}
                      onClick={() => handleSort('description')}
                    >
                      Description
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === 'amount'}
                      direction={sortBy === 'amount' ? sortOrder.toLowerCase() as 'asc' | 'desc' : 'desc'}
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No transactions found. Create your first transaction!
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.account?.name || 'Unknown Account'}</TableCell>
                      <TableCell>
                        <Chip
                          icon={transaction.type === 'income' ? <TrendingUp /> : <TrendingDown />}
                          label={transaction.type}
                          color={transaction.type === 'income' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount), transaction.account?.currency || 'USD')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(transaction)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(transaction.id)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Account *</InputLabel>
              <Select
                value={formData.accountId}
                label="Account *"
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id.toString()}>
                    {account.name} ({formatCurrency(account.balance, account.currency)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              required
              fullWidth
              type="number"
              label="Amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              inputProps={{ step: '0.01', min: '0.01' }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Type *</InputLabel>
              <Select
                value={formData.type}
                label="Type *"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              >
                <MenuItem value="income">
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ mr: 1 }} />
                    Income
                  </Box>
                </MenuItem>
                <MenuItem value="expense">
                  <Box display="flex" alignItems="center">
                    <TrendingDown sx={{ mr: 1 }} />
                    Expense
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              margin="normal"
              required
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              type="date"
              label="Transaction Date"
              value={formData.transactionDate}
              onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.accountId || !formData.amount || !formData.description}
          >
            {editingTransaction ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
