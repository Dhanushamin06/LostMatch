"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowLeft, Loader2, Image, MapPin, Calendar, Clock, Tag, HelpCircle, X, User, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/services/api"
import { ItemCategory } from "@/types"

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "BAGS", label: "Bags" },
  { value: "WALLETS", label: "Wallets" },
  { value: "ID_CARDS", label: "ID Cards" },
  { value: "KEYS", label: "Keys" },
  { value: "BOOKS", label: "Books" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "OTHER", label: "Other" },
]

export default function ReportLostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    category: "BAGS" as ItemCategory,
    description: "",
    identifying_features: "",
    location: "",
    lost_date: "",
    lost_time: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    additional_details: "",
  })

  // Load user profile to prefill contact details
  useState(() => {
    if (typeof window !== "undefined" && api.isAuthenticated()) {
      api.get<{ full_name: string; email: string; phone_number?: string } & Record<string, unknown>>("/profile")
        .then((profile) => {
          if (profile) {
            setFormData((prev) => ({
              ...prev,
              contact_name: prev.contact_name || profile.full_name || "",
              contact_email: prev.contact_email || profile.email || "",
              contact_phone: prev.contact_phone || profile.phone_number || "",
            }))
          }
        })
        .catch(() => {})
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        setError("File must be an image")
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.title || !formData.description || !formData.location || !formData.lost_date) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("title", formData.title)
      formDataToSend.append("category", formData.category)
      formDataToSend.append("description", formData.description)
      formDataToSend.append("identifying_features", formData.identifying_features)
      formDataToSend.append("location", formData.location)
      formDataToSend.append("lost_date", formData.lost_date)
      if (formData.lost_time) formDataToSend.append("lost_time", formData.lost_time)
      if (formData.contact_name) formDataToSend.append("contact_name", formData.contact_name)
      if (formData.contact_phone) formDataToSend.append("contact_phone", formData.contact_phone)
      if (formData.contact_email) formDataToSend.append("contact_email", formData.contact_email)
      if (formData.additional_details) formDataToSend.append("additional_details", formData.additional_details)
      if (imageFile) formDataToSend.append("image", imageFile)

      await api.upload("/lost-items", formDataToSend)
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report")
    } finally {
      setLoading(false)
    }
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
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Report Lost Item</h1>
            <p className="text-white/60 mt-2">Provide details to help AI find matches</p>
          </div>

          <Card className="glass-strong border-white/10">
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Black Wildcraft Backpack"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as ItemCategory }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the item in detail: color, brand, size, condition, any unique marks..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifying_features">Identifying Features</Label>
                  <Textarea
                    id="identifying_features"
                    name="identifying_features"
                    placeholder="e.g., Red keychain on left strap, small tear on bottom right corner, 'JD' initials inside"
                    value={formData.identifying_features}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-white/50" />
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., Near College Library, Main Campus"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lost_date">Date Lost *</Label>
                    <Input
                      id="lost_date"
                      name="lost_date"
                      type="date"
                      value={formData.lost_date}
                      onChange={handleInputChange}
                      required
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lost_time">Time Lost (approx)</Label>
                    <Input
                      id="lost_time"
                      name="lost_time"
                      type="time"
                      value={formData.lost_time}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Item Image</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {imagePreview ? (
                        <div className="relative">
                          <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null)
                              setImageFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white hover:bg-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Image className="h-12 w-12 text-white/30" />
                          <div>
                            <p className="text-white/70">Click or drag to upload</p>
                            <p className="text-xs text-white/40">PNG, JPG up to 5MB</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Contact & Person Details */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium text-base">
                    <User className="h-5 w-5" />
                    <span>Contact & Owner Information</span>
                  </div>
                  <p className="text-xs text-white/50 -mt-2">
                    These details will be shared with verified finders to help return your item quickly.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_name">Your Name / Contact Person</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                        <Input
                          id="contact_name"
                          name="contact_name"
                          placeholder="e.g., John Doe"
                          className="pl-9"
                          value={formData.contact_name}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Mobile / Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                        <Input
                          id="contact_phone"
                          name="contact_phone"
                          type="tel"
                          placeholder="e.g., +91 98765 43210"
                          className="pl-9"
                          value={formData.contact_phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        placeholder="e.g., john@example.com"
                        className="pl-9"
                        value={formData.contact_email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional_details">Additional Contact Instructions / Notes</Label>
                    <Textarea
                      id="additional_details"
                      name="additional_details"
                      placeholder="e.g., Available between 2 PM - 7 PM, Reachable on WhatsApp, Reward offered for return"
                      value={formData.additional_details}
                      onChange={handleInputChange}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Link href="/dashboard">
                    <Button type="button" variant="outline" className="flex-1">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1 glow" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}