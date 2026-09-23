"use client"

import { Search, Package, Box, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ItemsPage() {
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
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Lost Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">No lost items reported yet</p>
                <Link href="/report/lost">
                  <Button variant="outline" className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Report Lost Item
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle>Found Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-center py-8">No found items reported yet</p>
                <Link href="/report/found">
                  <Button variant="outline" className="w-full">
                    <Package className="h-4 w-4 mr-2" />
                    Report Found Item
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}