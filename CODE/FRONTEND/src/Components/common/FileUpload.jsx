/**
 * Reusable File Upload Component
 * Supports drag-and-drop, preview, and progress tracking
 */

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Film, CheckCircle, AlertCircle } from 'lucide-react'
import { formatFileSize } from '../../lib/firebaseStorage'

export default function FileUpload({
    onUpload,
    accept = 'image/*',
    maxSize = 5 * 1024 * 1024, // 5MB default
    type = 'image', // 'image' or 'video'
    currentFile = null,
    disabled = false
}) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(currentFile)
    const [isDragging, setIsDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileSelect = (selectedFile) => {
        setError(null)

        // Validate file size
        if (selectedFile.size > maxSize) {
            setError(`File too large. Maximum size: ${formatFileSize(maxSize)}`)
            return
        }

        // Validate file type
        const acceptedTypes = accept.split(',').map(t => t.trim())
        const isValidType = acceptedTypes.some(acceptType => {
            if (acceptType.endsWith('/*')) {
                const category = acceptType.split('/')[0]
                return selectedFile.type.startsWith(category)
            }
            return selectedFile.type === acceptType
        })

        if (!isValidType) {
            setError(`Invalid file type. Accepted: ${accept}`)
            return
        }

        setFile(selectedFile)

        // Generate preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onloadend = () => setPreview(reader.result)
            reader.readAsDataURL(selectedFile)
        } else if (selectedFile.type.startsWith('video/')) {
            setPreview(URL.createObjectURL(selectedFile))
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) handleFileSelect(droppedFile)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleUpload = async () => {
        if (!file || !onUpload) return

        setUploading(true)
        setError(null)
        setProgress(0)

        try {
            await onUpload(file, (progressValue) => {
                setProgress(progressValue)
            })
            setFile(null)
        } catch (err) {
            setError(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            setProgress(0)
        }
    }

    const handleRemove = () => {
        setFile(null)
        setPreview(currentFile)
        setError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            {!preview && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                        transition-all duration-200
                        ${isDragging
                            ? 'border-titan-purple bg-titan-purple/10'
                            : 'border-white/20 hover:border-titan-purple/50 bg-white/5'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                        disabled={disabled}
                    />

                    <div className="flex flex-col items-center gap-3">
                        {type === 'video' ? (
                            <Film size={48} className="text-white/40" />
                        ) : (
                            <ImageIcon size={48} className="text-white/40" />
                        )}

                        <div>
                            <p className="text-white font-medium mb-1">
                                Drop {type} here or click to browse
                            </p>
                            <p className="text-white/40 text-sm">
                                Max size: {formatFileSize(maxSize)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview */}
            {preview && (
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 group">
                    {type === 'image' ? (
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-64 object-cover"
                        />
                    ) : (
                        <video
                            src={preview}
                            controls
                            className="w-full h-64 object-cover"
                        />
                    )}

                    {/* Change Overlay */}
                    <div
                        onClick={() => !disabled && fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center text-white">
                            <Upload size={24} className="mb-2" />
                            <span className="font-medium">Change {type === 'image' ? 'Image' : 'Video'}</span>
                        </div>
                    </div>

                    {file && !uploading && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering the file input
                                handleRemove();
                            }}
                            className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors z-10"
                        >
                            <X size={20} className="text-white" />
                        </button>
                    )}
                </div>
            )}

            {/* File Info */}
            {file && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                        {type === 'video' ? <Film size={20} /> : <ImageIcon size={20} />}
                        <div>
                            <p className="text-sm font-medium text-white">{file.name}</p>
                            <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
                        </div>
                    </div>

                    {!uploading && (
                        <button
                            onClick={handleUpload}
                            disabled={disabled}
                            className="btn-primary text-sm py-2 px-4"
                        >
                            <Upload size={16} className="mr-2" />
                            Upload
                        </button>
                    )}
                </div>
            )}

            {/* Progress Bar */}
            {uploading && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Uploading...</span>
                        <span className="text-titan-purple font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-titan-purple to-titan-blue transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle size={20} className="text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {!file && preview && preview !== currentFile && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle size={20} className="text-green-400" />
                    <p className="text-sm text-green-400">Upload successful!</p>
                </div>
            )}
        </div>
    )
}
