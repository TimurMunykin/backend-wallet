import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'

interface RecurringPayment {
  id: number
  amount: number
  type: 'income' | 'expense'
  description: string
  frequency: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date?: string
  account_id: number
  account?: {
    id: number
    name: string
  }
}

export default function RecurringPayments() {
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    startDate: '',
    accountId: 1
  })

  useEffect(() => {
    fetchRecurringPayments()
  }, [])

  const fetchRecurringPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/recurring-payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.success ? result.data : []
        setRecurringPayments(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch recurring payments:', response.status)
        setRecurringPayments([])
      }
    } catch (error) {
      console.error('Error fetching recurring payments:', error)
      setRecurringPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/recurring-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })
      
      if (response.ok) {
        setOpen(false)
        setFormData({
          amount: '',
          type: 'expense',
          description: '',
          frequency: 'monthly',
          startDate: '',
          accountId: 1
        })
        fetchRecurringPayments()
      }
    } catch (error) {
      console.error('Error creating recurring payment:', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/recurring-payments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchRecurringPayments()
      }
    } catch (error) {
      console.error('Error deleting recurring payment:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'success' : 'error'
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Recurring Payments
        </Typography>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Recurring Payments
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Recurring Payment
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(recurringPayments) && recurringPayments.length > 0 ? (
              recurringPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.type} 
                      color={getTypeColor(payment.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{payment.frequency}</TableCell>
                  <TableCell>{new Date(payment.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(payment.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No recurring payments found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Recurring Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'income' | 'expense'})}
                >
                  <MenuItem value="expense">Expense</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frequency"
                  onChange={(e) => setFormData({...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly'})}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
