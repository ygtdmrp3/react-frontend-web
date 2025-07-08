import React, { useState, useEffect } from 'react';

function ProductDetail() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // URL'den ürün ID'sini al
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
      fetchProduct(productId);
    } else {
      setError('Ürün bulunamadı');
      setLoading(false);
    }
  }, []);

  const fetchProduct = async (productId) => {
    try {
      const response = await fetch(`${apiUrl}/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Ürün bulunamadı');
      }
      const data = await response.json();
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Stok kontrolü
    if (product.stock <= 0) {
      alert('Bu ürün stokta kalmamıştır.');
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setShowSizeModal(true);
      return;
    }

    const productToAdd = {
      ...product,
      selectedSize: selectedSize || null,
      qty: quantity
    };

    setCart(prev => {
      const existing = prev.find(item => 
        item._id === product._id && item.selectedSize === productToAdd.selectedSize
      );
      
      let updated;
      if (existing) {
        // Stok limiti kontrolü
        if (existing.qty + quantity > product.stock) {
          alert(`Bu üründen maksimum ${product.stock} adet alabilirsiniz.`);
          return prev;
        }
        updated = prev.map(item => 
          item._id === product._id && item.selectedSize === productToAdd.selectedSize 
            ? { ...item, qty: item.qty + quantity } 
            : item
        );
      } else {
        updated = [...prev, productToAdd];
      }
      
      localStorage.setItem('cart', JSON.stringify(updated));
      return updated;
    });

    alert('Ürün sepete eklendi!');
    setSelectedSize('');
    setQuantity(1);
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setShowSizeModal(false);
    handleAddToCart();
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#333', marginBottom: 16 }}>Yükleniyor...</div>
          <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#d32f2f', marginBottom: 16 }}>Hata</div>
          <div style={{ fontSize: 16, color: '#666' }}>{error || 'Ürün bulunamadı'}</div>
          <button 
            onClick={() => window.close()} 
            style={{
              marginTop: 20,
              padding: '12px 24px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sayfayı Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, width: 40, objectFit: 'contain' }} />
          <span style={{ fontWeight: 'bold', fontSize: 24, color: '#222' }}>SER BUTİK</span>
        </div>
        <button 
          onClick={() => window.close()} 
          style={{
            padding: '8px 16px',
            background: '#f8f9fa',
            color: '#666',
            border: '1px solid #dee2e6',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ✕ Kapat
        </button>
      </div>

      {/* Ürün Detayı */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
          {/* Sol: Ürün Görseli */}
          <div>
            <div style={{
              width: '100%',
              aspectRatio: '4/5',
              background: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={product.images && product.images[0]} 
                alt={product.name} 
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  background: '#fff'
                }} 
              />
            </div>
          </div>

          {/* Sağ: Ürün Bilgileri */}
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#1a1a1a',
              marginBottom: 16,
              lineHeight: 1.2
            }}>
              {product.name}
            </h1>

            <div style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#007bff',
              marginBottom: 24
            }}>
              {product.price} ₺
            </div>

            <div style={{
              fontSize: 16,
              color: '#666',
              lineHeight: 1.6,
              marginBottom: 24
            }}>
              {product.description}
            </div>

            {/* Stok Durumu */}
            <div style={{
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 24,
              background: product.stock <= 0 ? '#ffeaea' : product.stock <= 5 ? '#fff3e0' : '#e8f5e9',
              border: `2px solid ${product.stock <= 0 ? '#f5c2c7' : product.stock <= 5 ? '#ffcc80' : '#c8e6c9'}`,
              color: product.stock <= 0 ? '#d32f2f' : product.stock <= 5 ? '#f57c00' : '#2e7d32',
              fontWeight: 600
            }}>
              {product.stock <= 0 ? '❌ Stok Tükendi' : 
               product.stock <= 5 ? `⚠️ Son ${product.stock} adet` : 
               `✅ Stokta ${product.stock} adet`}
            </div>

            {/* Ürün Özellikleri */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#333' }}>Ürün Özellikleri</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {product.color && <div><strong>Renk:</strong> {product.color}</div>}
                {product.productType && <div><strong>Ürün Tipi:</strong> {product.productType}</div>}
                {product.cutType && <div><strong>Kesim:</strong> {product.cutType}</div>}
                {product.productionPlace && <div><strong>Üretim Yeri:</strong> {product.productionPlace}</div>}
                {product.material && <div><strong>Materyal:</strong> {product.material}</div>}
                {product.modelHeight && <div><strong>Model Boyu:</strong> {product.modelHeight}</div>}
                {product.modelSize && <div><strong>Model Bedeni:</strong> {product.modelSize}</div>}
                {product.sizes && product.sizes.length > 0 && <div><strong>Mevcut Bedenler:</strong> {product.sizes.join(', ')}</div>}
                {product.pattern && <div><strong>Desen:</strong> {product.pattern}</div>}
                {product.sustainability && <div><strong>Sürdürülebilirlik:</strong> {product.sustainability}</div>}
                {product.sleeveType && <div><strong>Kol Tipi:</strong> {product.sleeveType}</div>}
                {product.collarType && <div><strong>Yaka Tipi:</strong> {product.collarType}</div>}
                {product.legLength && <div><strong>Paça Boyu:</strong> {product.legLength}</div>}
              </div>
            </div>

            {/* Satın Alma Bölümü */}
            {product.stock > 0 && (
              <div>
                {/* Miktar Seçimi */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                    Miktar:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{
                        width: 40,
                        height: 40,
                        background: '#f8f9fa',
                        border: '2px solid #dee2e6',
                        borderRadius: 8,
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
                      {quantity}
                    </span>
                    <button 
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      style={{
                        width: 40,
                        height: 40,
                        background: '#f8f9fa',
                        border: '2px solid #dee2e6',
                        borderRadius: 8,
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: 14, color: '#666' }}>
                      (Maksimum: {product.stock})
                    </span>
                  </div>
                </div>

                {/* Sepete Ekle Butonu */}
                <button 
                  onClick={handleAddToCart}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,123,255,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => e.target.style.background = '#0056b3'}
                  onMouseOut={e => e.target.style.background = '#007bff'}
                >
                  🛒 Sepete Ekle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Beden Seçim Modalı */}
      {showSizeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Beden Seçin</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  style={{
                    padding: '12px 20px',
                    background: '#f8f9fa',
                    border: '2px solid #dee2e6',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => {
                    e.target.style.background = '#007bff';
                    e.target.style.color = '#fff';
                    e.target.style.borderColor = '#007bff';
                  }}
                  onMouseOut={e => {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.color = '#333';
                    e.target.style.borderColor = '#dee2e6';
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSizeModal(false)}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* CSS Animasyonları */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ProductDetail; 