"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Package, Box, RotateCcw, Bell, User, LogOut, Menu, X, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"
import { User as UserType } from "@/types"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchUser = async () => {
      try {
        const userData = await api.get<UserType>("/auth/me")
        setUser(userData)
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
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

  const stats = [
    { label: "Total Lost", value: "0", icon: Search, color: "text-blue-400" },
    { label: "Total Found", value: "0", icon: Package, color: "text-green-400" },
    { label: "Potential Matches", value: "0", icon: RotateCcw, color: "text-purple-400" },
    { label: "Successful Returns", value: "0", icon: Box, color: "text-yellow-400" },
  ]

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
                      Notifications
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
            {stats.map((stat) => (
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
                <CardTitle>My Lost Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">No lost items reported yet</p>
                <div className="text-center">
                  <Link href="/report/lost">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Search className="h-4 w-4 mr-2" />
                      Report Lost Item
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>My Found Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">No found items reported yet</p>
                <div className="text-center">
                  <Link href="/report/found">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Package className="h-4 w-4 mr-2" />
                      Report Found Item
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">No notifications yet</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}