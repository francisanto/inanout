# In&out Finance Hub

Build a modern, responsive personal finance management web app called In&out.

The purpose of the app is to help a user manage their complete personal finances in one place: income, salary, expenses, budgets, borrowings, lending, credits/debts, recurring payments, savings, and financial reminders.

Use Supabase as the backend database and authentication system. Use PostgreSQL with proper relationships and Row Level Security so every user's financial data is private to that user.

1. Authentication

Create:

Sign up

Login

Logout

Forgot password

User profile

Each user's financial data must be isolated using Supabase Row Level Security.

2. Main Dashboard

Create a clean dashboard showing:

Financial overview cards

Current Balance

Total Income

Total Expenses

Money You Owe

Money Owed to You

Credit/Debt Remaining

Savings

Net Worth

Allow the user to select a date range:

Today

This Week

This Month

This Year

Custom Range

The dashboard should automatically update all calculations based on the selected period.

Quick actions

Add prominent buttons:

Add Expense

Add Income

Borrowed Money

Lent Money

Payment

Transfer

3. Expense Section

Create a dedicated Expenses page.

Users should be able to add:

Amount

Category

Date

Payment method

Account

Description

Notes

Default categories:

Food

Travel

Shopping

Bills

Entertainment

Education

Health

Subscriptions

Rent

Utilities

Other

Allow users to create custom categories.

Expense analytics

Create interactive charts.

Add filters:

Daily

Weekly

Monthly

Yearly

Custom date range

Show:

Expense trend over time

Expense by category

Top spending categories

Total spending

Average daily spending

Highest spending day

The charts must dynamically update according to the selected filter and database data.

Use line charts for spending trends and bar/pie charts for category breakdowns where appropriate.

4. Income / Salary Section

Create a dedicated Income page.

Allow users to record:

Salary

Freelance

Business income

Other income

Fields:

Amount

Source

Date

Description

Recurring or one-time

For salary, allow:

Monthly salary

Salary date

Expected salary

Actual salary received

Show:

Total income

Monthly income

Income history

Income source breakdown

Income trend chart

Add Daily / Weekly / Monthly / Yearly filters.

5. Borrowed Money Section

Create a dedicated Borrowings page.

This represents money that I borrowed from other people.

Fields:

Person name

Amount borrowed

Date borrowed

Due date

Amount repaid

Remaining amount

Notes

Status

Statuses:

Active

Partially Paid

Fully Paid

Overdue

Allow partial payments.

Example:

Rahul
Borrowed: ₹5,000
Paid: ₹2,000
Remaining: ₹3,000

Show:

Total borrowed

Total repaid

Total remaining

Upcoming due payments

Overdue payments

6. Lending Section

Create a dedicated Lending page.

This represents money that other people owe me.

Fields:

Person name

Amount lent

Date

Expected return date

Amount received

Remaining amount

Notes

Status

Allow partial repayments.

Example:

Akhil
Lent: ₹3,000
Received: ₹1,000
Remaining: ₹2,000

Show:

Total lent

Total received

Total pending

Upcoming expected payments

Overdue payments

7. People Section

Create a People page.

Each person can have multiple financial transactions.

Example:

Rahul

You owe ₹3,000

2 transactions

Next payment: Aug 15

Akhil

Owes you ₹2,000

3 transactions

Expected payment: Aug 20

Clicking a person should show their complete transaction history.

8. Credits / Debts Section

Create a dedicated Credits & Debts page.

Support:

Credit cards

Loans

EMIs

BNPL

Other debts

Fields:

Name

Provider

Total amount

Paid amount

Remaining amount

Interest rate

EMI amount

Due date

Status

Show:

Total debt

Total paid

Remaining debt

Upcoming EMI

Overdue payments

Add progress bars showing debt repayment progress.

9. Recurring Payments

Create a Recurring Payments page.

Users can create recurring expenses such as:

Rent

Netflix

Phone bill

Internet

EMI

Insurance

Subscriptions

Other bills

Fields:

Name

Amount

Category

Frequency

Start date

Next due date

Payment method

Frequency:

Daily

Weekly

Monthly

Yearly

Automatically calculate the next payment date.

10. Budget Section

Create a Budgets page.

Allow users to create monthly budgets.

Example:

Food: ₹5,000
Travel: ₹2,000
Shopping: ₹3,000
Entertainment: ₹1,500

Show:

Budget
Spent
Remaining

Example:

Food
₹5,000 budget
₹3,800 spent
₹1,200 remaining

Display progress bars.

When spending approaches the budget limit:

"⚠️ You have used 85% of your Food budget."

When the budget is exceeded:

"⚠️ Food budget exceeded by ₹500."

11. Daily Money Plan

Create a Daily Plan section.

Calculate the user's recommended daily spending amount based on:

Remaining monthly budget

Days remaining in the month

Upcoming recurring payments

Upcoming debt payments

Savings target

Example:

Monthly available money: ₹9,000
Days remaining: 20

Recommended daily spending:

₹450/day

Show:

Today

Recommended spending:
₹450

Spent today:
₹280

Remaining:
₹170

Also show upcoming obligations:

EMI ₹2,000 in 3 days

Rent ₹8,000 in 7 days

Rahul payment ₹1,000 in 10 days

The calculation should be dynamic and based on real user data.

12. Savings Goals

Create a Savings Goals page.

Allow users to create goals:

Example:

Laptop
Target: ₹80,000
Saved: ₹35,000
Remaining: ₹45,000

Vacation
Target: ₹30,000
Saved: ₹12,000

Show progress bars and percentage completed.

Allow adding money toward a goal.

13. Notifications & Reminders

Create a reminder system.

Users should receive reminders for:

Upcoming EMI

Loan payment

Borrowed money repayment

Lending collection

Recurring bills

Salary date

Budget warnings

Savings goals

Example:

"🔔 EMI payment of ₹2,000 is due tomorrow."

"🔔 Rahul's ₹1,000 repayment is due in 3 days."

"⚠️ You have only ₹500 left in your Food budget."

Allow users to enable/disable individual reminder types.

14. Transactions Page

Create a complete transaction history.

Each transaction should show:

Date

Type

Category

Description

Amount

Account

Payment method

Types:

Expense

Income

Borrowed

Lending

Repayment

Debt payment

Transfer

Add filters:

Today

Week

Month

Year

Custom range

Category

Type

Account

Add search.

Allow edit and delete.

15. Financial Analytics

Create an Analytics page.

Include:

Expense trend

Filters:

Daily

Weekly

Monthly

Yearly

Show line chart.

Category spending

Show:

Food

Travel

Shopping

Bills

Entertainment

Other

Use a pie/donut chart.

Income vs Expense

Show a comparison chart.

Monthly financial summary

Show:

Income
Expenses
Savings
Debt payments
Net cash flow

Yearly summary

Show monthly income and expenses for the selected year.

16. Accounts

Allow users to create financial accounts:

Cash

Bank account

UPI

Credit card

Wallet

Other

Each account should have:

Name

Type

Opening balance

Current balance

Transactions should be associated with accounts.

17. Database Design

Use Supabase PostgreSQL.

Create tables:

profiles
accounts
transactions
income
expenses
borrowings
lending
people
debts
debt_payments
recurring_payments
budgets
budget_categories
savings_goals
savings_contributions
reminders
categories

Every table containing user data must have:

user_id UUID referencing the authenticated user.

Enable Row Level Security on all user-specific tables.

Users must only be able to read, create, update and delete their own records.

Use proper foreign keys and indexes.

Use timestamps such as:

created_at
updated_at

where appropriate.

18. Important Financial Logic

Do not simply display hardcoded values.

All dashboard numbers must be calculated from database transactions.

Current balance should consider:

Income

Expenses
+/- Transfers

Debt payments
+/- Relevant lending/borrowing transactions

Borrowing and lending should track their own outstanding balances.

Budget calculations should use actual expenses.

Daily spending recommendations should consider remaining available money and upcoming obligations.

All calculations must update immediately after adding, editing or deleting a transaction.

19. UI / UX

Design should be modern, minimal and professional.

Use:

Responsive design

Mobile-first layout

Desktop sidebar navigation

Mobile bottom navigation

Cards

Charts

Progress bars

Clean tables

Modal forms

Toast notifications

Loading states

Empty states

Confirmation dialogs for deletion

Use a professional financial dashboard style.

Navigation:

Dashboard
Expenses
Income
Borrowings
Lending
Debts
Budgets
Recurring
Savings
Analytics
Transactions
People
Settings

Use INR ₹ as the default currency.

Allow currency to be changed later.

20. Dashboard Layout

The dashboard should be organized approximately as:

TOP:

Current Balance
Income
Expenses
Net Worth

SECOND ROW:

Money You Owe
Money Owed to You
Debt Remaining
Savings

THIRD:

Expense / Income chart

with filter:

Daily | Weekly | Monthly | Yearly | Custom

FOURTH:

Budget progress

FIFTH:

Upcoming Payments

SIXTH:

Recent Transactions

SEVENTH:

People who owe you / people you owe

21. Important Requirements

Do NOT use mock data after the database is connected.

Use real Supabase data.

Create proper loading, error and empty states.

For a new user with no transactions, show helpful empty states instead of zero-filled meaningless charts.

Make all charts responsive.

Make all filters functional.

Make all forms validate amounts and dates.

Prevent negative or invalid financial values where inappropriate.

Use optimistic UI where safe.

Keep the application architecture clean and scalable.

Build the application so additional features such as bank integration, automatic transaction imports and AI-based financial insights can be added later.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inanout.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b8944707-f0c6-415f-bae4-e81f114f24f8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
