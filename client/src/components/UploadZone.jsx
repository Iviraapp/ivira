import { useState, useRef, useCallback } from 'react'
import { Upload, X, Eye, EyeOff, Check, Image as ImageIcon, Loader } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const FONT = "'Inter', -apple-system, sans-serif"

// Client-side WebP compression via canvas
async function compressToWebP(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }))
      }, 'image/webp', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

// Simple BlurHash-like placeholder — generates a tiny data URL
function generatePlaceholder(file) {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 4
      canvas.height = 4
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 4, 4)
      resolve(canvas.toDataURL('image/jpeg', 0.3))
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function UploadZone({
  onUpload,
  accept = 'image/*',
  maxFiles = 5,
  maxSizeMB = 10,
  showPrivacyToggle = false,
  label = 'Upload Image',
  compact = false,
  uploadEndpoint = '/upload',
}) {
  const { theme, isDark } = useTheme()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [privacy, setPrivacy] = useState('private') // 'private' | 'trainer'
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState([])
  const inputRef = useRef(null)

  const accent = '#7C3AED'

  const handleFiles = useCallback(async (newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > maxSizeMB * 1024 * 1024) return false
      return true
    }).slice(0, maxFiles - files.length)

    const processed = []
    for (const file of valid) {
      const compressed = await compressToWebP(file)
      const placeholder = await generatePlaceholder(file)
      processed.push({
        original: file,
        compressed,
        placeholder,
        preview: URL.createObjectURL(compressed),
        name: compressed.name,
        size: compressed.size,
      })
    }
    setFiles(prev => [...prev, ...processed])
  }, [files.length, maxFiles, maxSizeMB])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)

    const results = []
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData()
      formData.append('file', files[i].compressed)
      formData.append('privacy', privacy)
      formData.append('placeholder', files[i].placeholder)

      try {
        const api = (await import('../lib/api')).default
        const token = localStorage.getItem('ivira_token') || localStorage.getItem('ivira_admin_token') || localStorage.getItem('ivira_member_token')
        const { data } = await api.post(uploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        results.push(data)
      } catch (err) {
        console.error('Upload failed:', err)
      }
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploaded(results)
    setUploading(false)
    if (onUpload) onUpload(results)
    setFiles([])
  }

  const cardBg = isDark ? '#121212' : '#F8F9FA'
  const borderColor = isDark ? '#1F1F1F' : '#E5E7EB'
  const textColor = isDark ? '#fff' : '#000'
  const textSec = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? accent : borderColor}`,
          borderRadius: compact ? 12 : 16,
          padding: compact ? '20px' : '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? `${accent}08` : cardBg,
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <Upload size={compact ? 24 : 32} color={dragOver ? accent : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')} style={{ marginBottom: compact ? 8 : 12 }} />
        <p style={{ fontSize: compact ? 13 : 14, color: textSec, margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' }}>
          Drop files or click to browse. Max {maxSizeMB}MB, WebP auto-compression
        </p>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {files.map((f, i) => (
              <div key={i} style={{
                position: 'relative', width: 100, height: 100,
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${borderColor}`,
              }}>
                {/* BlurHash placeholder */}
                <img src={f.placeholder} alt="" style={{
                  position: 'absolute', width: '100%', height: '100%',
                  objectFit: 'cover', filter: 'blur(10px)', transform: 'scale(1.2)',
                }} />
                <img src={f.preview} alt={f.name} style={{
                  position: 'relative', width: '100%', height: '100%', objectFit: 'cover',
                }} />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                ><X size={12} color="#fff" /></button>
                <span style={{
                  position: 'absolute', bottom: 4, left: 4,
                  fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.6)',
                  padding: '1px 5px', borderRadius: 4,
                }}>
                  {(f.size / 1024).toFixed(0)}KB
                </span>
              </div>
            ))}
          </div>

          {/* Privacy Toggle */}
          {showPrivacyToggle && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginTop: 12,
              padding: '10px 14px', borderRadius: 10,
              background: cardBg, border: `1px solid ${borderColor}`,
            }}>
              <span style={{ fontSize: 13, color: textSec, flex: 1 }}>Visibility</span>
              <button
                onClick={() => setPrivacy(privacy === 'private' ? 'trainer' : 'private')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 6,
                  background: privacy === 'private' ? 'rgba(255,255,255,0.08)' : `${accent}18`,
                  border: `1px solid ${privacy === 'private' ? borderColor : accent + '40'}`,
                  color: privacy === 'private' ? textSec : accent,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: FONT,
                }}
              >
                {privacy === 'private' ? <EyeOff size={13} /> : <Eye size={13} />}
                {privacy === 'private' ? 'Private' : 'Share with Trainer'}
              </button>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, marginTop: 12,
              background: uploading ? `${accent}80` : accent,
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {uploading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading {progress}%
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload {files.length} {files.length === 1 ? 'file' : 'files'}
              </>
            )}
          </button>

          {/* Progress Bar */}
          {uploading && (
            <div style={{
              marginTop: 8, height: 4, borderRadius: 2,
              background: borderColor, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: accent, borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Success */}
      {uploaded.length > 0 && files.length === 0 && !uploading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
          padding: '10px 14px', borderRadius: 10,
          background: '#34A85318', border: '1px solid #34A85340',
        }}>
          <Check size={16} color="#34A853" />
          <span style={{ fontSize: 13, color: '#34A853' }}>
            {uploaded.length} {uploaded.length === 1 ? 'file' : 'files'} uploaded successfully
          </span>
        </div>
      )}
    </div>
  )
}
