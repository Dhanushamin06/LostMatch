"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw, Bell, Check, Mail, Shield, Package, RotateCcw as RotateCcwIcon, Clock, MessageSquare, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"

interface Notification {
  id: number
  type: string
  message: string
  is_read: number
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        const [notifData, countData] = await Promise.all([
          api.get<Notification[]>("/notifications?limit=50"),
          api.get<{ unread_count: number }>("/notifications/unread-count"),
        ])
        setNotifications(notifData)
        setUnreadCount(countData.unread_count)
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`, {})
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all", {})
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "claim_submitted":
        return <MessageSquare className="h-4 w-4 text-blue-400" />
      case "claim_approved":
        return <Check className="h-4 w-4 text-green-400" />
      case "claim_rejected":
        return <X className="h-4 w-4 text-red-400" />
      case "item_returned":
        return <Package className="h-4 w-4 text-yellow-400" />
      default:
        return <Bell className="h-4 w-4 text-primary" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "claim_submitted":
        return "Claim Submitted"
      case "claim_approved":
        return "Claim Approved"
      case "claim_rejected":
        return "Claim Rejected"
      case "item_returned":
        return "Item Returned"
      default:
        return "Notification"
    }
  }

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => n.is_read === 0)
    : notifications

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
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Notifications</h1>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {unreadCount} unread
                </Badge>
              )}
              <div className="flex bg-white/5 rounded-lg p-1" role="group">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    filter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    filter === "unread"
                      ? "bg-primary text-primary-foreground"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Unread
                </button>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <Card className="glass border-white/10">
              <CardContent className="text-center py-12">
                <Bell className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-white/40 mt-2">
                  {filter === "unread"
                    ? "All caught up!"
                    : "Notifications will appear here when you get matches or claims"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`glass border-white/10 transition-colors ${
                    notif.is_read === 0 ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white/5 flex-shrink-0">
                        {getTypeIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white capitalize">{getTypeLabel(notif.type)}</h4>
                          <span className="text-xs text-white/50 whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/70 mt-1 text-sm">{notif.message}</p>
                      </div>
                      {notif.is_read === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary"
                          onClick={() => markAsRead(notif.id)}
                          aria-label="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
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