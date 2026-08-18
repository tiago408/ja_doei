import { useState, useEffect } from 'react';
import type { ProductDocument } from '../types';
import { getProducts } from '../services/productService';
import './Feed.css';

export function Feed() {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="feed-container"><p>Carregando doações...</p></div>;
  }

  return (
    <div className="feed-container">
      <h2>Feed de Doações</h2>
      {products.length === 0 ? (
        <p className="empty-message">Nenhuma doação disponível no momento.</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              {product.imageURL && (
                <img 
                  src={product.imageURL} 
                  alt={product.name}
                  className="product-image"
                />
              )}
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="description">{product.description}</p>
                <div className="product-details">
                  <span className="category">{product.category}</span>
                  <span className="stock">
                    Disponível: {product.stock}
                  </span>
                </div>
                {product.price > 0 && (
                  <p className="price">R$ {product.price.toFixed(2)}</p>
                )}
                <button className="interest-btn">Tenho Interesse</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
