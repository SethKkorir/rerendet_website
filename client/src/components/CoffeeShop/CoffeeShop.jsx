import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaEye, FaTimes, FaPlus, FaLeaf, FaShoppingBag } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import FlavorChart from '../Product/FlavorChart';
import FloatingBeans from '../UI/FloatingBeans';
import { isFreshlyRoasted } from '../../utils/productHelpers';
import './CoffeeShop.css';

const CoffeeShop = () => {
  const { addToCart, showAlert } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBeans, setShowBeans] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?category=coffee-beans&inStock=true');
        if (!response.ok) throw new Error('Failed to fetch products');
        const result = await response.json();

        if (result.success && result.data && Array.isArray(result.data.products)) {
          const allProducts = [];
          result.data.products.forEach(product => {
            if (product.sizes && product.sizes.length > 0) {
              product.sizes.forEach(sizeOption => {
                allProducts.push({
                  ...product,
                  _id: product._id,
                  size: sizeOption.size,
                  price: sizeOption.price,
                  displayName: `${product.name} - ${sizeOption.size}`,
                  selectedSize: sizeOption.size,
                  images: product.images || [],
                  variationKey: `${product._id}-${sizeOption.size.replace('g', '')}`
                });
              });
            } else {
              allProducts.push({
                ...product,
                size: '250g',
                price: product.price || 0,
                displayName: product.name,
                selectedSize: '250g',
                images: product.images || [],
                variationKey: product._id
              });
            }
          });
          setProducts(allProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        showAlert('Failed to load products. Please try again later.', 'error');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [showAlert]);

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0 && product.images[0].url) {
      return product.images[0].url;
    }
    if (product.image) return product.image;
    return `https://via.placeholder.com/600x600/6F4E37/ffffff?text=${encodeURIComponent(product.name)}`;
  };

  const isInStock = (product) => {
    if (product.inventory && product.inventory.stock !== undefined) {
      return product.inventory.stock > 0;
    }
    return product.inStock !== false;
  };

  const handleAddToCart = async (product) => {
    setAddingToCart(product.variationKey);
    setShowBeans(true);
    setTimeout(() => setShowBeans(false), 2000);
    try {
      const cartProduct = {
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
        sizes: product.sizes || []
      };
      await addToCart(cartProduct, 1, product.selectedSize || product.size);
      if (selectedProduct) setSelectedProduct(null);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showAlert('Failed to add product to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <section id="coffee-shop" className="coffee-shop">
        <div className="container">
          <div className="loading-state">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="loading-icon-wrap"
            >
              <FaShoppingBag style={{ fontSize: '3rem', color: 'var(--color-primary)' }} />
            </motion.div>
            <p>Curating our finest roasts...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="coffee-shop" className="coffee-shop">
      <FloatingBeans isVisible={showBeans} />
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Artisanal Coffee Collection</h2>
          <p className="section-subtitle">
            Experience the journey from bean to cup with our sustainably sourced,
            hand-roasted Kenyan specialties.
          </p>
        </motion.div>

        <motion.div
          className="coffee-grid"
          layout
        >
          {products.map((product, index) => {
            const productInStock = isInStock(product);
            const fresh = isFreshlyRoasted(product.roastDate);

            return (
              <motion.div
                key={product.variationKey}
                className="coffee-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                whileHover={{ y: -10 }}
              >
                <div className="coffee-image-container">
                  <Link to={`/product/${product.seo?.slug || product._id}`} className="image-link">
                    <img
                      src={getProductImage(product)}
                      alt={product.displayName || product.name}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/600x600/6F4E37/ffffff?text=${encodeURIComponent(product.name)}`;
                      }}
                    />
                  </Link>

                  <div className="card-overlay-actions">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="premium-view-btn"
                      onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                    >
                      <FaEye />
                    </motion.button>
                  </div>

                  {fresh && (
                    <div className="fresh-badge-glow">
                      <FaLeaf className="fresh-icon" /> FRESHLY ROASTED
                    </div>
                  )}
                  {product.badge && <div className="coffee-badge">{product.badge}</div>}
                  {!productInStock && <div className="out-of-stock-badge">Sold Out</div>}
                </div>

                <div className="coffee-info">
                  <div className="coffee-header">
                    <h3 className="coffee-title">{product.name}</h3>
                  </div>
                  <p className="coffee-origin">{product.origin} • {product.size}</p>

                  <div className="flavor-notes">
                    {product.flavorNotes?.slice(0, 3).map((note, idx) => (
                      <span key={idx} className="flavor-pill">{note}</span>
                    ))}
                  </div>

                  <div className="card-footer">
                    <div className="price-tag">
                      <span className="price-currency">KES</span>
                      <span className="price-amount">{product.price.toLocaleString()}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`quick-add-btn ${!productInStock || addingToCart === product.variationKey ? 'disabled' : ''}`}
                      onClick={() => handleAddToCart(product)}
                      disabled={!productInStock || addingToCart === product.variationKey}
                    >
                      {addingToCart === product.variationKey ? <div className="loader-mini" /> : <FaPlus />}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {selectedProduct && (
            <motion.div
              className="modal-overlay premium-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
            >
              <motion.div
                className="quick-view-modal premium-modal-content"
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="close-modal-btn" onClick={() => setSelectedProduct(null)}><FaTimes /></button>

                <div className="modal-content-grid">
                  <div className="modal-image">
                    <img src={getProductImage(selectedProduct)} alt={selectedProduct.name} />
                  </div>
                  <div className="modal-details">
                    <span className="modal-badge">{selectedProduct.roastLevel} Roast</span>
                    <h2>{selectedProduct.name}</h2>
                    <p className="modal-origin">{selectedProduct.origin} • {selectedProduct.selectedSize}</p>
                    <div className="modal-price">KES {selectedProduct.price.toLocaleString()}</div>
                    <p className="modal-desc">{selectedProduct.description}</p>

                    <div className="modal-flavors">
                      <strong>Flavor Notes:</strong>
                      <div className="flavor-notes" style={{ marginTop: '0.5rem' }}>
                        {selectedProduct.flavorNotes?.map((note, i) => (
                          <span key={i} className="flavor-pill">{note}</span>
                        ))}
                      </div>
                    </div>

                    {selectedProduct.flavorProfiles && (
                      <div className="modal-chart-wrap" style={{ margin: '1.5rem 0' }}>
                        <FlavorChart flavorProfiles={selectedProduct.flavorProfiles} />
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-premium"
                      onClick={() => handleAddToCart(selectedProduct)}
                      disabled={addingToCart === selectedProduct.variationKey}
                      style={{ width: '100%' }}
                    >
                      {addingToCart === selectedProduct.variationKey ? 'Adding to Brew...' : 'Add to Cart'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default CoffeeShop;