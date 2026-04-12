/* eslint-disable sonarjs/cognitive-complexity, no-nested-ternary, react/prop-types, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
    CheckCircle2,
    Eye,
    Flag,
    Image as ImageIcon,
    Info,
    Loader2,
    Search,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    ZoomIn,
    Clock3,
    MapPin,
    Phone,
    User,
    AlertTriangle,
    RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import Layout from '../../Components/layout/Layout'
import { GradientText } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'FLAGGED', label: 'Suspicious' }
]

const RISK_OPTIONS = [
    { value: 'ALL', label: 'All users' },
    { value: 'true', label: 'Risk flagged only' },
    { value: 'false', label: 'Clean only' }
]

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' }
]

const getStatusClass = (status) => {
    if (status === 'APPROVED') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    if (status === 'REJECTED') return 'bg-rose-500/10 text-rose-300 border-rose-500/20'
    if (status === 'FLAGGED') return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    return 'bg-white/5 text-white/70 border-white/10'
}

const formatDateTime = (value) => {
    if (!value) return '—'
    return new Date(value).toLocaleString()
}

const formatDateOnly = (value) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString()
}

const maskIdNumber = (value) => {
    if (!value) return 'Not captured in current schema'
    if (value.length <= 4) return `****${value}`
    return `${'*'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`
}

const formatBillingSummary = (value) => {
    if (!value) return 'Not provided'
    if (typeof value === 'string') return value
    return 'Provided'
}

const getDecisionConfirmationText = (action) => {
    if (action === 'APPROVE') return 'Approve this KYC request?'
    if (action === 'REJECT') return 'Reject this KYC request?'
    return 'Mark this KYC request as suspicious?'
}

const getDecisionToastText = (action) => {
    if (action === 'APPROVE') return 'KYC approved'
    if (action === 'REJECT') return 'KYC rejected'
    return 'KYC flagged as suspicious'
}

const getToneClass = (tone) => {
    if (tone === 'emerald') return 'text-emerald-300'
    if (tone === 'rose') return 'text-rose-300'
    return 'text-amber-300'
}

const getToneDotClass = (tone) => {
    if (tone === 'emerald') return 'bg-emerald-300'
    if (tone === 'rose') return 'bg-rose-300'
    return 'bg-amber-300'
}

const getBadgeToneClass = (tone) => {
    if (tone === 'emerald') return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
    if (tone === 'rose') return 'bg-rose-500/10 text-rose-200 border-rose-500/20'
    if (tone === 'amber') return 'bg-amber-500/10 text-amber-200 border-amber-500/20'
    return 'bg-white/5 text-white/70 border-white/10'
}

const emptyDetail = {
    user: null,
    riskFlag: false,
    riskReasons: [],
    auditTrail: [],
    checklist: {},
    documentPreview: {}
}

const ManageKycPanel = () => {
    const [filters, setFilters] = useState({
        status: 'PENDING',
        country: 'ALL',
        risk: 'ALL',
        sort: 'newest',
        search: ''
    })
    const [requests, setRequests] = useState([])
    const [countries, setCountries] = useState([])
    const [loading, setLoading] = useState(true)
    const [detailLoading, setDetailLoading] = useState(false)
    const [selectedId, setSelectedId] = useState(null)
    const [detail, setDetail] = useState(emptyDetail)
    const [actionLoading, setActionLoading] = useState(null)
    const [decisionReason, setDecisionReason] = useState('')
    const [previewImage, setPreviewImage] = useState(null)

    const selectedRequest = useMemo(() => {
        if (!selectedId) return null
        return requests.find((request) => request.id === selectedId) || null
    }, [requests, selectedId])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const params = {
                page: 1,
                limit: 100,
                sort: filters.sort,
                search: filters.search || undefined
            }

            if (filters.status !== 'ALL') {
                params.status = filters.status
            }
            if (filters.country !== 'ALL') {
                params.country = filters.country
            }
            if (filters.risk !== 'ALL') {
                params.risk = filters.risk
            }

            const response = await api.get('/kyc/admin/kyc', { params })
            const data = response.data?.data || []
            setRequests(data)

            const nextCountries = Array.from(new Set(data.map((request) => request.user?.countryCode).filter(Boolean))).sort((left, right) => left.localeCompare(right))
            setCountries(nextCountries)

            if (data.length === 0) {
                setSelectedId(null)
                setDetail(emptyDetail)
                return
            }

            const currentSelectionExists = data.some((request) => request.id === selectedId)
            if (!currentSelectionExists) {
                setSelectedId(data[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch KYC requests:', error)
            toast.error('Failed to load KYC requests')
        } finally {
            setLoading(false)
        }
    }

    const fetchDetail = async (requestId) => {
        if (!requestId) return

        try {
            setDetailLoading(true)
            const response = await api.get(`/kyc/admin/kyc/${requestId}`)
            setDetail(response.data?.data || emptyDetail)
            setDecisionReason('')
        } catch (error) {
            console.error('Failed to load KYC detail:', error)
            toast.error('Failed to load KYC detail')
        } finally {
            setDetailLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [filters.status, filters.country, filters.risk, filters.sort, filters.search])

    useEffect(() => {
        if (selectedId) {
            fetchDetail(selectedId)
        }
    }, [selectedId])

    const updateFilter = (name, value) => {
        setFilters((current) => ({ ...current, [name]: value }))
    }

    const refreshAll = async () => {
        await fetchRequests()
        if (selectedId) {
            await fetchDetail(selectedId)
        }
    }

    const handleDecision = async (action, endpoint, payload = {}) => {
        if (!selectedId) return

        if (action !== 'APPROVE' && !decisionReason.trim()) {
            toast.error('Please give a reason')
            return
        }

        const confirmationText = getDecisionConfirmationText(action)

        if (!globalThis.confirm(confirmationText)) return

        try {
            setActionLoading(action)
            await api.patch(endpoint, payload)
            toast.success(getDecisionToastText(action))
            await refreshAll()
        } catch (error) {
            console.error('KYC action failed:', error)
            toast.error(error.response?.data?.message || 'Action failed')
        } finally {
            setActionLoading(null)
        }
    }

    const filteredCountries = countries.length > 0 ? countries : []
    let listSection = null
    if (loading) {
        listSection = (
            <div className="flex items-center justify-center py-20 text-white/50">
                <Loader2 className="animate-spin mr-2" size={18} /> Loading requests...
            </div>
        )
    } else if (requests.length === 0) {
        listSection = (
            <div className="py-20 text-center text-white/40 px-6">
                <ShieldX className="mx-auto mb-3" size={42} />
                No KYC requests match the current filters.
            </div>
        )
    } else {
        listSection = (
            <div className="max-h-[760px] overflow-auto divide-y divide-white/5">
                {requests.map((request) => {
                    const active = request.id === selectedId
                    return (
                        <button
                            key={request.id}
                            onClick={() => setSelectedId(request.id)}
                            className={`w-full text-left px-5 py-4 transition-colors ${active ? 'bg-white/6' : 'hover:bg-white/5'}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-titan-purple/30 to-cyan-500/20 flex items-center justify-center text-white font-bold">
                                            {(request.user?.legalName || request.user?.username || 'U').slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white truncate">{request.user?.legalName || request.user?.username || 'Unknown user'}</p>
                                            <p className="text-xs text-white/40 truncate">{request.user?.id}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50">
                                        <span className="inline-flex items-center gap-2"><Phone size={12} /> {request.user?.phone || 'No phone'}</span>
                                        <span className="inline-flex items-center gap-2"><MapPin size={12} /> {request.user?.countryCode || 'No country'}</span>
                                        <span className="inline-flex items-center gap-2"><Clock3 size={12} /> {formatDateTime(request.createdAt)}</span>
                                        <span className="inline-flex items-center gap-2"><ShieldAlert size={12} /> {request.riskFlag ? 'Risk flagged' : 'Clear'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={`px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${getStatusClass(request.displayStatus)}`}>{request.displayStatus}</span>
                                    <span className={`px-2 py-1 rounded-lg text-[11px] border ${request.riskFlag ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-white/50'}`}>
                                        {request.riskFlag ? `${request.previousAttempts} review events` : 'No risk flag'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        )
    }

    let detailSection = null
    if (detailLoading) {
        detailSection = (
            <div className="h-full min-h-[760px] flex items-center justify-center text-white/50">
                <Loader2 className="animate-spin mr-2" size={18} /> Loading request detail...
            </div>
        )
    } else if (selectedRequest) {
        detailSection = (
            <div className="p-5 md:p-6 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/35">Core Review Screen</p>
                        <h2 className="font-heading text-2xl font-bold text-white mt-2">
                            {detail.user?.legalName || detail.user?.username || 'KYC Request'}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <BadgePill icon={User} label={detail.user?.email || 'No email'} />
                            <BadgePill icon={MapPin} label={detail.user?.countryCode || 'No country'} />
                            <BadgePill icon={ShieldAlert} label={detail.riskFlag ? 'Risk flagged' : 'Low risk'} tone={detail.riskFlag ? 'amber' : 'emerald'} />
                            <BadgePill icon={CheckCircle2} label={detail.checklist?.basicIdentity ? 'Level 1 complete' : 'Level 1 incomplete'} tone={detail.checklist?.basicIdentity ? 'emerald' : 'rose'} />
                        </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2">
                        <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${getStatusClass(detail.displayStatus)}`}>{detail.displayStatus}</span>
                        <span className="text-xs text-white/40">Submitted {formatDateTime(detail.createdAt)}</span>
                        <span className="text-xs text-white/40">Updated {formatDateTime(detail.updatedAt)}</span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1.1fr_1.3fr_0.9fr] gap-4">
                    <div className="space-y-4">
                        <PanelCard title="User Info" icon={Info}>
                            <div className="space-y-3 text-sm">
                                {detailRows.map((row) => (
                                    <DetailLine
                                        key={row.label}
                                        label={row.label}
                                        value={row.value}
                                        verified={row.verified}
                                    />
                                ))}
                            </div>
                        </PanelCard>

                        <PanelCard title="Decision Guide" icon={ShieldCheck}>
                            <ChecklistList title="Approve if" items={detail.decisionRules?.approve || []} tone="emerald" />
                            <ChecklistList title="Reject if" items={detail.decisionRules?.reject || []} tone="rose" />
                            <ChecklistList title="Suspicious if" items={detail.decisionRules?.suspicious || []} tone="amber" />
                        </PanelCard>
                    </div>

                    <div className="space-y-4">
                        <PanelCard title="Documents" icon={ImageIcon}>
                            <div className="grid md:grid-cols-2 gap-4">
                                <DocumentTile
                                    label="Government ID"
                                    value={detail.documentPreview?.proofUrl}
                                    fallback="ID image not available"
                                    onPreview={setPreviewImage}
                                />
                                <DocumentTile
                                    label="Selfie"
                                    value={detail.documentPreview?.selfieUrl}
                                    fallback="Selfie image not available"
                                    onPreview={setPreviewImage}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-black/25 border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs uppercase tracking-[0.25em] text-white/35">ID Type</span>
                                        <span className="text-xs text-white/60">{detail.documentPreview?.documentType || 'Unknown'}</span>
                                    </div>
                                    <div className="text-sm text-white/70">Masked ID number</div>
                                    <div className="mt-1 font-mono text-white">{maskIdNumber(detail.documentPreview?.idNumberMasked)}</div>
                                </div>

                                <div className="bg-black/25 border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs uppercase tracking-[0.25em] text-white/35">Face Check</span>
                                        <span className={`text-xs ${detail.checklist?.faceVerification ? 'text-emerald-300' : 'text-amber-300'}`}>
                                            {detail.checklist?.faceVerification ? 'Selfie uploaded' : 'Needs selfie review'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-white/70">Side-by-side review is enabled below.</div>
                                    <div className="mt-3 text-xs text-white/45">Manual name mismatch checks should be handled with the ID document and selfie visible at once.</div>
                                </div>
                            </div>

                            <div className="mt-4 bg-black/25 border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-white/80">Side-by-side view</span>
                                    <span className="text-xs text-white/40">Click any image to zoom</span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <PreviewImageCard title="ID vs Name" src={detail.documentPreview?.proofUrl} onClick={setPreviewImage} />
                                    <PreviewImageCard title="Selfie vs Face" src={detail.documentPreview?.selfieUrl} onClick={setPreviewImage} />
                                </div>
                            </div>
                        </PanelCard>

                        <PanelCard title="Previous Attempts" icon={RotateCcw}>
                            {detail.auditTrail?.length ? (
                                <div className="space-y-3">
                                    {detail.auditTrail.map((entry) => (
                                        <div key={entry.id} className="rounded-2xl bg-black/25 border border-white/5 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-semibold text-white text-sm">{entry.action}</div>
                                                <div className="text-xs text-white/40">{formatDateTime(entry.createdAt)}</div>
                                            </div>
                                            <div className="mt-2 text-xs text-white/55">
                                                {entry.details?.reason || entry.details?.userId || 'No additional notes'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/45">No previous admin decisions found for this request.</p>
                            )}
                        </PanelCard>
                    </div>

                    <div className="space-y-4">
                        <PanelCard title="Actions" icon={Flag}>
                            <div className="space-y-3">
                                <textarea
                                    value={decisionReason}
                                    onChange={(event) => setDecisionReason(event.target.value)}
                                    placeholder="Always give a reason for reject or suspicious."
                                    className="w-full min-h-[120px] bg-black/30 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-titan-purple/50 resize-none"
                                />

                                <button
                                    onClick={() => handleDecision('APPROVE', `/kyc/admin/kyc/${selectedId}/approve`)}
                                    disabled={actionLoading !== null}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/25 px-4 py-3 font-semibold transition-colors disabled:opacity-60"
                                >
                                    {actionLoading === 'APPROVE' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Approve
                                </button>

                                <button
                                    onClick={() => handleDecision('REJECT', `/kyc/admin/kyc/${selectedId}/reject`, { reason: decisionReason })}
                                    disabled={actionLoading !== null}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/25 px-4 py-3 font-semibold transition-colors disabled:opacity-60"
                                >
                                    {actionLoading === 'REJECT' ? <Loader2 size={16} className="animate-spin" /> : <ShieldX size={16} />}
                                    Reject
                                </button>

                                <button
                                    onClick={() => handleDecision('SUSPICIOUS', `/kyc/admin/kyc/${selectedId}/suspicious`, { reason: decisionReason })}
                                    disabled={actionLoading !== null}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/25 px-4 py-3 font-semibold transition-colors disabled:opacity-60"
                                >
                                    {actionLoading === 'SUSPICIOUS' ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                                    Mark Suspicious
                                </button>
                            </div>
                        </PanelCard>

                        <PanelCard title="Smart Flags" icon={AlertTriangle}>
                            <div className="space-y-3 text-sm">
                                <SmartFlag label="Basic identity complete" ok={detail.checklist?.basicIdentity} />
                                <SmartFlag label="Government ID present" ok={detail.checklist?.governmentId} />
                                <SmartFlag label="Selfie present" ok={detail.checklist?.faceVerification} />
                                <SmartFlag label="Billing info present" ok={detail.checklist?.paymentVerification} />
                                <SmartFlag label="Risk flagged" ok={!detail.riskFlag} inverse />
                            </div>
                            {detail.riskReasons?.length > 0 && (
                                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                                    <div className="font-semibold mb-2">Risk reasons</div>
                                    <ul className="space-y-1 list-disc list-inside text-amber-50/90">
                                        {detail.riskReasons.map((reason) => (
                                            <li key={reason}>{reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </PanelCard>
                    </div>
                </div>
            </div>
        )
    } else {
        detailSection = (
            <div className="h-full min-h-[760px] flex flex-col items-center justify-center text-white/45 px-6 text-center">
                <ShieldAlert size={46} className="mb-4 text-white/20" />
                <h3 className="text-xl font-bold text-white mb-2">Select a KYC request</h3>
                <p className="max-w-lg">
                    The detail screen will show the user info, documents, previous attempts, and admin actions.
                </p>
            </div>
        )
    }

    let previewModal = null
    if (previewImage) {
        previewModal = (
            <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                tabIndex={0}
                onClick={() => setPreviewImage(null)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape' || event.key === 'Enter') {
                        setPreviewImage(null)
                    }
                }}
            >
                <div className="max-w-5xl max-h-[90vh] w-full bg-titan-bg-card border border-white/10 rounded-3xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2 text-white/80">
                            <ZoomIn size={16} />
                            Image zoom
                        </div>
                        <button onClick={() => setPreviewImage(null)} className="text-white/50 hover:text-white transition-colors">Close</button>
                    </div>
                    <div className="bg-black flex items-center justify-center p-4">
                        <img src={previewImage} alt="KYC preview" className="max-h-[75vh] w-auto object-contain rounded-2xl" />
                    </div>
                </div>
            </div>
        )
    }

    const detailRows = [
        { label: 'User ID', value: detail.user?.id },
        { label: 'Full Name', value: detail.user?.legalName || detail.user?.username || 'Not provided' },
        { label: 'Date of Birth', value: formatDateOnly(detail.user?.dateOfBirth) },
        { label: 'Phone', value: detail.user?.phone || 'Not provided', verified: detail.user?.phoneVerified },
        { label: 'Email', value: detail.user?.email || 'Not provided', verified: detail.user?.emailVerified },
        { label: 'Country', value: detail.user?.countryCode || 'Not provided' },
        { label: 'Billing', value: formatBillingSummary(detail.user?.billingAddress) },
        { label: 'Host Status', value: detail.user?.hostStatus || 'Not set' }
    ]

    return (
        <Layout userRole="ADMIN">
            <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-80 h-80 bg-titan-purple/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
                                Admin <GradientText>KYC Panel</GradientText>
                            </h1>
                            <p className="text-white/45 max-w-2xl">
                                One screen for KYC triage, one screen for deep review. Filter fast, inspect documents, then approve, reject, or flag risky accounts.
                            </p>
                        </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
                            <SummaryCard label="Visible" value={requests.length} icon={Eye} />
                            <SummaryCard label="Risk" value={requests.filter((request) => request.riskFlag).length} icon={ShieldAlert} accent="text-amber-300" />
                            <SummaryCard label="Pending" value={requests.filter((request) => request.displayStatus === 'PENDING').length} icon={Loader2} accent="text-yellow-300" />
                            <SummaryCard label="Approved" value={requests.filter((request) => request.displayStatus === 'APPROVED').length} icon={ShieldCheck} accent="text-emerald-300" />
                        </div>
                    </div>

                    <section className="bg-titan-bg-card border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl shadow-black/20">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
                                <FilterSelect label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(value) => updateFilter('status', value)} />
                                <FilterSelect label="Country" value={filters.country} options={[{ value: 'ALL', label: 'All countries' }, ...filteredCountries.map((country) => ({ value: country, label: country }))]} onChange={(value) => updateFilter('country', value)} />
                                <FilterSelect label="Risk" value={filters.risk} options={RISK_OPTIONS} onChange={(value) => updateFilter('risk', value)} />
                                <FilterSelect label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(value) => updateFilter('sort', value)} />
                            </div>

                            <div className="relative w-full xl:w-[320px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input
                                    value={filters.search}
                                    onChange={(event) => updateFilter('search', event.target.value)}
                                    placeholder="Search name, email, phone, or ID"
                                    className="w-full bg-black/30 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-titan-purple/50"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
                        <section className="bg-titan-bg-card border border-white/5 rounded-3xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="font-heading text-xl font-bold text-white">KYC Requests</h2>
                                    <p className="text-xs text-white/40">Click a row to open the review panel.</p>
                                </div>
                                <button
                                    onClick={refreshAll}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <RotateCcw size={14} /> Refresh
                                </button>
                            </div>

                            {listSection}
                        </section>

                        <section className="bg-titan-bg-card border border-white/5 rounded-3xl overflow-hidden min-h-[760px]">
                            {detailSection}
                        </section>
                    </div>
                </div>

                {previewModal}
            </div>
        </Layout>
    )
}

const SummaryCard = ({ label, value, icon: Icon, accent = 'text-white' }) => (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.25em] ${accent} opacity-80`}>
            <Icon size={12} /> {label}
        </div>
        <div className="mt-2 text-2xl font-display font-bold text-white">{value}</div>
    </div>
)

SummaryCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.elementType.isRequired,
    accent: PropTypes.string,
}

const FilterSelect = ({ label, value, options, onChange }) => (
    <label className="block">
        <span className="text-xs uppercase tracking-[0.25em] text-white/35">{label}</span>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-2 w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-titan-purple/50"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </label>
)

FilterSelect.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired
    })).isRequired,
    onChange: PropTypes.func.isRequired,
}

const PanelCard = ({ title, icon: Icon, children }) => (
    <div className="rounded-3xl border border-white/5 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-white/80 font-semibold mb-4">
            <Icon size={16} className="text-titan-purple" /> {title}
        </div>
        {children}
    </div>
)

PanelCard.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    children: PropTypes.node.isRequired,
}

const DetailLine = ({ label, value, verified }) => (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
        <div className="text-white/40 text-xs uppercase tracking-[0.2em]">{label}</div>
        <div className="text-right max-w-[60%]">
            <div className="text-white text-sm break-words">{value}</div>
            {verified !== undefined && (
                <div className={`text-[11px] mt-1 ${verified ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {verified ? 'OTP verified' : 'Not verified'}
                </div>
            )}
        </div>
    </div>
)

DetailLine.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    verified: PropTypes.bool,
}

const ChecklistList = ({ title, items, tone }) => {
    const toneClass = getToneClass(tone)

    return (
        <div className="mb-4 last:mb-0">
            <div className={`text-xs uppercase tracking-[0.25em] ${toneClass} mb-2`}>{title}</div>
            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item} className="text-sm text-white/70 flex items-start gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 rounded-full ${getToneDotClass(tone)}`} />
                        <span>{item}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

ChecklistList.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(PropTypes.string).isRequired,
    tone: PropTypes.oneOf(['emerald', 'rose', 'amber']).isRequired,
}

const DocumentTile = ({ label, value, fallback, onPreview }) => {
    const hasImage = Boolean(value)

    return (
        <button
            type="button"
            onClick={() => hasImage && onPreview(value)}
            className="text-left rounded-2xl border border-white/5 bg-black/25 overflow-hidden hover:border-white/15 transition-colors"
        >
            <div className="px-4 py-3 flex items-center justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-white/35">{label}</div>
                    <div className="text-sm text-white/70 mt-1">{hasImage ? 'Tap to zoom' : fallback}</div>
                </div>
                <ZoomIn size={16} className={hasImage ? 'text-white/50' : 'text-white/20'} />
            </div>
            <div className="bg-black/30 aspect-[4/3] flex items-center justify-center">
                {hasImage ? (
                    <img src={value} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-white/25 flex flex-col items-center gap-2">
                        <ImageIcon size={26} />
                        <span className="text-xs uppercase tracking-[0.25em]">Missing</span>
                    </div>
                )}
            </div>
        </button>
    )
}

const PreviewImageCard = ({ title, src, onClick }) => (
    <button
        type="button"
        onClick={() => src && onClick(src)}
        className="rounded-2xl border border-white/5 bg-black/30 overflow-hidden text-left hover:border-white/15 transition-colors"
    >
        <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.25em] text-white/35">{title}</span>
            <ZoomIn size={14} className={src ? 'text-white/45' : 'text-white/20'} />
        </div>
        <div className="aspect-square bg-black/40 flex items-center justify-center">
            {src ? (
                <img src={src} alt={title} className="w-full h-full object-cover" />
            ) : (
                <div className="text-white/25 flex flex-col items-center gap-2">
                    <ImageIcon size={24} />
                    <span className="text-xs uppercase tracking-[0.25em]">No image</span>
                </div>
            )}
        </div>
    </button>
)

DocumentTile.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    fallback: PropTypes.string.isRequired,
    onPreview: PropTypes.func.isRequired,
}

PreviewImageCard.propTypes = {
    title: PropTypes.string.isRequired,
    src: PropTypes.string,
    onClick: PropTypes.func.isRequired,
}

const BadgePill = ({ icon: Icon, label, tone = 'default' }) => {
    const toneClass = getBadgeToneClass(tone)

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${toneClass}`}>
            <Icon size={12} /> {label}
        </span>
    )

    BadgePill.propTypes = {
        icon: PropTypes.elementType.isRequired,
        label: PropTypes.string.isRequired,
        tone: PropTypes.oneOf(['default', 'emerald', 'rose', 'amber']),
    }
}

const SmartFlag = ({ label, ok, inverse = false }) => {
    const showGood = inverse ? !ok : ok
    return (
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
            <span className="text-white/70">{label}</span>
            <span className={`text-xs font-semibold ${showGood ? 'text-emerald-300' : 'text-rose-300'}`}>
                {showGood ? 'PASS' : 'REVIEW'}
            </span>
        </div>
    )

    SmartFlag.propTypes = {
        label: PropTypes.string.isRequired,
        ok: PropTypes.bool.isRequired,
        inverse: PropTypes.bool,
    }
}

export default ManageKycPanel