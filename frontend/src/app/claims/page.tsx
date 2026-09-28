"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw, Gavel, Clock, CheckCircle, XCircle, MessageSquare, Shield, ArrowRight, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"

interface ClaimItem {
  id: number
  match_id: number
  claimant_id: number
  verification_question: string
  verification_answer: string | null
  status: string
  created_at: string
  match: {
    id: number
    lost_item: { title: string }
    found_item: { title: string }
    final_score: number
  }
  claimant: {
    full_name: string
  }
}

export default function ClaimsPage() {
  const router = useRouter()
  const [myClaims, setMyClaims] = useState<ClaimItem[]>([])
  const [receivedClaims, setReceivedClaims] = useState<ClaimItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"my" | "received">("my")

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchClaims = async () => {
      try {
        const [myData, receivedData] = await Promise.all([
          api.get<ClaimItem[]>("/claims/my-claims"),
          api.get<ClaimItem[]>("/claims/received-claims"),
        ])
        setMyClaims(myData)
        setReceivedClaims(receivedData)
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()
  }, [router])

  const verifyClaim = async (claimId: number, approve: boolean) => {
    const answer = prompt("Enter verification answer:")
    if (!answer) return

    try {
      await api.patch(`/claims/${claimId}/verify`, {
        verification_answer: answer,
        approve,
      })
      // Refresh
      const [myData, receivedData] = await Promise.all([
        api.get<ClaimItem[]>("/claims/my-claims"),
        api.get<ClaimItem[]>("/claims/received-claims"),
      ])
      setMyClaims(myData)
      setReceivedClaims(receivedData)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to verify claim")
    }
  }

  const markReturned = async (claimId: number) => {
    if (!confirm("Mark this item as returned?")) return
    try {
      await api.patch(`/claims/${claimId}/return`, {})
      const [myData, receivedData] = await Promise.all([
        api.get<ClaimItem[]>("/claims/my-claims"),
        api.get<ClaimItem[]>("/claims/received-claims"),
      ])
      setMyClaims(myData)
      setReceivedClaims(receivedData)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as returned")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "verified":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const claims = activeTab === "my" ? myClaims : receivedClaims

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Claims</h1>

          <div className="flex bg-white/5 rounded-lg p-1 mb-6" role="group">
            <button
              onClick={() => setActiveTab("my")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "my"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:text-white"
              }`}
            >
              My Claims ({myClaims.length})
            </button>
            <button
              onClick={() => setActiveTab("received")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "received"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Received Claims ({receivedClaims.length})
            </button>
          </div>

          {claims.length === 0 ? (
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>{activeTab === "my" ? "No Claims Submitted" : "No Claims Received"}</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <Gavel className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg mb-2">
                  {activeTab === "my"
                    ? "You haven't submitted any claims yet"
                    : "No one has claimed your found items yet"}
                </p>
                <p className="text-white/40 mb-6">
                  {activeTab === "my"
                    ? "When a match is found for your lost item, you can submit a claim here"
                    : "Claims will appear here when someone claims your found items"}
                </p>
                <Link href="/matches">
                  <Button className="glow">
                    <Search className="h-4 w-4 mr-2" />
                    View Matches
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <Card key={claim.id} className="glass border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {activeTab === "my"
                            ? `Claim for: ${claim.match.lost_item.title}`
                            : `Claim by: ${claim.claimant.full_name}`}
                        </h3>
                        <p className="text-white/50 text-sm mt-1">
                          Match Score: {Math.round(claim.match.final_score * 100)}%
                        </p>
                      </div>
                      {getStatusBadge(claim.status)}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/50">Lost Item</p>
                        <p className="font-medium text-white">{claim.match.lost_item.title}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/50">Found Item</p>
                        <p className="font-medium text-white">{claim.match.found_item.title}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-white/50">Submitted</p>
                        <p className="font-medium text-white">{new Date(claim.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg mb-4">
                      <p className="text-xs text-white/50 mb-1">Verification Question</p>
                      <p className="text-white">{claim.verification_question}</p>
                      {claim.verification_answer && (
                        <p className="text-xs text-white/50 mt-1">Answer: {claim.verification_answer}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {claim.status === "pending" && activeTab === "received" && (
                        <>
                          <Button onClick={() => verifyClaim(claim.id, true)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button variant="destructive" onClick={() => verifyClaim(claim.id, false)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {claim.status === "verified" && activeTab === "received" && (
                        <Button onClick={() => markReturned(claim.id)} className="bg-blue-600 hover:bg-blue-700">
                          <Package className="h-4 w-4 mr-2" />
                          Mark as Returned
                        </Button>
                      )}
                      {claim.status === "verified" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {claim.status === "rejected" && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
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
    </div>
  )
}