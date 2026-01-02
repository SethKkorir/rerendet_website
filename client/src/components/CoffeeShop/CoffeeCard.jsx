import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

function CoffeeCard({ product, onAddToCart }) {
  const { formatPrice } = useContext(AppContext);

  return (
    <div className="coffee-card">
      <div className="coffee-image">
        <img
          src={product.images?.[0]?.url || `https://via.placeholder.com/300x300?text=${product.name}`}
          alt={product.name}
        />
        {product.badge && <div className="coffee-badge">{product.badge}</div>}
      </div>
      <div className="coffee-info">
        <h3 className="coffee-title">{product.name}</h3>
        <p className="coffee-description">{product.description}</p>
        <div className="coffee-meta">
          <span className="coffee-size">250g</span>
          <span className="coffee-price">{formatPrice(product.price)}</span>
        </div>
        <button
          className="btn primary add-to-cart"
          onClick={() => onAddToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default CoffeeCard;