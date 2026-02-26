import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityLogs from './ActivityLogs';
import { AppContext } from '../../context/AppContext';
import {
  FaShoppingBag, FaDollarSign, FaUsers, FaBox,
  FaArrowUp, FaArrowDown, FaEye, FaChartLine,
  FaFilePdf, FaFileCsv, FaDownload, FaCoffee,
  FaPlus, FaCheckCircle
} from 'react-icons/fa';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

const Dashboard = () => {
  const { showAlert, fetchDashboardStats, fetchSalesAnalytics, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Theme Detection for Recharts
  const [themeColors, setThemeColors] = useState({
    primary: '#D4AF37',
    text: '#94a3b8',
    grid: '#e2e8f0',
    background: '#ffffff'
  });

  useEffect(() => {
    const updateThemeColors = () => {
      const style = getComputedStyle(document.documentElement);
      setThemeColors({
        primary: style.getPropertyValue('--color-primary').trim() || '#D4AF37',
        text: style.getPropertyValue('--text-muted').trim() || '#94a3b8',
        grid: style.getPropertyValue('--border-main').trim() || '#e2e8f0',
        background: style.getPropertyValue('--bg-card').trim() || '#ffffff'
      });
    };

    updateThemeColors();
    const observer = new MutationObserver(updateThemeColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const ReportsView = ({ data, colors }) => {
    if (!data) return null;

    const kpis = [
      { label: 'Avg. Order Value', value: `KES ${Math.round(data.averageOrderValue || 0).toLocaleString()}`, icon: <FaDollarSign />, trend: '+5.2%' },
      { label: 'Conversion Rate', value: `${data.conversionRate || 3.5}%`, icon: <FaChartLine />, trend: '+0.8%' },
      { label: 'Customer Retention', value: `${data.retentionRate || 15.2}%`, icon: <FaUsers />, trend: '+2.1%' },
      { label: 'Products Sold', value: (data.productsSold || 0).toLocaleString(), icon: <FaBox />, trend: '+12%' },
    ];

    return (
      <div className="reports-view fade-in">
        <div className="reports-grid">
          {kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="report-kpi-card glass-card"
            >
              <div className="kpi-header">
                <div className="kpi-icon">{kpi.icon}</div>
                <span className="kpi-trend">{kpi.trend}</span>
              </div>
              <div className="kpi-body">
                <h4 className="kpi-value">{kpi.value}</h4>
                <p className="kpi-label">{kpi.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="reports-charts">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="chart-main glass-panel"
          >
            <div className="section-header">
              <h3>Detailed Revenue Performance</h3>
              <div className="chart-actions">
                <button className="btn-icon-mini"><FaFilePdf /></button>
                <button className="btn-icon-mini"><FaFileCsv /></button>
              </div>
            </div>
            <div className="chart-container-large">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="name" stroke={colors.text} fontSize={12} />
                  <YAxis stroke={colors.text} fontSize={12} tickFormatter={(v) => `K${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-glass)',
                      boxShadow: 'var(--shadow-premium)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={colors.primary}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorReport)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="chart-side glass-panel"
          >
            <h3>Sales by Category</h3>
            <div className="chart-container-small">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.categoryDistribution?.length > 0 ? data.categoryDistribution : [
                      { name: 'Beans', value: 400 },
                      { name: 'Equipment', value: 300 },
                      { name: 'Apparel', value: 300 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {['#D4AF37', '#8B5E3C', '#A67B5B', '#E3C099'].map((col, i) => (
                      <Cell key={`cell-${i}`} fill={col} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes] = await Promise.all([
        fetchDashboardStats(timeframe),
        fetchSalesAnalytics(timeframe)
      ]);

      if (statsRes.success) setStats(statsRes.data);

      if (analyticsRes.success) {
        setAnalyticsData(analyticsRes.data);
        const salesData = analyticsRes.data.salesData || [];
        const formattedData = salesData.map(item => ({
          name: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: item.total || 0,
          orders: item.count || 0
        }));

        if (formattedData.every(d => d.revenue === 0)) {
          setChartData([1200, 2100, 1800, 2400, 1900, 2800, 3200].map((v, i) => ({
            name: `Day ${i + 1}`, revenue: v, orders: Math.floor(v / 400), isMock: true
          })));
        } else {
          setChartData(formattedData);
        }
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      showAlert('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const StatCard = ({ title, value, change, icon, color, subtitle, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`stat-card ${color} glass-card`}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        {change !== undefined && (
          <div className={`stat-change ${change > 0 ? 'positive' : 'negative'}`}>
            {change > 0 ? <FaArrowUp /> : <FaArrowDown />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <FaCoffee className="loading-icon" />
        </motion.div>
        <p>Polishing your data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Analytics Command Center</h1>
          <p>Real-time performance overview of Rerendet Coffee.</p>
        </div>

        <div className="header-controls">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select glass-panel"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <div className="tab-buttons glass-panel">
            {['overview', 'reports', 'logs'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeTab === 'overview' ? (
        <div className="fade-in">
          <div className="stats-grid">
            <StatCard
              delay={0.1} color="revenue" title="Revenue"
              value={`KES ${(stats?.overview?.totalRevenue || 0).toLocaleString()}`}
              change={12} icon={<FaDollarSign />}
            />
            <StatCard
              delay={0.2} color="orders" title="Total Orders"
              value={(stats?.overview?.totalOrders || 0).toLocaleString()}
              change={8} icon={<FaShoppingBag />}
            />
            <StatCard
              delay={0.3} color="customers" title="Customers"
              value={(stats?.overview?.totalUsers || 0).toLocaleString()}
              change={5} icon={<FaUsers />}
            />
            <StatCard
              delay={0.4} color="products" title="Inventory"
              value={(stats?.overview?.totalProducts || 0).toLocaleString()}
              icon={<FaBox />}
            />
          </div>

          <div className="charts-row">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="chart-section"
            >
              <div className="section-header">
                <h3>Revenue Trajectory</h3>
                <div className="premium-label">Trends: +12.5%</div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={themeColors.grid} />
                    <XAxis dataKey="name" stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={themeColors.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `K${v / 1000}k`} />
                    <Tooltip contentClassName="custom-chart-tooltip" />
                    <Area
                      type="monotone" dataKey="revenue"
                      stroke={themeColors.primary} strokeWidth={3}
                      fill="url(#colorRevenue)" animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="chart-section"
            >
              <h3>Top Categories</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Coffee', value: 45 },
                        { name: 'Tea', value: 25 },
                        { name: 'Gear', value: 20 },
                        { name: 'Other', value: 10 }
                      ]}
                      innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                    >
                      {['#D4AF37', '#6F4E37', '#A67B5B', '#E3C099'].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="dashboard-content">
            <div className="recent-orders">
              <div className="section-header">
                <h3>Priority Orders</h3>
                <button className="btn-premium-mini" onClick={() => navigate('/admin/orders')}>Manage All</button>
              </div>
              <div className="orders-list">
                {stats?.recentOrders?.map((order, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={order._id} className="order-item"
                  >
                    <div className="order-main">
                      <span className="order-number">#{order.orderNumber}</span>
                      <span className="order-customer">{order.user?.firstName} {order.user?.lastName}</span>
                    </div>
                    <div className="order-meta">
                      <span className="order-amount">KES {order.total?.toLocaleString()}</span>
                      <span className={`order-status ${order.status}`}>{order.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="low-stock">
              <div className="section-header">
                <h3>Inventory Alerts</h3>
              </div>
              <div className="stock-list">
                {stats?.lowStockProducts?.map((product, i) => (
                  <div key={product._id} className="stock-item">
                    <span className="product-name">{product.name}</span>
                    <span className="stock-count">{product.inventory?.stock} left</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        <ReportsView data={analyticsData} colors={themeColors} />
      ) : activeTab === 'logs' ? (
        <ActivityLogs />
      ) : null}
    </div>
  );
};

export default Dashboard;