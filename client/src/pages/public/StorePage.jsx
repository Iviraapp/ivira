import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { ShoppingBag, Search } from 'lucide-react'

const T = {
  bg: '#000000', bgSec: '#0A0A0A', bgTer: '#141414',
  text: '#FFFFFF', textSec: '#A0A0A0', textTer: '#666666',
  border: '#1A1A1A', accent: '#10B981', green: '#34A853', amber: '#FBBC05', red: '#EA4335',
}

const font = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

export default function StorePage() {
  const { gymId } = useParams()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const { data: gym } = useQuery({
    queryKey: ['gym', gymId],
    queryFn: () => api.get(`/gyms/${gymId}`).then(r => r.data),
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['store-products', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/products?status=active`).then(r => r.data),
  })

  const { data: affiliateBrands = [] } = useQuery({
    queryKey: ['affiliate-store', gymId],
    queryFn: () => api.get(`/gyms/${gymId}/affiliate/store`).then(r => r.data?.brands || []),
  })

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory
    return matchesSearch && matchesCategory
  })

  async function handleBuyNow(product) {
    const email = prompt('Enter your email to proceed:')
    if (!email) return
    try {
      const { data } = await api.post(`/gyms/${gymId}/store/checkout`, {
        product_id: product.id,
        email,
      })
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed. Please try again.')
    }
  }

  async function handleNotifyMe(product) {
    const email = prompt('Enter your email to get notified when this is back in stock:')
    if (!email) return
    try {
      await api.post(`/gyms/${gymId}/products/${product.id}/waitlist`, { email })
      alert('You will be notified when this item is back in stock.')
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: font, color: T.text }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <ShoppingBag size={22} color={T.accent} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
          {gym?.name || 'Store'}
        </span>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
        {/* Search */}
        <div style={{
          position: 'relative', marginBottom: 20,
        }}>
          <Search size={16} color={T.textTer} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px 12px 40px', fontSize: 14,
              background: T.bgSec, color: T.text, border: `1px solid ${T.border}`,
              borderRadius: 10, outline: 'none', fontFamily: font,
            }}
          />
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 24,
            overflowX: 'auto', paddingBottom: 4,
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', fontFamily: font,
                  background: activeCategory === cat ? T.accent : T.bgTer,
                  color: activeCategory === cat ? '#fff' : T.textSec,
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60, color: T.textTer, fontSize: 14 }}>
            Loading products...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: T.textTer, fontSize: 14 }}>
            {search || activeCategory !== 'All' ? 'No products match your search.' : 'No products available yet.'}
          </div>
        )}

        {/* Product grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(product => {
            const inStock = product.stock == null || product.stock > 0
            return (
              <div key={product.id} style={{
                background: T.bgSec, borderRadius: 12,
                border: `1px solid ${T.border}`, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.15s ease',
              }}>
                {/* Image placeholder */}
                <div style={{
                  height: 160,
                  background: `linear-gradient(135deg, ${T.bgTer}, ${T.bg})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ShoppingBag size={32} color={T.textTer} />
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
                      {product.name}
                    </span>
                    {product.category && (
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px',
                        borderRadius: 10, background: T.bgTer, color: T.textSec,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {product.category}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
                    {'\u20B9'}{product.price}
                  </span>

                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    {inStock ? (
                      <button
                        onClick={() => handleBuyNow(product)}
                        style={{
                          width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                          borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: T.accent, color: '#fff', fontFamily: font,
                          transition: 'opacity 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        Buy Now
                      </button>
                    ) : (
                      <button
                        onClick={() => handleNotifyMe(product)}
                        style={{
                          width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
                          borderRadius: 8, border: `1px solid ${T.border}`, cursor: 'pointer',
                          background: 'transparent', color: T.textSec, fontFamily: font,
                          transition: 'border-color 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = T.textTer}
                        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                      >
                        Notify Me
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Affiliate Partner Brands */}
        {affiliateBrands.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 600, color: T.textSec,
              textTransform: 'uppercase', letterSpacing: '1px',
              marginBottom: 16, fontFamily: font,
            }}>
              Partner Brands
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}>
              {affiliateBrands.map(brand => (
                <a
                  key={brand.id}
                  href={`${brand.base_url}?ref=${gymId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: T.bgSec,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 20,
                    textDecoration: 'none',
                    color: T.text,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#333'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    const logo = e.currentTarget.querySelector('.brand-logo')
                    if (logo) logo.style.filter = 'grayscale(0)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border
                    e.currentTarget.style.transform = 'translateY(0)'
                    const logo = e.currentTarget.querySelector('.brand-logo')
                    if (logo) logo.style.filter = 'grayscale(1)'
                  }}
                >
                  {/* Brand Logo */}
                  <div className="brand-logo" style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#1A1A1A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    filter: 'grayscale(1)',
                    transition: 'filter 0.3s ease',
                  }}>
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20, fontWeight: 700, color: T.accent }}>{brand.name[0]}</span>
                    )}
                  </div>

                  <span style={{ fontSize: 15, fontWeight: 600, fontFamily: font }}>{brand.name}</span>

                  <span style={{
                    fontSize: 12, color: T.textSec, fontFamily: font,
                  }}>
                    {brand.description || brand.category}
                  </span>

                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: '#34A853', fontFamily: font,
                    marginTop: 'auto',
                  }}>
                    Shop Now →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
