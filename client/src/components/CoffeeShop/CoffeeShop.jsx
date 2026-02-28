import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaEye, FaTimes, FaPlus, FaLeaf, FaShoppingBag,
  FaTools, FaTag, FaBoxOpen, FaGlobe, FaFire,
  FaFilter, FaStar, FaShieldAlt
} from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import FloatingBeans from '../UI/FloatingBeans';
import { isFreshlyRoasted } from '../../utils/productHelpers';
import './CoffeeShop.css';

/* ─── Helpers ──────────────────────────────────────────── */
const getProductImage = (product) => {
  if (product?.images?.length > 0 && product.images[0].url) return product.images[0].url;
  if (product?.image) return product.image;
  return `https://via.placeholder.com/600x600/1a1714/D4AF37?text=${encodeURIComponent(product?.name || 'Product')}`;
};

const isInStock = (product) => {
  if (product?.inventory?.stock !== undefined) return product.inventory.stock > 0;
  return product?.inStock !== false;
};

/* Category meta — icons, labels, colours. Anything not listed falls back to the default */
const CAT_META = {
  'coffee-beans': { icon: '☕', label: 'Coffee Beans', color: '#D4AF37', cardType: 'coffee' },
  'brewing-equipment': { icon: '⚙️', label: 'Brewing Equipment', color: '#3b82f6', cardType: 'equipment' },
  'accessories': { icon: '🎒', label: 'Accessories', color: '#8b5cf6', cardType: 'generic' },
  'merchandise': { icon: '🛍️', label: 'Merchandise', color: '#10b981', cardType: 'generic' },
};
const getCatMeta = (cat) => CAT_META[cat] || { icon: '📦', label: cat || 'Product', color: '#6b7280', cardType: 'generic' };

/* ─── Product Card ──────────────────────────────────────── */
const ProductCard = ({ product, index, handleAddToCart, addingToCart, setSelectedProduct }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const productInStock = isInStock(product);
  const fresh = product.category === 'coffee-beans' && isFreshlyRoasted(product.roastDate);
  const meta = getCatMeta(product.category);

  return (
    <motion.div
      className="coffee-card-wrapper"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.6 }}
    >
      <motion.div
        className={`coffee-card coffee-card--${meta.cardType}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {/* Image */}
        <div className="coffee-image-container" style={{ transform: 'translateZ(50px)' }}>
          <Link to={`/product/${product.seo?.slug || product._id}`} className="image-link">
            <img
              src={getProductImage(product)}
              alt={product.name}
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/600x600/1a1714/D4AF37?text=${encodeURIComponent(product.name)}`;
              }}
            />
          </Link>

          {/* Category badge (top-left) */}
          <div className="card-cat-badge" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}44` }}>
            {meta.icon} {meta.label}
          </div>

          {/* Quick view */}
          <div className="card-overlay-actions">
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="premium-view-btn"
              onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
            >
              <FaEye />
            </motion.button>
          </div>

          {fresh && <div className="fresh-badge-glow"><FaLeaf className="fresh-icon" /> FRESHLY ROASTED</div>}
          {product.badge && <div className="coffee-badge">{product.badge}</div>}
          {!productInStock && <div className="out-of-stock-badge">Sold Out</div>}
        </div>

        {/* Info */}
        <div className="coffee-info" style={{ transform: 'translateZ(30px)' }}>
          <div className="coffee-header">
            <h3 className="coffee-title">{product.name}</h3>
            <div className="price-tag-compact">KES {product.price?.toLocaleString?.() ?? product.sizes?.[0]?.price?.toLocaleString?.() ?? '—'}</div>
          </div>

          {/* Subtitle row adapts per category */}
          <p className="coffee-origin">
            {product.category === 'coffee-beans'
              ? `${product.origin || ''}${product.origin && product.size ? ' • ' : ''}${product.size || ''}`
              : product.brand
                ? `${product.brand}${product.size ? ' · ' + product.size : ''}`
                : product.size || meta.label}
          </p>

          {/* Coffee: flavor notes — Equipment/others: material or features */}
          {product.category === 'coffee-beans' && product.flavorNotes?.length > 0 && (
            <div className="flavor-notes">
              {product.flavorNotes.slice(0, 2).map((note, idx) => (
                <span key={idx} className="flavor-pill">{note}</span>
              ))}
            </div>
          )}

          {product.category !== 'coffee-beans' && (
            <div className="flavor-notes">
              {product.material && <span className="flavor-pill"><FaShieldAlt style={{ fontSize: '0.65rem' }} /> {product.material}</span>}
              {product.capacity && <span className="flavor-pill">{product.capacity}</span>}
              {!product.material && !product.capacity && product.tags?.slice(0, 2).map((t, i) => (
                <span key={i} className="flavor-pill">{t}</span>
              ))}
            </div>
          )}

          {/* Stock indicator */}
          {product.inventory?.stock !== undefined && (
            <div className={`card-stock-indicator ${product.inventory.stock <= 0 ? 'out' : product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? 'low' : 'ok'}`}>
              {product.inventory.stock <= 0 ? '● Out of stock' :
                product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? `● Only ${product.inventory.stock} left` :
                  `● ${product.inventory.stock} in stock`}
            </div>
          )}

          <div className="card-footer">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className={`btn-premium-add ${!productInStock || addingToCart === product.variationKey ? 'disabled' : ''}`}
              onClick={() => handleAddToCart(product)}
              disabled={!productInStock || addingToCart === product.variationKey}
            >
              {addingToCart === product.variationKey ? <div className="loader-mini" /> : (<><FaPlus /> <span>Add to Cart</span></>)}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Quick-View Modal (category-aware) ─────────────────── */
const QuickViewModal = ({ product, onClose, onAddToCart, addingToCart }) => {
  const meta = getCatMeta(product.category);
  const isCoffee = product.category === 'coffee-beans';
  const productInStock = isInStock(product);

  return (
    <motion.div
      className="modal-overlay premium-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="quick-view-modal premium-modal-content"
        initial={{ scale: 0.9, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>

        <div className="modal-content-grid">
          <div className="modal-image">
            <div className="modal-image-glow" style={{ background: `radial-gradient(circle, ${meta.color}22 0%, transparent 70%)` }} />
            <img src={getProductImage(product)} alt={product.name} />
          </div>

          <div className="modal-details">
            {/* Category badge — replaces coffee-only "X Roast" badge */}
            <div className="modal-badge" style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}44` }}>
              {meta.icon} {isCoffee && product.roastLevel ? `${product.roastLevel} Roast · ` : ''}{meta.label}
            </div>

            <h2>{product.name}</h2>

            {/* Subtitle adapts per category */}
            <p className="modal-origin">
              {isCoffee
                ? `${product.origin || 'Kenya'} · ${product.selectedSize || product.size || ''}`
                : [product.brand, product.material, product.capacity, product.size].filter(Boolean).join(' · ')}
            </p>

            <div className="modal-price">
              <span>KES {product.price?.toLocaleString?.() ?? '—'}</span>
              {product.badge && <span className="price-badge-small">{product.badge}</span>}
            </div>

            <div className="modal-desc">{product.description}</div>

            {/* Coffee: flavor notes */}
            {isCoffee && product.flavorNotes?.length > 0 && (
              <div className="modal-flavors">
                <strong>Flavor Notes</strong>
                <div className="flavor-notes" style={{ marginTop: '0.5rem' }}>
                  {product.flavorNotes.map((note, i) => <span key={i} className="flavor-pill">{note}</span>)}
                </div>
              </div>
            )}

            {/* Equipment/accessories: extra details */}
            {!isCoffee && (product.material || product.brand || product.capacity) && (
              <div className="modal-flavors">
                <strong>Product Details</strong>
                <div className="flavor-notes" style={{ marginTop: '0.5rem' }}>
                  {product.brand && <span className="flavor-pill">🏷️ {product.brand}</span>}
                  {product.material && <span className="flavor-pill">🛡️ {product.material}</span>}
                  {product.capacity && <span className="flavor-pill">📐 {product.capacity}</span>}
                </div>
              </div>
            )}

            {/* Stock */}
            {product.inventory?.stock !== undefined && (
              <div className={`modal-stock-badge ${product.inventory.stock <= 0 ? 'out' : product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? 'low' : 'ok'}`}>
                {product.inventory.stock <= 0 ? '● Out of stock' :
                  product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? `● Only ${product.inventory.stock} units left` :
                    `● ${product.inventory.stock} units available`}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-premium"
              onClick={() => onAddToCart(product)}
              disabled={!productInStock || addingToCart === product.variationKey}
              style={{ width: '100%', padding: '1.25rem', marginTop: '1.5rem', opacity: productInStock ? 1 : 0.6, cursor: productInStock ? 'pointer' : 'not-allowed' }}
            >
              {!productInStock ? 'Out of Stock' :
                addingToCart === product.variationKey ? 'Adding...' : 'Add to Cart'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Main Shop Component ───────────────────────────────── */
const CoffeeShop = () => {
  const { addToCart, showAlert } = useContext(AppContext);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBeans, setShowBeans] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ALL active, in-stock products (no category filter)
      const response = await fetch('/api/products?isActive=true&limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();

      if (result.success && Array.isArray(result.data?.products)) {
        const expanded = [];
        result.data.products.forEach(product => {
          if (product.sizes?.length > 0) {
            product.sizes.forEach(sizeOpt => {
              expanded.push({
                ...product,
                size: sizeOpt.size,
                price: sizeOpt.price,
                displayName: `${product.name} - ${sizeOpt.size}`,
                selectedSize: sizeOpt.size,
                variationKey: `${product._id}-${sizeOpt.size}`,
              });
            });
          } else {
            expanded.push({
              ...product,
              size: '',
              price: product.price || 0,
              displayName: product.name,
              variationKey: product._id,
            });
          }
        });
        setAllProducts(expanded);
      } else {
        setAllProducts([]);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load products. Please try again.', 'error');
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Build category tabs dynamically from what we actually have
  const categoriesInUse = ['all', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))];

  const displayed = activeCategory === 'all'
    ? allProducts
    : allProducts.filter(p => p.category === activeCategory);

  const handleAddToCart = async (product) => {
    if (!isInStock(product)) return;
    setAddingToCart(product.variationKey);
    setShowBeans(product.category === 'coffee-beans'); // beans animation only for coffee
    setTimeout(() => setShowBeans(false), 2000);
    try {
      await addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        size: product.selectedSize || product.size,
        images: product.images || [],
        category: product.category,
        roastLevel: product.roastLevel,
        origin: product.origin,
        flavorNotes: product.flavorNotes,
        badge: product.badge,
        sizes: product.sizes || [],
      }, 1, product.selectedSize || product.size);
      if (selectedProduct) setSelectedProduct(null);
    } catch (err) {
      console.error(err);
      showAlert('Failed to add to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <section id="coffee-shop" className="coffee-shop">
        <div className="container">
          <div className="loading-state">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="loading-icon-wrap">
              <FaShoppingBag style={{ fontSize: '3rem', color: 'var(--color-primary)' }} />
            </motion.div>
            <p>Loading our collection...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="coffee-shop" className="coffee-shop">
      <FloatingBeans isVisible={showBeans} />
      <div className="container">

        {/* Section header */}
        <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="section-title">Shop Our Collection</h2>
          <p className="section-subtitle">
            Discover our full range — from hand-roasted Kenyan beans to premium brewing gear and accessories.
          </p>
        </motion.div>

        {/* Category filter tabs */}
        {categoriesInUse.length > 2 && (
          <motion.div
            className="shop-category-tabs"
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1 }}>
            {categoriesInUse.map(cat => {
              const meta = cat === 'all' ? { icon: '🗂️', label: 'All Products', color: '#D4AF37' } : getCatMeta(cat);
              const count = cat === 'all' ? allProducts.length : allProducts.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  className={`shop-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                  style={activeCategory === cat ? { borderColor: meta.color, color: meta.color, background: `${meta.color}12` } : {}}
                  onClick={() => setActiveCategory(cat)}>
                  {meta.icon} {meta.label}
                  <span className="shop-cat-count">{count}</span>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Products grid */}
        {displayed.length === 0 ? (
          <div className="shop-empty">
            <span style={{ fontSize: '3rem' }}>📦</span>
            <p>No products in this category yet.</p>
          </div>
        ) : (
          <motion.div className="coffee-grid" layout>
            {displayed.map((product, index) => (
              <ProductCard
                key={product.variationKey}
                product={product}
                index={index}
                handleAddToCart={handleAddToCart}
                addingToCart={addingToCart}
                setSelectedProduct={setSelectedProduct}
              />
            ))}
          </motion.div>
        )}

        {/* Quick view modal */}
        <AnimatePresence>
          {selectedProduct && (
            <QuickViewModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={handleAddToCart}
              addingToCart={addingToCart}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default CoffeeShop;