// components/Admin/ProductsManagement.jsx - Premium Rewrite
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaBox, FaUpload,
  FaTimes, FaTag, FaStar, FaStarHalfAlt, FaRegStar,
  FaCoffee, FaFire, FaLeaf, FaGlobe, FaLayerGroup,
  FaBoxOpen, FaBell, FaCheckCircle
} from 'react-icons/fa';
import './ProductsManagement.css';

// ─── Helpers ────────────────────────────────────────────────────
const ROAST_LEVELS = [
  { value: 'light', label: 'Light', color: '#e8c99a', emoji: '☀️' },
  { value: 'medium-light', label: 'Med. Light', color: '#c8955a', emoji: '🌤️' },
  { value: 'medium', label: 'Medium', color: '#a0672e', emoji: '⛅' },
  { value: 'medium-dark', label: 'Med. Dark', color: '#7a4520', emoji: '🌥️' },
  { value: 'dark', label: 'Dark', color: '#4a2010', emoji: '🌑' },
  { value: 'espresso', label: 'Espresso', color: '#1a0a04', emoji: '☕' },
];

const CATEGORIES = [
  { value: 'coffee-beans', label: 'Coffee Beans', icon: <FaCoffee /> },
  { value: 'brewing-equipment', label: 'Brewing Equipment', icon: <FaLayerGroup /> },
  { value: 'accessories', label: 'Accessories', icon: <FaTag /> },
  { value: 'merchandise', label: 'Merchandise', icon: <FaBoxOpen /> },
];

// ─── Main Component ──────────────────────────────────────────────
const ProductsManagement = () => {
  const { showAlert, token } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [filters, setFilters] = useState({ category: 'all', search: '', page: 1, limit: 12 });
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const getToken = useCallback(() => {
    if (token) return token;
    try { return JSON.parse(localStorage.getItem('auth'))?.token; } catch { return null; }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = getToken();
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/admin/products?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      if (data.success) setProducts(data.data.products || []);
    } catch (error) {
      showAlert('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert, getToken]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (!r.ok) throw new Error('Failed to delete');
      showAlert('Product deleted', 'success');
      fetchProducts();
    } catch { showAlert('Failed to delete product', 'error'); }
  };

  const handleSelectAll = (e) => {
    setSelectedProducts(e.target.checked ? products.map(p => p._id) : []);
  };

  const handleSelectProduct = (id) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!selectedProducts.length) return;
    if (!window.confirm(`Delete ${selectedProducts.length} products?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedProducts.map(id =>
        fetch(`/api/admin/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
      ));
      showAlert(`${selectedProducts.length} products deleted`, 'success');
      setSelectedProducts([]);
      fetchProducts();
    } catch { showAlert('Failed to delete some products', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="products-management">
      {/* ── Header ── */}
      <div className="pm-header">
        <div>
          <h1 className="pm-title">Products</h1>
          <p className="pm-subtitle">{products.length} products in catalogue</p>
        </div>
        <div className="pm-header-actions">
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>⊞</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>☰</button>
          </div>
          <button className="btn-add-product" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="pm-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="category-pills">
          {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(cat => (
            <button
              key={cat.value}
              className={`cat-pill ${filters.category === cat.value ? 'active' : ''}`}
              onClick={() => setFilters(p => ({ ...p, category: cat.value, page: 1 }))}
            >
              {cat.icon && <span>{cat.icon}</span>} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            className="bulk-bar"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <span>{selectedProducts.length} selected</span>
            <button className="btn-bulk-delete" onClick={handleBulkDelete}>
              <FaTrash /> Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Product Grid ── */}
      {loading ? (
        <div className="pm-loading">
          <div className="pm-spinner" />
          <p>Loading products…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="pm-empty">
          <FaBox className="empty-icon" />
          <h3>No products yet</h3>
          <p>Start building your catalogue</p>
          <button className="btn-add-product" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>
            <FaPlus /> Add First Product
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="product-grid">
          {products.map((product, i) => (
            <motion.div
              key={product._id}
              className={`product-card ${selectedProducts.includes(product._id) ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="card-select">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product._id)}
                  onChange={() => handleSelectProduct(product._id)}
                />
              </div>

              {product.images?.[0] ? (
                <div className="card-image">
                  <img src={product.images[0].url} alt={product.name} />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  {product.isFeatured && <span className="featured-star"><FaStar /></span>}
                </div>
              ) : (
                <div className="card-image placeholder">
                  <FaCoffee />
                  {product.isFeatured && <span className="featured-star"><FaStar /></span>}
                </div>
              )}

              <div className="card-body">
                <div className="card-category">{CATEGORIES.find(c => c.value === product.category)?.label || product.category}</div>
                <h4 className="card-name">{product.name}</h4>
                {product.origin && <p className="card-origin"><FaGlobe /> {product.origin}</p>}

                <div className="card-prices">
                  {product.sizes?.map((s, idx) => (
                    <span key={idx} className="size-chip">
                      {s.size} <strong>KES {s.price?.toLocaleString()}</strong>
                    </span>
                  ))}
                </div>

                {product.flavorNotes?.length > 0 && (
                  <div className="flavor-pills">
                    {product.flavorNotes.slice(0, 3).map((note, idx) => (
                      <span key={idx} className="flavor-pill">{note}</span>
                    ))}
                  </div>
                )}

                <div className="card-footer">
                  <span className={`stock-chip ${(product.inventory?.stock || 0) <= 10 ? 'low' : 'ok'}`}>
                    {product.inventory?.stock || 0} in stock
                  </span>
                  <div className="card-actions">
                    <button className="btn-card-action edit" title="Edit" onClick={() => { setEditingProduct(product); setShowProductModal(true); }}>
                      <FaEdit />
                    </button>
                    <button className="btn-card-action delete" title="Delete" onClick={() => handleDeleteProduct(product._id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th><input type="checkbox" onChange={handleSelectAll} checked={products.length > 0 && selectedProducts.length === products.length} /></th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product._id} className={`product-row ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
                  <td><input type="checkbox" checked={selectedProducts.includes(product._id)} onChange={() => handleSelectProduct(product._id)} /></td>
                  <td>
                    <div className="table-product-info">
                      {product.images?.[0]
                        ? <img src={product.images[0].url} alt={product.name} className="table-thumb" />
                        : <div className="table-thumb placeholder"><FaCoffee /></div>}
                      <div>
                        <strong>{product.name}</strong>
                        {product.badge && <span className="table-badge">{product.badge}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="price-col">KES {product.sizes?.[0]?.price?.toLocaleString() || '—'}</td>
                  <td><span className={`stock-chip ${(product.inventory?.stock || 0) <= 10 ? 'low' : 'ok'}`}>{product.inventory?.stock || 0}</span></td>
                  <td>{CATEGORIES.find(c => c.value === product.category)?.label || product.category}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-card-action edit" onClick={() => { setEditingProduct(product); setShowProductModal(true); }}><FaEdit /></button>
                      <button className="btn-card-action delete" onClick={() => handleDeleteProduct(product._id)}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Product Modal ── */}
      <AnimatePresence>
        {showProductModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
            onSave={fetchProducts}
            getToken={getToken}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Product Modal ───────────────────────────────────────────────
const ProductModal = ({ product, onClose, onSave, getToken }) => {
  const { showAlert } = useContext(AppContext);
  const [activeSection, setActiveSection] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sizes: product?.sizes || [{ size: '250g', price: '' }],
    category: product?.category || 'coffee-beans',
    roastLevel: product?.roastLevel || 'medium',
    origin: product?.origin || '',
    flavorNotes: product?.flavorNotes || [],
    badge: product?.badge || '',
    inventory: {
      stock: product?.inventory?.stock ?? 0,
      lowStockAlert: product?.inventory?.lowStockAlert ?? 5,
    },
    tags: product?.tags?.join(', ') || '',
    isFeatured: product?.isFeatured || false,
  });
  const [images, setImages] = useState(product?.images || []);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // ── Image handling ──
  const processFiles = (files) => {
    const newImgs = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setImages(prev => [...prev, ...newImgs]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = async (index) => {
    const img = images[index];
    if (img.file) {
      URL.revokeObjectURL(img.url);
      setImages(prev => prev.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm('Delete this image permanently?')) return;
    try {
      const r = await fetch(`/api/admin/products/${product._id}/images`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.url }),
      });
      if (r.ok) setImages(prev => prev.filter((_, i) => i !== index));
      else showAlert('Failed to delete image', 'error');
    } catch { showAlert('Error deleting image', 'error'); }
  };

  // ── Size handling ──
  const addSize = () => set('sizes', [...formData.sizes, { size: '250g', price: '' }]);
  const removeSize = (i) => set('sizes', formData.sizes.filter((_, idx) => idx !== i));
  const updateSize = (i, field, value) => set('sizes', formData.sizes.map((s, idx) =>
    idx === i ? { ...s, [field]: field === 'price' ? (value === '' ? '' : parseFloat(value) || 0) : value } : s
  ));

  // ── Flavor tag handling ──
  const addFlavor = (note) => {
    const trimmed = note.trim();
    if (trimmed && !formData.flavorNotes.includes(trimmed)) {
      set('flavorNotes', [...formData.flavorNotes, trimmed]);
    }
    setFlavorInput('');
  };

  const removeFlavor = (note) => set('flavorNotes', formData.flavorNotes.filter(n => n !== note));

  const handleFlavorKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFlavor(flavorInput);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.sizes.length) {
      showAlert('Please fill in name, description, and at least one size.', 'error');
      return;
    }

    const invalidSizes = formData.sizes.filter(s => !s.size || !s.price || parseFloat(s.price) <= 0);
    if (invalidSizes.length) {
      showAlert('All sizes need a valid price > 0.', 'error');
      return;
    }

    const stock = parseInt(formData.inventory.stock);
    if (isNaN(stock) || stock < 0) {
      showAlert('Stock must be a valid number ≥ 0.', 'error');
      return;
    }

    setSaving(true);
    try {
      const authToken = getToken();
      if (!authToken) {
        showAlert('Session expired. Please log in again.', 'error');
        return;
      }

      const url = product ? `/api/admin/products/${product._id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sizes: formData.sizes.map(s => ({ size: s.size, price: parseFloat(s.price) })),
        category: formData.category,
        roastLevel: formData.category === 'coffee-beans' ? formData.roastLevel : undefined,
        origin: formData.origin.trim(),
        flavorNotes: formData.flavorNotes,
        badge: formData.badge.trim(),
        inventory: { stock, lowStockAlert: parseInt(formData.inventory.lowStockAlert) || 5 },
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isFeatured: formData.isFeatured,
      };

      const filesToUpload = images.filter(img => img.file).map(img => img.file);
      let response;

      if (filesToUpload.length > 0) {
        const fd = new FormData();
        fd.append('name', productData.name);
        fd.append('description', productData.description);
        fd.append('category', productData.category);
        fd.append('origin', productData.origin);
        fd.append('badge', productData.badge);
        fd.append('isFeatured', productData.isFeatured);
        fd.append('sizes', JSON.stringify(productData.sizes));
        fd.append('inventory', JSON.stringify(productData.inventory));
        fd.append('flavorNotes', JSON.stringify(productData.flavorNotes));
        fd.append('tags', JSON.stringify(productData.tags));
        if (productData.roastLevel) fd.append('roastLevel', productData.roastLevel);
        filesToUpload.forEach(file => fd.append('images', file));
        response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${authToken}` }, body: fd });
      } else {
        response = await fetch(url, {
          method,
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) {
          showAlert('Session expired. Please log in again.', 'error');
          return;
        }
        throw new Error(err.message || `Failed to ${product ? 'update' : 'create'} product`);
      }

      const data = await response.json();
      if (data.success) {
        showAlert(product ? 'Product updated!' : 'Product created!', 'success');
        onSave();
        onClose();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showAlert(error.message || 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const SECTIONS = [
    { id: 'basic', label: 'Basic Info', icon: <FaTag /> },
    { id: 'pricing', label: 'Pricing', icon: <FaLayerGroup /> },
    { id: 'coffee', label: 'Coffee Info', icon: <FaCoffee /> },
    { id: 'media', label: 'Media', icon: <FaUpload /> },
    { id: 'stock', label: 'Inventory', icon: <FaBoxOpen /> },
  ];

  const primaryImage = images.find(i => !i.file) || images[0];

  return (
    <motion.div
      className="pm-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pm-modal"
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="pm-modal-header">
          <div className="pm-modal-title">
            <div className="pm-modal-icon">{product ? <FaEdit /> : <FaPlus />}</div>
            <div>
              <h2>{product ? 'Edit Product' : 'New Product'}</h2>
              {product && <span className="pm-modal-subtitle">{product.name}</span>}
            </div>
          </div>
          <button className="pm-close-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="pm-modal-body">
          {/* ── LEFT: Navigation ── */}
          <nav className="pm-form-nav">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                type="button"
                className={`pm-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <span className="pm-nav-icon">{sec.icon}</span>
                {sec.label}
              </button>
            ))}

            {/* Mini Preview */}
            <div className="pm-mini-preview">
              {primaryImage ? (
                <img src={primaryImage.url} alt="preview" />
              ) : (
                <div className="pm-preview-placeholder"><FaCoffee /></div>
              )}
              <p className="pm-preview-name">{formData.name || 'Product name'}</p>
              <p className="pm-preview-price">
                {formData.sizes?.[0]?.price ? `KES ${parseFloat(formData.sizes[0].price).toLocaleString()}` : 'No price set'}
              </p>
              <div className="pm-preview-tags">
                {formData.isFeatured && <span className="preview-tag gold"><FaStar /> Featured</span>}
                {(formData.inventory?.stock || 0) <= 10 && <span className="preview-tag red"><FaBell /> Low stock</span>}
              </div>
            </div>
          </nav>

          {/* ── RIGHT: Form ── */}
          <form className="pm-form" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ═══ BASIC INFO ═══ */}
              {activeSection === 'basic' && (
                <motion.div key="basic" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title"><FaTag /> Basic Information</h3>

                  <div className="pm-field">
                    <label>Product Name <span className="req">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="e.g., Rerendet AA Premium Blend"
                      required
                    />
                  </div>

                  <div className="pm-field">
                    <label>Description <span className="req">*</span></label>
                    <textarea
                      value={formData.description}
                      onChange={e => set('description', e.target.value)}
                      rows={5}
                      placeholder="Describe the product — its taste, story, and what makes it unique..."
                      required
                    />
                  </div>

                  <div className="pm-row">
                    <div className="pm-field">
                      <label>Badge Label</label>
                      <input
                        type="text"
                        value={formData.badge}
                        onChange={e => set('badge', e.target.value)}
                        placeholder="e.g., Best Seller, New Arrival"
                      />
                    </div>
                    <div className="pm-field">
                      <label>Tags <span className="hint">(comma separated)</span></label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={e => set('tags', e.target.value)}
                        placeholder="premium, organic, single-origin"
                      />
                    </div>
                  </div>

                  <div className="pm-field">
                    <label>Category <span className="req">*</span></label>
                    <div className="category-selector">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          className={`cat-option ${formData.category === cat.value ? 'active' : ''}`}
                          onClick={() => set('category', cat.value)}
                        >
                          <span className="cat-icon">{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pm-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={e => set('isFeatured', e.target.checked)}
                        style={{ marginRight: '0.5rem', accentColor: 'var(--color-primary)' }}
                      />
                      Feature this product on homepage
                    </label>
                  </div>
                </motion.div>
              )}

              {/* ═══ PRICING & SIZES ═══ */}
              {activeSection === 'pricing' && (
                <motion.div key="pricing" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title"><FaLayerGroup /> Sizes & Pricing</h3>
                  <p className="pm-section-hint">Add one or more size variants with individual prices.</p>

                  <div className="sizes-builder">
                    {formData.sizes.map((size, i) => (
                      <motion.div
                        key={i}
                        className="size-row-premium"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="size-num">{i + 1}</div>
                        <div className="pm-field flex-1">
                          <label>Size</label>
                          <select value={size.size} onChange={e => updateSize(i, 'size', e.target.value)}>
                            <option value="100g">100g</option>
                            <option value="250g">250g</option>
                            <option value="500g">500g</option>
                            <option value="1000g">1000g (1kg)</option>
                            <option value="2000g">2000g (2kg)</option>
                            <option value="Standard">Standard</option>
                            <option value="Large">Large</option>
                          </select>
                        </div>
                        <div className="pm-field flex-1">
                          <label>Price (KES)</label>
                          <input
                            type="number"
                            value={size.price}
                            onChange={e => updateSize(i, 'price', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        {formData.sizes.length > 1 && (
                          <button type="button" className="size-remove-btn" onClick={() => removeSize(i)}>
                            <FaTimes />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <button type="button" className="btn-add-size" onClick={addSize}>
                    <FaPlus /> Add Another Size
                  </button>

                  {formData.sizes.length > 0 && (
                    <div className="pricing-summary">
                      <h4>Price Range</h4>
                      <div className="price-range">
                        <span>From</span>
                        <strong>KES {Math.min(...formData.sizes.map(s => parseFloat(s.price) || 0)).toLocaleString()}</strong>
                        <span>to</span>
                        <strong>KES {Math.max(...formData.sizes.map(s => parseFloat(s.price) || 0)).toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ COFFEE INFO ═══ */}
              {activeSection === 'coffee' && (
                <motion.div key="coffee" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title"><FaCoffee /> Coffee Details</h3>

                  {formData.category === 'coffee-beans' ? (
                    <>
                      <div className="pm-field">
                        <label>Roast Level</label>
                        <div className="roast-selector">
                          {ROAST_LEVELS.map(r => (
                            <button
                              key={r.value}
                              type="button"
                              className={`roast-btn ${formData.roastLevel === r.value ? 'active' : ''}`}
                              style={{ '--roast-color': r.color }}
                              onClick={() => set('roastLevel', r.value)}
                            >
                              <span className="roast-emoji">{r.emoji}</span>
                              <span className="roast-label">{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pm-row">
                        <div className="pm-field">
                          <label><FaGlobe /> Origin / Region</label>
                          <input
                            type="text"
                            value={formData.origin}
                            onChange={e => set('origin', e.target.value)}
                            placeholder="e.g., Nyeri, Kenya"
                          />
                        </div>
                      </div>

                      <div className="pm-field">
                        <label>Flavor Notes <span className="hint">(press Enter or comma to add)</span></label>
                        <div className="flavor-tag-input">
                          <div className="flavor-tags-container">
                            {formData.flavorNotes.map((note, i) => (
                              <span key={i} className="flavor-tag-pill">
                                {note}
                                <button type="button" onClick={() => removeFlavor(note)}><FaTimes /></button>
                              </span>
                            ))}
                            <input
                              type="text"
                              value={flavorInput}
                              onChange={e => setFlavorInput(e.target.value)}
                              onKeyDown={handleFlavorKeyDown}
                              onBlur={() => flavorInput.trim() && addFlavor(flavorInput)}
                              placeholder={formData.flavorNotes.length === 0 ? 'Type a flavor note and press Enter...' : ''}
                            />
                          </div>
                        </div>
                        <div className="flavor-suggestions">
                          {['Citrus', 'Chocolate', 'Caramel', 'Floral', 'Nutty', 'Berry', 'Honey', 'Earthy', 'Spicy'].map(s => (
                            !formData.flavorNotes.includes(s) && (
                              <button key={s} type="button" className="flavor-suggest-chip" onClick={() => addFlavor(s)}>
                                + {s}
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="pm-no-coffee">
                      <FaLeaf />
                      <p>Coffee-specific details are only available for the <strong>Coffee Beans</strong> category. Switch the category in Basic Info to unlock these fields.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ MEDIA ═══ */}
              {activeSection === 'media' && (
                <motion.div key="media" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title"><FaUpload /> Product Images</h3>
                  <p className="pm-section-hint">Upload up to 6 images. First image will be the main display image.</p>

                  <div
                    className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload className="drop-icon" />
                    <p className="drop-title">Drop images here or click to browse</p>
                    <p className="drop-hint">JPG, PNG, WebP — max 5MB each</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => processFiles(e.target.files)}
                    />
                  </div>

                  {images.length > 0 && (
                    <div className="image-grid">
                      {images.map((img, i) => (
                        <motion.div
                          key={i}
                          className={`image-tile ${i === 0 ? 'primary' : ''}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <img src={img.url} alt={`img-${i}`} />
                          {i === 0 && <span className="primary-badge">Main</span>}
                          {img.file && <span className="new-badge">New</span>}
                          <button type="button" className="img-remove-btn" onClick={() => removeImage(i)}>
                            <FaTimes />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ INVENTORY ═══ */}
              {activeSection === 'stock' && (
                <motion.div key="stock" className="pm-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="pm-section-title"><FaBoxOpen /> Inventory Management</h3>

                  <div className="stock-cards">
                    <div className="stock-card">
                      <div className="stock-card-icon green"><FaCheckCircle /></div>
                      <div className="pm-field">
                        <label>Current Stock <span className="req">*</span></label>
                        <input
                          type="number"
                          value={formData.inventory.stock}
                          onChange={e => set('inventory', { ...formData.inventory, stock: parseInt(e.target.value) || 0 })}
                          min="0"
                          required
                        />
                        <span className="pm-field-hint">Number of units available for sale</span>
                      </div>
                    </div>

                    <div className="stock-card">
                      <div className="stock-card-icon amber"><FaBell /></div>
                      <div className="pm-field">
                        <label>Low Stock Alert Threshold</label>
                        <input
                          type="number"
                          value={formData.inventory.lowStockAlert}
                          onChange={e => set('inventory', { ...formData.inventory, lowStockAlert: parseInt(e.target.value) || 5 })}
                          min="0"
                        />
                        <span className="pm-field-hint">Alert when stock falls to or below this number</span>
                      </div>
                    </div>
                  </div>

                  <div className="stock-status-preview">
                    <h4>Stock Status Preview</h4>
                    <div className={`stock-meter ${formData.inventory.stock === 0 ? 'out' : formData.inventory.stock <= formData.inventory.lowStockAlert ? 'low' : 'good'}`}>
                      <div className="meter-bar" style={{ width: `${Math.min(100, (formData.inventory.stock / Math.max(formData.inventory.stock, 50)) * 100)}%` }} />
                    </div>
                    <p className="stock-status-label">
                      {formData.inventory.stock === 0 ? '🔴 Out of stock' :
                        formData.inventory.stock <= formData.inventory.lowStockAlert ? '🟡 Low stock — alert will trigger' :
                          '🟢 In stock — healthy inventory'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Footer Actions ── */}
            <div className="pm-form-footer">
              <button type="button" className="btn-pm-cancel" onClick={onClose} disabled={saving}>Cancel</button>
              <div className="pm-form-footer-right">
                {activeSection !== 'stock' && (
                  <button
                    type="button"
                    className="btn-pm-next"
                    onClick={() => {
                      const ids = ['basic', 'pricing', 'coffee', 'media', 'stock'];
                      const nextIdx = ids.indexOf(activeSection) + 1;
                      if (nextIdx < ids.length) setActiveSection(ids[nextIdx]);
                    }}
                  >
                    Next Section →
                  </button>
                )}
                <button type="submit" className="btn-pm-save" disabled={saving}>
                  {saving ? (
                    <span className="saving-dots">
                      <span>Saving</span>
                      <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                    </span>
                  ) : product ? '💾 Update Product' : '✨ Create Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductsManagement;