"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw, Users, Package, Box, RotateCcw as RotateIcon, CheckCircle, TrendingUp, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    total_users: 0,
    lost_items: 0,
    found_items: 0,
    potential_matches: 0,
    successful_returns: 0,
    pending_claims: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchStats = async () => {
      try {
        const data = await api.get<typeof stats>("/admin/analytics")
        setStats(data)
      } catch {
        // Use mock data for now
        setStats({
          total_users: 0,
          lost_items: 0,
          found_items: 0,
          potential_matches: 0,
          successful_returns: 0,
          pending_claims: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  const statCards = [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-400" },
    { label: "Lost Items", value: stats.lost_items, icon: Package, color: "text-red-400" },
    { label: "Found Items", value: stats.found_items, icon: Box, color: "text-green-400" },
    { label: "Potential Matches", value: stats.potential_matches, icon: RotateIcon, color: "text-purple-400" },
    { label: "Successful Returns", value: stats.successful_returns, icon: CheckCircle, color: "text-yellow-400" },
    { label: "Pending Claims", value: stats.pending_claims, icon: TrendingUp, color: "text-orange-400" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Search className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">LostMatch Admin</span>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-white/60 mt-1">System analytics and statistics</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className="glass border-white/10">
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-white/60">{stat.label}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">Chart coming soon</p>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Location Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">Chart coming soon</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Match Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">Chart coming soon</p>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Recovery Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">Chart coming soon</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>IR Evaluation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">Evaluation results will appear here after running tests</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}