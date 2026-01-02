import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityLogs from './ActivityLogs';
import { AppContext } from '../../context/AppContext';
import {
  FaShoppingBag,
  FaDollarSign,
  FaUsers,
  FaBox,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaChartLine,
  FaFilePdf,
  FaFileCsv,
  FaDownload,
  FaCoffee,
  FaExclamationTriangle,
  FaClock
} from 'react-icons/fa';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { showAlert, fetchDashboardStats, fetchSalesAnalytics } = useContext(AppContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // key: Run both fetches in parallel for speed
      const [statsRes, analyticsRes] = await Promise.all([
        fetchDashboardStats(timeframe),
        fetchSalesAnalytics(timeframe)
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (analyticsRes.success) {
        // Format data for Recharts
        // API returns { _id: "2023-10-25", total: 1500 }
        // Chart needs { name: "Oct 25", revenue: 1500 }
        const formattedData = (analyticsRes.data.salesData || []).map(item => {
          const date = new Date(item._id);
          return {
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: item.total
          };
        });
        setChartData(formattedData);

        // Merge category distribution into stats for Pie Chart
        setStats(prev => ({
          ...prev,
          categoryDistribution: analyticsRes.data.categoryDistribution || []
        }));
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

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!stats?.recentOrders?.length) {
      showAlert('No data to export', 'warning');
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const rows = stats.recentOrders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleDateString(),
      `${order.user?.firstName || ''} ${order.user?.lastName || ''}`,
      order.items?.length || 0,
      order.total,
      order.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('CSV Report downloaded successfully', 'success');
  };

  // Handle Print Report
  const handlePrintReport = () => {
    window.print();
  };

  const StatCard = ({ title, value, change, icon, color, subtitle }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        {icon}
      </div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        {change !== undefined && (
          <div className={`stat-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
            {change > 0 ? <FaArrowUp /> : change < 0 ? <FaArrowDown /> : null}
            <span>{change !== 0 ? `${Math.abs(change)}%` : 'No change'}</span>
          </div>
        )}
      </div>
    </div>
  );

  const QuickActions = () => (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        <button
          className="action-btn"
          onClick={() => navigate('/admin/products')}
        >
          <FaBox />
          <span>Manage Products</span>
        </button>
        <button
          className="action-btn"
          onClick={() => navigate('/admin/orders')}
        >
          <FaShoppingBag />
          <span>View Orders</span>
        </button>
        <button
          className="action-btn"
          onClick={() => navigate('/admin/users')}
        >
          <FaUsers />
          <span>Manage Customers</span>
        </button>
        <button
          className="action-btn"
          onClick={() => setActiveTab('reports')}
        >
          <FaChartLine />
          <span>Generate Reports</span>
        </button>
      </div>
    </div>
  );

  const RecentOrders = () => (
    <div className="recent-orders">
      <div className="section-header">
        <h3>Recent Orders</h3>
        <button
          className="btn-view-all"
          onClick={() => navigate('/admin/orders')}
        >
          View All
        </button>
      </div>
      <div className="orders-list">
        {stats?.recentOrders?.length > 0 ? (
          stats.recentOrders.slice(0, 5).map(order => (
            <div key={order._id} className="order-item">
              <div className="order-info">
                <span className="order-number">#{order.orderNumber}</span>
                <span className="order-customer">
                  {order.user?.firstName} {order.user?.lastName}
                </span>
              </div>
              <div className="order-details">
                <span className="order-amount">KES {order.total?.toLocaleString()}</span>
                <span className={`order-status ${order.status}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-section">
            <p>No recent orders</p>
          </div>
        )}
      </div>
    </div>
  );

  const LowStockAlert = () => (
    <div className="low-stock">
      <div className="section-header">
        <h3>Low Stock Alert</h3>
        <button
          className="btn-view-all"
          onClick={() => navigate('/admin/products?lowStock=true')}
        >
          View All
        </button>
      </div>
      <div className="stock-list">
        {stats?.lowStockProducts?.length > 0 ? (
          stats.lowStockProducts.slice(0, 5).map(product => (
            <div key={product._id} className="stock-item">
              <div className="product-info">
                <span className="product-name">{product.name}</span>
                <span className="stock-level">
                  Stock: {product.inventory?.stock || 0}
                </span>
              </div>
              <span className={`stock-status ${product.inventory?.stock <= 5 ? 'critical' : 'low'}`}>
                {product.inventory?.stock <= 5 ? 'Critical' : 'Low'}
              </span>
            </div>
          ))
        ) : (
          <div className="empty-section">
            <FaBox />
            <p>All products are well stocked</p>
          </div>
        )}
      </div>
    </div>
  );

  const ReportsSection = () => (
    <div className="reports-section">
      <h2>Reports & Analytics</h2>
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">
            <FaFilePdf />
          </div>
          <h4>System Report</h4>
          <p>Print or Save detailed system report</p>
          <button className="btn-download" onClick={handlePrintReport}>
            <FaDownload />
            Print / Save PDF
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <FaFileCsv />
          </div>
          <h4>Data Export</h4>
          <p>Export recent order data to CSV</p>
          <button className="btn-download" onClick={handleExportCSV}>
            <FaDownload />
            Export CSV
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <FaChartLine />
          </div>
          <h4>Analytics</h4>
          <p>View detailed analytics and insights</p>
          <button className="btn-download" onClick={() => navigate('/admin/analytics')}>
            <FaEye />
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <FaCoffee className="loading-icon" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header no-print">
        <div className="header-content">
          <h1>Dashboard Overview</h1>
          <p>Welcome to your admin dashboard</p>
        </div>
        <div className="header-controls">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Security Logs
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Statistics Grid */}
          <div className="stats-grid">
            <StatCard
              title="Total Revenue"
              value={`KES ${(stats?.overview?.totalRevenue || 0).toLocaleString()}`}
              change={12}
              icon={<FaDollarSign />}
              color="revenue"
              subtitle="All time revenue"
            />
            <StatCard
              title="Total Orders"
              value={(stats?.overview?.totalOrders || 0).toLocaleString()}
              change={8}
              icon={<FaShoppingBag />}
              color="orders"
              subtitle={`${stats?.overview?.todayOrders || 0} today`}
            />
            <StatCard
              title="Pending Payments"
              value={(stats?.overview?.pendingOrders || 0).toLocaleString()}
              change={0}
              icon={<FaClock />}
              color="pending"
              subtitle="Unpaid Orders"
            />
            <StatCard
              title="Total Customers"
              value={(stats?.overview?.totalUsers || 0).toLocaleString()}
              change={5}
              icon={<FaUsers />}
              color="customers"
              subtitle="Registered users"
            />
            <StatCard
              title="Total Products"
              value={(stats?.overview?.totalProducts || 0).toLocaleString()}
              change={3}
              icon={<FaBox />}
              color="products"
              subtitle={`${stats?.lowStockProducts?.length || 0} low stock`}
            />
          </div>

          <QuickActions />

          <div className="dashboard-content">
            <RecentOrders />
            <LowStockAlert />
          </div>

          <div className="charts-row">
            <div className="chart-section revenue-chart">
              <h3>Revenue Trends (Last {timeframe})</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6F4E37" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6F4E37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `K${value}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#6F4E37', fontWeight: 600 }}
                      formatter={(value) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6F4E37"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart we missed earlier */}
            <div className="chart-section category-chart">
              <h3>Sales by Category</h3>
              {stats?.categoryDistribution?.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6F4E37', '#A67B5B', '#C19A6B', '#E3C099'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <p>No category data available</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'logs' ? (
        <ActivityLogs />
      ) : (
        <ReportsSection />
      )}
    </div>
  );
};

export default Dashboard;