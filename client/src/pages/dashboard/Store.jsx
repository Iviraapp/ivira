import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { formatPaise } from '../../lib/utils'
import api from '../../lib/api'
import { Package, Plus, X, Search, Edit2, Trash2, AlertTriangle, ShoppingBag } from 'lucide-react'

const FONT = "'Inter', -apple-system, sans-serif"
const FONT_M = "'JetBrains Mono', 'Fira Code', monospace"

const CATEGORIES = ['All', 'Supplement', 'Gear', 'Apparel', 'Accessories', 'Food & Beverage', 'Other']
const PRODUCT_CATEGORIES = CATEGORIES.filter(c => c !== 'All')

// ── Skeleton card for loading state ────────────────────────────────────
function SkeletonCard({ theme, sp }) {
  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        height: 160, background: theme.bgTer,
        animation: 'storePulse 1.5s ease-in-out infinite',
      }} />
      <div style={{ padding: sp(16) }}>
        <div style={{
          height: 12, width: '40%', background: theme.bgTer, borderRadius: 6, marginBottom: sp(10),
          animation: 'storePulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          height: 16, width: '70%', background: theme.bgTer, borderRadius: 6, marginBottom: sp(8),
          animation: 'storePulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          height: 12, width: '90%', background: theme.bgTer, borderRadius: 6, marginBottom: sp(12),
          animation: 'storePulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          height: 14, width: '60%', background: theme.bgTer, borderRadius: 6,
          animation: 'storePulse 1.5s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}

// ── Add / Edit Product Modal ───────────────────────────────────────────
function ProductModal({ open, onClose, gymId, theme, sp, editProduct }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('Supplement')
  const [imageUrl, setImageUrl] = useState('')

  const isEdit = !!editProduct

  // Reset / populate on open
  useEffect(() => {
    if (open && editProduct) {
      setName(editProduct.name || '')
      setDescription(editProduct.description || '')
      setPrice(editProduct.price_paise ? (editProduct.price_paise / 100).toString() : '')
      setStock(editProduct.stock != null ? editProduct.stock.toString() : '')
      setCategory(editProduct.category || 'Supplement')
      setImageUrl(editProduct.image_url || '')
    } else if (open) {
      setName('')
      setDescription('')
      setPrice('')
      setStock('')
      setCategory('Supplement')
      setImageUrl('')
    }
  }, [open, editProduct])

  const createProduct = useMutation({
    mutationFn: (payload) => api.post(`/gyms/${gymId}/products`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', gymId] })
      toast.success('Product added successfully')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to add product'),
  })

  const updateProduct = useMutation({
    mutationFn: (payload) => api.patch(`/gyms/${gymId}/products/${editProduct?.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', gymId] })
      toast.success('Product updated successfully')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update product'),
  })

  const handleSubmit = () => {
    if (!name.trim()) return toast.error('Product name is required')
    const paise = Math.round(parseFloat(price) * 100)
    if (!paise || paise <= 0) return toast.error('Enter a valid price')
    const qty = parseInt(stock, 10)
    if (isNaN(qty) || qty < 0) return toast.error('Enter a valid stock quantity')

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price_paise: paise,
      stock: qty,
      category,
      image_url: imageUrl.trim() || null,
    }

    if (isEdit) {
      updateProduct.mutate(payload)
    } else {
      createProduct.mutate(payload)
    }
  }

  const isSubmitting = createProduct.isPending || updateProduct.isPending

  if (!open) return null

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: `${sp(10)}px ${sp(12)}px`,
    background: theme.bgTer, border: `1px solid ${theme.border}`, borderRadius: 8,
    color: theme.text, fontSize: 14, fontFamily: FONT, outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600, color: theme.textSec,
    marginBottom: 6, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440, background: theme.bgSec,
        border: `1px solid ${theme.border}`, borderRadius: 16,
        zIndex: 1001, overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: `${sp(20)}px ${sp(24)}px`,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: 17, fontWeight: 700, color: theme.text, fontFamily: FONT,
            }}>{isEdit ? 'Edit Product' : 'Add Product'}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: theme.textTer, fontFamily: FONT }}>
              {isEdit ? 'Update product details' : 'Add a new product to your store'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: theme.bgTer, color: theme.textSec, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: `${sp(20)}px ${sp(24)}px`, overflowY: 'auto' }}>
          {/* Name */}
          <div style={{ marginBottom: sp(16) }}>
            <label style={labelStyle}>Product Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Whey Protein 1kg"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: sp(16) }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief product description..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          {/* Price + Stock row */}
          <div style={{ display: 'flex', gap: sp(12), marginBottom: sp(16) }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Price (INR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: sp(12), top: '50%', transform: 'translateY(-50%)',
                  color: theme.textTer, fontSize: 14, fontFamily: FONT_M, pointerEvents: 'none',
                }}>₹</span>
                <input
                  type="number" min="0" step="0.01"
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, paddingLeft: sp(28), fontFamily: FONT_M }}
                  onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Stock Quantity</label>
              <input
                type="number" min="0" step="1"
                value={stock} onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                style={{ ...inputStyle, fontFamily: FONT_M }}
                onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: sp(16) }}>
            <label style={labelStyle}>Category</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
            >
              {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: sp(20) }}>
            <label style={labelStyle}>Image URL (optional)</label>
            <input
              value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%', padding: `${sp(12)}px 0`, border: 'none', borderRadius: 10,
              background: theme.brandAccent, color: '#fff', fontFamily: FONT,
              fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            {isSubmitting ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete Confirmation Modal ──────────────────────────────────────────
function DeleteConfirmModal({ open, onClose, onConfirm, productName, theme, sp, isPending }) {
  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 1002,
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 380, background: theme.bgSec,
        border: `1px solid ${theme.border}`, borderRadius: 16,
        zIndex: 1003, padding: sp(24),
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: sp(20) }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${theme.red}15`, color: theme.red,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: sp(12),
          }}>
            <Trash2 size={22} />
          </div>
          <h3 style={{
            margin: 0, fontSize: 17, fontWeight: 700, color: theme.text, fontFamily: FONT,
          }}>Delete Product</h3>
          <p style={{
            margin: `${sp(8)}px 0 0`, fontSize: 14, color: theme.textSec, fontFamily: FONT,
            lineHeight: 1.5,
          }}>
            Are you sure you want to delete <strong style={{ color: theme.text }}>{productName}</strong>?
            This action cannot be undone.
          </p>
        </div>
        <div style={{ display: 'flex', gap: sp(10) }}>
          <button onClick={onClose} style={{
            flex: 1, padding: `${sp(10)}px 0`, border: `1px solid ${theme.border}`,
            borderRadius: 10, background: 'transparent', color: theme.textSec,
            fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending} style={{
            flex: 1, padding: `${sp(10)}px 0`, border: 'none', borderRadius: 10,
            background: theme.red, color: '#fff', fontFamily: FONT,
            fontSize: 14, fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Product Card ───────────────────────────────────────────────────────
function ProductCard({ product, theme, sp, onEdit, onDelete }) {
  const isLowStock = product.stock > 0 && product.stock <= 5
  const isOutOfStock = product.stock === 0

  return (
    <div style={{
      background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 12,
      overflow: 'hidden', position: 'relative',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.borderStrong}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
    >
      {/* Image area */}
      <div style={{
        height: 160, background: theme.bgTer, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div style={{
          display: product.image_url ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
        }}>
          <Package size={36} color={theme.textTer} strokeWidth={1.5} />
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700, color: theme.red,
              background: `${theme.red}20`, padding: '6px 14px', borderRadius: 8,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: sp(16) }}>
        {/* Category + stock warning row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: sp(8),
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, fontFamily: FONT,
            color: theme.textTer, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: theme.bgTer, padding: '3px 8px', borderRadius: 6,
          }}>
            {product.category || 'Other'}
          </span>
          {isLowStock && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, fontFamily: FONT,
              color: theme.amber, background: `${theme.amber}15`,
              padding: '3px 8px', borderRadius: 6,
            }}>
              <AlertTriangle size={12} />
              Low Stock
            </span>
          )}
        </div>

        {/* Name */}
        <h4 style={{
          margin: 0, fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: FONT,
          lineHeight: 1.3,
        }}>
          {product.name}
        </h4>

        {/* Description preview */}
        {product.description && (
          <p style={{
            margin: `${sp(4)}px 0 0`, fontSize: 13, color: theme.textTer, fontFamily: FONT,
            lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {product.description}
          </p>
        )}

        {/* Price + stock */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: sp(10), fontSize: 14, fontFamily: FONT_M,
        }}>
          <span style={{ fontWeight: 700, color: theme.text }}>
            {formatPaise(product.price_paise)}
          </span>
          <span style={{ color: theme.textTer, fontSize: 12 }}>·</span>
          <span style={{
            color: isOutOfStock ? theme.red : isLowStock ? theme.amber : theme.textSec,
            fontSize: 13,
          }}>
            {product.stock} in stock
          </span>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: sp(8), marginTop: sp(12),
          borderTop: `1px solid ${theme.border}`, paddingTop: sp(12),
        }}>
          <button onClick={() => onEdit(product)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: `${sp(8)}px 0`, border: `1px solid ${theme.border}`,
            borderRadius: 8, background: 'transparent', color: theme.textSec,
            fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.text }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSec }}
          >
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => onDelete(product)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: `${sp(8)}px 0`, border: `1px solid ${theme.border}`,
            borderRadius: 8, background: 'transparent', color: theme.textSec,
            fontFamily: FONT, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.red; e.currentTarget.style.color = theme.red }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSec }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Store Page ────────────────────────────────────────────────────
export default function Store() {
  const { gym } = useAuth()
  const { theme, sp } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const gymId = gym?.id

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', gymId],
    queryFn: () =>
      api.get(`/gyms/${gymId}/products`).then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!gymId,
    staleTime: 30_000,
  })

  const deleteProduct = useMutation({
    mutationFn: (productId) => api.delete(`/gyms/${gymId}/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', gymId] })
      toast.success('Product deleted')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete product'),
  })

  const products = (productsData || [])
    .filter((p) => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

  const handleEdit = (product) => {
    setEditProduct(product)
    setModalOpen(true)
  }

  const handleDelete = (product) => {
    setDeleteTarget(product)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditProduct(null)
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Keyframe animations */}
      <style>{`
        @keyframes storePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: sp(24), flexWrap: 'wrap', gap: sp(12),
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800, color: theme.text,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Package size={24} strokeWidth={2.5} />
            Store
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: theme.textSec }}>
            Manage your product inventory
          </p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setModalOpen(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: `${sp(10)}px ${sp(20)}px`, border: 'none', borderRadius: 10,
            background: theme.brandAccent, color: '#fff',
            fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Search + Category filters */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: sp(16), marginBottom: sp(24),
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{
            position: 'absolute', left: sp(12), top: '50%', transform: 'translateY(-50%)',
            color: theme.textTer, pointerEvents: 'none',
          }} />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: `${sp(10)}px ${sp(12)}px ${sp(10)}px ${sp(36)}px`,
              background: theme.bgSec, border: `1px solid ${theme.border}`, borderRadius: 10,
              color: theme.text, fontSize: 14, fontFamily: FONT, outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.borderFocus}
            onBlur={(e) => e.target.style.borderColor = theme.border}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: sp(8), top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: 6, border: 'none',
              background: theme.bgTer, color: theme.textTer, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div style={{
          display: 'flex', gap: sp(6), flexWrap: 'wrap',
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: `${sp(6)}px ${sp(14)}px`, border: `1px solid ${theme.border}`,
                borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: activeCategory === cat ? theme.text : 'transparent',
                color: activeCategory === cat ? theme.bg : theme.textSec,
                borderColor: activeCategory === cat ? theme.text : theme.border,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: sp(20),
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} theme={theme} sp={sp} />
          ))}
        </div>
      ) : isError ? (
        <div style={{
          textAlign: 'center', padding: `${sp(60)}px ${sp(20)}px`,
        }}>
          <AlertTriangle size={40} color={theme.red} strokeWidth={1.5} />
          <p style={{
            fontSize: 16, fontWeight: 600, color: theme.text, marginTop: sp(16),
          }}>Failed to load products</p>
          <p style={{ fontSize: 14, color: theme.textSec, marginTop: sp(4) }}>
            Please try refreshing the page.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: `${sp(60)}px ${sp(20)}px`,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: theme.bgSec,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: sp(16),
          }}>
            <ShoppingBag size={32} color={theme.textTer} strokeWidth={1.5} />
          </div>
          <p style={{
            fontSize: 16, fontWeight: 600, color: theme.text, margin: 0,
          }}>
            {search || activeCategory !== 'All' ? 'No products match your filters' : 'No products yet'}
          </p>
          <p style={{
            fontSize: 14, color: theme.textSec, marginTop: sp(6), marginBottom: sp(20),
          }}>
            {search || activeCategory !== 'All'
              ? 'Try adjusting your search or category filter.'
              : 'Start by adding your first product to the store.'}
          </p>
          {!search && activeCategory === 'All' && (
            <button
              onClick={() => { setEditProduct(null); setModalOpen(true) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: `${sp(10)}px ${sp(20)}px`, border: 'none', borderRadius: 10,
                background: theme.brandAccent, color: '#fff',
                fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={18} /> Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: sp(20),
        }}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              theme={theme}
              sp={sp}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProductModal
        open={modalOpen}
        onClose={handleCloseModal}
        gymId={gymId}
        theme={theme}
        sp={sp}
        editProduct={editProduct}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteProduct.mutate(deleteTarget?.id)}
        productName={deleteTarget?.name}
        theme={theme}
        sp={sp}
        isPending={deleteProduct.isPending}
      />
    </div>
  )
}
