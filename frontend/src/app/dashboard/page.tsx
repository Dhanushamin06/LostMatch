"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Package, Box, RotateCcw, Bell, User, LogOut, Menu, X, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"
import { User as UserType } from "@/types"

interface DashboardStats {
  lost_items: number
  found_items: number
  lost_matched: number
  found_matched: number
  successful_returns: number
  pending_claims: number
  unread_notifications: number
}

interface ItemSummary {
  id: number
  title: string
  category: string
  image_url: string | null
  location: string
  lost_date?: string
  found_date?: string
  status: string
  created_at: string
  user_id: number
}

function ItemList({ items, type, emptyMessage, reportHref, icon: Icon }: {
  items: ItemSummary[]
  type: "lost" | "found"
  emptyMessage: string
  reportHref: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const dateField = type === "lost" ? "lost_date" : "found_date"
  const iconColor = type === "lost" ? "text-blue-400" : "text-green-400"

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">{emptyMessage}</p>
        <Link href={reportHref} className="mt-4 inline-block">
          <Button variant="outline" className="w-full sm:w-auto">
            <Icon className="h-4 w-4 mr-2" />
            Report {type.charAt(0).toUpperCase() + type.slice(1)} Item
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {items.slice(0, 3).map((item) => (
        <Link key={item.id} href={`/items/${item.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="h-12 w-12 object-cover rounded-lg" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{item.title}</p>
            <p className="text-xs text-white/50">{item.location} • {item[dateField]}</p>
          </div>
          <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/70">{item.status}</span>
        </Link>
      ))}
      {items.length > 3 && (
        <Link href="/items" className="text-center text-sm text-primary hover:underline block mt-2">
          View all {items.length} {type} items
        </Link>
      )}
    </div>
  )
}

function NotificationList({ notifications }: { notifications: any[] }) {
  if (notifications.length === 0) {
    return <p className="text-white/60 text-center py-8">No notifications yet</p>
  }

  return (
    <div className="space-y-2">
      {notifications.slice(0, 5).map((notif) => (
        <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
          <Bell className="h-5 w-5 text-primary/80 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white">{notif.message}</p>
            <p className="text-xs text-white/40">{new Date(notif.created_at).toLocaleString()}</p>
          </div>
          {!notif.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
      ))}
      {notifications.length > 5 && (
        <Link href="/notifications" className="text-center text-sm text-primary hover:underline block mt-2">
          View all notifications
        </Link>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lostItems, setLostItems] = useState<ItemSummary[]>([])
  const [foundItems, setFoundItems] = useState<ItemSummary[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        const [userData, statsData, lostData, foundData, notifData] = await Promise.all([
          api.get<UserType>("/auth/me"),
          api.get<DashboardStats>("/profile/stats"),
          api.get<ItemSummary[]>("/lost-items"),
          api.get<ItemSummary[]>("/found-items"),
          api.get<any[]>("/notifications?limit=5"),
        ])
        setUser(userData)
        setStats(statsData)
        setLostItems(lostData)
        setFoundItems(foundData)
        setNotifications(notifData)
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = () => {
    api.logout()
    router.push("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const statCards = stats ? [
    { label: "Total Lost", value: stats.lost_items, icon: Search, color: "text-blue-400" },
    { label: "Total Found", value: stats.found_items, icon: Package, color: "text-green-400" },
    { label: "Potential Matches", value: stats.lost_matched + stats.found_matched, icon: RotateCcw, color: "text-purple-400" },
    { label: "Successful Returns", value: stats.successful_returns, icon: Box, color: "text-yellow-400" },
  ] : []

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Search className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">LostMatch</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-primary">Dashboard</Link>
              <Link href="/report/lost" className="text-sm font-medium text-white/70 hover:text-white">Report Lost</Link>
              <Link href="/report/found" className="text-sm font-medium text-white/70 hover:text-white">Report Found</Link>
              <Link href="/matches" className="text-sm font-medium text-white/70 hover:text-white">Matches</Link>
              <Link href="/items" className="text-sm font-medium text-white/70 hover:text-white">My Items</Link>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden md:block text-sm font-medium">{user.full_name}</span>
                  <ChevronDown className="h-4 w-4 text-white/50" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass-strong rounded-lg border border-white/10 py-2 shadow-lg">
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link href="/notifications" className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5">
                      <Bell className="h-4 w-4" />
                      Notifications {stats && stats.unread_notifications > 0 && (
                        <span className="bg-red-500 text-xs rounded-full px-1.5 py-0.5">{stats.unread_notifications}</span>
                      )}
                    </Link>
                    <hr className="border-white/10 my-2" />
                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 md:hidden glass-strong border-b border-white/10 p-4 z-40">
          <div className="flex flex-col gap-2">
            <Link href="/dashboard" className="px-4 py-2 text-white/70 hover:text-white">Dashboard</Link>
            <Link href="/report/lost" className="px-4 py-2 text-white/70 hover:text-white">Report Lost</Link>
            <Link href="/report/found" className="px-4 py-2 text-white/70 hover:text-white">Report Found</Link>
            <Link href="/matches" className="px-4 py-2 text-white/70 hover:text-white">Matches</Link>
            <Link href="/items" className="px-4 py-2 text-white/70 hover:text-white">My Items</Link>
          </div>
        </div>
      )}

      <main className="pt-20 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome back, {user.full_name}</h1>
            <p className="text-white/60 mt-1">Here's an overview of your lost & found activity</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className="glass border-white/10">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">{stat.label}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Lost Items</CardTitle>
                  <Link href="/items">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ItemList
                  items={lostItems}
                  type="lost"
                  emptyMessage="No lost items reported yet"
                  reportHref="/report/lost"
                  icon={Search}
                />
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Found Items</CardTitle>
                  <Link href="/items">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ItemList
                  items={foundItems}
                  type="found"
                  emptyMessage="No found items reported yet"
                  reportHref="/report/found"
                  icon={Package}
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notifications</CardTitle>
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <NotificationList notifications={notifications} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}