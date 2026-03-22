import { M, FONT, FONT_M } from './theme'

export default function StoreCard({ name, price, trainer, rating, onBook }) {
  const formatPaise = (p) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(p / 100)

  return (
    <div style={{
      background: M.card, borderRadius: 14, padding: '16px 18px',
      border: `1px solid ${M.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: FONT,
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: M.text }}>{name}</div>
        <div style={{ fontSize: 12, color: M.textSec, marginTop: 4 }}>{trainer}</div>
        {rating && <div style={{ fontSize: 11, color: M.amber, marginTop: 2 }}>{rating} stars</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: M.accent, fontFamily: FONT_M }}>
          {formatPaise(price)}
        </div>
        <button
          onClick={onBook}
          style={{
            marginTop: 6, padding: '6px 16px', borderRadius: 8,
            background: M.accent, border: 'none',
            color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT,
          }}
        >Book</button>
      </div>
    </div>
  )
}
