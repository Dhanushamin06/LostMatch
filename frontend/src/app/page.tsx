"use client"

import dynamic from "next/dynamic"
import { ArrowRight, Search, Shield, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

// Dynamically load the 3D Canvas to disable SSR
const LandingScene = dynamic(
  () => import("@/components/3d/LandingScene").then((mod) => mod.LandingScene),
  { ssr: false }
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Search className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-text">LostMatch</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register">
                <Button variant="glass" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">

          {/* 3D Background Container */}
          <div className="absolute inset-0 z-0">
            <LandingScene />
            {/* Softened gradient overlays with pointer-events-none so mouse drag works */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/40 via-transparent to-background" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          </div>

          {/* Hero Foreground Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pointer-events-none">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left pointer-events-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/30 mb-6">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Powered by Multimodal AI</span>
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                  Lost something?<br />
                  <span className="gradient-text">Let AI find it.</span>
                </h1>
                <p className="text-lg sm:text-xl text-white/70 mb-8 max-w-xl mx-auto lg:mx-0">
                  Report lost or found items instantly. Our AI matches visual similarity,
                  semantic descriptions, location proximity, and time to retrieve the best matches automatically.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link href="/report/lost">
                    <Button size="lg" className="w-full sm:w-auto gap-2 glow" style={{ padding: '1rem 2rem' }}>
                      <Search className="h-5 w-5" />
                      Report Lost Item
                    </Button>
                  </Link>
                  <Link href="/report/found">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" style={{ padding: '1rem 2rem' }}>
                      <ArrowRight className="h-5 w-5" />
                      Report Found Item
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 gap-4 lg:gap-6 pointer-events-auto">
                <Card className="glass border-white/10 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Search className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">Multimodal Search</h3>
                    <p className="text-sm text-white/60">Combines image, text, location & time</p>
                  </CardContent>
                </Card>
                <Card className="glass border-white/10 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Zap className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">Instant Matching</h3>
                    <p className="text-sm text-white/60">Real-time retrieval with FAISS</p>
                  </CardContent>
                </Card>
                <Card className="glass border-white/10 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Shield className="h-5 w-5 text-green-400" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">Secure Claims</h3>
                    <p className="text-sm text-white/60">Verification without exposing contacts</p>
                  </CardContent>
                </Card>
                <Card className="glass border-white/10 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">Explainable AI</h3>
                    <p className="text-sm text-white/60">See why each match was found</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5 border-y border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 gradient-text">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Report", desc: "Submit a lost or found item with photo, description, location, and time." },
                { step: "02", title: "AI Retrieval", desc: "Our system generates embeddings and searches the opposite collection using FAISS." },
                { step: "03", title: "Get Matches", desc: "Receive ranked matches with explainable scores for image, text, location, and time." },
              ].map((item) => (
                <Card key={item.step} className="glass border-white/10 p-6 text-center hover:border-primary/30 transition-all">
                  <div className="text-4xl font-bold text-primary/50 mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/70">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center text-white/50 text-sm">
          <p>LostMatch - AI-Powered Multimodal Lost & Found Retrieval System</p>
          <p className="mt-2">Built with Next.js, FastAPI, PostgreSQL, FAISS, and Sentence Transformers</p>
        </div>
      </footer>
    </div>
  )
}