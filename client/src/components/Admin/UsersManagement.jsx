// src/components/Admin/UsersManagement.jsx — Premium Rewrite
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaUser, FaEnvelope, FaPhone, FaCalendar,
  FaSync, FaTimes, FaShoppingBag, FaMapMarkerAlt,
  FaTrash, FaUserTag, FaShieldAlt, FaUserCheck,
  FaUserClock, FaChevronLeft, FaChevronRight,
  FaCrown, FaUsers, FaUserShield
} from 'react-icons/fa';
import './UsersManagement.css';

// ─── Helpers ────────────────────────────────────────────────────
const ROLE_CONFIG = {
  'super-admin': { label: 'Super Admin', color: 'gold', icon: <FaCrown />, bg: 'rgba(212,175,55,0.12)', text: '#D4AF37' },
  'admin': { label: 'Admin', color: 'blue', icon: <FaUserShield />, bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'customer': { label: 'Customer', color: 'green', icon: <FaUser />, bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
};

const getInitials = (firstName, lastName) =>
  `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Avatar Component ──────────────────────────────────────────
const UserAvatar = ({ user, size = 'md' }) => {
  const initials = getInitials(user.firstName, user.lastName);
  const role = user.userType || user.role || 'customer';
  const colors = {
    'super-admin': 'linear-gradient(135deg, #D4AF37, #b38f2a)',
    'admin': 'linear-gradient(135deg, #3b82f6, #2563eb)',
    'customer': 'linear-gradient(135deg, #6F4E37, #4a3425)',
  };
  return (
    <div className={`user-avatar-circle size-${size}`} style={{ background: colors[role] || colors.customer }}>
      {initials}
    </div>
  );
};

// ─── Role Badge ────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.customer;
  return (
    <span className="role-badge-pill" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────
const UsersManagement = () => {
  const { showAlert, fetchAdminUsers, updateUserRole, deleteUser } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [filters, setFilters] = useState({ search: '', role: '', page: 1, limit: 12 });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admins: 0, verified: 0, recent: 0 });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminUsers(filters);
      if (response.success) {
        const userList = response.data.users || [];
        setUsers(userList);
        setPagination(response.data.pagination || {});
        // Compute stats
        setStats({
          total: response.data.pagination?.total || userList.length,
          admins: userList.filter(u => u.userType === 'admin' || u.userType === 'super-admin').length,
          verified: userList.filter(u => u.isVerified).length,
          recent: userList.filter(u => {
            const d = new Date(u.createdAt);
            return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
          }).length,
        });
      }
    } catch {
      showAlert('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(p => ({ ...p, search: searchTerm, page: 1 }));
    }, 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setFilters(p => ({ ...p, role: roleFilter === 'all' ? '' : roleFilter, page: 1 }));
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [filters]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        fetchUsers();
        if (selectedUser?._id === userId) setSelectedUser(prev => ({ ...prev, userType: newRole, role: newRole }));
        showAlert('Role updated successfully', 'success');
      }
    } catch { showAlert('Failed to update role', 'error'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user permanently? This cannot be undone.')) return;
    try {
      const res = await deleteUser(userId);
      if (res.success) {
        fetchUsers();
        if (selectedUser?._id === userId) setSelectedUser(null);
        showAlert('User deleted', 'success');
      }
    } catch { showAlert('Failed to delete user', 'error'); }
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    if (!window.confirm(`Delete ${selectedUsers.length} users? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedUsers.map(id => deleteUser(id)));
      showAlert(`${selectedUsers.length} users deleted`, 'success');
      setSelectedUsers([]);
      fetchUsers();
    } catch { showAlert('Failed to delete some users', 'error'); }
    finally { setLoading(false); }
  };

  const handleSelectAll = (e) => setSelectedUsers(e.target.checked ? users.map(u => u._id) : []);
  const handleSelectUser = (id) =>
    setSelectedUsers(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  return (
    <div className="users-management">
      {/* ── Stats Row ── */}
      <div className="um-stats-row">
        {[
          { icon: <FaUsers />, label: 'Total Users', value: pagination.total || stats.total, color: '#3b82f6' },
          { icon: <FaUserShield />, label: 'Admins', value: stats.admins, color: '#D4AF37' },
          { icon: <FaUserCheck />, label: 'Verified', value: stats.verified, color: '#10b981' },
          { icon: <FaUserClock />, label: 'New This Week', value: stats.recent, color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="um-stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="um-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="um-stat-value">{s.value}</p>
              <p className="um-stat-label">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar">
        <div className="um-search-box">
          <FaSearch className="um-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="um-clear-btn" onClick={() => setSearchTerm('')}><FaTimes /></button>
          )}
        </div>

        <div className="um-role-pills">
          {['all', 'customer', 'admin', 'super-admin'].map(r => (
            <button
              key={r}
              className={`um-role-pill ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'All Roles' : ROLE_CONFIG[r]?.label || r}
            </button>
          ))}
        </div>

        <button className="um-refresh-btn" onClick={fetchUsers} disabled={loading} title="Refresh">
          <FaSync className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div
            className="um-bulk-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected</span>
            <button className="um-bulk-delete-btn" onClick={handleBulkDelete}>
              <FaTrash /> Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      {loading ? (
        <div className="um-loading">
          <div className="um-spinner" />
          <p>Loading users…</p>
        </div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                  />
                </th>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="um-empty-row">
                    <div className="um-empty">
                      <FaUsers className="um-empty-icon" />
                      <h3>No users found</h3>
                      <p>{searchTerm ? `No results for "${searchTerm}"` : 'Your user list is empty'}</p>
                      {searchTerm && <button onClick={() => setSearchTerm('')} className="um-clear-link">Clear search</button>}
                    </div>
                  </td>
                </tr>
              ) : users.map((user, i) => (
                <motion.tr
                  key={user._id}
                  className={`um-row ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                    />
                  </td>
                  <td>
                    <div className="um-user-cell">
                      <UserAvatar user={user} size="sm" />
                      <div className="um-user-name-block">
                        <strong>{user.firstName} {user.lastName}</strong>
                        <span className="um-user-id">#{user._id?.slice(-6)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="um-contact-block">
                      <span><FaEnvelope /> {user.email}</span>
                      {user.phone && <span><FaPhone /> {user.phone}</span>}
                    </div>
                  </td>
                  <td><RoleBadge role={user.userType || user.role || 'customer'} /></td>
                  <td>
                    <span className="um-date">{formatDate(user.createdAt)}</span>
                  </td>
                  <td>
                    <span className={`um-verified-badge ${user.isVerified ? 'yes' : 'no'}`}>
                      {user.isVerified ? '✓ Verified' : '⌛ Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="um-actions">
                      <button
                        className="um-action-btn view"
                        title="View Profile"
                        onClick={() => setSelectedUser(user)}
                      >
                        <FaUser />
                      </button>
                      <button
                        className="um-action-btn delete"
                        title="Delete User"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="um-pagination">
              <button
                className="um-page-btn"
                disabled={filters.page === 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              >
                <FaChevronLeft /> Prev
              </button>
              <div className="um-page-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(pg => (
                  <button
                    key={pg}
                    className={`um-page-num ${filters.page === pg ? 'active' : ''}`}
                    onClick={() => setFilters(p => ({ ...p, page: pg }))}
                  >
                    {pg}
                  </button>
                ))}
              </div>
              <button
                className="um-page-btn"
                disabled={filters.page === pagination.pages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── User Profile Drawer ── */}
      <AnimatePresence>
        {selectedUser && (
          <UserProfileDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onRoleChange={handleRoleChange}
            onDelete={handleDeleteUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── User Profile Drawer ────────────────────────────────────────
const UserProfileDrawer = ({ user, onClose, onRoleChange, onDelete }) => {
  const [role, setRole] = useState(user.userType || user.role || 'customer');
  const [saving, setSaving] = useState(false);

  const handleRoleSave = async () => {
    setSaving(true);
    await onRoleChange(user._id, role);
    setSaving(false);
  };

  const initials = getInitials(user.firstName, user.lastName);
  const joinDate = formatDate(user.createdAt);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="um-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <motion.div
        className="um-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 250 }}
      >
        {/* Drawer Header */}
        <div className="um-drawer-header">
          <span className="um-drawer-title">User Profile</span>
          <button className="um-drawer-close" onClick={onClose}><FaTimes /></button>
        </div>

        {/* Profile Hero */}
        <div className="um-profile-hero">
          <div className={`um-avatar-large role-${user.userType || 'customer'}`}>
            {initials}
          </div>
          <div className="um-profile-hero-info">
            <h2>{user.firstName} {user.lastName}</h2>
            <RoleBadge role={user.userType || user.role || 'customer'} />
            <span className={`um-verified-badge large ${user.isVerified ? 'yes' : 'no'}`}>
              {user.isVerified ? '✓ Verified Account' : '⌛ Unverified Account'}
            </span>
          </div>
        </div>

        {/* Profile Body */}
        <div className="um-drawer-body">

          {/* Contact Info */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaEnvelope /> Contact Information</h4>
            <div className="um-info-rows">
              <div className="um-info-row">
                <span className="um-info-label"><FaEnvelope /> Email</span>
                <span className="um-info-value">{user.email}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label"><FaPhone /> Phone</span>
                <span className="um-info-value">{user.phone || <em>Not provided</em>}</span>
              </div>
              {user.address && (
                <div className="um-info-row">
                  <span className="um-info-label"><FaMapMarkerAlt /> Address</span>
                  <span className="um-info-value">{user.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaCalendar /> Account Details</h4>
            <div className="um-info-rows">
              <div className="um-info-row">
                <span className="um-info-label">User ID</span>
                <span className="um-info-value mono">{user._id}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Joined</span>
                <span className="um-info-value">{joinDate}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Last Login</span>
                <span className="um-info-value">{user.lastLogin ? formatDate(user.lastLogin) : 'Never recorded'}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Orders</span>
                <span className="um-info-value">
                  <FaShoppingBag style={{ marginRight: '0.3rem', color: 'var(--color-primary)' }} />
                  {user.orderCount ?? '—'} orders
                </span>
              </div>
            </div>
          </div>

          {/* Role Management */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaShieldAlt /> System Role</h4>
            <p className="um-drawer-section-hint">Changing the role grants or revokes administrative access to this platform.</p>

            <div className="um-role-options">
              {['customer', 'admin', 'super-admin'].map(r => {
                const cfg = ROLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    className={`um-role-option ${role === r ? 'active' : ''}`}
                    style={role === r ? { borderColor: cfg.text, background: cfg.bg, color: cfg.text } : {}}
                    onClick={() => setRole(r)}
                  >
                    <span className="um-role-option-icon">{cfg.icon}</span>
                    <span className="um-role-option-label">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {role !== (user.userType || user.role || 'customer') && (
              <motion.button
                className="um-save-role-btn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleRoleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : `✓ Apply Role: ${ROLE_CONFIG[role]?.label}`}
              </motion.button>
            )}
          </div>

          {/* Danger Zone */}
          <div className="um-drawer-section danger-zone">
            <h4 className="um-drawer-section-title danger"><FaTrash /> Danger Zone</h4>
            <p className="um-drawer-section-hint">Deleting this user is permanent and cannot be reversed. Their orders and data will be preserved.</p>
            <button className="um-delete-btn" onClick={() => { onDelete(user._id); onClose(); }}>
              <FaTrash /> Delete This Account
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default UsersManagement;