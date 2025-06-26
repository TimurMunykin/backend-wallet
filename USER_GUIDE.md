# Personal Finance Manager - User Guide

This guide explains how to use the Personal Finance Manager API from a user's perspective with practical examples and use cases.

## Table of Contents
- [Getting Started](#getting-started)
- [Account Management](#account-management)
- [Transaction Tracking](#transaction-tracking)
- [Recurring Payments](#recurring-payments)
- [Salary Management](#salary-management)
- [Goals & Savings](#goals--savings)
- [Daily Spending Calculator](#daily-spending-calculator)
- [Financial Analytics](#financial-analytics)
- [Snapshots & History](#snapshots--history)
- [Complete User Journey Examples](#complete-user-journey-examples)

## Getting Started

### Authentication
Before using any features, you need to register and authenticate:

**Use Case**: *"I want to create an account and start managing my finances"*

```bash
# Register
POST /api/auth/register
{
  "email": "john@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

# Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

## Account Management

### Setting Up Financial Accounts

**Use Case**: *"I want to log my current money across multiple accounts (checking, savings, credit card)"*

```bash
# Add checking account
POST /api/accounts
{
  "name": "Chase Checking",
  "balance": 2500.00,
  "currency": "USD"
}

# Add savings account
POST /api/accounts
{
  "name": "High Yield Savings",
  "balance": 15000.00,
  "currency": "USD"
}

# Add credit card (negative balance)
POST /api/accounts
{
  "name": "Chase Sapphire",
  "balance": -850.00,
  "currency": "USD"
}
```

**Use Case**: *"I want to see all my accounts and total balance"*

```bash
# Get all accounts
GET /api/accounts

# Get total balance across all accounts
GET /api/accounts/total-balance
```

## Transaction Tracking

### Recording Daily Expenses and Income

**Use Case**: *"I bought groceries for $125.50 and want to record it"*

```bash
POST /api/transactions
{
  "accountId": 1,
  "amount": 125.50,
  "type": "expense",
  "description": "Groceries - Whole Foods",
  "transactionDate": "2024-01-15T18:30:00Z"
}
```

**Use Case**: *"I received my freelance payment of $2,000"*

```bash
POST /api/transactions
{
  "accountId": 1,
  "amount": 2000.00,
  "type": "income",
  "description": "Freelance Web Development",
  "transactionDate": "2024-01-15T10:00:00Z"
}
```

**Use Case**: *"I want to see my spending patterns for this month"*

```bash
# Get transactions with filters
GET /api/transactions?type=expense&startDate=2024-01-01&endDate=2024-01-31&sortBy=transaction_date&sortOrder=DESC

# Get transactions for specific account
GET /api/transactions?accountId=1&limit=50
```

**Use Case**: *"I want to import multiple transactions at once"*

```bash
POST /api/transactions/bulk
{
  "transactions": [
    {
      "accountId": 1,
      "amount": 45.20,
      "type": "expense",
      "description": "Gas Station"
    },
    {
      "accountId": 1,
      "amount": 12.50,
      "type": "expense",
      "description": "Coffee Shop"
    }
  ]
}
```

## Recurring Payments

### Setting Up Automatic Payments

**Use Case**: *"I want to track my monthly rent of $1,200 due on the 1st"*

```bash
POST /api/recurring-payments
{
  "accountId": 1,
  "amount": 1200.00,
  "type": "expense",
  "description": "Monthly Rent",
  "frequency": "monthly",
  "startDate": "2024-01-01",
  "dayOfMonth": 1
}
```

**Use Case**: *"I want to track my weekly salary deposit"*

```bash
POST /api/recurring-payments
{
  "accountId": 1,
  "amount": 1500.00,
  "type": "income",
  "description": "Weekly Salary",
  "frequency": "weekly",
  "startDate": "2024-01-05",
  "dayOfWeek": 5
}
```

**Use Case**: *"I paid my rent and want to confirm the payment"*

```bash
# Get upcoming payments
GET /api/recurring-payments/upcoming?days=7

# Execute the payment (using execution ID from above)
POST /api/recurring-payments/executions/123
{
  "actualAmount": 1200.00,
  "notes": "Paid via bank transfer"
}
```

## Salary Management

### Managing Income Expectations

**Use Case**: *"I get paid between the 10th and 15th of each month, expecting $4,500"*

```bash
POST /api/salary
{
  "accountId": 1,
  "expectedAmount": 4500.00,
  "description": "Monthly Salary - TechCorp",
  "startDay": 10,
  "endDay": 15,
  "frequency": "monthly"
}
```

**Use Case**: *"I received my salary and want to confirm it"*

```bash
# Get upcoming salary receipts
GET /api/salary/upcoming?months=2

# Confirm salary receipt (using receipt ID)
POST /api/salary/receipts/456/confirm
{
  "actualAmount": 4650.00,
  "notes": "Includes overtime bonus"
}
```

## Goals & Savings

### Setting Financial Goals

**Use Case**: *"I want to save $10,000 for a vacation by December 2024"*

```bash
POST /api/goals
{
  "title": "Europe Vacation Fund",
  "targetAmount": 10000.00,
  "minBalance": 500.00,
  "targetDate": "2024-12-01",
  "description": "2-week Europe trip with family"
}
```

**Use Case**: *"I want to break down my vacation goal into smaller goals"*

```bash
# Create sub-goals
POST /api/goals
{
  "title": "Flight Tickets",
  "targetAmount": 3000.00,
  "targetDate": "2024-10-01",
  "parentGoalId": 1
}

POST /api/goals
{
  "title": "Accommodation",
  "targetAmount": 4000.00,
  "targetDate": "2024-11-01",
  "parentGoalId": 1
}
```

**Use Case**: *"I want to see how I'm progressing toward my goals"*

```bash
# Get all goals progress
GET /api/goals/progress

# Get specific goal progress
GET /api/goals/1/progress

# Mark goal as achieved
POST /api/goals/1/achieve
```

## Daily Spending Calculator

### Managing Daily Budget

**Use Case**: *"I want to know how much I can spend daily until my next salary"*

```bash
# Create a spending configuration
POST /api/daily-spending/configs
{
  "name": "Conservative Spending",
  "periodType": "toSalary",
  "includeSalary": true,
  "includeRecurringIncome": true,
  "includeRecurringExpenses": true,
  "selectedGoalIds": [1, 2],
  "emergencyBuffer": 500.00
}

# Activate the configuration
POST /api/daily-spending/configs/1/activate

# Calculate daily spending limit
GET /api/daily-spending/calculate
```

**Use Case**: *"I want to see how much I can spend for the next 30 days"*

```bash
POST /api/daily-spending/configs
{
  "name": "30-Day Budget",
  "periodType": "customDays",
  "periodValue": 30,
  "includeSalary": false,
  "includeRecurringExpenses": true,
  "selectedGoalIds": [],
  "emergencyBuffer": 200.00
}
```

## Financial Analytics

### Understanding Spending Patterns

**Use Case**: *"I want to see my income vs expenses over the last year"*

```bash
GET /api/analytics/income-expense-trends?period=monthly&months=12
```

**Use Case**: *"I want to understand where most of my money goes"*

```bash
GET /api/analytics/spending-patterns?months=6
```

**Use Case**: *"I want to see my overall financial health"*

```bash
GET /api/analytics/financial-summary
```

**Use Case**: *"I want to forecast my financial situation for the next 6 months"*

```bash
GET /api/analytics/forecasts?monthsAhead=6
```

**Use Case**: *"I want a detailed cash flow analysis"*

```bash
GET /api/analytics/cash-flow?months=12
```

## Snapshots & History

### Tracking Financial Progress

**Use Case**: *"I want to create a snapshot of my current financial state"*

```bash
POST /api/snapshots
{
  "accountId": 1,
  "notes": "End of January financial snapshot"
}
```

**Use Case**: *"I want to see how my finances have changed over time"*

```bash
# Get snapshots for the last 3 months
GET /api/snapshots?startDate=2023-11-01&endDate=2024-01-31

# Get financial trends
GET /api/snapshots/trends?days=90
```

**Use Case**: *"I want to compare my financial state from 6 months ago to now"*

```bash
POST /api/snapshots/compare
{
  "snapshotId1": 100,
  "snapshotId2": 200
}
```

## Complete User Journey Examples

### Example 1: New User Setup

**Scenario**: *"I'm new to budgeting and want to get a complete view of my finances"*

```bash
# 1. Register and login
POST /api/auth/register { ... }
POST /api/auth/login { ... }

# 2. Set up accounts
POST /api/accounts { "name": "Checking", "balance": 3500 }
POST /api/accounts { "name": "Savings", "balance": 12000 }
POST /api/accounts { "name": "Credit Card", "balance": -1200 }

# 3. Set up recurring payments
POST /api/recurring-payments { "description": "Rent", "amount": 1800, "frequency": "monthly" }
POST /api/recurring-payments { "description": "Car Payment", "amount": 450, "frequency": "monthly" }

# 4. Set up salary
POST /api/salary { "expectedAmount": 5500, "startDay": 1, "endDay": 5, "frequency": "monthly" }

# 5. Set financial goals
POST /api/goals { "title": "Emergency Fund", "targetAmount": 15000, "targetDate": "2024-12-31" }

# 6. Configure daily spending
POST /api/daily-spending/configs { "name": "Default", "periodType": "toSalary", "includeSalary": true }

# 7. Get financial overview
GET /api/analytics/financial-summary
GET /api/daily-spending/calculate
```

### Example 2: Monthly Financial Review

**Scenario**: *"It's the end of the month and I want to review my financial progress"*

```bash
# 1. Create monthly snapshot
POST /api/snapshots { "accountId": 1, "notes": "End of month review" }

# 2. Review spending patterns
GET /api/analytics/spending-patterns?months=1

# 3. Check goal progress
GET /api/goals/progress

# 4. Review transactions
GET /api/transactions?startDate=2024-01-01&endDate=2024-01-31&type=expense

# 5. Confirm any pending salary/recurring payments
GET /api/recurring-payments/upcoming?days=7
GET /api/salary/upcoming?months=1

# 6. Plan for next month
GET /api/analytics/forecasts?monthsAhead=1
```

### Example 3: Vacation Planning

**Scenario**: *"I want to plan and save for a $5,000 vacation in 8 months"*

```bash
# 1. Create vacation goal
POST /api/goals {
  "title": "Summer Vacation",
  "targetAmount": 5000,
  "targetDate": "2024-08-01",
  "description": "Family vacation to Hawaii"
}

# 2. Break it down into sub-goals
POST /api/goals { "title": "Flights", "targetAmount": 2000, "parentGoalId": 1 }
POST /api/goals { "title": "Hotel", "targetAmount": 2500, "parentGoalId": 1 }
POST /api/goals { "title": "Activities", "targetAmount": 500, "parentGoalId": 1 }

# 3. Adjust daily spending to include vacation savings
PUT /api/daily-spending/configs/1 {
  "selectedGoalIds": [1, 2, 3, 4],
  "emergencyBuffer": 1000
}

# 4. Track progress monthly
GET /api/goals/1/progress

# 5. Monitor if you're on track
GET /api/analytics/forecasts?monthsAhead=8
```

## API Documentation

For complete API documentation with request/response schemas and authentication details, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## Tips for Success

1. **Start Simple**: Begin with basic account setup and transaction tracking
2. **Be Consistent**: Regularly log transactions for accurate insights
3. **Use Goals**: Set specific, measurable financial goals
4. **Review Regularly**: Use analytics to understand your spending patterns
5. **Leverage Automation**: Set up recurring payments for predictable expenses
6. **Monitor Progress**: Use snapshots to track your financial journey over time

## Common Workflows

### Daily Usage
1. Log new transactions as they occur
2. Check daily spending limit before major purchases
3. Review upcoming recurring payments

### Weekly Usage
1. Review transaction history
2. Execute/confirm recurring payments
3. Check goal progress

### Monthly Usage
1. Create financial snapshot
2. Review spending patterns
3. Adjust goals and budgets
4. Confirm salary receipts
5. Plan for next month using forecasts