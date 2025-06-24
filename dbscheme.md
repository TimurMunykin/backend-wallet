# Database Schema for Personal Finance Manager

## Tables Description

### USERS
- `id` (int, PK) - Primary key
- `email` (string, UK) - Unique email
- `password_hash` (string) - Hashed password
- `name` (string) - User display name
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### ACCOUNTS
- `id` (int, PK) - Primary key
- `user_id` (int, FK) - Reference to USERS.id
- `name` (string) - Account name (e.g., "Main Card", "Cash")
- `balance` (decimal) - Current balance
- `currency` (string) - Currency code
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### TRANSACTIONS
- `id` (int, PK) - Primary key
- `account_id` (int, FK) - Reference to ACCOUNTS.id
- `amount` (decimal) - Transaction amount
- `type` (string) - "income" or "expense"
- `description` (string) - Transaction description
- `transaction_date` (datetime) - When transaction occurred
- `recurring_payment_id` (int, FK, nullable) - Reference to RECURRING_PAYMENTS.id if auto-generated
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### RECURRING_PAYMENTS
- `id` (int, PK) - Primary key
- `account_id` (int, FK) - Reference to ACCOUNTS.id
- `amount` (decimal) - Payment amount
- `type` (string) - "income" or "expense"
- `description` (string) - Payment description
- `frequency` (string) - "monthly", "weekly", "daily"
- `start_date` (date) - When payments start
- `end_date` (date, nullable) - When payments end (null = infinite)
- `day_of_month` (int, nullable) - For monthly payments (1-31)
- `day_of_week` (int, nullable) - For weekly payments (0-6)
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### RECURRING_EXECUTIONS
- `id` (int, PK) - Primary key
- `recurring_payment_id` (int, FK) - Reference to RECURRING_PAYMENTS.id
- `transaction_id` (int, FK, nullable) - Reference to TRANSACTIONS.id if executed
- `expected_date` (date) - When payment was expected
- `expected_amount` (decimal) - Expected amount
- `actual_amount` (decimal, nullable) - Actual amount paid
- `executed` (boolean) - Whether payment was executed
- `executed_at` (datetime, nullable) - When payment was executed
- `notes` (string, nullable) - Comments about deviations
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### SALARY_PAYMENTS
- `id` (int, PK) - Primary key
- `account_id` (int, FK) - Reference to ACCOUNTS.id
- `expected_amount` (decimal) - Expected salary amount
- `description` (string) - Salary description
- `start_day` (int) - Start of payment window (1-31)
- `end_day` (int) - End of payment window (1-31)
- `frequency` (string) - "monthly", "quarterly"
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### SALARY_RECEIPTS
- `id` (int, PK) - Primary key
- `salary_payment_id` (int, FK) - Reference to SALARY_PAYMENTS.id
- `transaction_id` (int, FK, nullable) - Reference to TRANSACTIONS.id if received
- `period_year_month` (date) - Period in YYYY-MM format
- `expected_amount` (decimal) - Expected amount (copied for history)
- `actual_amount` (decimal, nullable) - Actual amount received
- `received` (boolean) - Whether salary was received
- `received_at` (datetime, nullable) - When salary was received
- `notes` (string, nullable) - Comments about deviations
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### GOALS
- `id` (int, PK) - Primary key
- `user_id` (int, FK) - Reference to USERS.id
- `parent_goal_id` (int, FK, nullable) - Reference to GOALS.id for sub-goals
- `title` (string) - Goal title
- `target_amount` (decimal) - Amount to save for this goal
- `min_balance` (decimal) - Minimum balance to keep on top of goal
- `target_date` (date) - Target completion date
- `description` (string, nullable) - Goal description
- `achieved` (boolean) - Whether goal is achieved
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### SNAPSHOTS
- `id` (int, PK) - Primary key
- `account_id` (int, FK) - Reference to ACCOUNTS.id
- `balance` (decimal) - Balance at snapshot time
- `total_income` (decimal) - Income since last snapshot
- `total_expense` (decimal) - Expenses since last snapshot
- `transactions_count` (int) - Number of transactions since last snapshot
- `recent_transactions` (json) - Last N transactions for quick access
- `goals_progress` (json) - Progress on goals at snapshot time
- `snapshot_date` (datetime) - When snapshot was taken
- `notes` (string, nullable) - Optional notes
- `created_at` (datetime) - Creation timestamp

### DAILY_SPENDING_CONFIGS
- `id` (int, PK) - Primary key
- `user_id` (int, FK) - Reference to USERS.id
- `name` (string) - Configuration name
- `is_active` (boolean) - Whether this is the active configuration
- `period_type` (string) - "to_salary", "to_month_end", "custom_days", "to_date"
- `custom_days` (int, nullable) - Number of days if period_type = "custom_days"
- `custom_end_date` (date, nullable) - End date if period_type = "to_date"
- `include_pending_salary` (boolean) - Include expected salary in calculations
- `include_recurring_income` (boolean) - Include recurring income
- `include_recurring_expenses` (boolean) - Include recurring expenses
- `active_goals` (json) - Array of goal IDs to include in calculations
- `goal_priorities` (json) - Goal priorities for allocation
- `emergency_buffer` (decimal) - Emergency buffer amount
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp

### DAILY_SPENDING_CACHE
- `id` (int, PK) - Primary key
- `user_id` (int, FK) - Reference to USERS.id
- `config_id` (int, FK) - Reference to DAILY_SPENDING_CONFIGS.id
- `daily_limit` (decimal) - Calculated daily spending limit (can be negative)
- `current_balance` (decimal) - Current balance used in calculation
- `available_for_goals` (decimal) - Amount available for goals
- `days_remaining` (decimal) - Days remaining in period
- `calculation_breakdown` (json) - Detailed calculation breakdown
- `calculated_at` (datetime) - When calculation was performed
- `expires_at` (datetime) - When cache expires
- `created_at` (datetime) - Creation timestamp

## Relationships

- USERS → ACCOUNTS (one-to-many)
- USERS → GOALS (one-to-many)
- USERS → DAILY_SPENDING_CONFIGS (one-to-many)
- USERS → DAILY_SPENDING_CACHE (one-to-many)
- ACCOUNTS → TRANSACTIONS (one-to-many)
- ACCOUNTS → RECURRING_PAYMENTS (one-to-many)
- ACCOUNTS → SALARY_PAYMENTS (one-to-many)
- ACCOUNTS → SNAPSHOTS (one-to-many)
- DAILY_SPENDING_CONFIGS → DAILY_SPENDING_CACHE (one-to-many)
- RECURRING_PAYMENTS → TRANSACTIONS (one-to-many)
- RECURRING_PAYMENTS → RECURRING_EXECUTIONS (one-to-many)
- SALARY_PAYMENTS → SALARY_RECEIPTS (one-to-many)
- SALARY_RECEIPTS → TRANSACTIONS (one-to-one, nullable)
- RECURRING_EXECUTIONS → TRANSACTIONS (one-to-one, nullable)
- GOALS → GOALS (self-referencing for parent-child relationship)

## Key Features

1. **Multi-user support** - Each user has isolated data
2. **Multiple accounts** - Users can have multiple accounts (cards, cash, etc.)
3. **Transaction tracking** - All income/expense transactions
4. **Recurring payments** - Automatic payments with actual vs expected tracking
5. **Salary tracking** - Salary with flexible date ranges and actual vs expected amounts
6. **Goals system** - Hierarchical goals with target amounts and minimum balance requirements
7. **Daily spending calculation** - Highly configurable daily spending limits
8. **Snapshots** - Point-in-time balance and transaction summaries
9. **Caching** - Performance optimization for complex calculations