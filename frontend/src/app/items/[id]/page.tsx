"use client"

import { Suspense, use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, MapPin, Calendar, Clock, Tag, FileText, Eye,
  User, Mail, Phone, MessageCircle, Info, Package, Search, AlertTriangle, CheckCircle
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"

interface ItemDetail {
  id: number
  title: string
  category: string
  description: string
  identifying_features: string
  image_url: string | null
  location: string
  lost_date?: string
  found_date?: string
  lost_time?: string
  found_time?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  additional_details?: string
  status: string
  created_at: string
  user_id: number
  user_name?: string
  user_email?: string
  user_phone?: string
}

function ItemDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemType = searchParams.get("type")

  const [item, setItem] = useState<ItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchItem = async () => {
      try {
        let data: ItemDetail | null = null
        if (itemType === "found") {
          data = await api.get<ItemDetail>(`/found-items/${id}`)
        } else if (itemType === "lost") {
          data = await api.get<ItemDetail>(`/lost-items/${id}`)
        } else {
          try {
            data = await api.get<ItemDetail>(`/lost-items/${id}`)
          } catch {
            data = await api.get<ItemDetail>(`/found-items/${id}`)
          }
        }
        setItem(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load item")
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id, itemType, router])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lost": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Lost</Badge>
      case "found": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Found</Badge>
      case "potential_match": return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Potential Match</Badge>
      case "claim_pending": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Claim Pending</Badge>
      case "verified": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>
      case "returned": return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Returned</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass border-red-500/30 bg-red-500/10 max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Item Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-4">{error || "This item does not exist or you do not have access to it."}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isFound = itemType === "found" || (item.found_date != null && item.lost_date == null)
  const dateLabel = isFound ? "Found" : "Lost"
  const itemDate = isFound ? item.found_date : item.lost_date
  const itemTime = isFound ? item.found_time : item.lost_time

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Search className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">LostMatch</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              {item.image_url ? (
                <img src={api.getImageUrl(item.image_url)!} alt={item.title} className="w-full rounded-2xl object-cover max-h-[500px] border border-white/10" />
              ) : (
                <div className="w-full h-80 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Package className="h-20 w-20 text-white/20" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold text-white">{item.title}</h1>
                {getStatusBadge(item.status)}
              </div>

              <div className="flex items-center gap-2 text-white/60">
                <Tag className="h-4 w-4" />
                <span className="capitalize">{item.category.replace(/_/g, " ")}</span>
              </div>

              <div className="flex items-center gap-2 text-white/60">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{item.location}</span>
              </div>

              {itemDate && (
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{dateLabel}: {itemDate}</span>
                  {itemTime && <><Clock className="h-4 w-4 ml-2" /><span>{itemTime}</span></>}
                </div>
              )}

              {item.description && (
                <Card className="glass border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <FileText className="h-4 w-4" />Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-white/80 leading-relaxed">{item.description}</p></CardContent>
                </Card>
              )}

              {item.identifying_features && (
                <Card className="glass border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <Eye className="h-4 w-4" />Identifying Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-white/80 leading-relaxed">{item.identifying_features}</p></CardContent>
                </Card>
              )}

              {/* Person & Contact Details */}
              {(item.contact_name || item.user_name || item.contact_phone || item.user_phone || item.contact_email || item.user_email || item.additional_details) && (
                <Card className={`glass ${isFound ? "border-green-500/30 bg-green-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-base font-semibold flex items-center gap-2 ${isFound ? "text-green-400" : "text-blue-400"}`}>
                      <User className="h-5 w-5" />
                      {isFound ? "Finder & Handover Contact" : "Owner & Contact Person"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-base">
                        {item.contact_name || item.user_name || "Anonymous User"}
                      </p>
                      {item.user_name && item.contact_name && item.user_name !== item.contact_name && (
                        <span className="text-xs text-white/50">(Account: {item.user_name})</span>
                      )}
                    </div>

                    {/* Phone / Mobile */}
                    {(item.contact_phone || item.user_phone) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-2 text-white/80">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="font-mono text-sm">{item.contact_phone || item.user_phone}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${item.contact_phone || item.user_phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30 text-xs font-medium transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${(item.contact_phone || item.user_phone || "").replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {(item.contact_email || item.user_email) && (
                      <div className="flex items-center gap-2 text-white/70">
                        <Mail className="h-4 w-4 text-primary" />
                        <a
                          href={`mailto:${item.contact_email || item.user_email}`}
                          className="hover:text-primary transition-colors text-sm underline decoration-white/20 underline-offset-2"
                        >
                          {item.contact_email || item.user_email}
                        </a>
                      </div>
                    )}

                    {/* Handover / Additional details */}
                    {item.additional_details && (
                      <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                        <p className="text-xs font-medium text-white/50 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          {isFound ? "Custody / Handover Location" : "Special Instructions"}
                        </p>
                        <p className="text-sm text-white/90 leading-relaxed">{item.additional_details}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="pt-2">
                <Link href="/matches">
                  <Button className="w-full glow">
                    <CheckCircle className="h-4 w-4 mr-2" />View Potential Matches
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ItemDetailContent id={id} />
    </Suspense>
  )
}