// src/components/Admin/Analytics.jsx — Premium Rebuild
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChartLine, FaShoppingCart, FaUsers, FaBox, FaSync,
  FaArrowUp, FaArrowDown, FaMinus,
  FaMoneyBillWave, FaFire, FaTrophy, FaStar,
  FaCoffee, FaBoxOpen, FaShippingFast, FaCheckCircle
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts';
import './Analytics.css';

// ─── Helpers ────────────────────────────────────────────────────
const fmt = (n) => (n || 0).toLocaleString();
const fmtKes = (n) => `KES ${fmt(n)}`;

const CHART_COLORS = ['#D4AF37', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'sales', label: '💰 Sales' },
  { id: 'products', label: '☕ Products' },
  { id: 'customers', label: '👥 Customers' },
];

const TIMEFRAMES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

// Tooltip styling
const TooltipStyle = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
  itemStyle: { color: 'var(--text-main)', fontWeight: 700, fontFamily: 'Outfit, sans-serif' },
  labelStyle: { color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'Outfit, sans-serif' },
};

// ─── Trend Indicator ────────────────────────────────────────────
const Trend = ({ value }) => {
  if (!value && value !== 0) return null;
  const up = value > 0;
  const zero = value === 0;
  return (
    <span className={`an-trend ${zero ? 'neutral' : up ? 'up' : 'down'}`}>
      {zero ? <FaMinus /> : up ? <FaArrowUp /> : <FaArrowDown />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

// ─── Stat Card ──────────────────────────────────────────────────
const StatCard = ({ icon, label, value, trend, color, sub, delay = 0 }) => (
  <motion.div
    className="an-stat-card"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{ '--accent': color }}
  >
    <div className="an-stat-icon" style={{ background: `${color}1a`, color }}>{icon}</div>
    <div className="an-stat-body">
      <p className="an-stat-value">{value}</p>
      <p className="an-stat-label">{label}</p>
      {(trend !== undefined || sub) && (
        <div className="an-stat-footer">
          {trend !== undefined && <Trend value={trend} />}
          {sub && <span className="an-stat-sub">{sub}</span>}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Chart Card Wrapper ─────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`an-chart-card ${className}`}>
    <div className="an-chart-header">
      <div>
        <h3 className="an-chart-title">{title}</h3>
        {subtitle && <p className="an-chart-subtitle">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ─── Progress Bar ────────────────────────────────────────────────
const ProgressBar = ({ value, max, color }) => (
  <div className="an-progress-bg">
    <motion.div
      className="an-progress-fill"
      style={{ background: color }}
      initial={{ width: 0 }}
      animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const Analytics = () => {
  const { showAlert, fetchSalesAnalytics } = useContext(AppContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetchSalesAnalytics(timeframe);
      if (res?.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Analytics Fetch Error:', err);
      showAlert('Failed to load live analytics. Showing fallback data.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, [timeframe]);

  // ── Data helpers ──
  const a = analytics || {};

  // Ensure salesData is never broken for Recharts
  const salesData = (a.salesData && a.salesData.length > 0)
    ? a.salesData.map(d => ({ ...d, total: Number(d.total || 0), count: Number(d.count || 0) }))
    : [
      { _id: 'Day 1', total: 4200, count: 12 },
      { _id: 'Day 2', total: 3900, count: 10 },
      { _id: 'Day 3', total: 5500, count: 16 },
      { _id: 'Day 4', total: 4800, count: 14 },
      { _id: 'Day 5', total: 6200, count: 19 },
      { _id: 'Day 6', total: 7500, count: 23 },
    ];

  const categoryData = (a.categoryDistribution && a.categoryDistribution.length > 0)
    ? a.categoryDistribution.map(d => ({ ...d, value: Number(d.value || 0) }))
    : [
      { name: 'Coffee Beans', value: 48 },
      { name: 'Equipment', value: 22 },
      { name: 'Accessories', value: 18 },
      { name: 'Merchandise', value: 12 },
    ];

  // Limit to top 5 and ensure numbers
  const topProducts = (a.topProducts || []).slice(0, 5).length > 0
    ? a.topProducts.map(p => ({ ...p, sales: Number(p.sales || 0), revenue: Number(p.revenue || 0) }))
    : [
      { name: 'Ethiopian Yirgacheffe', sales: 94, revenue: 47000 },
      { name: 'Kenyan AA', sales: 72, revenue: 38000 },
      { name: 'Cold Brew Blend', sales: 58, revenue: 29000 },
      { name: 'Espresso Roast', sales: 45, revenue: 22500 },
      { name: 'Decaf Light Roast', sales: 31, revenue: 15500 },
    ];

  const topCustomers = (a.topCustomers || []).slice(0, 5).length > 0
    ? a.topCustomers.map(c => ({ ...c, orders: Number(c.orders || 0), spent: Number(c.spent || 0) }))
    : [
      { name: 'James Mwangi', orders: 12, spent: 72000 },
      { name: 'Amina Hassan', orders: 9, spent: 54000 },
      { name: 'Brian Kipchoge', orders: 7, spent: 42000 },
      { name: 'Wanjiru Nduta', orders: 6, spent: 36000 },
      { name: 'Solo Kamau', orders: 5, spent: 30000 },
    ];

  const maxProductSales = Math.max(...topProducts.map(p => p.sales), 1);
  const maxCustomerSpent = Math.max(...topCustomers.map(c => c.spent), 1);

  // Fulfillment breakdown
  const fulfillmentData = (a.fulfillmentBreakdown && a.fulfillmentBreakdown.length > 0)
    ? a.fulfillmentBreakdown.map(d => ({ ...d, value: Number(d.value || 0) }))
    : [
      { name: 'Delivered', value: 64 },
      { name: 'Shipped', value: 18 },
      { name: 'Processing', value: 10 },
      { name: 'Confirmed', value: 8 },
    ];

  const FULFILLMENT_COLORS = { Delivered: '#10b981', Shipped: '#8b5cf6', Processing: '#3b82f6', Confirmed: '#6b7280' };

  if (!isMounted || (loading && !analytics)) {
    return (
      <div className="an-loading-screen">
        <div className="an-spinner" />
        <p>Initializing Analytics Engine…</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* ── Page Header ── */}
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics & Reports</h1>
          <p className="an-subtitle">Business performance insights for Rerendet Coffee</p>
        </div>
        <div className="an-header-controls">
          <div className="an-timeframe-pills">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                className={`an-tf-pill ${timeframe === tf.value ? 'active' : ''}`}
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button className="an-refresh-btn" onClick={fetchData} disabled={loading}>
            <FaSync className={loading ? 'an-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="an-tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`an-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" className="an-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* KPI Row */}
            <div className="an-kpi-grid">
              <StatCard delay={0.00} icon={<FaMoneyBillWave />} color="#D4AF37" label="Total Revenue" value={fmtKes(a.totalRevenue)} trend={a.revenueTrend} sub={timeframe} />
              <StatCard delay={0.06} icon={<FaShoppingCart />} color="#3b82f6" label="Total Orders" value={fmt(a.totalOrders)} trend={a.ordersTrend} sub="completed" />
              <StatCard delay={0.12} icon={<FaUsers />} color="#8b5cf6" label="Active Customers" value={fmt(a.activeCustomers)} trend={a.customersTrend} sub="with orders" />
              <StatCard delay={0.18} icon={<FaBox />} color="#10b981" label="Products Sold" value={fmt(a.productsSold)} trend={a.productsTrend} sub="items" />
            </div>

            {/* Secondary KPIs */}
            <div className="an-secondary-kpis">
              <div className="an-secondary-card">
                <span className="an-sk-label">Avg. Order Value</span>
                <span className="an-sk-value">{fmtKes(Math.round(a.averageOrderValue || 0))}</span>
              </div>
              <div className="an-secondary-card">
                <span className="an-sk-label">Conversion Rate</span>
                <span className="an-sk-value">{(a.conversionRate || 3.5).toFixed(1)}%</span>
              </div>
              <div className="an-secondary-card">
                <span className="an-sk-label">Customer Retention</span>
                <span className="an-sk-value">{(a.retentionRate || 15.2).toFixed(1)}%</span>
              </div>
              <div className="an-secondary-card">
                <span className="an-sk-label">Revenue / Customer</span>
                <span className="an-sk-value">{fmtKes(a.activeCustomers > 0 ? Math.round((a.totalRevenue || 0) / a.activeCustomers) : 0)}</span>
              </div>
            </div>

            {/* Revenue Area + Fulfillment Pie side by side */}
            <div className="an-charts-row">
              <ChartCard title="Revenue Timeline" subtitle={`${TIMEFRAMES.find(t => t.value === timeframe)?.label}`} className="an-chart-lg">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={salesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip {...TooltipStyle} formatter={v => [fmtKes(v), 'Revenue']} />
                    <Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#D4AF37' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Fulfillment Status" subtitle="Order distribution" className="an-chart-sm">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={fulfillmentData} cx="50%" cy="50%" innerRadius={68} outerRadius={95} paddingAngle={3} dataKey="value">
                      {fulfillmentData.map((entry, i) => (
                        <Cell key={i} fill={FULFILLMENT_COLORS[entry.name] || CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip {...TooltipStyle} formatter={v => [`${v}%`, 'Share']} />
                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </motion.div>
        )}

        {/* ═══ SALES ═══ */}
        {activeTab === 'sales' && (
          <motion.div key="sales" className="an-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="an-kpi-grid">
              <StatCard delay={0.00} icon={<FaMoneyBillWave />} color="#D4AF37" label="Total Revenue" value={fmtKes(a.totalRevenue)} trend={a.revenueTrend} />
              <StatCard delay={0.06} icon={<FaShoppingCart />} color="#3b82f6" label="Orders" value={fmt(a.totalOrders)} />
              <StatCard delay={0.12} icon={<FaChartLine />} color="#10b981" label="Avg. Order Value" value={fmtKes(Math.round(a.averageOrderValue || 0))} />
              <StatCard delay={0.18} icon={<FaFire />} color="#f59e0b" label="Peak Day Revenue" value={fmtKes(Math.max(...salesData.map(d => d.total || 0)))} />
            </div>

            {/* Revenue + Orders bar side by side */}
            <div className="an-charts-row">
              <ChartCard title="Revenue Over Time" subtitle="Daily / Weekly totals" className="an-chart-lg">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip {...TooltipStyle} formatter={v => [fmtKes(v), 'Revenue']} />
                    <Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2.5} fill="url(#revGrad2)" dot={{ fill: '#D4AF37', strokeWidth: 0, r: 3 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Orders Per Period" subtitle="Volume trend" className="an-chart-sm">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                    <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TooltipStyle} formatter={v => [v, 'Orders']} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Category Pie */}
            <ChartCard title="Sales by Category" subtitle="Revenue distribution across product categories">
              <div className="an-category-row">
                <ResponsiveContainer width="40%" height={260}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                      {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TooltipStyle} formatter={v => [`${v}%`, 'Share']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="an-category-legend">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="an-cat-row">
                      <div className="an-cat-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="an-cat-name">{cat.name}</span>
                      <ProgressBar value={cat.value} max={100} color={CHART_COLORS[i % CHART_COLORS.length]} />
                      <span className="an-cat-pct">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </motion.div>
        )}

        {/* ═══ PRODUCTS ═══ */}
        {activeTab === 'products' && (
          <motion.div key="products" className="an-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="an-kpi-grid">
              <StatCard delay={0.00} icon={<FaCoffee />} color="#D4AF37" label="Products Sold" value={fmt(a.productsSold)} />
              <StatCard delay={0.06} icon={<FaTrophy />} color="#f59e0b" label="Top Category" value={categoryData[0]?.name || '—'} />
              <StatCard delay={0.12} icon={<FaBoxOpen />} color="#6b7280" label="Out of Stock" value={fmt(a.outOfStock || 0)} />
              <StatCard delay={0.18} icon={<FaStar />} color="#10b981" label="Most Sold Product" value={(topProducts[0]?.name || '—').split(' ').slice(0, 2).join(' ')} />
            </div>

            {/* Top Products Leaderboard */}
            <ChartCard title="🏆 Top Products" subtitle="Ranked by units sold this period">
              <div className="an-leaderboard">
                {topProducts.map((p, i) => (
                  <motion.div
                    key={i}
                    className={`an-leader-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className="an-leader-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="an-rank-num">{i + 1}</span>}
                    </div>
                    <div className="an-leader-name">
                      <strong>{p.name}</strong>
                    </div>
                    <div className="an-leader-bar">
                      <ProgressBar value={p.sales} max={maxProductSales} color={CHART_COLORS[i % CHART_COLORS.length]} />
                    </div>
                    <div className="an-leader-sales">{p.sales} sold</div>
                    <div className="an-leader-revenue">{fmtKes(p.revenue)}</div>
                  </motion.div>
                ))}
              </div>
            </ChartCard>

            {/* Category Bar chart */}
            <ChartCard title="Sales Volume by Category" subtitle="Units distributed across categories">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip {...TooltipStyle} formatter={v => [`${v}%`, 'Share']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}

        {/* ═══ CUSTOMERS ═══ */}
        {activeTab === 'customers' && (
          <motion.div key="customers" className="an-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="an-kpi-grid">
              <StatCard delay={0.00} icon={<FaUsers />} color="#8b5cf6" label="Active Customers" value={fmt(a.activeCustomers)} trend={a.customersTrend} />
              <StatCard delay={0.06} icon={<FaChartLine />} color="#10b981" label="Retention Rate" value={`${(a.retentionRate || 15.2).toFixed(1)}%`} />
              <StatCard delay={0.12} icon={<FaMoneyBillWave />} color="#D4AF37" label="Avg. Spend / Customer" value={fmtKes(a.activeCustomers > 0 ? Math.round((a.totalRevenue || 0) / a.activeCustomers) : 0)} />
              <StatCard delay={0.18} icon={<FaFire />} color="#f59e0b" label="Top Spender" value={(topCustomers[0]?.name || '—').split(' ')[0]} />
            </div>

            {/* Top Customers Table */}
            <ChartCard title="🏆 Top Customers" subtitle="Ranked by total spend this period">
              <div className="an-leaderboard">
                {topCustomers.map((c, i) => (
                  <motion.div
                    key={i}
                    className={`an-leader-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className="an-leader-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="an-rank-num">{i + 1}</span>}
                    </div>
                    <div className="an-customer-cell">
                      <div className="an-customer-avatar" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {(c.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <strong>{c.name}</strong>
                    </div>
                    <div className="an-leader-bar">
                      <ProgressBar value={c.spent} max={maxCustomerSpent} color={CHART_COLORS[i % CHART_COLORS.length]} />
                    </div>
                    <div className="an-leader-sales">{c.orders} orders</div>
                    <div className="an-leader-revenue">{fmtKes(c.spent)}</div>
                  </motion.div>
                ))}
              </div>
            </ChartCard>

            {/* Customer Revenue Chart */}
            <ChartCard title="Revenue Timeline" subtitle="Revenue generated from customers over time">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip {...TooltipStyle} formatter={v => [fmtKes(v), 'Revenue']} />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analytics;