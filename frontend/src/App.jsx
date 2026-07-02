import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { authApi, transactionApi, analyticsApi, aiApi, adminApi, budgetApi } from "./api";

const API_BASE = "http://localhost:5000/api";

const emptyTransaction = {
  type: "expense",
  amount: "",
  description: "",
  category: "",
  transaction_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const emptyBudget = {
  category: "",
  amount: "",
  month: new Date().toISOString().slice(0, 7),
};

function App() {
  const [mode, setMode] = useState("light");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(token ? "dashboard" : "login");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [filters, setFilters] = useState({ category: "", search: "", type: "", month: "" });
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [editingId, setEditingId] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [budgetForm, setBudgetForm] = useState(emptyBudget);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      setPage("dashboard");
      refreshAll();
    }
  }, [token]);

  useEffect(() => {
    if (page === "admin" && user?.role === "admin") {
      fetchAdminData();
    }
  }, [page, user]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const setError = (error) => setMessage(typeof error === "string" ? error : error?.response?.data?.error || "Something went wrong");

  const refreshAll = async () => {
    await Promise.all([fetchUser(), fetchDashboard(), fetchTransactions(), fetchCategories(), fetchAnalytics(), fetchReportSummary(), fetchBudgets()]);
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, authHeaders());
      setUser(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: form.email,
        password: form.password,
      });
      setToken(response.data.access_token);
      setUser(response.data.user);
      setMessage("");
      setPage("dashboard");
    } catch (err) {
      setError(err);
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      setMessage("Registration successful. Please login.");
      setPage("login");
    } catch (err) {
      setError(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_BASE}/analytics/dashboard`, authHeaders());
      setDashboard(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.month) params.month = filters.month;
      const response = await axios.get(`${API_BASE}/transactions`, { ...authHeaders(), params });
      setTransactions(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/transactions/categories`, authHeaders());
      setCategories(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/analytics/charts`, authHeaders());
      setStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportSummary = async () => {
    try {
      const monthly = await analyticsApi.monthlyReport();
      const yearly = await analyticsApi.yearlyReport();
      setReportSummary({ monthly: monthly.data, yearly: yearly.data });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await budgetApi.list();
      setBudgets(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createBudget = async () => {
    try {
      const payload = {
        ...budgetForm,
        amount: Number(budgetForm.amount),
      };
      const response = editingBudgetId
        ? await budgetApi.save(payload, editingBudgetId)
        : await budgetApi.save(payload);
      setMessage(editingBudgetId ? "Budget updated." : "Budget created.");
      setBudgetForm(emptyBudget);
      setEditingBudgetId(null);
      await fetchBudgets();
      return response;
    } catch (err) {
      setError(err);
    }
  };

  const editBudget = (budget) => {
    setEditingBudgetId(budget.id);
    setBudgetForm({ category: budget.category || "", amount: budget.amount, month: budget.month });
    setPage("budgets");
  };

  const deleteBudget = async (id) => {
    try {
      await budgetApi.delete(id);
      setMessage("Budget deleted.");
      await fetchBudgets();
    } catch (err) {
      setError(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [users, statsResponse] = await Promise.all([adminApi.users(), adminApi.stats()]);
      setAdminUsers(users.data);
      setAdminStats(statsResponse.data);
    } catch (err) {
      setError(err);
    }
  };

  const downloadCsvFile = async () => {
    try {
      const response = await analyticsApi.exportCsv();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err);
    }
  };

  const downloadPdfFile = async () => {
    try {
      const response = await analyticsApi.downloadPdf();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "finance_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err);
    }
  };

  const createTransaction = async () => {
    try {
      const payload = {
        ...transactionForm,
        amount: Number(transactionForm.amount),
      };
      if (editingId) {
        await axios.put(`${API_BASE}/transactions/${editingId}`, payload, authHeaders());
        setMessage("Transaction updated.");
      } else {
        await axios.post(`${API_BASE}/transactions`, payload, authHeaders());
        setMessage("Transaction added.");
      }
      setTransactionForm(emptyTransaction);
      setEditingId(null);
      await Promise.all([fetchDashboard(), fetchTransactions(), fetchCategories(), fetchAnalytics()]);
    } catch (err) {
      setError(err);
    }
  };

  const editTransaction = (tx) => {
    setEditingId(tx.id);
    setTransactionForm({
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category || "",
      transaction_date: tx.transaction_date,
      notes: tx.notes || "",
    });
    setPage("transactions");
  };

  const deleteTransaction = async (id) => {
    try {
      await axios.delete(`${API_BASE}/transactions/${id}`, authHeaders());
      setMessage("Transaction deleted.");
      await Promise.all([fetchDashboard(), fetchTransactions(), fetchAnalytics()]);
    } catch (err) {
      setError(err);
    }
  };

  const uploadCsv = async (file) => {
    if (!file) return;
    try {
      const data = new FormData();
      data.append("file", file);
      await axios.post(`${API_BASE}/transactions/upload-csv`, data, { ...authHeaders(), headers: { ...authHeaders().headers, "Content-Type": "multipart/form-data" } });
      setMessage("CSV imported successfully.");
      await Promise.all([fetchDashboard(), fetchTransactions(), fetchCategories(), fetchAnalytics()]);
    } catch (err) {
      setError(err);
    }
  };

  const fetchAIData = async () => {
    try {
      const [forecast, anomalies, recommendations] = await Promise.all([
        aiApi.forecast(),
        aiApi.anomalies(),
        aiApi.recommendations(),
      ]);
      setInsights({ forecast: forecast.data.forecast, anomalies: anomalies.data.anomalies, recommendations: recommendations.data });
    } catch (err) {
      setError(err);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    setPage("login");
  };

  const transactionTotals = useMemo(() => {
    const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expenses, savings: income - expenses };
  }, [transactions]);

  const chartRows = (items) => items.map((item, index) => {
    const height = Math.max(6, Math.min(120, item.amount / 10));
    return (
      <div key={index} className="chart-bar">
        <div className="bar" style={{ height }} title={`${item.month || item.name}: $${item.amount}`} />
        <span>{item.month || item.name}</span>
      </div>
    );
  });

  return (
    <div className={`app ${mode}`}>
      <aside className="sidebar">
        <div className="brand">Finance Flow</div>
        <div className="sidebar-group">
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Dashboard</button>
          <button className={page === "transactions" ? "active" : ""} onClick={() => setPage("transactions")}>Transactions</button>
          <button className={page === "budgets" ? "active" : ""} onClick={() => setPage("budgets")}>Budgets</button>
          <button className={page === "ai" ? "active" : ""} onClick={() => setPage("ai")}>AI Insights</button>
          <button className={page === "reports" ? "active" : ""} onClick={() => setPage("reports")}>Reports</button>
          {user?.role === "admin" && <button className={page === "admin" ? "active" : ""} onClick={() => setPage("admin")}>Admin</button>}
        </div>
        <div className="sidebar-footer">
          <button className="toggle" onClick={() => setMode(mode === "light" ? "dark" : "light")}>{mode === "light" ? "Dark" : "Light"}</button>
          {token && <button className="danger" onClick={handleLogout}>Logout</button>}
        </div>
      </aside>

      <main className="content">
        {!token && page === "login" && (
          <section className="card auth-card">
            <h1>Welcome back</h1>
            <p>Login to manage your budget, transactions, and AI insights.</p>
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button onClick={handleLogin}>Login</button>
            <p className="small-text">
              New here? <button className="link-button" onClick={() => { setPage("register"); setMessage(""); }}>Create account</button>
            </p>
            {message && <div className="notice error">{message}</div>}
          </section>
        )}

        {!token && page === "register" && (
          <section className="card auth-card">
            <h1>Create account</h1>
            <p>Sign up for secure expense tracking and forecasting.</p>
            <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button onClick={handleRegister}>Register</button>
            <p className="small-text">
              Already registered? <button className="link-button" onClick={() => { setPage("login"); setMessage(""); }}>Login</button>
            </p>
            {message && <div className="notice error">{message}</div>}
          </section>
        )}

        {token && page === "dashboard" && (
          <section>
            <div className="page-header">
              <div>
                <h1>Dashboard</h1>
                <p className="subtitle">Healthy spending starts with visibility.</p>
              </div>
              <div className="small-card">Hello, {user?.username || "User"}</div>
            </div>

            <div className="grid grid-4">
              <div className="card stat-card">
                <span>Total Income</span>
                <h2>${dashboard?.income?.toFixed(2) ?? "0.00"}</h2>
              </div>
              <div className="card stat-card">
                <span>Total Expenses</span>
                <h2>${dashboard?.expenses?.toFixed(2) ?? "0.00"}</h2>
              </div>
              <div className="card stat-card">
                <span>Savings</span>
                <h2>${dashboard?.savings?.toFixed(2) ?? "0.00"}</h2>
              </div>
              <div className="card stat-card">
                <span>Health Score</span>
                <h2>{dashboard?.health_score ?? 0}%</h2>
              </div>
            </div>

            <div className="grid grid-3">
              <div className="card">
                <h3>Recent Transactions</h3>
                <ul className="list-compact">
                  {dashboard?.recent_transactions?.map((tx) => (
                    <li key={tx.id}>{tx.transaction_date} • {tx.description} • ${tx.amount.toFixed(2)}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3>Budget Progress</h3>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${dashboard?.budget_progress ?? 0}%` }} />
                </div>
                <p>{dashboard?.budget_progress?.toFixed(1) ?? 0}% of budget used</p>
              </div>
              <div className="card">
                <h3>Quick Actions</h3>
                <button onClick={() => setPage("transactions")}>Add transaction</button>
                <button onClick={fetchAIData}>Refresh AI insights</button>
              </div>
            </div>

            <div className="grid grid-3">
              <div className="card chart-card">
                <h3>Monthly Expense Trend</h3>
                {stats?.monthly_expenses?.length ? (
                  <div className="chart-grid">
                    {stats.monthly_expenses.map((item, index) => (
                      <div key={index} className="chart-bar">
                        <div className="bar" style={{ height: `${Math.max(12, Math.min(140, item.amount / 3))}px` }} title={`${item.month}: $${item.amount}`} />
                        <span>{item.month.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No expense history yet.</p>
                )}
              </div>
              <div className="card chart-card">
                <h3>Income vs Expense</h3>
                {stats?.income_vs_expense?.length ? (
                  <div className="chart-grid legend-grid">
                    {stats.income_vs_expense.map((item, index) => (
                      <div key={index} className="chart-row">
                        <span>{item.month.slice(5)}</span>
                        <div className="bar income" style={{ width: `${Math.max(20, Math.min(180, item.income / 5))}px` }} title={`Income $${item.income}`} />
                        <div className="bar expense" style={{ width: `${Math.max(20, Math.min(180, item.expense / 5))}px` }} title={`Expense $${item.expense}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No income/expense history yet.</p>
                )}
              </div>
              <div className="card chart-card">
                <h3>Budget vs Actual</h3>
                {stats?.budget_vs_actual?.length ? (
                  <div className="budget-list">
                    {stats.budget_vs_actual.map((row, index) => (
                      <div key={index} className="budget-row">
                        <span>{row.name}</span>
                        <span>${row.actual.toFixed(2)}</span>
                        <span className="muted">budget ${row.budget.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No budget data yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {token && page === "transactions" && (
          <section>
            <div className="page-header">
              <div>
                <h1>Transactions</h1>
                <p className="subtitle">Manage income, expenses, uploads, and categories.</p>
              </div>
              <button className="primary" onClick={createTransaction}>{editingId ? "Update" : "Add"} transaction</button>
            </div>

            <div className="card form-grid">
              <div>
                <label>Type</label>
                <select value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label>Amount</label>
                <input type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} />
              </div>
              <div>
                <label>Description</label>
                <input value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} />
              </div>
              <div>
                <label>Category</label>
                <input value={transactionForm.category} onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })} list="category-list" />
                <datalist id="category-list">
                  {categories.map((category) => <option key={category.id} value={category.name} />)}
                </datalist>
              </div>
              <div>
                <label>Date</label>
                <input type="date" value={transactionForm.transaction_date} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })} />
              </div>
              <div className="full-width">
                <label>Notes</label>
                <textarea value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="card filter-row">
              <div>
                <label>Search</label>
                <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search description" />
              </div>
              <div>
                <label>Category</label>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                  <option value="">All</option>
                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                </select>
              </div>
              <div>
                <label>Type</label>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label>Month</label>
                <input type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
              </div>
              <button className="secondary" onClick={fetchTransactions}>Apply</button>
            </div>

            <div className="card csv-upload">
              <label>Upload CSV transactions</label>
              <input type="file" accept=".csv" onChange={(e) => uploadCsv(e.target.files?.[0])} />
            </div>

            <div className="card table-card">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.transaction_date}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category || "Uncategorized"}</td>
                      <td>{tx.type}</td>
                      <td>${tx.amount.toFixed(2)}</td>
                      <td>
                        <button className="small" onClick={() => editTransaction(tx)}>Edit</button>
                        <button className="small danger" onClick={() => deleteTransaction(tx.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {token && page === "ai" && (
          <section>
            <div className="page-header">
              <div>
                <h1>AI Insights</h1>
                <p className="subtitle">Expense classification, forecasts, anomaly detection, and budget recommendations.</p>
              </div>
              <button className="primary" onClick={fetchAIData}>Refresh insights</button>
            </div>

            <div className="grid grid-3">
              <div className="card">
                <h3>Forecast</h3>
                <p>Next month predicted expenses</p>
                <h2>${insights?.forecast ?? "0.00"}</h2>
              </div>
              <div className="card">
                <h3>Unusual Spending</h3>
                <ul className="list-compact">
                  {insights?.anomalies?.length ? insights.anomalies.map((item, idx) => <li key={idx}>{item.description}: ${item.amount}</li>) : <li>No anomalies detected</li>}
                </ul>
              </div>
              <div className="card">
                <h3>Recommendations</h3>
                <ul className="list-compact">
                  {insights?.recommendations?.saving_tips?.map((tip, idx) => <li key={idx}>{tip}</li>) || <li>Run AI insights to generate tips.</li>}
                </ul>
              </div>
            </div>

            <div className="card">
              <h3>Budget suggestions</h3>
              <div className="budget-list">
                {insights?.recommendations?.budgets?.length ? insights.recommendations.budgets.map((item, index) => (
                  <div key={index} className="budget-row">
                    <span>{item.category}</span>
                    <span>${item.recommended.toFixed(2)}</span>
                    <span className="muted">actual ${item.actual.toFixed(2)}</span>
                  </div>
                )) : <p>No budget recommendations available yet.</p>}
              </div>
            </div>
          </section>
        )}

        {token && page === "reports" && (
          <section>
            <div className="page-header">
              <div>
                <h1>Reports</h1>
                <p className="subtitle">Download detailed exports and review monthly and yearly summaries.</p>
              </div>
            </div>

            <div className="grid grid-3">
              <div className="card">
                <h3>Monthly Summary</h3>
                <p>Income: ${reportSummary?.monthly?.income?.toFixed(2) ?? "0.00"}</p>
                <p>Expenses: ${reportSummary?.monthly?.expenses?.toFixed(2) ?? "0.00"}</p>
                <p>Savings: ${reportSummary?.monthly?.savings?.toFixed(2) ?? "0.00"}</p>
              </div>
              <div className="card">
                <h3>Yearly Summary</h3>
                <ul className="list-compact">
                  {reportSummary?.yearly?.length ? reportSummary.yearly.map((year) => (
                    <li key={year.year}>{year.year}: income ${year.income.toFixed(2)}, expense ${year.expense.toFixed(2)}</li>
                  )) : <li>No yearly data yet.</li>}
                </ul>
              </div>
              <div className="card actions-card">
                <button onClick={downloadCsvFile}>Export CSV</button>
                <button onClick={downloadPdfFile}>Download PDF</button>
              </div>
            </div>
          </section>
        )}

        {token && page === "budgets" && (
          <section>
            <div className="page-header">
              <div>
                <h1>Budgets</h1>
                <p className="subtitle">Set monthly budgets and compare them to actual spending.</p>
              </div>
              <button className="primary" onClick={createBudget}>{editingBudgetId ? "Update" : "Create"} budget</button>
            </div>

            <div className="card form-grid">
              <div>
                <label>Category</label>
                <input value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} />
              </div>
              <div>
                <label>Amount</label>
                <input type="number" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} />
              </div>
              <div>
                <label>Month</label>
                <input type="month" value={budgetForm.month} onChange={(e) => setBudgetForm({ ...budgetForm, month: e.target.value })} />
              </div>
            </div>

            <div className="card table-card">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>{budget.category}</td>
                      <td>{budget.month}</td>
                      <td>${budget.amount.toFixed(2)}</td>
                      <td>
                        <button className="small" onClick={() => editBudget(budget)}>Edit</button>
                        <button className="small danger" onClick={() => deleteBudget(budget.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {token && user?.role === "admin" && page === "admin" && (
          <section>
            <div className="page-header">
              <div>
                <h1>Admin Panel</h1>
                <p className="subtitle">Manage users, view system stats, and monitor platform health.</p>
              </div>
            </div>
            <div className="grid grid-3">
              <div className="card">
                <h3>Usage Stats</h3>
                <p>Users: {adminStats?.users ?? "0"}</p>
                <p>Transactions: {adminStats?.transactions ?? "0"}</p>
                <p>Income: ${adminStats?.income?.toFixed(2) ?? "0.00"}</p>
                <p>Expenses: ${adminStats?.expenses?.toFixed(2) ?? "0.00"}</p>
              </div>
              <div className="card">
                <h3>Recent users</h3>
                <ul className="list-compact">
                  {adminUsers.slice(0, 6).map((adminUser) => (
                    <li key={adminUser.id}>{adminUser.username} • {adminUser.email}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3>Admin actions</h3>
                <p>Use backend admin endpoints to manage users and analytics from this dashboard.</p>
              </div>
            </div>
          </section>
        )}

        {message && <div className="notice">{message}</div>}
      </main>
    </div>
  );
}

export default App;
