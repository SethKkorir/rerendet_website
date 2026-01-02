// components/Admin/ProductsManagement.jsx - COMPLETELY REWRITTEN WITH FIXES
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaBox, FaUpload, FaTimes } from 'react-icons/fa';
import './ProductsManagement.css';

const ProductsManagement = () => {
  const { showAlert, token } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    page: 1,
    limit: 10
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Bulk Actions Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProducts(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;

    try {
      setLoading(true);
      const authToken = getToken();

      // Execute deletions in parallel
      await Promise.all(selectedProducts.map(id =>
        fetch(`/api/admin/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ));

      showAlert(`Successfully deleted ${selectedProducts.length} products`, 'success');
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showAlert('Failed to delete some products', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get token
  const getToken = () => {
    if (token) return token;
    const auth = localStorage.getItem('auth');
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        return parsed.token;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = getToken();
      const queryParams = new URLSearchParams(filters).toString();

      const response = await fetch(`/api/admin/products?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (error) {
      console.error('Products fetch error:', error);
      showAlert('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const authToken = getToken();

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete product');

      const data = await response.json();

      if (data.success) {
        showAlert('Product deleted successfully', 'success');
        fetchProducts();
      }
    } catch (error) {
      console.error('Delete product error:', error);
      showAlert('Failed to delete product', 'error');
    }
  };

  const ProductRow = ({ product }) => (
    <tr className={`product-row ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={selectedProducts.includes(product._id)}
          onChange={() => handleSelectProduct(product._id)}
        />
      </td>
      <td>
        <div className="product-info">
          {product.images?.[0] && (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="product-image"
            />
          )}
          <div>
            <h4>{product.name}</h4>
            <p className="product-category">{product.category}</p>
            <p className="product-sizes">
              {product.sizes?.map(size => `${size.size}: KES ${size.price}`).join(' | ')}
            </p>
          </div>
        </div>
      </td>
      <td>
        {product.sizes?.[0] ? `KES ${product.sizes[0].price.toLocaleString()}` : 'N/A'}
      </td>
      <td>
        <span className={`stock-badge ${product.inventory?.stock <= 10 ? 'low' : 'good'}`}>
          {product.inventory?.stock || 0}
        </span>
      </td>
      <td>{product.category}</td>
      <td>
        <div className="product-actions">
          <button
            className="btn-icon"
            onClick={() => {
              setEditingProduct(product);
              setShowProductModal(true);
            }}
            title="Edit Product"
          >
            <FaEdit />
          </button>
          <button
            className="btn-icon danger"
            onClick={() => handleDeleteProduct(product._id)}
            title="Delete Product"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="products-management">
      <div className="page-header">
        <h1>Products Management</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
          >
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          <option value="coffee-beans">Coffee Beans</option>
          <option value="brewing-equipment">Brewing Equipment</option>
          <option value="accessories">Accessories</option>
          <option value="merchandise">Merchandise</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.length > 0 && (
        <div className="bulk-actions-bar" style={{
          background: '#eef2ff',
          padding: '10px 20px',
          marginBottom: '20px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #c7d2fe'
        }}>
          <span style={{ fontWeight: 500, color: '#4338ca' }}>
            {selectedProducts.length} products selected
          </span>
          <button
            onClick={handleBulkDelete}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaTrash /> Delete Selected
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={products.length > 0 && selectedProducts.length === products.length}
                  />
                </th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <ProductRow key={product._id} product={product} />
              ))}
            </tbody>
          </table>
        )}

        {!loading && products.length === 0 && (
          <div className="empty-state">
            <FaBox className="empty-icon" />
            <p>No products found</p>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
            >
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={fetchProducts}
        />
      )}
    </div>
  );
};

// Product Modal Component - COMPLETELY REWRITTEN WITH FIXED FORM SUBMISSION
const ProductModal = ({ product, onClose, onSave }) => {
  const { showAlert, token } = useContext(AppContext);

  // Helper to get token
  const getToken = () => {
    if (token) return token;
    const auth = localStorage.getItem('auth');
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        return parsed.token;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sizes: product?.sizes || [{ size: '250g', price: '' }],
    category: product?.category || 'coffee-beans',
    roastLevel: product?.roastLevel || 'medium',
    origin: product?.origin || '',
    flavorNotes: product?.flavorNotes?.join(', ') || '',
    badge: product?.badge || '',
    inventory: {
      stock: product?.inventory?.stock || 0,
      lowStockAlert: product?.inventory?.lowStockAlert || 5
    },
    tags: product?.tags?.join(', ') || '',
    isFeatured: product?.isFeatured || false
  });
  const [images, setImages] = useState(product?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Handle image selection (for new products)
  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // For new products, store files for later upload
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file: file
    }));

    setImages(prev => [...prev, ...newImages]);
    showAlert('Images selected for upload', 'info');
  };

  // Handle image deletion
  const removeImage = async (index) => {
    const imageToRemove = images[index];

    // If it's a new image (has file property), just remove from state
    if (imageToRemove.file) {
      setImages(prev => prev.filter((_, i) => i !== index));
      URL.revokeObjectURL(imageToRemove.url); // Clean up blob URL
      return;
    }

    // If it's an existing image, we need to delete it from the server
    if (product && imageToRemove.url) {
      if (!window.confirm('Are you sure you want to delete this image? This cannot be undone.')) {
        return;
      }

      try {
        const authToken = getToken();
        if (!authToken) {
          showAlert('Authentication required', 'error');
          return;
        }

        const response = await fetch(`/api/admin/products/${product._id}/images`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ imageUrl: imageToRemove.url })
        });

        if (response.ok) {
          setImages(prev => prev.filter((_, i) => i !== index));
          showAlert('Image deleted successfully', 'success');
        } else {
          try {
            const data = await response.json();
            showAlert(data.message || 'Failed to delete image', 'error');
          } catch (e) {
            showAlert('Failed to delete image', 'error');
          }
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        showAlert('Error deleting image', 'error');
      }
    }
  };

  // Add size option
  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { size: '250g', price: '' }]
    }));
  };

  // Remove size option
  const removeSize = (index) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  // Update size option - FIXED to handle number conversion properly
  const updateSize = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? {
          ...size,
          [field]: field === 'price' ? (value === '' ? '' : parseFloat(value) || 0) : value
        } : size
      )
    }));
  };

  // Fixed handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show confirmation dialog
    const action = product ? 'update' : 'create';
    const confirmMessage = product
      ? 'Are you sure you want to update this product?'
      : 'Are you sure you want to create this product?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Validate required fields
    if (!formData.name.trim() || !formData.description.trim() || !formData.sizes || formData.sizes.length === 0) {
      showAlert('Please fill in all required fields (name, description, and at least one size)', 'error');
      return;
    }

    // Validate sizes have valid prices
    const invalidSizes = formData.sizes.filter(size =>
      !size.size ||
      size.price === '' ||
      isNaN(parseFloat(size.price)) ||
      parseFloat(size.price) <= 0
    );

    if (invalidSizes.length > 0) {
      showAlert('Please ensure all sizes have valid prices greater than 0', 'error');
      return;
    }

    // Convert sizes to proper format with numbers
    const validatedSizes = formData.sizes.map(size => ({
      size: size.size,
      price: parseFloat(size.price)
    }));

    // Validate stock
    const stock = parseInt(formData.inventory.stock);
    if (isNaN(stock) || stock < 0) {
      showAlert('Please enter a valid stock quantity', 'error');
      return;
    }

    const lowStockAlert = parseInt(formData.inventory.lowStockAlert) || 5;

    setSaving(true);

    try {
      const authToken = getToken();

      if (!authToken) {
        showAlert('Authentication required. Please log in again.', 'error');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
        return;
      }

      const url = product
        ? `/api/admin/products/${product._id}`
        : '/api/admin/products';

      const method = product ? 'PUT' : 'POST';

      // Prepare the product data
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sizes: validatedSizes,
        category: formData.category,
        roastLevel: formData.category === 'coffee-beans' ? formData.roastLevel : undefined,
        origin: formData.origin.trim(),
        flavorNotes: formData.flavorNotes ?
          formData.flavorNotes.split(',').map(note => note.trim()).filter(note => note) : [],
        badge: formData.badge.trim(),
        inventory: {
          stock: stock,
          lowStockAlert: lowStockAlert
        },
        tags: formData.tags ?
          formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        isFeatured: formData.isFeatured
      };

      console.log('📦 Submitting product data:', productData);

      let response;

      // Identify new images to upload
      const filesToUpload = images.filter(img => img.file).map(img => img.file);

      if (filesToUpload.length > 0) {
        // Use FormData if there are files to upload
        const formDataToSend = new FormData();

        // Append all product data as JSON string for the 'data' field logic if your backend supports it,
        // OR simply append fields directly if your backend expects standard multipart structure.
        // Based on productController.js, createProduct expects req.body fields directly.
        // However, standard multer/express handling of FormData populates req.body with text fields automatically.
        // But arrays/objects need careful handling.

        // productController.js:
        // const { name, description... sizes... } = req.body;
        // sizes parsing: typeof sizes === 'string' ? JSON.parse(sizes) : sizes;

        // So we can append fields one by one.

        formDataToSend.append('name', productData.name);
        formDataToSend.append('description', productData.description);
        formDataToSend.append('category', productData.category);
        formDataToSend.append('origin', productData.origin);
        formDataToSend.append('badge', productData.badge);
        formDataToSend.append('isFeatured', productData.isFeatured);
        if (productData.roastLevel) formDataToSend.append('roastLevel', productData.roastLevel);

        // Complex fields -> JSON strings
        formDataToSend.append('sizes', JSON.stringify(productData.sizes));
        formDataToSend.append('inventory', JSON.stringify({
          stock: productData.inventory.stock,
          lowStockAlert: productData.inventory.lowStockAlert
        }));
        // Note on inventory: productController lines 176-179 (create) access inventory.stock directly.
        // Wait, line 177: parseInt(inventory?.stock). If inventory is a string (JSON), this might be NaN.
        // The controller actually does NOT seem to parse 'inventory' from JSON string in createProduct.
        // It does: `inventory: { stock: parseInt(inventory?.stock)... }`
        // If inventory is passed as "[object Object]" string from FormData, this fails.
        // Let's re-read createProduct carefully.

        // Line 131: const { inventory } = req.body.
        // In createProduct, it accesses `inventory?.stock`. 
        // If sending FormData, 'inventory' stringified will be a string. `inventory?.stock` on a string is undefined.
        // So createProduct controller might NOT support JSON string for inventory unless we change it.
        // OR we can send `inventory.stock` as separate fields? No, schema.

        // HOWEVER, updateProduct (lines 250-254) does:
        // if (inventory) { product.inventory = { stock: parseInt(inventory.stock)... } }
        // Again, if inventory comes as a JSON string, it won't have .stock property.

        // Fix: Use the same strategy as 'sizes' - send as string and let backend parse? 
        // But backend ONLY parses 'sizes', 'flavorNotes', 'tags'. NOT 'inventory'.

        // Workaround: Send individual inventory fields if possible? No.

        // Let's check `productController.js` lines 145 (sizes), 172 (flavorNotes), 181 (tags).
        // It DOES explicitly parse those. It does NOT explicitly parse 'inventory'.

        // This suggests the backend expects 'inventory' to be an object. 
        // When using FormData, you can simulate nesting using dot notation: 'inventory[stock]'
        // Express's body-parser (or multer if it handles text fields) *might* support extended syntax?
        // Standard express `app.use(express.urlencoded({ extended: true }))` supports `inventory[stock]`.
        // But `multer` populates `req.body`. 
        // Usually `multer` just puts the text values in req.body. 'inventory[stock]' key would be 'inventory[stock]'.

        // So, existing backend logic for create/update product might be buggy for FormData uploads if it expects nested objects.
        // BUT, notice lines 527-547 in the ORGINAL file I am replacing.
        // It was doing: `formDataToSend.append('data', JSON.stringify(productData));`
        // And sending 'data'.
        // Does the backend support 'data' field?
        // Looking at `productController.js`, line 122: `const { name ... } = req.body;`.
        // It extracts directly from `req.body`. It does NOT extract from `req.body.data`.
        // So the PREVIOUS implementation of "New product with images" (lines 527-547) seems like it would have FAILED to pass the text fields correctly! 
        // Because it was putting everything into a 'data' field which the controller ignores.

        // Wait, did I miss something in `productController.js`? 
        // Lines 121-134 extract fields from `req.body`.
        // If the client sent `data` field, `req.body` would have `data: "..."`. `req.body.name` would be undefined.
        // EXCEPT if there is middleware that parses `req.body.data`.

        // I checked routes/productRoutes.js. `import { upload } from '../middleware/uploadMiddleware.js';`
        // Maybe uploadMiddleware parses it?
        // Let's assume standard behavior for now. The previous code looks suspicious.
        // "New product with images - use FormData". 
        // If that actually worked, then there must be some middleware I haven't seen.
        // But if it didn't work, then I'm fixing a bug.

        // For Update (`updateProduct`), lines 207-219 extract from `req.body`.

        // Safe bet: Send fields individually.
        // For nested objects like `inventory`, since the backend doesn't parse JSON string for it,
        // maybe I shouldn't send it as `inventory` string.
        // But wait, `updateProduct` updates `inventory` if it exists.
        // If I assume I can't easily change backend just yet:
        // I will change backend to parse `inventory` string too. That is safer.
        // But first, let's construct the FormData properly here assuming backend CAN handle it (I will patch backend).

        formDataToSend.append('images', filesToUpload[0]); // Just to start loop correctly below
        // Actually, just loop:
        filesToUpload.forEach(file => {
          formDataToSend.append('images', file);
        });

        // Add other array fields
        if (productData.tags) formDataToSend.append('tags', JSON.stringify(productData.tags));
        if (productData.flavorNotes) formDataToSend.append('flavorNotes', JSON.stringify(productData.flavorNotes));

        // Inventory - sending as JSON string, will need to update backend to parse it
        formDataToSend.append('inventory', JSON.stringify(productData.inventory));

        response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${authToken}`,
            // Content-Type header let browser set it
          },
          body: formDataToSend
        });
      } else {
        // No new images - use JSON
        response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData)
        });
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }

        console.error('❌ Server error response:', errorData);
        console.error('Response status:', response.status);

        // If unauthorized, redirect to login
        if (response.status === 401) {
          showAlert('Your session has expired. Please log in again.', 'error');
          localStorage.removeItem('auth');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 2000);
          return;
        }

        const errorMessage = errorData.message || errorData.error || `Failed to ${action} product. Please try again.`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        showAlert(
          product ? 'Product updated successfully' : 'Product created successfully',
          'success'
        );
        onSave();
        onClose();
      } else {
        throw new Error(data.message || `Failed to ${action} product`);
      }
    } catch (error) {
      console.error('❌ Save product error:', error);
      showAlert(error.message || `Failed to ${action} product. Please try again.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                required
              >
                <option value="coffee-beans">Coffee Beans</option>
                <option value="brewing-equipment">Brewing Equipment</option>
                <option value="accessories">Accessories</option>
                <option value="merchandise">Merchandise</option>
              </select>
            </div>

            {/* Sizes and Prices - FIXED number handling */}
            <div className="form-group full-width">
              <label>Sizes and Prices *</label>
              {formData.sizes.map((size, index) => (
                <div key={index} className="size-row">
                  <select
                    value={size.size}
                    onChange={(e) => updateSize(index, 'size', e.target.value)}
                    required
                  >
                    <option value="250g">250g</option>
                    <option value="500g">500g</option>
                    <option value="1000g">1000g</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Price"
                    value={size.price}
                    onChange={(e) => updateSize(index, 'price', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                  {formData.sizes.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon danger sm"
                      onClick={() => removeSize(index)}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-outline sm" onClick={addSize}>
                + Add Size
              </button>
            </div>

            {/* Coffee-specific fields */}
            {formData.category === 'coffee-beans' && (
              <>
                <div className="form-group">
                  <label>Roast Level</label>
                  <select
                    value={formData.roastLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, roastLevel: e.target.value }))}
                  >
                    <option value="light">Light</option>
                    <option value="medium-light">Medium Light</option>
                    <option value="medium">Medium</option>
                    <option value="medium-dark">Medium Dark</option>
                    <option value="dark">Dark</option>
                    <option value="espresso">Espresso</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Origin</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                    placeholder="e.g., Kenya, Ethiopia"
                  />
                </div>
              </>
            )}

            {/* Flavor Notes */}
            <div className="form-group">
              <label>Flavor Notes</label>
              <input
                type="text"
                value={formData.flavorNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, flavorNotes: e.target.value }))}
                placeholder="e.g., Citrus, Caramel, Chocolate"
              />
            </div>

            {/* Badge */}
            <div className="form-group">
              <label>Badge</label>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="e.g., Morning Favorite, Best Seller"
              />
            </div>

            {/* Inventory */}
            <div className="form-group">
              <label>Stock Quantity *</label>
              <input
                type="number"
                value={formData.inventory.stock}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, stock: val === '' ? '' : parseInt(val) }
                  }));
                }}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Low Stock Alert</label>
              <input
                type="number"
                value={formData.inventory.lowStockAlert}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, lowStockAlert: val === '' ? '' : parseInt(val) }
                  }));
                }}
                min="0"
              />
            </div>

            {/* Description */}
            <div className="form-group full-width">
              <label>Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows="4"
                required
              />
            </div>

            {/* Image Upload - Always visible */}
            <div className="form-group full-width">
              <label>Product Images</label>
              <div className="image-upload-section">
                <div className="upload-area">
                  <FaUpload className="upload-icon" />
                  <p>Click to upload or drag and drop</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={uploading}
                  />
                </div>

                {/* Image Previews */}
                <div className="image-previews">
                  {images.map((image, index) => (
                    <div key={index} className="image-preview">
                      <img src={image.url} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="form-group full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                />
                Feature this product
              </label>
            </div>

            <div className="form-group full-width">
              <label>Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., premium, organic, single-origin"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (product ? 'Updating...' : 'Creating...') : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductsManagement;