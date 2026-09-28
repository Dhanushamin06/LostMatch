"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Package, Box, RotateCcw, Trash2, Edit, Eye, MoreVertical, MapPin } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { api } from "@/services/api"
import { ItemCategory, ItemStatus } from "@/types"

interface ItemSummary {
  id: number
  title: string
  category: string
  description: string
  identifying_features: string
  image_url: string | null
  location: string
  latitude: number | null
  longitude: number | null
  lost_date?: string
  found_date?: string
  lost_time?: string
  found_time?: string
  status: string
  created_at: string
  user_id: number
  text_embedding_id: number | null
  image_embedding_id: number | null
}

export default function ItemsPage() {
  const router = useRouter()
  const [lostItems, setLostItems] = useState<ItemSummary[]>([])
  const [foundItems, setFoundItems] = useState<ItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost")

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchItems = async () => {
      try {
        const [lostData, foundData] = await Promise.all([
          api.get<ItemSummary[]>("/lost-items"),
          api.get<ItemSummary[]>("/found-items"),
        ])
        setLostItems(lostData)
        setFoundItems(foundData)
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [router])

  const deleteItem = async (type: "lost" | "found", id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      await api.delete(`/${type}-items/${id}`)
      if (type === "lost") {
        setLostItems((prev) => prev.filter((item) => item.id !== id))
      } else {
        setFoundItems((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item")
    }
  }

  const rematchItem = async (type: "lost" | "found", id: number) => {
    try {
      await api.post(`/${type}-items/${id}/rematch`, {})
      alert("Re-matching triggered!")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to trigger re-match")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "lost":
      case "found":
        return <Badge variant="secondary">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
      case "potential_match":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Potential Match</Badge>
      case "claim_pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Claim Pending</Badge>
      case "verified":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>
      case "returned":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Returned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const items = activeTab === "lost" ? lostItems : foundItems
  const ItemIcon = activeTab === "lost" ? Search : Package

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
          <h1 className="text-3xl font-bold mb-8">My Items</h1>

          <div className="flex bg-white/5 rounded-lg p-1 mb-6" role="group">
            <button
              onClick={() => setActiveTab("lost")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "lost"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Search className="h-4 w-4 mr-2 inline" />
              Lost Items ({lostItems.length})
            </button>
            <button
              onClick={() => setActiveTab("found")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "found"
                  ? "bg-primary text-primary-foreground"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Package className="h-4 w-4 mr-2 inline" />
              Found Items ({foundItems.length})
            </button>
          </div>

          {items.length === 0 ? (
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>{activeTab === "lost" ? "No Lost Items" : "No Found Items"}</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <ItemIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg mb-2">
                  {activeTab === "lost" ? "You haven't reported any lost items yet" : "You haven't reported any found items yet"}
                </p>
                <Link href={`/report/${activeTab}`}>
                  <Button className="glow mt-4">
                    <Search className="h-4 w-4 mr-2" />
                    Report {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="glass border-white/10 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={api.getImageUrl(item.image_url)!}
                      alt={item.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-white/5 flex items-center justify-center">
                      <ItemIcon className="h-12 w-12 text-white/30" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white truncate pr-2">{item.title}</h4>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-white/50 mb-2 capitalize">{item.category.replace("_", " ")}</p>
                    <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </p>
                    <p className="text-xs text-white/40 mb-3">
                      {activeTab === "lost" ? "Lost" : "Found"}: {item.lost_date || item.found_date}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <Link
                        href={`/items/${item.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white/10 border-white/20">
                          <DropdownMenuItem
                            className="text-white hover:bg-primary/20"
                            onClick={() => rematchItem(activeTab, item.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Re-match
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-red-500/20"
                            onClick={() => deleteItem(activeTab, item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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