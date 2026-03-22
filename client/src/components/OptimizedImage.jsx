import { useState, useRef, useEffect } from 'react'

const PLACEHOLDER_GRADIENT = 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #121212 100%)'

export default function OptimizedImage({
  src,
  alt = '',
  width,
  height,
  style = {},
  className,
  sizes,
  placeholder,
  borderRadius = 0,
  objectFit = 'cover',
}) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: width || '100%',
        height: height || 'auto',
        borderRadius,
        background: placeholder || PLACEHOLDER_GRADIENT,
        ...style,
      }}
    >
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            borderRadius,
          }}
        />
      )}
    </div>
  )
}

/**
 * Generate responsive image srcSet for different sizes.
 * Pass a base URL that supports width params (e.g., Cloudinary, ImageKit).
 *
 * @param {string} baseUrl - Base image URL
 * @param {number[]} widths - Array of widths to generate
 * @returns {string} srcSet string
 */
export function generateSrcSet(baseUrl, widths = [64, 256, 512, 1024]) {
  return widths
    .map(w => `${baseUrl}?w=${w} ${w}w`)
    .join(', ')
}

/**
 * Profile image size presets
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 64, height: 64 },
  medium: { width: 256, height: 256 },
  large: { width: 512, height: 512 },
}

/**
 * Get profile image URL at specific size
 * Assumes backend serves resized images at /uploads/:id?size=thumbnail|medium|large
 */
export function getProfileUrl(memberId, size = 'thumbnail') {
  if (!memberId) return null
  return `/api/v1/uploads/profile/${memberId}?size=${size}`
}
