"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw, ArrowRight, CheckCircle, XCircle, Clock, Eye, MessageSquare, AlertCircle, MapPin, Calendar, Phone, MessageCircle, Mail, User, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"

interface MatchItem {
  id: number
  lost_item_id: number
  found_item_id: number
  image_score: number
  text_score: number
  location_score: number
  time_score: number
  final_score: number
  status: string
  created_at: string
  lost_item: ItemSummary
  found_item: ItemSummary
}

interface UserSummary {
  full_name: string
  email: string
  phone_number?: string | null
}

interface ItemSummary {
  id: number
  title: string
  category: string
  description?: string
  identifying_features?: string
  image_url: string | null
  location: string
  lost_date?: string
  found_date?: string
  lost_time?: string
  found_time?: string
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  additional_details?: string | null
  user_id: number
  user?: UserSummary | null
}

export default function MatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [claimModal, setClaimModal] = useState<{ open: boolean; matchId: number | null }>({ open: false, matchId: null })
  const [claimQuestion, setClaimQuestion] = useState("")
  const [claimSubmitting, setClaimSubmitting] = useState(false)

  const openClaimModal = (matchId: number) => {
    setClaimModal({ open: true, matchId })
    setClaimQuestion("")
  }

  const submitClaim = async () => {
    if (!claimQuestion.trim() || !claimModal.matchId) return
    setClaimSubmitting(true)
    try {
      await api.post("/claims", {
        match_id: claimModal.matchId,
        verification_question: claimQuestion,
      })
      setClaimModal({ open: false, matchId: null })
      // Refresh matches
      const data = await api.get<MatchItem[]>("/matches")
      setMatches(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit claim")
    } finally {
      setClaimSubmitting(false)
    }
  }

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchMatches = async () => {
      try {
        const data = await api.get<MatchItem[]>("/matches")
        setMatches(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load matches")
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [router])

  const formatScore = (score: number) => Math.round(score * 100) + "%"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>
      case "claim_pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Claim Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Search className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">LostMatch</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Potential Matches</h1>

          {error && (
            <Card className="glass border-red-500/30 bg-red-500/10 mb-6">
              <CardContent className="text-red-400">{error}</CardContent>
            </Card>
          )}

          {matches.length === 0 ? (
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>No Matches Found</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-white/60 text-lg mb-4">No potential matches yet</p>
                <p className="text-white/40 mb-6">Report a lost or found item to start AI-powered matching</p>
                <div className="flex gap-4 justify-center">
                  <Link href="/report/lost">
                    <Button className="glow">
                      <Search className="h-4 w-4 mr-2" />
                      Report Lost Item
                    </Button>
                  </Link>
                  <Link href="/report/found">
                    <Button variant="outline">
                      <Search className="h-4 w-4 mr-2" />
                      Report Found Item
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <Card key={match.id} className="glass border-white/10">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Match Score: {formatScore(match.final_score)}</h3>
                          {getStatusBadge(match.status)}
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between text-white/70">
                            <span>Visual Similarity</span>
                            <span className="font-medium">{formatScore(match.image_score)}</span>
                          </div>
                          <div className="flex justify-between text-white/70">
                            <span>Description Match</span>
                            <span className="font-medium">{formatScore(match.text_score)}</span>
                          </div>
                          <div className="flex justify-between text-white/70">
                            <span>Location Match</span>
                            <span className="font-medium">{formatScore(match.location_score)}</span>
                          </div>
                          <div className="flex justify-between text-white/70">
                            <span>Time Match</span>
                            <span className="font-medium">{formatScore(match.time_score)}</span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                          <p className="text-xs text-white/50">Matched on {new Date(match.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 gap-6">
                        <div className="p-4 bg-white/5 rounded-lg">
                          <h4 className="font-medium text-white/60 mb-3">Lost Item</h4>
                          <Link href={`/items/${match.lost_item.id}?type=lost`} className="block group">
                            {match.lost_item.image_url ? (
                              <img src={api.getImageUrl(match.lost_item.image_url)!} alt={match.lost_item.title} className="w-full h-40 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity" />
                            ) : (
                              <div className="w-full h-40 bg-white/5 rounded-lg flex items-center justify-center mb-3">
                                <Search className="h-10 w-10 text-white/30" />
                              </div>
                            )}
                            <h5 className="font-medium text-white truncate group-hover:text-primary transition-colors">{match.lost_item.title}</h5>
                            <p className="text-xs text-white/50 mt-1">{match.lost_item.category}</p>
                            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.lost_item.location}
                            </p>
                            {match.lost_item.lost_date && (
                              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Lost: {match.lost_item.lost_date}
                              </p>
                            )}
                          </Link>
                          {/* Contact Person Details */}
                          {(match.lost_item.contact_name || match.lost_item.user || match.lost_item.contact_phone) && (
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-1.5">
                              <p className="text-xs font-semibold text-blue-400">Lost By / Contact:</p>
                              <p className="font-medium text-white text-sm">
                                {match.lost_item.contact_name || match.lost_item.user?.full_name || "Owner"}
                              </p>
                              {(match.lost_item.contact_phone || match.lost_item.user?.phone_number) && (
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <span className="text-xs text-white/70 font-mono">
                                    {match.lost_item.contact_phone || match.lost_item.user?.phone_number}
                                  </span>
                                  <div className="flex gap-1">
                                    <a
                                      href={`tel:${match.lost_item.contact_phone || match.lost_item.user?.phone_number}`}
                                      className="p-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 text-[11px] font-medium"
                                      title="Call"
                                    >
                                      <Phone className="h-3 w-3" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${(match.lost_item.contact_phone || match.lost_item.user?.phone_number || "").replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded bg-green-500/20 text-green-300 hover:bg-green-500/40 text-[11px] font-medium"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              )}
                              {(match.lost_item.contact_email || match.lost_item.user?.email) && (
                                <p className="text-xs text-white/60 truncate">
                                  {match.lost_item.contact_email || match.lost_item.user?.email}
                                </p>
                              )}
                              {match.lost_item.additional_details && (
                                <p className="text-[11px] text-white/50 italic pt-1 border-t border-white/5">
                                  Note: {match.lost_item.additional_details}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-white/5 rounded-lg">
                          <h4 className="font-medium text-white/60 mb-3">Found Item</h4>
                          <Link href={`/items/${match.found_item.id}?type=found`} className="block group">
                            {match.found_item.image_url ? (
                              <img src={api.getImageUrl(match.found_item.image_url)!} alt={match.found_item.title} className="w-full h-40 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity" />
                            ) : (
                              <div className="w-full h-40 bg-white/5 rounded-lg flex items-center justify-center mb-3">
                                <Search className="h-10 w-10 text-white/30" />
                              </div>
                            )}
                            <h5 className="font-medium text-white truncate group-hover:text-primary transition-colors">{match.found_item.title}</h5>
                            <p className="text-xs text-white/50 mt-1">{match.found_item.category}</p>
                            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.found_item.location}
                            </p>
                            {match.found_item.found_date && (
                              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Found: {match.found_item.found_date}
                              </p>
                            )}
                          </Link>
                          {/* Finder Contact Details */}
                          {(match.found_item.contact_name || match.found_item.user || match.found_item.contact_phone) && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-1.5">
                              <p className="text-xs font-semibold text-green-400">Found By / Handover:</p>
                              <p className="font-medium text-white text-sm">
                                {match.found_item.contact_name || match.found_item.user?.full_name || "Finder"}
                              </p>
                              {(match.found_item.contact_phone || match.found_item.user?.phone_number) && (
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <span className="text-xs text-white/70 font-mono">
                                    {match.found_item.contact_phone || match.found_item.user?.phone_number}
                                  </span>
                                  <div className="flex gap-1">
                                    <a
                                      href={`tel:${match.found_item.contact_phone || match.found_item.user?.phone_number}`}
                                      className="p-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 text-[11px] font-medium"
                                      title="Call"
                                    >
                                      <Phone className="h-3 w-3" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${(match.found_item.contact_phone || match.found_item.user?.phone_number || "").replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded bg-green-500/20 text-green-300 hover:bg-green-500/40 text-[11px] font-medium"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              )}
                              {(match.found_item.contact_email || match.found_item.user?.email) && (
                                <p className="text-xs text-white/60 truncate">
                                  {match.found_item.contact_email || match.found_item.user?.email}
                                </p>
                              )}
                              {match.found_item.additional_details && (
                                <p className="text-[11px] text-white/50 italic pt-1 border-t border-white/5">
                                  Location/Custody: {match.found_item.additional_details}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {match.status === "pending" && (
                        <>
                          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => openClaimModal(match.id)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Submit Claim
                          </Button>
                          <Button variant="ghost">
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {match.status === "confirmed" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Match Confirmed
                        </Badge>
                      )}
                      {match.status === "claim_pending" && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          Claim Under Review
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Claim Submission Modal */}
      {claimModal.open && claimModal.matchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/10 glass-strong rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Submit Claim</h3>
            <p className="text-white/70 mb-4">Enter a verification question that only the true owner would know the answer to.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Verification Question</label>
                <textarea
                  value={claimQuestion}
                  onChange={(e) => setClaimQuestion(e.target.value)}
                  placeholder="e.g., What color is the keychain attached to the bag? What are the initials written inside?"
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-white/40 focus:border-primary focus:outline-none"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setClaimModal({ open: false, matchId: null })}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={claimSubmitting || !claimQuestion.trim()} onClick={submitClaim}>
                  {claimSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Claim"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}