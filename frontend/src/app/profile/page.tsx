"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw, User, Mail, Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"
import { User as UserType } from "@/types"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ full_name: "", email: "", phone_number: "", alt_contact: "" })
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" })
  const [message, setMessage] = useState({ type: "", text: "" })

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login")
      return
    }

    const fetchUser = async () => {
      try {
        const userData = await api.get<UserType>("/profile")
        setUser(userData)
        setFormData({
          full_name: userData.full_name || "",
          email: userData.email || "",
          phone_number: userData.phone_number || "",
          alt_contact: userData.alt_contact || "",
        })
      } catch {
        api.logout()
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: "", text: "" })

    try {
      await api.patch("/profile", formData)
      setMessage({ type: "success", text: "Profile updated successfully" })
      const updatedUser = await api.get<UserType>("/profile")
      setUser(updatedUser)
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile" })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: "", text: "" })

    if (passwordData.new !== passwordData.confirm) {
      setMessage({ type: "error", text: "New passwords do not match" })
      setSaving(false)
      return
    }

    if (passwordData.new.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" })
      setSaving(false)
      return
    }

    try {
      await api.patch("/auth/password", {
        current_password: passwordData.current,
        new_password: passwordData.new,
      })
      setMessage({ type: "success", text: "Password changed successfully" })
      setPasswordData({ current: "", new: "", confirm: "" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to change password" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

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
          <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

          {message.text && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-red-500/20 border border-red-500/30 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <Card className="glass-strong border-white/10 mb-6">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Mobile / Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    placeholder="e.g., +91 98765 43210"
                    value={formData.phone_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alt_contact">Alternate Contact / Notes</Label>
                  <Input
                    id="alt_contact"
                    name="alt_contact"
                    placeholder="e.g., WhatsApp, Telegram handle, Room 204"
                    value={formData.alt_contact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, alt_contact: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={user.role}
                    disabled
                    className="bg-white/5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={new Date(user.created_at).toLocaleDateString()}
                    disabled
                    className="bg-white/5"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-strong border-white/10">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, current: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, new: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirm: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" variant="outline" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}