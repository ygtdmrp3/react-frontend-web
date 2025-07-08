import React, { useState, useEffect, useMemo, useCallback } from 'react';
import io from 'socket.io-client';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Helper function to split sizes
function splitSizesByType(sizes) {
  const letterSizes = [];
  const numberSizes = [];
  (sizes || []).forEach(size => {
    if (/^[0-9]+$/.test(size.trim())) {
      numberSizes.push(size.trim());
    } else if (size.trim()) {
      letterSizes.push(size.trim());
    }
  });
  return { letterSizes, numberSizes };
}

function optimizeCloudinaryUrl(url) {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    // Zaten optimize ise tekrar ekleme
    if (url.includes('/upload/w_400,h_500,c_fill,q_auto,f_auto/')) return url;
    return url.replace('/upload/', '/upload/w_400,h_500,c_fill,q_auto,f_auto/');
  }
  return url;
}

// En üste ekle:
const headerResponsiveStyle = `
@media (max-width: 600px) {
  .header-bar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    padding: 8px 4px !important;
  }
  .header-bar button, .header-bar a, .header-bar .profile-menu-parent {
    font-size: 15px !important;
    padding: 8px 8px !important;
    min-width: 0 !important;
    width: 100% !important;
    margin: 0 !important;
  }
  .header-bar .profile-menu-parent {
    width: 100% !important;
  }
}

/* Ürün kartları için responsive tasarım */
@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: repeat(1, 1fr) !important;
    gap: 16px !important;
  }
  .product-card {
    min-height: 380px !important;
    padding: 16px !important;
  }
  .product-image-container {
    width: 160px !important;
    height: 200px !important;
    min-width: 160px !important;
    min-height: 200px !important;
    max-width: 160px !important;
    max-height: 200px !important;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 20px !important;
  }
  .product-card {
    min-height: 420px !important;
  }
  .product-image-container {
    width: 180px !important;
    height: 220px !important;
    min-width: 180px !important;
    min-height: 220px !important;
    max-width: 180px !important;
    max-height: 220px !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 24px !important;
  }
}

@media (min-width: 1025px) {
  .product-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
    gap: 32px !important;
  }
}
`;

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwChangeMsg, setPwChangeMsg] = useState('');
  const [pwChangeError, setPwChangeError] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [productCategory, setProductCategory] = useState('');
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [productAddMsg, setProductAddMsg] = useState('');
  const [productAddError, setProductAddError] = useState('');
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminProductsLoading, setAdminProductsLoading] = useState(false);
  const [adminProductsError, setAdminProductsError] = useState('');
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [showOrders, setShowOrders] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editMsg, setEditMsg] = useState('');
  const [editError, setEditError] = useState('');
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageError, setEditImageError] = useState('');
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminOrders, setShowAdminOrders] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);
  const [allOrdersError, setAllOrdersError] = useState('');
  const [userProducts, setUserProducts] = useState([]);
  const [userProductsLoading, setUserProductsLoading] = useState(false);
  const [userProductsError, setUserProductsError] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    surname: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    zip: ''
  });
  const [stockWarning, setStockWarning] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [activeSupport, setActiveSupport] = useState(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [showSupportListModal, setShowSupportListModal] = useState(false);
  // Admin destek talepleri için state'ler
  const [adminSupportTickets, setAdminSupportTickets] = useState([]);
  const [showAdminSupportModal, setShowAdminSupportModal] = useState(false);
  const [activeAdminSupport, setActiveAdminSupport] = useState(null);
  const [adminSupportMessage, setAdminSupportMessage] = useState('');
  const [adminSupportLoading, setAdminSupportLoading] = useState(false);
  const [adminSupportError, setAdminSupportError] = useState('');
  const [showAdminSupportListModal, setShowAdminSupportListModal] = useState(false);
  
  // Sipariş yönetimi modalı için state
  const [showOrderManagementModal, setShowOrderManagementModal] = useState(false);
  
  // Admin siparişleri için state'ler
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [adminOrdersError, setAdminOrdersError] = useState('');
  
  // Kategori sistemi için state'ler
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editCategoryMode, setEditCategoryMode] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Ürün kartları için resim navigasyonu state'leri
  const [productCardImageIndexes, setProductCardImageIndexes] = useState({});

  // --- useMemo ile türetilenler ---
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return userProducts;
    }
    return userProducts.filter(product => String(product.category) === String(selectedCategory));
  }, [userProducts, selectedCategory]);

  const filteredAdminProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return adminProducts;
    }
    return adminProducts.filter(product => String(product.category) === String(selectedCategory));
  }, [adminProducts, selectedCategory]);

  const activeProducts = useMemo(() => {
    return user && user.role === 'admin' ? filteredAdminProducts : filteredProducts;
  }, [user, filteredAdminProducts, filteredProducts]);

  const categoryProductCounts = useMemo(() => {
    const counts = {};
    userProducts.forEach(product => {
      const categoryId = String(product.category);
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });
    return counts;
  }, [userProducts]);

  // Socket.io bağlantısı
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const socket = io(apiUrl);
    
    socket.on('productsUpdated', () => {
      fetchProducts();
      fetchAdminProducts();
    });
    
    socket.on('supportMessageUpdated', (updatedTicket) => {
      // Kullanıcı destek talepleri güncelle
      setSupportTickets(prev =>
        prev.map(ticket =>
          ticket._id === updatedTicket._id ? updatedTicket : ticket
        )
      );
      
      // Admin destek talepleri güncelle
      setAdminSupportTickets(prev =>
        prev.map(ticket =>
          ticket._id === updatedTicket._id ? updatedTicket : ticket
        )
      );
      
      // Aktif destek talebi güncelle
      if (activeSupport && activeSupport._id === updatedTicket._id) {
        const currentMessageCount = activeSupport.messages?.length || 0;
        const newMessageCount = updatedTicket.messages?.length || 0;
        
        if (newMessageCount > currentMessageCount) {
          setActiveSupport(updatedTicket);
          
          // Otomatik scroll
          setTimeout(() => {
            const chatContainer = document.querySelector('.support-chat-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);
        }
      }
      
      // Aktif admin destek talebi güncelle
      if (activeAdminSupport && activeAdminSupport._id === updatedTicket._id) {
        const currentMessageCount = activeAdminSupport.messages?.length || 0;
        const newMessageCount = updatedTicket.messages?.length || 0;
        
        if (newMessageCount > currentMessageCount) {
          setActiveAdminSupport(updatedTicket);
          
          // Otomatik scroll
          setTimeout(() => {
            const chatContainer = document.querySelector('.admin-support-chat-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);
        }
      }
    });
    
    // Sipariş durumu güncelleme dinleyicisi
    socket.on('orderStatusUpdated', (updatedOrder) => {
      // Kullanıcı siparişleri güncelle
      setOrders(prev =>
        prev.map(order =>
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );
      
      // Admin siparişleri güncelle
      setAdminOrders(prev =>
        prev.map(order =>
          order._id === updatedOrder._id ? updatedOrder : order
        )
      );
    });
    
    return () => socket.disconnect();
  }, [user, activeSupport, activeAdminSupport]);

  // Oturum bilgisini localStorage'dan yükle
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    fetchUserProducts();
    fetchCategories(); // Kategorileri yükle
  }, []);

  // Kullanıcı ürünleri çek
  const fetchProducts = async () => {
    setUserProductsLoading(true);
    setUserProductsError('');
    try {
      const res = await fetch(`${apiUrl}/api/products`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserProducts(data);
      } else {
        setUserProductsError('Ürünler alınamadı.');
      }
    } catch {
      setUserProductsError('Ürünler alınamadı.');
    }
    setUserProductsLoading(false);
  };

  // Admin ürünleri çek
  const fetchAdminProducts = async () => {
    if (user && user.role === 'admin') {
      setAdminProductsLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/products`);
        const data = await res.json();
        setAdminProducts(data);
        setAdminProductsLoading(false);
      } catch (err) {
        setAdminProductsError('Ürünler alınamadı.');
        setAdminProductsLoading(false);
      }
    }
  };

  // Admin ürünleri çek (useEffect ile)
  useEffect(() => {
    fetchAdminProducts();
  }, [user, productAddMsg, showProductModal, editMsg]);

  // Admin destek taleplerini çek (useEffect ile)
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchAdminSupportTickets();
      fetchAdminOrders(); // Admin siparişlerini de çek
    }
  }, [user]);

  // Mesajlar değiştiğinde scroll'u aşağı indir
  useEffect(() => {
    if (activeSupport?.messages) {
      setTimeout(() => {
        const chatContainer = document.querySelector('.support-chat-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }, [activeSupport?.messages]);

  useEffect(() => {
    if (activeAdminSupport?.messages) {
      setTimeout(() => {
        const chatContainer = document.querySelector('.admin-support-chat-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  }, [activeAdminSupport?.messages]);

  // Kullanıcı ürünleri çek
  useEffect(() => {
    fetchUserProducts();
  }, []);

  // Kullanıcı siparişlerini çek
  useEffect(() => {
    if (user && user.email) {
      fetchOrders(user.email);
    }
  }, [user]);

  // Resim lazy loading için intersection observer - Kaldırıldı

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClick = (e) => {
      if (!e.target.closest('.profile-menu-parent')) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileMenu]);

  // Sepete ürün ekle (stok kontrolü ile)
  const handleAddToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id && item.selectedSize === product.selectedSize);
      let updated;
      if (existing) {
        // Toplam miktar stoktan fazla olamaz
        if (existing.qty + 1 > product.stock) {
          setStockWarning(`Bu üründen maksimum ${product.stock} adet alabilirsiniz.`);
          setTimeout(() => setStockWarning(''), 3000);
          return prev;
        }
        updated = prev.map(item =>
          item._id === product._id && item.selectedSize === product.selectedSize
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      } else {
        // Eğer stok 0 ise eklenemez
        if (product.stock < 1) {
          setStockWarning('Bu ürün stokta kalmamıştır.');
          setTimeout(() => setStockWarning(''), 3000);
          return prev;
        }
        updated = [...prev, { ...product, qty: 1 }];
      }
      localStorage.setItem('cart', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Sepetten ürün çıkar
  const handleRemoveFromCart = useCallback((id) => {
    setCart(prev => {
      const updated = prev.filter(item => `${item._id}-${item.selectedSize || 'no-size'}` !== id);
      localStorage.setItem('cart', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Sepeti boşalt
  const handleClearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem('cart');
  }, []);

  // Sepet toplamı
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  // Sepet ürün adedi
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  // Kullanıcı siparişlerini getir
  const fetchOrders = async (email) => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await fetch(`${apiUrl}/api/my-orders?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrdersError('Siparişler alınamadı.');
      }
    } catch {
      setOrdersError('Siparişler alınamadı.');
    }
    setOrdersLoading(false);
  };

  // Admin için tüm siparişleri getir
  const fetchAllOrders = async () => {
    setAllOrdersLoading(true);
    setAllOrdersError('');
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllOrders(data);
        setAdminOrders(data); // Admin siparişleri de güncelle
      } else {
        setAllOrdersError('Siparişler alınamadı.');
      }
    } catch {
      setAllOrdersError('Siparişler alınamadı.');
    }
    setAllOrdersLoading(false);
  };

  // Admin siparişleri için ayrı fetch fonksiyonu
  const fetchAdminOrders = async () => {
    setAdminOrdersLoading(true);
    setAdminOrdersError('');
    try {
      const res = await fetch(`${apiUrl}/api/orders`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAdminOrders(data);
      } else {
        setAdminOrdersError('Siparişler alınamadı.');
      }
    } catch {
      setAdminOrdersError('Siparişler alınamadı.');
    }
    setAdminOrdersLoading(false);
  };

  // Kullanıcılar için ürünleri getir
  const fetchUserProducts = async () => {
    setUserProductsLoading(true);
    setUserProductsError('');
    try {
      const res = await fetch(`${apiUrl}/api/products`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserProducts(data);
      } else {
        setUserProductsError('Ürünler alınamadı.');
      }
    } catch {
      setUserProductsError('Ürünler alınamadı.');
    }
    setUserProductsLoading(false);
  };

  // Demo satın al
  const handleDemoPurchase = async () => {
    if (!user) {
      alert('Satın alma için giriş yapmalısınız.');
      return;
    }
    if (cart.length === 0) return;
    
    // Adres formunu göster
    setAddressForm({
      name: user.username || '',
      surname: '',
      phone: '',
      address: '',
      city: '',
      district: '',
      zip: ''
    });
    setShowAddressForm(true);
  };

  // Adres formu ile sipariş oluştur
  const handleCreateOrderWithAddress = async () => {
    if (!addressForm.name || !addressForm.phone || !addressForm.address || !addressForm.city) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    
    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, email: user.email, address: addressForm })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Sipariş oluşturulamadı.');
        return;
      }
      setCart([]);
      localStorage.removeItem('cart');
      setShowCart(false);
      setShowAddressForm(false);
      fetchOrders(user.email);
      setShowOrders(true);
    } catch {
      alert('Sipariş oluşturulamadı.');
    }
  };

  // Ürün güncelleme
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setEditMsg('');
    setEditError('');
    if (!editProduct.name || !editProduct.price || !editProduct.stock || !editProduct.description) {
      setEditError('Zorunlu alanlar boş bırakılamaz.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/products/${editProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProduct)
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Güncellenemedi.');
        return;
      }
      setEditMsg('Ürün başarıyla güncellendi!');
      setEditProduct(null);
      setEditMode(false);
      setTimeout(() => setEditMsg(''), 2000);
    } catch (err) {
      setEditError('Sunucu hatası.');
    }
  };

  // Ürün silme
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`${apiUrl}/api/products/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert('Ürün silinemedi.');
        return;
      }
      alert('Ürün başarıyla silindi!');
      // Ürün listesini yenile
      fetchAdminProducts();
    } catch (err) {
      alert('Sunucu hatası.');
    }
  };

  // Ürün detayını yeni sekmede aç
  const handleProductClick = (product) => {
    // Yeni sekmede ürün detay sayfası aç
    const productUrl = `/product-detail.html?id=${product._id}`;
    window.open(productUrl, '_blank');
  };



  // Ürün düzenleme modalını aç
  const openEditModal = (product) => {
    console.log('Modal açılıyor - Ürün:', product);
    setEditProduct({ ...product });
    setShowEditModal(true);
    console.log('Modal açıldı - editProduct state:', { ...product });
  };

  // Ürün düzenleme modalını kapat
  const closeEditModal = () => {
    setEditProduct(null);
    setShowEditModal(false);
    setEditMsg('');
    setEditError('');
    setEditImageError('');
  };

  // Düzenleme modalı için resim yükleme
  const handleEditImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setEditImageUploading(true);
    setEditImageError('');
    
    const uploadedUrls = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setEditImageError('Resim boyutu 5MB\'dan küçük olmalıdır.');
        setEditImageUploading(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      
      try {
        const response = await fetch('https://api.cloudinary.com/v1_1/ddkc67grz/image/upload', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        } else {
          throw new Error('Resim yüklenemedi - URL alınamadı');
        }
      } catch (error) {
        setEditImageError('Resim yüklenirken hata oluştu. Lütfen tekrar deneyin.');
        setEditImageUploading(false);
        return;
      }
    }
    
    // Mevcut resimlere yeni resimleri ekle
    const currentImages = editProduct.images || [];
    setEditProduct({
      ...editProduct,
      images: [...currentImages, ...uploadedUrls]
    });
    
    setEditImageError('');
    setEditImageUploading(false);
    e.target.value = ''; // Input'u temizle
  };

  // Düzenleme modalından resim silme
  const handleRemoveEditImage = (indexToRemove) => {
    const updatedImages = editProduct.images.filter((_, index) => index !== indexToRemove);
    setEditProduct({
      ...editProduct,
      images: updatedImages
    });
  };

  // Ürün düzenleme modalından güncelleme
  const handleUpdateProductModal = async (e) => {
    e.preventDefault();
    setEditMsg('');
    setEditError('');
    
    console.log('Düzenleme başlatıldı - editProduct:', editProduct);
    
    if (!editProduct.name || !editProduct.price || !editProduct.stock || !editProduct.description) {
      setEditError('Zorunlu alanlar boş bırakılamaz.');
      return;
    }
    
    // Bedenleri string'den array'e çevir
    let processedProduct = { ...editProduct };
    if (typeof processedProduct.sizes === 'string') {
      processedProduct.sizes = processedProduct.sizes
        .split(',')
        .map(size => size.trim())
        .filter(size => size.length > 0);
    }
    
    console.log('İşlenmiş ürün verisi:', processedProduct);
    console.log('Gönderilecek URL:', `${apiUrl}/api/products/${editProduct._id}`);
    
    try {
      const res = await fetch(`${apiUrl}/api/products/${editProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedProduct)
      });
      
      console.log('Backend yanıtı - Status:', res.status);
      const data = await res.json();
      console.log('Backend yanıtı - Data:', data);
      
      if (!res.ok) {
        console.error('Backend hatası:', data);
        setEditError(data.error || data.message || 'Güncellenemedi.');
        return;
      }
      
      console.log('Güncelleme başarılı!');
      setEditMsg('Ürün başarıyla güncellendi!');
      
      // State'i doğrudan güncelle
      setAdminProducts(prevProducts => 
        prevProducts.map(p => p._id === editProduct._id ? data : p)
      );
      
      closeEditModal();
      
      // Sayfayı zorla yenile
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setTimeout(() => setEditMsg(''), 2000);
    } catch (err) {
      console.error('Frontend hatası:', err);
      setEditError('Sunucu hatası: ' + err.message);
    }
  };

  // Beden seçimi ile sepete ekle
  const handleAddToCartWithSize = (product) => {
    // Stok kontrolü
    if (product.stock <= 0) {
      setStockWarning('Bu ürün stokta kalmamıştır.');
      setTimeout(() => setStockWarning(''), 3000);
      return;
    }

    // Beden kontrolü - eğer ürünün bedenleri varsa beden seçimi zorunlu
    if (product.sizes && product.sizes.length > 0) {
      setSizeOptions(product.sizes);
      setPendingProduct(product);
      setShowSizeModal(true);
    } else {
      handleAddToCart(product);
    }
  };

  // Beden seçimini onayla
  const handleConfirmSize = () => {
    if (!selectedSize) {
      setStockWarning('Lütfen bir beden seçiniz.');
      setTimeout(() => setStockWarning(''), 3000);
      return;
    }
    handleAddToCart({ ...pendingProduct, selectedSize });
    setShowSizeModal(false);
    setPendingProduct(null);
    setSelectedSize('');
  };

  // Giriş işlemi
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Giriş başarısız');
        return;
      }
      // Başarılı giriş
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Kullanıcı bilgisi/token localStorage'a kaydedildi
    } catch (err) {
      setLoginError('Sunucu hatası');
    }
  };

  // Kayıt işlemi
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, username: registerUsername, password: registerPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'Kayıt başarısız');
        return;
      }
      // Başarılı kayıt
      setRegisterSuccess('Kayıt başarılı! Giriş yapabilirsiniz.');
      setTimeout(() => {
        setShowRegister(false);
        setShowLogin(true);
        setRegisterEmail('');
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterError('');
        setRegisterSuccess('');
      }, 1200);
    } catch (err) {
      setRegisterError('Sunucu hatası');
    }
  };

  // Çıkış işlemi
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Şifre değiştirme işlemi
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwChangeMsg('');
    setPwChangeError('');
    if (!oldPassword || !newPassword || !newPassword2) {
      setPwChangeError('Tüm alanlar zorunlu.');
      return;
    }
    if (newPassword !== newPassword2) {
      setPwChangeError('Yeni şifreler eşleşmiyor.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwChangeError(data.error || 'Şifre değiştirilemedi.');
        return;
      }
      setPwChangeMsg('Şifre başarıyla değiştirildi!');
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (err) {
      setPwChangeError('Sunucu hatası.');
    }
  };

  // Cloudinary upload - Çoklu resim desteği
  const cloudinaryCloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'ddkc67grz';
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    setProductImageUploading(true);
    setProductAddError('');
    
    const uploadedUrls = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        console.log('Cloudinary response:', data);
        
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        } else {
          console.error('Cloudinary error:', data);
          setProductAddError(`Görsel yüklenemedi: ${data.error?.message || 'Bilinmeyen hata'}`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setProductAddError(`Görsel yüklenemedi: ${err.message}`);
      }
    }
    
    if (uploadedUrls.length > 0) {
      setProductImages(prev => [...prev, ...uploadedUrls]);
    }
    
    setProductImageUploading(false);
    e.target.value = ''; // Input'u temizle
  };

  // Ürün kartı resim navigasyonu - Optimize edilmiş
  const handleProductCardImageChange = useCallback((productId, direction) => {
    setProductCardImageIndexes(prev => {
      const currentIndex = prev[productId] || 0;
      const product = activeProducts.find(p => p._id === productId);
      const maxIndex = (product?.images?.length || 1) - 1;
      
      if (maxIndex <= 0) return prev; // Tek resim varsa değiştirme
      
      let newIndex;
      if (direction === 'next') {
        newIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      }
      
      // Sadece değişiklik varsa güncelle
      if (newIndex === currentIndex) return prev;
      
      return { ...prev, [productId]: newIndex };
    });
  }, [activeProducts]);

  // Keyboard navigasyonu - Optimize edilmiş
  useEffect(() => {
    let timeoutId;
    
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        
        // Throttle: Çok hızlı tuş basımlarını engelle
        if (timeoutId) return;
        
        timeoutId = setTimeout(() => {
          const activeCard = document.querySelector('.product-card:hover');
          if (activeCard) {
            const productId = activeCard.getAttribute('data-product-id');
            if (productId) {
              handleProductCardImageChange(productId, e.key === 'ArrowLeft' ? 'prev' : 'next');
            }
          }
          timeoutId = null;
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleProductCardImageChange]);

  // Ürün ekleme - Çoklu resim desteği
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productName.trim() || !productPrice.trim() || !productStock.trim() || !productDesc.trim()) {
      setProductAddError('Tüm alanlar gereklidir');
      return;
    }

    if (productImages.length === 0) {
      setProductAddError('En az bir resim gereklidir');
      return;
    }

    setProductAddError('');
    setProductAddMsg('Ürün ekleniyor...');

    try {
      const response = await fetch(`${apiUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName.trim(),
          price: parseFloat(productPrice),
          stock: parseInt(productStock),
          description: productDesc.trim(),
          images: productImages,
          category: productCategory || null
        })
      });

      if (response.ok) {
        setProductAddMsg('Ürün başarıyla eklendi!');
        setProductName('');
        setProductPrice('');
        setProductStock('');
        setProductDesc('');
        setProductImages([]);
        setProductCategory('');
        fetchUserProducts();
        setTimeout(() => setProductAddMsg(''), 3000);
      } else {
        const error = await response.json();
        setProductAddError(error.message || 'Ürün eklenirken hata oluştu');
      }
    } catch (error) {
      setProductAddError('Bağlantı hatası');
    }
  };

  // Kullanıcıya ait destek taleplerini getir
  const fetchSupportTickets = async () => {
    if (!user) return;
    setSupportLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/support?userEmail=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSupportTickets(data);
      }
    } catch {
      // ignore
    }
    setSupportLoading(false);
  };

  // Admin için tüm destek taleplerini getir
  const fetchAdminSupportTickets = async () => {
    if (!user || user.role !== 'admin') return;
    setAdminSupportLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/support`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAdminSupportTickets(data);
      }
    } catch {
      // ignore
    }
    setAdminSupportLoading(false);
  };

  // Destek talebi başlat veya mevcut talebi aç
  const handleOpenSupport = (orderId) => {
    // Mevcut destek talebi var mı?
    const ticket = supportTickets.find(t => t.orderId === orderId);
    if (ticket) {
      setActiveSupport(ticket);
      setShowSupportModal(true);
    } else {
      // Yeni destek talebi başlat
      setActiveSupport({ orderId, messages: [], status: 'Açık', chatOpen: true });
      setShowSupportModal(true);
    }
  };

  // Destek talebi mesaj gönder
  const handleSendSupportMessage = async () => {
    if (!supportMessage.trim() || !activeSupport) return;
    setSupportLoading(true);
    
    const messageToSend = supportMessage.trim();
    setSupportMessage(''); // Mesajı hemen temizle
    
    try {
      if (activeSupport._id) {
        // Mevcut talebe mesaj ekle - önce UI'da göster
        const newMessage = { sender: 'user', message: messageToSend, date: new Date() };
        const updatedTicket = {
          ...activeSupport,
          messages: [...(activeSupport.messages || []), newMessage],
          status: 'Açık'
        };
        setActiveSupport(updatedTicket);
        
        // Scroll'u aşağı indir
        setTimeout(() => {
          const chatContainer = document.querySelector('.support-chat-container');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
        
        // Sonra backend'e gönder
        const res = await fetch(`${apiUrl}/api/support/${activeSupport._id}/user-reply`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userReply: messageToSend })
        });
        
        if (!res.ok) {
          setSupportError('Mesaj gönderilemedi.');
          // Hata durumunda mesajı geri al
          setActiveSupport(activeSupport);
        } else {
          setSupportError('');
        }
      } else {
        // Yeni destek talebi oluştur - önce UI'da göster
        const newMessage = { sender: 'user', message: messageToSend, date: new Date() };
        const newTicket = {
          _id: 'temp-' + Date.now(),
          orderId: activeSupport.orderId,
          userEmail: user.email,
          messages: [newMessage],
          status: 'Açık',
          chatOpen: true,
          createdAt: new Date()
        };
        setActiveSupport(newTicket);
        
        // Sonra backend'e gönder
        const res = await fetch(`${apiUrl}/api/support`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: activeSupport.orderId, userEmail: user.email, message: messageToSend })
        });
        
        if (res.ok) {
          const realTicket = await res.json();
          setActiveSupport(realTicket);
          setSupportError('');
          // Scroll'u aşağı indir
          setTimeout(() => {
            const chatContainer = document.querySelector('.support-chat-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);
        } else {
          setSupportError('Destek talebi oluşturulamadı.');
          // Hata durumunda mesajı geri al
          setActiveSupport(null);
        }
      }
    } catch {
      setSupportError('Mesaj gönderilemedi.');
      // Hata durumunda mesajı geri al
      setActiveSupport(activeSupport);
    }
    setSupportLoading(false);
  };

  // Admin destek talebi mesaj gönder
  const handleSendAdminSupportMessage = async () => {
    if (!adminSupportMessage.trim() || !activeAdminSupport) return;
    setAdminSupportLoading(true);
    
    const messageToSend = adminSupportMessage.trim();
    setAdminSupportMessage(''); // Mesajı hemen temizle
    
    try {
      if (activeAdminSupport._id) {
        // Mevcut talebe admin mesajı ekle - önce UI'da göster
        const newMessage = { sender: 'admin', message: messageToSend, date: new Date() };
        const updatedTicket = {
          ...activeAdminSupport,
          messages: [...(activeAdminSupport.messages || []), newMessage],
          status: 'Yanıtlandı'
        };
        setActiveAdminSupport(updatedTicket);
        
        // Scroll'u aşağı indir
        setTimeout(() => {
          const chatContainer = document.querySelector('.admin-support-chat-container');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
        
        // Sonra backend'e gönder
        const res = await fetch(`${apiUrl}/api/support/${activeAdminSupport._id}/reply`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminReply: messageToSend })
        });
        
        if (!res.ok) {
          setAdminSupportError('Mesaj gönderilemedi.');
          // Hata durumunda mesajı geri al
          setActiveAdminSupport(activeAdminSupport);
        } else {
          setAdminSupportError('');
        }
      }
    } catch {
      setAdminSupportError('Mesaj gönderilemedi.');
      // Hata durumunda mesajı geri al
      setActiveAdminSupport(activeAdminSupport);
    }
    setAdminSupportLoading(false);
  };

  // Google ile girişten dönen kullanıcıyı işle
  const handleGoogleLoginSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode(credentialResponse.credential);
      // decoded: { email, name, picture, sub }
      setUser({
        email: decoded.email,
        username: decoded.name,
        avatar: decoded.picture,
        googleId: decoded.sub,
        role: 'user',
        google: true
      });
      localStorage.setItem('user', JSON.stringify({
        email: decoded.email,
        username: decoded.name,
        avatar: decoded.picture,
        googleId: decoded.sub,
        role: 'user',
        google: true
      }));
      setShowLogin(false);
      setShowRegister(false);
    }
  };

  // Kategori sistemi fonksiyonları
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('Kategori adı gereklidir');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim()
        })
      });

      if (response.ok) {
        setCategorySuccess('Kategori başarıyla eklendi');
        setCategoryName('');
        setCategoryDescription('');
        setCategoryError('');
        fetchCategories();
        setTimeout(() => setCategorySuccess(''), 3000);
      } else {
        const error = await response.json();
        setCategoryError(error.message || 'Kategori eklenirken hata oluştu');
      }
    } catch (error) {
      setCategoryError('Bağlantı hatası');
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('Kategori adı gereklidir');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/categories/${editCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim()
        })
      });

      if (response.ok) {
        setCategorySuccess('Kategori başarıyla güncellendi');
        setCategoryName('');
        setCategoryDescription('');
        setCategoryError('');
        setEditCategoryMode(false);
        setEditCategoryId(null);
        fetchCategories();
        setTimeout(() => setCategorySuccess(''), 3000);
      } else {
        const error = await response.json();
        setCategoryError(error.message || 'Kategori güncellenirken hata oluştu');
      }
    } catch (error) {
      setCategoryError('Bağlantı hatası');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCategorySuccess('Kategori başarıyla silindi');
        fetchCategories();
        setTimeout(() => setCategorySuccess(''), 3000);
      } else {
        const error = await response.json();
        setCategoryError(error.message || 'Kategori silinirken hata oluştu');
      }
    } catch (error) {
      setCategoryError('Bağlantı hatası');
    }
  };

  const openEditCategoryModal = (category) => {
    setEditCategoryMode(true);
    setEditCategoryId(category._id);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditCategoryMode(false);
    setEditCategoryId(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryError('');
  };

  // Sipariş durumu güncelleme fonksiyonu (admin)
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      console.log('Durum güncelleniyor:', orderId, newStatus);
      
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Sipariş durumu güncellenemedi');
      }
      
      const updatedOrder = await res.json();
      console.log('Güncellenmiş sipariş:', updatedOrder);
      
      // Local state'i güncelle (Socket.IO zaten güncelleyecek ama hızlı feedback için)
      setAdminOrders(prev =>
        prev.map(order =>
          order._id === orderId ? updatedOrder : order
        )
      );
      
      // Kullanıcı siparişlerini de güncelle
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? updatedOrder : order
        )
      );
      
      alert(`Sipariş durumu başarıyla "${newStatus}" olarak güncellendi!`);
      
    } catch (error) {
      console.error('Sipariş durumu güncelleme hatası:', error);
      alert(`Sipariş durumu güncellenirken hata oluştu: ${error.message}`);
    }
  };

  // Sipariş durumu renk fonksiyonu
  const getStatusColor = (status) => {
    switch (status) {
      case 'Satın Alındı':
        return '#28a745'; // Yeşil
      case 'Hazırlanıyor':
        return '#ffc107'; // Sarı
      case 'Kargoya Verildi':
        return '#17a2b8'; // Mavi
      case 'Teslim Edildi':
        return '#6f42c1'; // Mor
      case 'İptal Edildi':
        return '#dc3545'; // Kırmızı
      case 'Demo Satın Alma':
        return '#28a745'; // Yeşil (eski siparişler için)
      default:
        return '#6c757d'; // Gri
    }
  };

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  const apiUrl = process.env.REACT_APP_API_URL;

  return (
    <div>
      {/* Header */}
      <header className="header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px 24px 40px', borderBottom: '1px solid #eee', background: '#fff', position: 'relative' }}>
        {/* Sol: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 80 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 48, width: 48, objectFit: 'contain' }} />
        </div>
        {/* Orta: SER BUTİK */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1 }}>
          <span style={{ fontWeight: 'bold', fontSize: 28, letterSpacing: 2, color: '#222' }}>SER BUTİK</span>
        </div>
        {/* Sağ: Kullanıcı Girişi veya Kullanıcı Bilgisi */}
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '7px 16px', fontWeight: 600, borderRadius: 8, border: '1.5px solid #888', background: '#f7f7f7', cursor: 'pointer', fontSize: 15, marginRight: 0 }}
                onClick={() => {
                  if (user.role === 'admin') {
                    fetchAllOrders();
                    setShowAdminOrders(true);
                  } else {
                    fetchOrders(user.email);
                    setShowOrders(true);
                  }
                }}
              >
                {user.role === 'admin' ? 'Siparişler' : 'Siparişlerim'}
              </button>
              {user && user.role === 'admin' && (
                <button
                  style={{ marginLeft: 12, padding: '7px 16px', fontWeight: 600, borderRadius: 8, border: '1.5px solid #007bff', background: '#007bff', color: '#fff', cursor: 'pointer', fontSize: 15 }}
                  onClick={() => {
                    fetchAdminOrders();
                    setShowOrderManagementModal(true);
                  }}
                >
                  📦 Sipariş Yönetimi
                </button>
              )}
              <button
                style={{ marginLeft: 12, padding: '7px 16px', fontWeight: 600, borderRadius: 8, border: '1.5px solid #888', background: '#f7f7f7', cursor: 'pointer', fontSize: 15 }}
                onClick={() => { 
                  if (user.role === 'admin') {
                    fetchAdminSupportTickets(); 
                    setShowAdminSupportListModal(true); 
                  } else {
                    fetchSupportTickets(); 
                    setShowSupportListModal(true); 
                  }
                }}
              >
                {user.role === 'admin' ? 'Destek Talepleri' : 'Destek Taleplerim'}
              </button>
              <button
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                tabIndex={0}
                aria-label="Profil Menüsü"
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="14" fill="#f2f2f2"/>
                  <circle cx="14" cy="12" r="5" fill="#bbb"/>
                  <ellipse cx="14" cy="21" rx="7" ry="4" fill="#bbb"/>
                </svg>
              </button>
              <button
                style={{ padding: '7px 18px', fontWeight: 600, borderRadius: 8, border: '1.5px solid #888', background: '#fff', cursor: 'pointer', fontSize: 15, marginLeft: 8 }}
                onClick={handleLogout}
              >
                Çıkış Yap
              </button>
              {typeof showProfileMenu === 'undefined' ? null : showProfileMenu && (
                <div style={{ position: 'absolute', top: 38, right: 0, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 140, zIndex: 10, padding: '6px 0' }}>
                  <button
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 18px', textAlign: 'left', fontSize: 15, cursor: 'pointer', color: '#222', fontWeight: 500 }}
                    onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                  >
                    Profilim
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              style={{ padding: '8px 20px', fontWeight: 500, borderRadius: 6, border: '1px solid #888', background: '#fff', cursor: 'pointer' }}
              onClick={() => setShowLogin(true)}
            >
            Giriş Yap
          </button>
          )}
        </div>
      </header>
      {/* Login Modal */}
      {showLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '36px 28px 28px 28px', minWidth: 340, maxWidth: 380, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Giriş Yap</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <input
                type="text"
                placeholder="E-posta veya Kullanıcı Adı"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
                autoFocus
              />
              <input
                type="password"
                placeholder="Şifre"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
              />
              {loginError && (
                <div style={{
                  background: '#ffeaea',
                  color: '#b3261e',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 15,
                  border: '1.5px solid #f5c2c7',
                  textAlign: 'left',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(179,38,30,0.04)'
                }}>
                  {loginError}
    </div>
              )}
              <button
                type="submit"
                style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,123,255,0.06)', transition: 'background 0.2s' }}
                onMouseOver={e => e.target.style.background='#0056b3'}
                onMouseOut={e => e.target.style.background='#007bff'}
              >
                Giriş Yap
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span style={{ color: '#444' }}>Hesabınız yok mu? </span>
              <button
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', fontSize: 15, fontWeight: 500, padding: 0 }}
                onClick={() => { setShowLogin(false); setShowRegister(true); setLoginError(''); }}
              >
                Kayıt Ol
              </button>
            </div>
            <div style={{ margin: '16px 0', textAlign: 'center' }}>veya</div>
            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={() => alert('Google ile giriş başarısız!')}
                width="100%"
                locale="tr"
                text="Giriş yap"
                shape="pill"
                theme="filled_blue"
              />
            </GoogleOAuthProvider>
          </div>
        </div>
      )}
      {/* Register Modal */}
      {showRegister && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '36px 28px 28px 28px', minWidth: 340, maxWidth: 380, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowRegister(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Kayıt Ol</h2>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <input
                type="email"
                placeholder="E-posta"
                value={registerEmail}
                onChange={e => setRegisterEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
                autoFocus
              />
              <input
                type="text"
                placeholder="Kullanıcı Adı"
                value={registerUsername}
                onChange={e => setRegisterUsername(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
              />
              <input
                type="password"
                placeholder="Şifre"
                value={registerPassword}
                onChange={e => setRegisterPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
              />
              {registerError && (
                <div style={{
                  background: '#ffeaea',
                  color: '#b3261e',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 15,
                  border: '1.5px solid #f5c2c7',
                  textAlign: 'left',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(179,38,30,0.04)'
                }}>
                  {registerError}
                </div>
              )}
              {registerSuccess && (
                <div style={{
                  background: '#eaffea',
                  color: '#218838',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 15,
                  border: '1.5px solid #b2f5c7',
                  textAlign: 'left',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(33,136,56,0.04)'
                }}>
                  {registerSuccess}
                </div>
              )}
              <button
                type="submit"
                style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,123,255,0.06)', transition: 'background 0.2s' }}
                onMouseOver={e => e.target.style.background='#0056b3'}
                onMouseOut={e => e.target.style.background='#007bff'}
              >
                Kayıt Ol
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span style={{ color: '#444' }}>Zaten hesabınız var mı? </span>
              <button
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline', fontSize: 15, fontWeight: 500, padding: 0 }}
                onClick={() => { setShowRegister(false); setShowLogin(true); setRegisterError(''); setRegisterSuccess(''); }}
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Profil Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '36px 28px 28px 28px', minWidth: 340, maxWidth: 400, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => { setShowProfileModal(false); setPwChangeMsg(''); setPwChangeError(''); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Profilim</h2>
            <div style={{ marginBottom: 18, fontSize: 16, color: '#222', fontWeight: 500 }}>
              <div><span style={{ color: '#888', fontWeight: 400 }}>Kullanıcı Adı:</span> {user.username}</div>
              <div><span style={{ color: '#888', fontWeight: 400 }}>E-posta:</span> {user.email}</div>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Şifre Değiştir</div>
              <input
                type="password"
                placeholder="Mevcut Şifre"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 10, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Yeni Şifre"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 10, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                placeholder="Yeni Şifre (Tekrar)"
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
                style={{ width: '100%', padding: '12px 12px', marginBottom: 10, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
              />
              {pwChangeError && (
                <div style={{ background: '#ffeaea', color: '#b3261e', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 15, border: '1.5px solid #f5c2c7', textAlign: 'left', fontWeight: 500, boxShadow: '0 2px 8px rgba(179,38,30,0.04)' }}>{pwChangeError}</div>
              )}
              {pwChangeMsg && (
                <div style={{ background: '#eaffea', color: '#218838', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 15, border: '1.5px solid #b2f5c7', textAlign: 'left', fontWeight: 500, boxShadow: '0 2px 8px rgba(33,136,56,0.04)' }}>{pwChangeMsg}</div>
              )}
              <button type="submit" style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,123,255,0.06)', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background='#0056b3'} onMouseOut={e => e.target.style.background='#007bff'}>Şifreyi Değiştir</button>
            </form>
          </div>
        </div>
      )}
      {/* Ürün Ekleme Formu */}
      {user && user.role === 'admin' && (
        <div style={{ maxWidth: 1200, margin: '32px auto 0 auto', background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: 1, color: '#222' }}>Ürün Ekle</h2>
          <form onSubmit={handleAddProduct} style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Ürün Adı *"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              required
              style={{ flex: '1 1 180px', minWidth: 160, maxWidth: 220, height: 44, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, background: '#fafbfc', transition: 'border 0.2s' }}
            />
            <input
              type="number"
              placeholder="Fiyat *"
              value={productPrice}
              onChange={e => setProductPrice(e.target.value)}
              required
              style={{ flex: '1 1 100px', minWidth: 90, maxWidth: 120, height: 44, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, background: '#fafbfc', transition: 'border 0.2s' }}
            />
            <input
              type="number"
              placeholder="Stok *"
              value={productStock}
              onChange={e => setProductStock(e.target.value)}
              required
              style={{ flex: '1 1 80px', minWidth: 70, maxWidth: 100, height: 44, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, background: '#fafbfc', transition: 'border 0.2s' }}
            />
            <input
              type="text"
              placeholder="Açıklama *"
              value={productDesc}
              onChange={e => setProductDesc(e.target.value)}
              required
              style={{ flex: '2 1 220px', minWidth: 180, maxWidth: 320, height: 44, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, background: '#fafbfc', transition: 'border 0.2s' }}
            />
            <select
              value={productCategory}
              onChange={e => setProductCategory(e.target.value)}
              style={{ flex: '1 1 150px', minWidth: 120, maxWidth: 180, height: 44, padding: '0 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, background: '#fafbfc', transition: 'border 0.2s' }}
            >
              <option value="">Kategori Seç</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f7fa', border: '1.5px solid #d1d5db', borderRadius: 8, height: 44, padding: '0 14px', cursor: 'pointer', minWidth: 160, maxWidth: 220 }}>
              <span style={{ color: '#555', fontWeight: 500, fontSize: 15 }}>Görseller *</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {productImageUploading && <span style={{ color: '#007bff', fontWeight: 500, fontSize: 15 }}>Yükleniyor...</span>}
              {productImages.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  {productImages.map((image, index) => (
                    <img 
                      key={index}
                      src={image} 
                      alt={`Ürün görseli ${index + 1}`} 
                      style={{ 
                        height: 36, 
                        width: 36,
                        borderRadius: 6, 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        objectFit: 'cover'
                      }} 
                    />
                  ))}
                </div>
              )}
            </label>
            <button 
              type="submit" 
                              onClick={() => {}}
              style={{ height: 44, padding: '0 32px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', minWidth: 110, boxShadow: '0 2px 8px rgba(0,123,255,0.06)', transition: 'background 0.2s' }}
            >
              Ekle
            </button>
          </form>
          {productAddError && <div style={{ background: '#ffeaea', color: '#b3261e', borderRadius: 8, padding: '10px 14px', marginTop: 18, fontSize: 15, border: '1.5px solid #f5c2c7', textAlign: 'left', fontWeight: 500, boxShadow: '0 2px 8px rgba(179,38,30,0.04)', width: '100%', maxWidth: 600 }}>{productAddError}</div>}
          {productAddMsg && <div style={{ background: '#eaffea', color: '#218838', borderRadius: 8, padding: '10px 14px', marginTop: 18, fontSize: 15, border: '1.5px solid #b2f5c7', textAlign: 'left', fontWeight: 500, boxShadow: '0 2px 8px rgba(33,136,56,0.04)', width: '100%', maxWidth: 600 }}>{productAddMsg}</div>}
        </div>
      )}
      {/* Ürün listesi - Admin ve Kullanıcı için tek liste */}
      <div style={{ width: '100%', maxWidth: 1400, margin: '32px auto 0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, margin: '40px 0 24px 0', textAlign: 'center', letterSpacing: 1 }}>
          {user && user.role === 'admin' ? 'Ürün Yönetimi' : 'Ürünlerimiz'}
        </h2>
        
        {/* Kategori Filtreleme Sistemi - Optimize edilmiş */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 32, padding: '0 20px' }}>
          {/* Ürün sayısı göstergesi */}
          <div style={{ 
            width: '100%', 
            textAlign: 'center', 
            marginBottom: 16, 
            color: '#666', 
            fontSize: 15, 
            fontWeight: 500 
          }}>
            {activeProducts.length} ürün bulundu
            {selectedCategory !== 'all' && categories.find(cat => cat._id === selectedCategory) && (
              <span style={{ color: '#007bff', fontWeight: 600 }}>
                {' '}• {categories.find(cat => cat._id === selectedCategory).name} kategorisinde
              </span>
            )}
          </div>
          
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '10px 20px',
              borderRadius: 25,
              border: selectedCategory === 'all' ? '2px solid #007bff' : '2px solid #e0e0e0',
              background: selectedCategory === 'all' ? '#007bff' : '#fff',
              color: selectedCategory === 'all' ? '#fff' : '#333',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: 14,
              position: 'relative'
            }}
            onMouseOver={e => {
              if (selectedCategory !== 'all') {
                e.target.style.background = '#f0f8ff';
                e.target.style.borderColor = '#007bff';
              }
            }}
            onMouseOut={e => {
              if (selectedCategory !== 'all') {
                e.target.style.background = '#fff';
                e.target.style.borderColor = '#e0e0e0';
              }
            }}
          >
            Tümü
            <span style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#007bff',
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              {userProducts.length}
            </span>
          </button>
          
          {categories.map(category => {
            const categoryProductCount = categoryProductCounts[category._id] || 0;
            return (
              <button
                key={category._id}
                onClick={() => setSelectedCategory(category._id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 25,
                  border: selectedCategory === category._id ? '2px solid #007bff' : '2px solid #e0e0e0',
                  background: selectedCategory === category._id ? '#007bff' : '#fff',
                  color: selectedCategory === category._id ? '#fff' : '#333',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: 14,
                  position: 'relative'
                }}
                onMouseOver={e => {
                  if (selectedCategory !== category._id) {
                    e.target.style.background = '#f0f8ff';
                    e.target.style.borderColor = '#007bff';
                  }
                }}
                onMouseOut={e => {
                  if (selectedCategory !== category._id) {
                    e.target.style.background = '#fff';
                    e.target.style.borderColor = '#e0e0e0';
                  }
                }}
              >
                {category.name}
                {categoryProductCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: selectedCategory === category._id ? '#fff' : '#007bff',
                    color: selectedCategory === category._id ? '#007bff' : '#fff',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {categoryProductCount}
                  </span>
                )}
              </button>
            );
          })}
          
          {/* Admin için kategori yönetimi butonu */}
          {user && user.role === 'admin' && (
            <button
              onClick={() => setShowCategoryModal(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 25,
                border: '2px solid #28a745',
                background: '#28a745',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseOver={e => e.target.style.background = '#218838'}
              onMouseOut={e => e.target.style.background = '#28a745'}
            >
              <span>+</span> Kategori Ekle
            </button>
          )}
        </div>
        
        {(user && user.role === 'admin' ? adminProductsLoading : userProductsLoading) ? (
          <div style={{ textAlign: 'center', color: '#007bff', fontWeight: 500, fontSize: 18 }}>Yükleniyor...</div>
        ) : (user && user.role === 'admin' ? adminProductsError : userProductsError) ? (
          <div style={{ textAlign: 'center', color: '#b3261e', fontWeight: 500, fontSize: 18 }}>{user && user.role === 'admin' ? adminProductsError : userProductsError}</div>
        ) : activeProducts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontWeight: 500, fontSize: 18, padding: '40px 20px' }}>
            {selectedCategory === 'all' ? 'Henüz ürün bulunmuyor.' : 'Bu kategoride ürün bulunmuyor.'}
          </div>
        ) : (
          <div className="product-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'clamp(16px, 3vw, 32px) clamp(20px, 4vw, 28px)',
            justifyContent: 'center',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {activeProducts.map(product => (
              <div
                key={product._id}
                className="product-card"
                data-product-id={product._id}
                style={{
                  background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                  borderRadius: 24,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                  padding: 'clamp(16px, 3vw, 24px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  minHeight: 'clamp(400px, 60vh, 460px)',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                  willChange: 'transform',
                  outline: 'none',
                  userSelect: 'none',
                  marginBottom: 8,
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '320px',
                  margin: '0 auto'
                }}
                onMouseOver={e => { 
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.15)'; 
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.border = '2px solid #007bff';
                  // Resim alanındaki okları göster
                  const arrows = e.currentTarget.querySelectorAll('button');
                  arrows.forEach(arrow => {
                    arrow.style.opacity = '1';
                  });
                }}
                onMouseOut={e => { 
                  e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.08)'; 
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.border = '2px solid transparent';
                  // Resim alanındaki okları gizle
                  const arrows = e.currentTarget.querySelectorAll('button');
                  arrows.forEach(arrow => {
                    arrow.style.opacity = '0.7';
                  });
                }}
                onClick={() => handleProductClick(product)}
              >
                {/* Stok durumu göstergesi */}
                {product.stock <= 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#d32f2f',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(211,47,47,0.3)'
                  }}>
                    STOK TÜKENDİ
                  </div>
                )}
                {product.stock > 0 && product.stock <= 5 && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#f57c00',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(245,124,0,0.3)'
                  }}>
                    SON {product.stock} ADET
                  </div>
                )}

                {/* Ürün görseli - Çoklu resim desteği */}
                <div className="product-image-container" style={{ 
                  width: 'clamp(180px, 25vw, 210px)', 
                  height: 'clamp(220px, 30vw, 260px)', 
                  minWidth: 'clamp(180px, 25vw, 210px)',
                  minHeight: 'clamp(220px, 30vw, 260px)',
                  maxWidth: 'clamp(180px, 25vw, 210px)',
                  maxHeight: 'clamp(220px, 30vw, 260px)',
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
                  borderRadius: 20, 
                  marginBottom: 'clamp(12px, 2vw, 20px)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img 
                        src={optimizeCloudinaryUrl(product.images[productCardImageIndexes[product._id] || 0])} 
                        alt={product.name} 
                        loading="lazy"
                        data-index={productCardImageIndexes[product._id] || 0}
                        style={{ 
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain', 
                          borderRadius: 20, 
                          transition: 'opacity 0.2s ease', 
                          background: 'transparent',
                          willChange: 'opacity'
                        }} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      
                      {/* Resim navigasyon okları */}
                      {product.images.length > 1 && (
                        <>
                          {/* Sol ok */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleProductCardImageChange(product._id, 'prev');
                            }}
                            style={{
                              position: 'absolute',
                              left: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 36,
                              height: 36,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 15,
                              transition: 'all 0.2s ease',
                              fontSize: 18,
                              fontWeight: 'bold',
                              opacity: 0.7
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.8)';
                              e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.6)';
                              e.target.style.transform = 'translateY(-50%) scale(1)';
                            }}
                            onTouchStart={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.8)';
                              e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            }}
                            onTouchEnd={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.6)';
                              e.target.style.transform = 'translateY(-50%) scale(1)';
                            }}
                          >
                            ‹
                          </button>
                          
                          {/* Sağ ok */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleProductCardImageChange(product._id, 'next');
                            }}
                            style={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 36,
                              height: 36,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 15,
                              transition: 'all 0.2s ease',
                              fontSize: 18,
                              fontWeight: 'bold',
                              opacity: 0.7
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.8)';
                              e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.6)';
                              e.target.style.transform = 'translateY(-50%) scale(1)';
                            }}
                            onTouchStart={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.8)';
                              e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            }}
                            onTouchEnd={(e) => {
                              e.target.style.background = 'rgba(0,0,0,0.6)';
                              e.target.style.transform = 'translateY(-50%) scale(1)';
                            }}
                          >
                            ›
                          </button>
                          
                          {/* Resim sayısı göstergesi */}
                          <div style={{
                            position: 'absolute',
                            bottom: 8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            zIndex: 15
                          }}>
                            {(productCardImageIndexes[product._id] || 0) + 1} / {product.images.length}
                          </div>
                        </>
                      )}
                      
                      {/* YENİ ÜRÜN etiketi - Resmin sağ altında */}
                      {product.createdAt && !isNaN(new Date(product.createdAt).getTime()) && (Date.now() - new Date(product.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                        <div style={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          background: '#28a745',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          zIndex: 20,
                          boxShadow: '0 4px 12px rgba(40,167,69,0.3)'
                        }}>
                          YENİ ÜRÜN
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0,123,255,0.1)',
                          borderRadius: 16,
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                        onMouseOver={(e) => {
                          e.target.style.opacity = '1';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.opacity = '0';
                        }}
                      >
                        <span style={{ color: '#007bff', fontSize: 18, fontWeight: 700 }}>Detayları Gör</span>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#888',
                      fontSize: 16,
                      borderRadius: 16
                    }}>
                      Resim Yok
                    </div>
                  )}
                </div>

                {/* Ürün bilgileri */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div style={{ 
                    fontWeight: 800, 
                    fontSize: 26, 
                    marginBottom: 12, 
                    color: '#1a1a1a', 
                    letterSpacing: 0.5,
                    lineHeight: 1.2
                  }}>
                    {product.name}
                  </div>
                  
                  {/* Kategori etiketi */}
                  {product.category && categories.find(cat => cat._id === product.category) && (
                    <div style={{
                      display: 'inline-block',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 8
                    }}>
                      {categories.find(cat => cat._id === product.category).name}
                    </div>
                  )}
                  
                  <div style={{ 
                    color: '#666', 
                    fontSize: 16, 
                    marginBottom: 12, 
                    minHeight: 40, 
                    maxHeight: 48, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4
                  }}>
                    {product.description}
                  </div>
                  <div style={{ 
                    fontWeight: 800, 
                    fontSize: 28, 
                    color: '#007bff', 
                    marginBottom: 8, 
                    letterSpacing: 0.5 
                  }}>
                    {product.price} ₺
                  </div>
                  <div style={{ 
                    color: product.stock <= 5 ? '#f57c00' : '#28a745', 
                    fontSize: 16, 
                    marginBottom: 20,
                    fontWeight: 600
                  }}>
                    {product.stock <= 0 ? 'Stok Tükendi' : `Stok: ${product.stock} adet`}
                  </div>
                </div>

                {/* Aksiyon butonları */}
                <div style={{ 
                  display: 'flex', 
                  gap: 10, 
                  width: '100%', 
                  justifyContent: 'center',
                  marginTop: 'auto'
                }}>
                  {user && user.role === 'admin' ? (
                    <>
                      <button 
                        style={{ 
                          flex: 1, 
                          background: product.stock > 0 ? '#e8f5e9' : '#f5f5f5', 
                          color: product.stock > 0 ? '#219653' : '#999', 
                          border: 'none', 
                          borderRadius: 12, 
                          padding: '12px 0', 
                          fontWeight: 700, 
                          fontSize: 15, 
                          cursor: product.stock > 0 ? 'pointer' : 'not-allowed', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 8, 
                          transition: 'all 0.2s ease',
                          boxShadow: product.stock > 0 ? '0 4px 12px rgba(33,150,83,0.2)' : 'none'
                        }} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (product.stock > 0) handleAddToCartWithSize(product); 
                        }}
                        disabled={product.stock <= 0}
                      >
                        <span style={{ fontSize: 18 }}>🛒</span> Sepete Ekle
                      </button>
                      <button 
                        style={{ 
                          flex: 1, 
                          background: '#fffde7', 
                          color: '#bfa100', 
                          border: 'none', 
                          borderRadius: 12, 
                          padding: '12px 0', 
                          fontWeight: 700, 
                          fontSize: 15, 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 8, 
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(191,161,0,0.2)'
                        }} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          openEditModal(product); 
                        }}
                      >
                        <span style={{ fontSize: 18 }}>✏️</span> Düzenle
                      </button>
                      <button 
                        style={{ 
                          flex: 1, 
                          background: '#ffebee', 
                          color: '#d32f2f', 
                          border: 'none', 
                          borderRadius: 12, 
                          padding: '12px 0', 
                          fontWeight: 700, 
                          fontSize: 15, 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 8, 
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(211,47,47,0.2)'
                        }} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteProduct(product._id); 
                        }}
                      >
                        <span style={{ fontSize: 18 }}>🗑️</span> Sil
                      </button>
                    </>
                  ) : (
                    <button 
                      style={{ 
                        width: '100%', 
                        background: product.stock > 0 ? '#007bff' : '#f5f5f5', 
                        color: product.stock > 0 ? '#fff' : '#999', 
                        border: 'none', 
                        borderRadius: 12, 
                        padding: '14px 0', 
                        fontWeight: 700, 
                        fontSize: 16, 
                        cursor: product.stock > 0 ? 'pointer' : 'not-allowed', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 10, 
                        transition: 'all 0.2s ease',
                        boxShadow: product.stock > 0 ? '0 6px 20px rgba(0,123,255,0.3)' : 'none'
                      }} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (product.stock > 0) handleAddToCartWithSize(product); 
                      }}
                      disabled={product.stock <= 0}
                    >
                      <span style={{ fontSize: 20 }}>🛒</span> 
                      {product.stock > 0 ? 'Sepete Ekle' : 'Stok Tükendi'}
                    </button>
                  )}
                </div>



              </div>
            ))}
          </div>
        )}
      </div>
      {/* Sepet modalı */}
      {showCart && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 420, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowCart(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Sepetim</h2>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 16, margin: '32px 0' }}>Sepetiniz boş.</div>
            ) : (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 18 }}>
                  {cart.map(item => (
                    <div key={`${item._id}-${item.selectedSize || 'no-size'}`} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '1px solid #f2f2f2', paddingBottom: 10 }}>
                      <img src={item.images && item.images[0]} alt={item.name} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, background: '#f7f7f7' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                        <div style={{ color: '#888', fontSize: 14 }}>{item.price} TL x {item.qty}</div>
                        {item.selectedSize && (
                          <div style={{ color: '#007bff', fontSize: 13, fontWeight: 500 }}>Beden: {item.selectedSize}</div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2', minWidth: 60, textAlign: 'right' }}>{item.price * item.qty} TL</div>
                      <button onClick={() => handleRemoveFromCart(`${item._id}-${item.selectedSize || 'no-size'}`)} style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: 20, cursor: 'pointer', marginLeft: 6 }} title="Ürünü çıkar">🗑️</button>
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#222', marginBottom: 18, textAlign: 'right' }}>Toplam: {cartTotal} TL</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={handleClearCart} style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#222', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>Sepeti Boşalt</button>
                  <button onClick={handleDemoPurchase} style={{ padding: '8px 22px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>Satın Al</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Sepeti aç butonu (sağ alt köşe) */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2500 }}>
        <button onClick={() => setShowCart(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', borderRadius: 24, padding: '14px 28px', boxShadow: '0 4px 16px rgba(0,123,255,0.10)', cursor: 'pointer', transition: 'background 0.2s' }}>
          <span style={{ fontSize: 22 }}>🛒</span> Sepeti Aç {cartCount > 0 && <span style={{ background: '#fff', color: '#007bff', borderRadius: 12, padding: '2px 10px', fontWeight: 700, fontSize: 15, marginLeft: 6 }}>{cartCount}</span>}
        </button>
      </div>
      {/* Siparişlerim modalı */}
      {showOrders && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 700, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowOrders(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Siparişlerim</h2>
            {ordersLoading ? (
              <div style={{ textAlign: 'center', color: '#007bff', fontWeight: 500 }}>Yükleniyor...</div>
            ) : ordersError ? (
              <div style={{ textAlign: 'center', color: '#b3261e', fontWeight: 500 }}>{ordersError}</div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 16, margin: '32px 0' }}>Henüz siparişiniz yok.</div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 8 }}>
                {orders.map(order => (
                  <div key={order._id} style={{ borderBottom: '1px solid #f2f2f2', marginBottom: 20, paddingBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#222' }}>
                      #{order._id.slice(-6).toUpperCase()} - {new Date(order.createdAt).toLocaleString('tr-TR')}
                    </div>
                    <div style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
                      <strong>Toplam:</strong> {order.total} TL | <strong>Durum:</strong> {order.status}
                    </div>
                    {/* Destek Talebi Butonu */}
                    <button onClick={() => handleOpenSupport(order._id)} style={{ marginBottom: 8, padding: '6px 16px', borderRadius: 8, background: '#e3f2fd', color: '#1976d2', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 15 }}>
                      Destek Talebi
                    </button>
                    
                    {/* Teslimat Adresi */}
                    {order.address && (
                      <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
                        <strong style={{ color: '#222', fontSize: 15 }}>Teslimat Adresi:</strong><br/>
                        {order.address.name} {order.address.surname}<br/>
                        {order.address.phone}<br/>
                        {order.address.address}<br/>
                        {order.address.district && `${order.address.district}, `}{order.address.city} {order.address.zip && order.address.zip}
                      </div>
                    )}
                    
                    {/* Ürün Detayları */}
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: 16, color: '#222' }}>Ürün Detayları:</strong>
                    </div>
                    {order.products.map((product, index) => (
                      <div key={index} style={{ background: '#f7f7f7', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <img src={product.image || ''} alt={product.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, background: '#fff' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{product.name}</div>
                            <div style={{ color: '#555', fontSize: 14 }}>
                              <strong>Fiyat:</strong> {product.price} TL | <strong>Adet:</strong> {product.qty} | <strong>Toplam:</strong> {product.price * product.qty} TL
                            </div>
                            {product.selectedSize && (
                              <div style={{ color: '#007bff', fontSize: 14, fontWeight: 500 }}>
                                <strong>Seçilen Beden:</strong> {product.selectedSize}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Ürün Özellikleri */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 12, color: '#666' }}>
                          {product.cutType && <div><strong>Kesim:</strong> {product.cutType}</div>}
                          {product.productionPlace && <div><strong>Üretim Yeri:</strong> {product.productionPlace}</div>}
                          {product.material && <div><strong>Materyal:</strong> {product.material}</div>}
                          {product.modelHeight && <div><strong>Model Boyu:</strong> {product.modelHeight}</div>}
                          {product.modelSize && <div><strong>Model Bedeni:</strong> {product.modelSize}</div>}
                          {product.pattern && <div><strong>Desen:</strong> {product.pattern}</div>}
                          {product.sustainability && <div><strong>Sürdürülebilirlik:</strong> {product.sustainability}</div>}
                          {product.sleeveType && <div><strong>Kol Tipi:</strong> {product.sleeveType}</div>}
                          {product.collarType && <div><strong>Yaka Tipi:</strong> {product.collarType}</div>}
                          {product.legLength && <div><strong>Paça Boyu:</strong> {product.legLength}</div>}
                          {product.color && <div><strong>Renk:</strong> {product.color}</div>}
                          {product.productType && <div><strong>Ürün Tipi:</strong> {product.productType}</div>}
                          {product.sizes && product.sizes.length > 0 && <div><strong>Mevcut Bedenler:</strong> {product.sizes.join(', ')}</div>}
                          {product.description && <div><strong>Açıklama:</strong> {product.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adres Formu Modalı */}
      {showAddressForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 500, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowAddressForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Teslimat Adresi</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateOrderWithAddress(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Ad *"
                  value={addressForm.name}
                  onChange={e => setAddressForm({ ...addressForm, name: e.target.value })}
                  required
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
                />
                <input
                  type="text"
                  placeholder="Soyad"
                  value={addressForm.surname}
                  onChange={e => setAddressForm({ ...addressForm, surname: e.target.value })}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
                />
              </div>
              <input
                type="tel"
                placeholder="Telefon *"
                value={addressForm.phone}
                onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                required
                style={{ padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
              />
              <textarea
                placeholder="Adres *"
                value={addressForm.address}
                onChange={e => setAddressForm({ ...addressForm, address: e.target.value })}
                required
                rows={3}
                style={{ padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  placeholder="İl *"
                  value={addressForm.city}
                  onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                  required
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
                />
                <input
                  type="text"
                  placeholder="İlçe"
                  value={addressForm.district}
                  onChange={e => setAddressForm({ ...addressForm, district: e.target.value })}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
                />
              </div>
              <input
                type="text"
                placeholder="Posta Kodu"
                value={addressForm.zip}
                onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })}
                style={{ padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16 }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddressForm(false)} style={{ padding: '10px 22px', borderRadius: 8, background: '#eee', color: '#222', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" style={{ padding: '10px 22px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>Siparişi Tamamla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Siparişler modalı */}
      {showAdminOrders && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 800, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowAdminOrders(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Tüm Siparişler</h2>
            {allOrdersLoading ? (
              <div style={{ textAlign: 'center', color: '#007bff', fontWeight: 500 }}>Yükleniyor...</div>
            ) : allOrdersError ? (
              <div style={{ textAlign: 'center', color: '#b3261e', fontWeight: 500 }}>{allOrdersError}</div>
            ) : allOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 16, margin: '32px 0' }}>Henüz sipariş yok.</div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', marginBottom: 8 }}>
                {allOrders.map(order => (
                  <div key={order._id} style={{ borderBottom: '1px solid #f2f2f2', marginBottom: 20, paddingBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#222' }}>
                      #{order._id.slice(-6).toUpperCase()} - {new Date(order.createdAt).toLocaleString('tr-TR')}
                    </div>
                    <div style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>
                      <strong>Müşteri:</strong> {order.userEmail} | <strong>Toplam:</strong> {order.total} TL | <strong>Durum:</strong> {order.status}
                    </div>
                    {/* Admin Destek Talebi Butonu */}
                    <button onClick={() => {
                      const ticket = adminSupportTickets.find(t => t.orderId === order._id);
                      if (ticket) {
                        setActiveAdminSupport(ticket);
                        setShowAdminSupportModal(true);
                        setShowAdminOrders(false);
                      } else {
                        alert('Bu sipariş için henüz destek talebi bulunmuyor.');
                      }
                    }} style={{ marginBottom: 8, padding: '6px 16px', borderRadius: 8, background: '#e3f2fd', color: '#1976d2', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 15 }}>
                      Destek Talebi Görüntüle
                    </button>
                    
                    {/* Teslimat Adresi */}
                    {order.address && (
                      <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
                        <strong style={{ color: '#222', fontSize: 15 }}>Teslimat Adresi:</strong><br/>
                        {order.address.name} {order.address.surname}<br/>
                        {order.address.phone}<br/>
                        {order.address.address}<br/>
                        {order.address.district && `${order.address.district}, `}{order.address.city} {order.address.zip && order.address.zip}
                      </div>
                    )}
                    {/* Ürün Detayları */}
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: 16, color: '#222' }}>Ürün Detayları:</strong>
                    </div>
                    {order.products.map((product, index) => (
                      <div key={index} style={{ background: '#f7f7f7', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <img src={product.image || ''} alt={product.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, background: '#fff' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{product.name}</div>
                            <div style={{ color: '#555', fontSize: 14 }}>
                              <strong>Fiyat:</strong> {product.price} TL | <strong>Adet:</strong> {product.qty} | <strong>Toplam:</strong> {product.price * product.qty} TL
                            </div>
                            {product.selectedSize && (
                              <div style={{ color: '#007bff', fontSize: 14, fontWeight: 500 }}>
                                <strong>Seçilen Beden:</strong> {product.selectedSize}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Ürün Özellikleri */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 12, color: '#666' }}>
                          {product.cutType && <div><strong>Kesim:</strong> {product.cutType}</div>}
                          {product.productionPlace && <div><strong>Üretim Yeri:</strong> {product.productionPlace}</div>}
                          {product.material && <div><strong>Materyal:</strong> {product.material}</div>}
                          {product.modelHeight && <div><strong>Model Boyu:</strong> {product.modelHeight}</div>}
                          {product.modelSize && <div><strong>Model Bedeni:</strong> {product.modelSize}</div>}
                          {product.pattern && <div><strong>Desen:</strong> {product.pattern}</div>}
                          {product.sustainability && <div><strong>Sürdürülebilirlik:</strong> {product.sustainability}</div>}
                          {product.sleeveType && <div><strong>Kol Tipi:</strong> {product.sleeveType}</div>}
                          {product.collarType && <div><strong>Yaka Tipi:</strong> {product.collarType}</div>}
                          {product.legLength && <div><strong>Paça Boyu:</strong> {product.legLength}</div>}
                          {product.color && <div><strong>Renk:</strong> {product.color}</div>}
                          {product.productType && <div><strong>Ürün Tipi:</strong> {product.productType}</div>}
                          {product.sizes && product.sizes.length > 0 && <div><strong>Mevcut Bedenler:</strong> {product.sizes.join(', ')}</div>}
                          {product.stock !== undefined && <div><strong>Stok:</strong> {product.stock}</div>}
                          {product.description && <div><strong>Açıklama:</strong> {product.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sipariş Yönetimi Modalı */}
      {showOrderManagementModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 1200, width: '95%', height: '90vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowOrderManagementModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>📦 Sipariş Yönetimi</h2>
            
            {adminOrdersLoading ? (
              <div style={{ textAlign: 'center', color: '#007bff', fontWeight: 500, fontSize: 18 }}>Yükleniyor...</div>
            ) : adminOrdersError ? (
              <div style={{ textAlign: 'center', color: '#b3261e', fontWeight: 500, fontSize: 18 }}>{adminOrdersError}</div>
            ) : adminOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6c757d', fontWeight: 500, fontSize: 18 }}>Henüz sipariş bulunmuyor</div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
                <div style={{ display: 'grid', gap: 24 }}>
                  {adminOrders.map(order => (
                    <div key={order._id} style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: 24,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #e9ecef'
                    }}>
                      {/* Sipariş Başlığı ve Durum */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                          <h3 style={{ color: '#333', margin: 0, fontSize: 20, fontWeight: 600 }}>
                            Sipariş #{order._id.slice(-8)}
                          </h3>
                          <p style={{ color: '#6c757d', margin: '4px 0 0 0', fontSize: 14 }}>
                            {new Date(order.createdAt).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        
                        {/* Durum Yönetimi */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            backgroundColor: getStatusColor(order.status) + '20',
                            border: `2px solid ${getStatusColor(order.status)}`,
                            color: getStatusColor(order.status),
                            fontWeight: 600,
                            fontSize: 14
                          }}>
                            {order.status}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', textAlign: 'center' }}>
                              Durum Değiştir
                            </label>
                            <select
                              value={order.status}
                              onChange={(e) => {
                                console.log('Dropdown değişti:', order._id, e.target.value);
                                handleOrderStatusUpdate(order._id, e.target.value);
                              }}
                              style={{
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '3px solid #007bff',
                                backgroundColor: '#fff',
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: 'pointer',
                                minWidth: 160,
                                color: '#333',
                                boxShadow: '0 2px 8px rgba(0,123,255,0.2)',
                                outline: 'none'
                              }}
                            >
                              <option value="Satın Alındı">Satın Alındı</option>
                              <option value="Hazırlanıyor">Hazırlanıyor</option>
                              <option value="Kargoya Verildi">Kargoya Verildi</option>
                              <option value="Teslim Edildi">Teslim Edildi</option>
                              <option value="İptal Edildi">İptal Edildi</option>
                              <option value="Demo Satın Alma">Demo Satın Alma</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Müşteri Bilgileri */}
                      <div style={{ 
                        background: '#f8f9fa', 
                        padding: 16, 
                        borderRadius: 12, 
                        marginBottom: 20 
                      }}>
                        <h4 style={{ color: '#333', margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                          👤 Müşteri Bilgileri
                        </h4>
                        <p style={{ color: '#495057', margin: '4px 0', fontSize: 14 }}>
                          <strong>Ad Soyad:</strong> {order.address.name} {order.address.surname}
                        </p>
                        <p style={{ color: '#495057', margin: '4px 0', fontSize: 14 }}>
                          <strong>Email:</strong> {order.userEmail}
                        </p>
                        <p style={{ color: '#495057', margin: '4px 0', fontSize: 14 }}>
                          <strong>Telefon:</strong> {order.address.phone}
                        </p>
                        <p style={{ color: '#495057', margin: '4px 0', fontSize: 14 }}>
                          <strong>Adres:</strong> {order.address.address}, {order.address.district}, {order.address.city} {order.address.zip}
                        </p>
                      </div>
                      
                      {/* Ürünler */}
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ color: '#333', margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>
                          🛍️ Ürünler
                        </h4>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {order.products.map((product, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              padding: 16,
                              background: '#fff',
                              borderRadius: 12,
                              border: '1px solid #e9ecef'
                            }}>
                              <img
                                src={product.image}
                                alt={product.name}
                                style={{
                                  width: 80,
                                  height: 80,
                                  objectFit: 'cover',
                                  borderRadius: 10
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#333', margin: '0 0 6px 0', fontWeight: 600, fontSize: 16 }}>
                                  {product.name}
                                </p>
                                <p style={{ color: '#6c757d', margin: '0 0 6px 0', fontSize: 14 }}>
                                  Adet: {product.qty} | Fiyat: {product.price}₺
                                </p>
                                {product.selectedSize && (
                                  <p style={{ color: '#6c757d', margin: 0, fontSize: 14 }}>
                                    Beden: {product.selectedSize}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ color: '#333', margin: 0, fontWeight: 600, fontSize: 18 }}>
                                  {(product.price * product.qty).toFixed(2)}₺
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Toplam */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 0',
                        borderTop: '2px solid #e9ecef'
                      }}>
                        <h3 style={{ color: '#333', margin: 0, fontSize: 18, fontWeight: 600 }}>
                          Toplam Tutar
                        </h3>
                        <h3 style={{ color: '#007bff', margin: 0, fontSize: 20, fontWeight: 700 }}>
                          {order.total.toFixed(2)}₺
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ürün detay modalı */}
      {showProductModal && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 36, minWidth: 340, maxWidth: 600, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowProductModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            {!editMode ? (
              <>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 18 }}>
                  {/* Çoklu resim gösterimi */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: 280, height: 320, borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedProduct?.images && selectedProduct.images.length > 0 ? (
                        <>
                          <img 
                            src={selectedProduct.images[currentImageIndex]} 
                            alt={`${selectedProduct?.name || ''} - Resim ${currentImageIndex + 1}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              background: '#fff',
                              transition: 'opacity 0.3s ease',
                              display: 'block'
                            }} 
                          />
                          
                          {/* Sol/Sağ ok butonları */}
                          {selectedProduct.images.length > 1 && (
                            <>
                              <button
                                onClick={() => setCurrentImageIndex(prev => prev === 0 ? selectedProduct.images.length - 1 : prev - 1)}
                                style={{
                                  position: 'absolute',
                                  left: 12,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: 40,
                                  height: 40,
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.target.style.background = 'rgba(0,0,0,0.8)'}
                                onMouseOut={e => e.target.style.background = 'rgba(0,0,0,0.6)'}
                              >
                                ‹
                              </button>
                              <button
                                onClick={() => setCurrentImageIndex(prev => prev === selectedProduct.images.length - 1 ? 0 : prev + 1)}
                                style={{
                                  position: 'absolute',
                                  right: 12,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: 40,
                                  height: 40,
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.target.style.background = 'rgba(0,0,0,0.8)'}
                                onMouseOut={e => e.target.style.background = 'rgba(0,0,0,0.6)'}
                              >
                                ›
                              </button>
                            </>
                          )}
                          
                          {/* Resim sayısı göstergesi */}
                          {selectedProduct.images.length > 1 && (
                            <div style={{
                              position: 'absolute',
                              bottom: 12,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#fff',
                              padding: '4px 12px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              {currentImageIndex + 1} / {selectedProduct.images.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#888',
                          fontSize: 16
                        }}>
                          Resim Yok
                        </div>
                      )}
                    </div>
                    
                    {/* Küçük resim önizlemeleri */}
                    {selectedProduct?.images && selectedProduct.images.length > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        gap: 8, 
                        marginTop: 12, 
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                      }}>
                        {selectedProduct.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            style={{
                              width: 50,
                              height: 50,
                              border: currentImageIndex === index ? '2px solid #007bff' : '2px solid #ddd',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              background: 'none',
                              padding: 0
                            }}
                          >
                            <img 
                              src={image} 
                              alt={`Önizleme ${index + 1}`}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }} 
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{selectedProduct?.name || ''}</div>
                    <div style={{ color: '#888', fontSize: 15, marginBottom: 8 }}>{selectedProduct?.description || ''}</div>
                    <div style={{ fontWeight: 700, fontSize: 19, color: '#1976d2', marginBottom: 2 }}>{selectedProduct?.price} TL</div>
                    <div style={{ color: '#555', fontSize: 15, marginBottom: 8 }}>Stok: {selectedProduct?.stock}</div>
                    {/* Diğer özellikler */}
                    <div style={{ color: '#444', fontSize: 15, marginBottom: 8 }}>
                      {selectedProduct?.color && <div><b>Renk:</b> {selectedProduct.color}</div>}
                      {selectedProduct?.productType && <div><b>Ürün Tipi:</b> {selectedProduct.productType}</div>}
                      {selectedProduct?.cutType && <div><b>Kesim:</b> {selectedProduct.cutType}</div>}
                      {selectedProduct?.productionPlace && <div><b>Üretim Yeri:</b> {selectedProduct.productionPlace}</div>}
                      {selectedProduct?.material && <div><b>Materyal:</b> {selectedProduct.material}</div>}
                      {selectedProduct?.modelHeight && <div><b>Model Boyu:</b> {selectedProduct.modelHeight}</div>}
                      {selectedProduct?.modelSize && <div><b>Model Bedeni:</b> {selectedProduct.modelSize}</div>}
                      {selectedProduct?.sizes && selectedProduct.sizes.length > 0 && <div><b>Bedenler:</b> {selectedProduct.sizes.join(', ')}</div>}
                      {selectedProduct?.pattern && <div><b>Desen:</b> {selectedProduct.pattern}</div>}
                      {selectedProduct?.sustainability && <div><b>Sürdürülebilirlik:</b> {selectedProduct.sustainability}</div>}
                      {selectedProduct?.sleeveType && <div><b>Kol Tipi:</b> {selectedProduct.sleeveType}</div>}
                      {selectedProduct?.collarType && <div><b>Yaka Tipi:</b> {selectedProduct.collarType}</div>}
                      {selectedProduct?.legLength && <div><b>Paça Boyu:</b> {selectedProduct.legLength}</div>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button style={{ padding: '10px 22px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }} onClick={() => handleAddToCartWithSize(selectedProduct)}>Sepete Ekle</button>
                  {user && user.role === 'admin' && <button style={{ padding: '10px 22px', borderRadius: 8, background: '#fbc02d', color: '#222', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }} onClick={() => openEditModal(selectedProduct)}>Düzenle</button>}
                  {user && user.role === 'admin' && <button style={{ padding: '10px 22px', borderRadius: 8, background: '#d32f2f', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteProduct(selectedProduct._id)}>Sil</button>}
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <input type="text" value={editProduct?.name || ''} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} placeholder="Ürün Adı" style={{ padding: 10, borderRadius: 7, border: '1.5px solid #ccc', fontSize: 16 }} />
                <input type="number" value={editProduct?.price || ''} onChange={e => setEditProduct({ ...editProduct, price: e.target.value })} placeholder="Fiyat" style={{ padding: 10, borderRadius: 7, border: '1.5px solid #ccc', fontSize: 16 }} />
                <input type="number" value={editProduct?.stock || ''} onChange={e => setEditProduct({ ...editProduct, stock: e.target.value })} placeholder="Stok" style={{ padding: 10, borderRadius: 7, border: '1.5px solid #ccc', fontSize: 16 }} />
                <input type="text" value={editProduct?.description || ''} onChange={e => setEditProduct({ ...editProduct, description: e.target.value })} placeholder="Açıklama" style={{ padding: 10, borderRadius: 7, border: '1.5px solid #ccc', fontSize: 16 }} />
                {/* Diğer özellikler için inputlar eklenebilir */}
                {editError && <div style={{ background: '#ffeaea', color: '#b3261e', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 15, border: '1px solid #f5c2c7', textAlign: 'left', fontWeight: 500 }}>{editError}</div>}
                {editMsg && <div style={{ background: '#eaffea', color: '#218838', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 15, border: '1px solid #b2f5c7', textAlign: 'left', fontWeight: 500 }}>{editMsg}</div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" style={{ padding: '10px 22px', borderRadius: 8, background: '#eee', color: '#222', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }} onClick={() => setEditMode(false)}>Vazgeç</button>
                  <button type="submit" style={{ padding: '10px 22px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>Kaydet</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Beden seçimi modalı */}
      {showSizeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 320, maxWidth: 400, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowSizeModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Beden Seçimi Zorunlu</h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 1.4 }}>
              Bu ürün için beden seçimi yapmanız gerekmektedir.
            </p>
            {/* Split sizes by type */}
            {(() => {
              const { letterSizes, numberSizes } = splitSizesByType(sizeOptions);
              return (
                <>
                  {letterSizes.length > 0 && (
                    <div style={{ marginBottom: numberSizes.length > 0 ? 18 : 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, textAlign: 'center' }}>Harf Bedenler</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                        {letterSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            style={{
                              padding: '12px 20px',
                              borderRadius: 10,
                              background: selectedSize === size ? '#007bff' : '#f8f9fa',
                              color: selectedSize === size ? '#fff' : '#333',
                              fontWeight: 600,
                              fontSize: 16,
                              border: selectedSize === size ? '2px solid #007bff' : '2px solid #dee2e6',
                              cursor: 'pointer',
                              minWidth: 70,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {numberSizes.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, textAlign: 'center' }}>Sayısal Bedenler</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                        {numberSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            style={{
                              padding: '12px 20px',
                              borderRadius: 10,
                              background: selectedSize === size ? '#007bff' : '#f8f9fa',
                              color: selectedSize === size ? '#fff' : '#333',
                              fontWeight: 600,
                              fontSize: 16,
                              border: selectedSize === size ? '2px solid #007bff' : '2px solid #dee2e6',
                              cursor: 'pointer',
                              minWidth: 70,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            <button
              onClick={handleConfirmSize}
              disabled={!selectedSize}
              style={{
                padding: '14px 24px',
                borderRadius: 10,
                background: selectedSize ? '#007bff' : '#e9ecef',
                color: selectedSize ? '#fff' : '#6c757d',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: selectedSize ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                marginTop: 10
              }}
            >
              {selectedSize ? 'Sepete Ekle' : 'Beden Seçiniz'}
            </button>
          </div>
        </div>
      )}
      {/* Admin ürün düzenleme modalı */}
      {showEditModal && editProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 36, minWidth: 400, maxWidth: 800, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={closeEditModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Ürün Düzenle</h2>
            
            <form onSubmit={handleUpdateProductModal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Temel Bilgiler */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Ürün Adı *</label>
                  <input 
                    type="text" 
                    value={editProduct.name || ''} 
                    onChange={e => {
                      console.log('Name değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, name: e.target.value }));
                    }} 
                    placeholder="Ürün Adı" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Fiyat *</label>
                  <input 
                    type="number" 
                    value={editProduct.price || ''} 
                    onChange={e => {
                      console.log('Price değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, price: Number(e.target.value) }));
                    }} 
                    placeholder="Fiyat" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Stok *</label>
                  <input 
                    type="number" 
                    value={editProduct.stock || ''} 
                    onChange={e => {
                      console.log('Stock değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, stock: Number(e.target.value) }));
                    }} 
                    placeholder="Stok" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Kategori</label>
                  <select
                    value={editProduct.category || ''}
                    onChange={e => {
                      console.log('Category değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, category: e.target.value }));
                    }}
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  >
                    <option value="">Kategori Seç</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Açıklama */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Açıklama *</label>
                <textarea 
                  value={editProduct.description || ''} 
                  onChange={e => {
                    console.log('Description değişiyor:', e.target.value);
                    setEditProduct(prev => ({ ...prev, description: e.target.value }));
                  }} 
                  placeholder="Ürün açıklaması" 
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', minHeight: 80, resize: 'vertical' }}
                  required
                />
              </div>
              
              {/* Resim Yönetimi */}
              <div style={{ border: '2px dashed #ddd', borderRadius: 12, padding: 20, background: '#f9f9f9' }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: '#333' }}>Ürün Resimleri</div>
                
                {/* Mevcut Resimler */}
                {editProduct.images && editProduct.images.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12, color: '#666' }}>Mevcut Resimler:</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {editProduct.images.map((image, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img 
                            src={image} 
                            alt={`Resim ${index + 1}`}
                            style={{ 
                              width: 100, 
                              height: 100, 
                              objectFit: 'cover', 
                              borderRadius: 8, 
                              border: '2px solid #ddd' 
                            }} 
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditImage(index)}
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              background: '#d32f2f',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 28,
                              height: 28,
                              fontSize: 16,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Yeni Resim Ekleme */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    disabled={editImageUploading}
                    style={{ flex: 1, padding: 8 }}
                  />
                  {editImageUploading && (
                    <div style={{ color: '#007bff', fontSize: 14, fontWeight: 500 }}>Yükleniyor...</div>
                  )}
                </div>
                {editImageError && (
                  <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, fontWeight: 500 }}>{editImageError}</div>
                )}
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                  Birden fazla resim seçebilirsiniz. Maksimum dosya boyutu: 5MB
                </div>
              </div>
              
              {/* Ürün Detayları */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Kesim</label>
                  <input 
                    type="text" 
                    value={editProduct.cutType || ''} 
                    onChange={e => {
                      console.log('CutType değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, cutType: e.target.value }));
                    }} 
                    placeholder="Kesim (örn: düz kesim)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Üretim Yeri</label>
                  <input 
                    type="text" 
                    value={editProduct.productionPlace || ''} 
                    onChange={e => {
                      console.log('ProductionPlace değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, productionPlace: e.target.value }));
                    }} 
                    placeholder="Üretim Yeri (örn: Türkiye İstanbul)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Materyal</label>
                  <input 
                    type="text" 
                    value={editProduct.material || ''} 
                    onChange={e => {
                      console.log('Material değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, material: e.target.value }));
                    }} 
                    placeholder="Materyal (örn: Pamuk)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Model Boyu</label>
                  <input 
                    type="text" 
                    value={editProduct.modelHeight || ''} 
                    onChange={e => {
                      console.log('ModelHeight değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, modelHeight: e.target.value }));
                    }} 
                    placeholder="Model Boyu (örn: 170)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Model Bedeni</label>
                  <input 
                    type="text" 
                    value={editProduct.modelSize || ''} 
                    onChange={e => {
                      console.log('ModelSize değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, modelSize: e.target.value }));
                    }} 
                    placeholder="Model Bedeni (örn: M)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Bedenler</label>
                  <input 
                    type="text" 
                    value={Array.isArray(editProduct.sizes) ? editProduct.sizes.join(', ') : (editProduct.sizes || '')} 
                    onChange={e => {
                      console.log('Sizes değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, sizes: e.target.value }));
                    }} 
                    placeholder="Bedenler (örn: XXL, M, S)" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Desen</label>
                  <input 
                    type="text" 
                    value={editProduct.pattern || ''} 
                    onChange={e => {
                      console.log('Pattern değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, pattern: e.target.value }));
                    }} 
                    placeholder="Desen" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Sürdürülebilirlik</label>
                  <input 
                    type="text" 
                    value={editProduct.sustainability || ''} 
                    onChange={e => {
                      console.log('Sustainability değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, sustainability: e.target.value }));
                    }} 
                    placeholder="Sürdürülebilirlik" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Kol Tipi</label>
                  <input 
                    type="text" 
                    value={editProduct.sleeveType || ''} 
                    onChange={e => {
                      console.log('SleeveType değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, sleeveType: e.target.value }));
                    }} 
                    placeholder="Kol Tipi" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Yaka Tipi</label>
                  <input 
                    type="text" 
                    value={editProduct.collarType || ''} 
                    onChange={e => {
                      console.log('CollarType değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, collarType: e.target.value }));
                    }} 
                    placeholder="Yaka Tipi" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Paça Boyu</label>
                  <input 
                    type="text" 
                    value={editProduct.legLength || ''} 
                    onChange={e => {
                      console.log('LegLength değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, legLength: e.target.value }));
                    }} 
                    placeholder="Paça Boyu" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Renk</label>
                  <input 
                    type="text" 
                    value={editProduct.color || ''} 
                    onChange={e => {
                      console.log('Color değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, color: e.target.value }));
                    }} 
                    placeholder="Renk" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#333' }}>Ürün Tipi</label>
                  <input 
                    type="text" 
                    value={editProduct.productType || ''} 
                    onChange={e => {
                      console.log('ProductType değişiyor:', e.target.value);
                      setEditProduct(prev => ({ ...prev, productType: e.target.value }));
                    }} 
                    placeholder="Ürün Tipi" 
                    style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none' }}
                  />
                </div>
              </div>
              
              {/* Hata ve Başarı Mesajları */}
              {editError && (
                <div style={{ background: '#ffeaea', color: '#b3261e', borderRadius: 8, padding: '12px 16px', fontSize: 15, border: '1px solid #f5c2c7', textAlign: 'left', fontWeight: 500 }}>
                  {editError}
                </div>
              )}
              {editMsg && (
                <div style={{ background: '#eaffea', color: '#218838', borderRadius: 8, padding: '12px 16px', fontSize: 15, border: '1px solid #b2f5c7', textAlign: 'left', fontWeight: 500 }}>
                  {editMsg}
                </div>
              )}
              
              {/* Butonlar */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={closeEditModal}
                  style={{ 
                    padding: '12px 24px', 
                    borderRadius: 8, 
                    background: '#f8f9fa', 
                    color: '#6c757d', 
                    fontWeight: 600, 
                    fontSize: 16, 
                    border: '1px solid #dee2e6', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '12px 24px', 
                    borderRadius: 8, 
                    background: '#007bff', 
                    color: '#fff', 
                    fontWeight: 600, 
                    fontSize: 16, 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stok uyarısı */}
      {stockWarning && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#ffeaea',
          color: '#b3261e',
          borderRadius: 12,
          padding: '16px 20px',
          fontSize: 16,
          border: '2px solid #f5c2c7',
          textAlign: 'left',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(179,38,30,0.15)',
          zIndex: 6000,
          maxWidth: 400,
          animation: 'slideIn 0.3s ease'
        }}>
          ⚠️ {stockWarning}
        </div>
      )}

      {/* Sepet modalı */}
      {showCart && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', padding: 32, minWidth: 340, maxWidth: 420, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowCart(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Sepetim</h2>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 16, margin: '32px 0' }}>Sepetiniz boş.</div>
            ) : (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 18 }}>
                  {cart.map(item => (
                    <div key={`${item._id}-${item.selectedSize || 'no-size'}`} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '1px solid #f2f2f2', paddingBottom: 10 }}>
                      <img src={item.images && item.images[0]} alt={item.name} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, background: '#f7f7f7' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                        <div style={{ color: '#888', fontSize: 14 }}>{item.price} TL x {item.qty}</div>
                        {item.selectedSize && (
                          <div style={{ color: '#007bff', fontSize: 13, fontWeight: 500 }}>Beden: {item.selectedSize}</div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2', minWidth: 60, textAlign: 'right' }}>{item.price * item.qty} TL</div>
                      <button onClick={() => handleRemoveFromCart(`${item._id}-${item.selectedSize || 'no-size'}`)} style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: 20, cursor: 'pointer', marginLeft: 6 }} title="Ürünü çıkar">🗑️</button>
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#222', marginBottom: 18, textAlign: 'right' }}>Toplam: {cartTotal} TL</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={handleClearCart} style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#222', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}>Sepeti Boşalt</button>
                  <button onClick={handleDemoPurchase} style={{ padding: '8px 22px', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}>Satın Al</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sepeti aç butonu (sağ alt köşe) */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2500 }}>
        <button onClick={() => setShowCart(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', borderRadius: 24, padding: '14px 28px', boxShadow: '0 4px 16px rgba(0,123,255,0.10)', cursor: 'pointer', transition: 'background 0.2s' }}>
          <span style={{ fontSize: 22 }}>🛒</span> Sepeti Aç {cartCount > 0 && <span style={{ background: '#fff', color: '#007bff', borderRadius: 12, padding: '2px 10px', fontWeight: 700, fontSize: 15, marginLeft: 6 }}>{cartCount}</span>}
        </button>
      </div>

      {/* Kullanıcı Destek Sohbet Modalı */}
      {showSupportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 28, minWidth: 320, maxWidth: 420, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => { setShowSupportModal(false); setActiveSupport(null); setSupportMessage(''); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }}>&times;</button>
            <h2 style={{ marginBottom: 12, fontSize: 20, fontWeight: 700, textAlign: 'center' }}>Destek Talebi</h2>
            <div className="support-chat-container" style={{ flex: 1, minHeight: 120, maxHeight: 260, overflowY: 'auto', background: '#f7f7f7', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {(activeSupport?.messages || []).sort((a, b) => new Date(a.date) - new Date(b.date)).map((msg, idx) => (
                <div key={idx} style={{ marginBottom: 8, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                  <span style={{ display: 'inline-block', background: msg.sender === 'user' ? '#e3f2fd' : '#fffde7', color: '#222', borderRadius: 8, padding: '7px 14px', fontSize: 15, fontWeight: 500, maxWidth: 220, wordBreak: 'break-word' }}>{msg.message}</span>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{new Date(msg.date).toLocaleString('tr-TR')}</div>
                </div>
              ))}
            </div>
            <textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Mesajınızı yazın..." style={{ width: '100%', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 15, padding: 10, marginBottom: 10, minHeight: 40, resize: 'vertical' }} disabled={supportLoading || activeSupport?.chatOpen === false} />
            <button onClick={handleSendSupportMessage} disabled={supportLoading || !supportMessage.trim() || activeSupport?.chatOpen === false} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: supportLoading || !supportMessage.trim() || activeSupport?.chatOpen === false ? 'not-allowed' : 'pointer', marginBottom: 4 }}>Gönder</button>
            {activeSupport?.chatOpen === false && <div style={{ color: '#b3261e', fontWeight: 500, fontSize: 14, textAlign: 'center', marginTop: 6 }}>Sohbet kapalı. Admin tarafından kapatıldı.</div>}
            {supportError && <div style={{ color: '#b3261e', fontWeight: 500, fontSize: 14, textAlign: 'center', marginTop: 6 }}>{supportError}</div>}
          </div>
        </div>
      )}

      {/* Destek Taleplerim Modalı */}
      {showSupportListModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 28, minWidth: 320, maxWidth: 520, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowSupportListModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }}>&times;</button>
            <h2 style={{ marginBottom: 12, fontSize: 20, fontWeight: 700, textAlign: 'center' }}>Destek Taleplerim</h2>
            {supportTickets.length === 0 ? (
              <div style={{ color: '#888', fontSize: 15, textAlign: 'center', margin: '32px 0' }}>Henüz destek talebiniz yok.</div>
            ) : (
              <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                {supportTickets.map(ticket => (
                  <div key={ticket._id} style={{ borderBottom: '1px solid #f2f2f2', marginBottom: 16, paddingBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', marginBottom: 2 }}>Sipariş: {ticket.orderId}</div>
                    <div style={{ color: '#555', fontSize: 14, marginBottom: 4 }}>Durum: {ticket.status}</div>
                    <button onClick={() => { setActiveSupport(ticket); setShowSupportModal(true); setShowSupportListModal(false); }} style={{ padding: '6px 14px', borderRadius: 8, background: '#e3f2fd', color: '#1976d2', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14 }}>Sohbeti Aç</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin destek talepleri modalı */}
      {showAdminSupportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 36, minWidth: 340, maxWidth: 600, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => { setShowAdminSupportModal(false); setActiveAdminSupport(null); setAdminSupportMessage(''); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }}>&times;</button>
            <h2 style={{ marginBottom: 18, fontSize: 22, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>Admin Destek Talepleri</h2>
            <div className="admin-support-chat-container" style={{ flex: 1, minHeight: 120, maxHeight: 260, overflowY: 'auto', background: '#f7f7f7', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {(activeAdminSupport?.messages || []).sort((a, b) => new Date(a.date) - new Date(b.date)).map((msg, idx) => (
                <div key={idx} style={{ marginBottom: 8, textAlign: msg.sender === 'admin' ? 'right' : 'left' }}>
                  <span style={{ display: 'inline-block', background: msg.sender === 'admin' ? '#e3f2fd' : '#fffde7', color: '#222', borderRadius: 8, padding: '7px 14px', fontSize: 15, fontWeight: 500, maxWidth: 220, wordBreak: 'break-word' }}>{msg.message}</span>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{new Date(msg.date).toLocaleString('tr-TR')}</div>
                </div>
              ))}
            </div>
            <textarea value={adminSupportMessage} onChange={e => setAdminSupportMessage(e.target.value)} placeholder="Mesajınızı yazın..." style={{ width: '100%', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 15, padding: 10, marginBottom: 10, minHeight: 40, resize: 'vertical' }} disabled={adminSupportLoading || activeAdminSupport?.chatOpen === false} />
            <button onClick={handleSendAdminSupportMessage} disabled={adminSupportLoading || !adminSupportMessage.trim() || activeAdminSupport?.chatOpen === false} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: adminSupportLoading || !adminSupportMessage.trim() || activeAdminSupport?.chatOpen === false ? 'not-allowed' : 'pointer', marginBottom: 4 }}>Gönder</button>
            {activeAdminSupport?.chatOpen === false && <div style={{ color: '#b3261e', fontWeight: 500, fontSize: 14, textAlign: 'center', marginTop: 6 }}>Sohbet kapalı. Admin tarafından kapatıldı.</div>}
            {adminSupportError && <div style={{ color: '#b3261e', fontWeight: 500, fontSize: 14, textAlign: 'center', marginTop: 6 }}>{adminSupportError}</div>}
            
            {/* Admin Yönetim Butonları */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${apiUrl}/api/support/${activeAdminSupport._id}/resolve`, { method: 'PUT' });
                    if (res.ok) {
                      const updatedTicket = await res.json();
                      // Aktif destek talebini güncelle (sohbet açık kalır)
                      setActiveAdminSupport(updatedTicket);
                      setAdminSupportError('');
                    } else {
                      setAdminSupportError('Durum güncellenemedi.');
                    }
                  } catch (err) {
                    setAdminSupportError('Durum güncellenemedi.');
                  }
                }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: '#4caf50', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14 }}
              >
                Çözüldü Olarak İşaretle
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${apiUrl}/api/support/${activeAdminSupport._id}/chat-toggle`, { 
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chatOpen: !activeAdminSupport.chatOpen })
                    });
                    if (res.ok) {
                      const updatedTicket = await res.json();
                      // Aktif destek talebini güncelle (sohbet durumu güncellenir)
                      setActiveAdminSupport(updatedTicket);
                      setAdminSupportError('');
                    } else {
                      setAdminSupportError('Chat durumu güncellenemedi.');
                    }
                  } catch (err) {
                    setAdminSupportError('Chat durumu güncellenemedi.');
                  }
                }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: activeAdminSupport?.chatOpen ? '#ff9800' : '#2196f3', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14 }}
              >
                {activeAdminSupport?.chatOpen ? 'Sohbeti Kapat' : 'Sohbeti Aç'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin destek talepleri modalı */}
      {showAdminSupportListModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 28, minWidth: 320, maxWidth: 520, width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={() => setShowAdminSupportListModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }}>&times;</button>
            <h2 style={{ marginBottom: 12, fontSize: 20, fontWeight: 700, textAlign: 'center' }}>Admin Destek Talepleri</h2>
                         {adminSupportTickets.length === 0 ? (
               <div style={{ color: '#888', fontSize: 15, textAlign: 'center', margin: '32px 0' }}>Henüz destek talebi yok.</div>
             ) : (
               <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                 {adminSupportTickets.map(ticket => (
                   <div key={ticket._id} style={{ borderBottom: '1px solid #f2f2f2', marginBottom: 16, paddingBottom: 10 }}>
                     <div style={{ fontWeight: 600, fontSize: 15, color: '#1976d2', marginBottom: 2 }}>Sipariş: {ticket.orderId}</div>
                     <div style={{ color: '#555', fontSize: 14, marginBottom: 2 }}>Müşteri: {ticket.userEmail}</div>
                     <div style={{ color: '#555', fontSize: 14, marginBottom: 4 }}>
                       Durum: <span style={{ 
                         color: ticket.status === 'Açık' ? '#ff9800' : 
                                ticket.status === 'Yanıtlandı' ? '#2196f3' : 
                                ticket.status === 'Çözüldü' ? '#4caf50' : '#666',
                         fontWeight: 600 
                       }}>{ticket.status}</span>
                       {ticket.chatOpen ? ' | Sohbet Açık' : ' | Sohbet Kapalı'}
                     </div>
                     <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>
                       Oluşturulma: {new Date(ticket.createdAt).toLocaleString('tr-TR')}
                     </div>
                     <button onClick={() => { setActiveAdminSupport(ticket); setShowAdminSupportModal(true); setShowAdminSupportListModal(false); }} style={{ padding: '6px 14px', borderRadius: 8, background: '#e3f2fd', color: '#1976d2', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14 }}>Sohbeti Aç</button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}

      {/* CSS Animasyonları */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <style>{headerResponsiveStyle}</style>
      
      {/* Kategori Yönetimi Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.22)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '36px 28px 28px 28px', minWidth: 400, maxWidth: 500, width: '90%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <button onClick={closeCategoryModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#888', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#222'} onMouseOut={e => e.target.style.color='#888'}>&times;</button>
            <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>
              {editCategoryMode ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </h2>
            
            <form onSubmit={editCategoryMode ? handleEditCategory : handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Kategori Adı *</label>
                <input
                  type="text"
                  placeholder="Kategori adını girin"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                  onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
                  autoFocus
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Açıklama</label>
                <textarea
                  placeholder="Kategori açıklaması (opsiyonel)"
                  value={categoryDescription}
                  onChange={e => setCategoryDescription(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 16, outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box', minHeight: 80, resize: 'vertical' }}
                  onFocus={e => e.target.style.border = '1.5px solid #007bff'}
                  onBlur={e => e.target.style.border = '1.5px solid #d1d5db'}
                />
              </div>
              
              {categoryError && (
                <div style={{
                  background: '#ffeaea',
                  color: '#b3261e',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 15,
                  border: '1.5px solid #f5c2c7',
                  textAlign: 'left',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(179,38,30,0.04)'
                }}>
                  {categoryError}
                </div>
              )}
              
              {categorySuccess && (
                <div style={{
                  background: '#eaffea',
                  color: '#218838',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 15,
                  border: '1.5px solid #b2f5c7',
                  textAlign: 'left',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(33,136,56,0.04)'
                }}>
                  {categorySuccess}
                </div>
              )}
              
              <button
                type="submit"
                style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: '#007bff', color: '#fff', fontWeight: 700, fontSize: 17, border: 'none', cursor: 'pointer', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,123,255,0.06)', transition: 'background 0.2s' }}
                onMouseOver={e => e.target.style.background='#0056b3'}
                onMouseOut={e => e.target.style.background='#007bff'}
              >
                {editCategoryMode ? 'Güncelle' : 'Ekle'}
              </button>
            </form>
            
            {/* Mevcut kategoriler listesi */}
            {categories.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: '#333' }}>Mevcut Kategoriler</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {categories.map(category => (
                    <div key={category._id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      background: '#f8f9fa', 
                      borderRadius: 8, 
                      marginBottom: 8,
                      border: '1px solid #e9ecef'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#333' }}>{category.name}</div>
                        {category.description && (
                          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{category.description}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openEditCategoryModal(category)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #007bff',
                            background: '#fff',
                            color: '#007bff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => {
                            e.target.style.background = '#007bff';
                            e.target.style.color = '#fff';
                          }}
                          onMouseOut={e => {
                            e.target.style.background = '#fff';
                            e.target.style.color = '#007bff';
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category._id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #dc3545',
                            background: '#fff',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => {
                            e.target.style.background = '#dc3545';
                            e.target.style.color = '#fff';
                          }}
                          onMouseOut={e => {
                            e.target.style.background = '#fff';
                            e.target.style.color = '#dc3545';
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Siparişler */}
     
      {/* Kullanıcı Siparişleri */}
     
    </div>
  );
}

export default App; 