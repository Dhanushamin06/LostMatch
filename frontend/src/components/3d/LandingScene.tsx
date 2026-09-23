"use client"

import { Canvas } from "@react-three/fiber"
import { Float, Html, OrbitControls, Stars } from "@react-three/drei"
import { Suspense } from "react"

const ITEMS = [
  { name: "backpack", position: [-2.2, 0.8, -0.5] as const, rotation: [0, 0.5, 0] as const, color: "#4f46e5" },
  { name: "phone", position: [2.2, 0.5, 0] as const, rotation: [0, -0.3, 0.1] as const, color: "#06b6d4" },
  { name: "keys", position: [0, -1.2, 1.5] as const, rotation: [0.3, 0, 0] as const, color: "#eab308" },
  { name: "wallet", position: [-1.8, -1.2, -0.5] as const, rotation: [0, 0, 0.2] as const, color: "#8b5cf6" },
  { name: "headphones", position: [1.8, 1.6, 0.5] as const, rotation: [-0.2, 0.5, 0] as const, color: "#ec4899" },
]

function ItemGeometry({ name, color }: { name: string; color: string }) {
  switch (name) {
    case "backpack":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.2, 0.5]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
        </mesh>
      )
    case "phone":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.55, 1.0, 0.08]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
        </mesh>
      )
    case "keys":
      return (
        <mesh castShadow>
          <torusGeometry args={[0.25, 0.06, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} />
        </mesh>
      )
    case "wallet":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.5, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
        </mesh>
      )
    case "headphones":
      return (
        <mesh castShadow>
          <torusGeometry args={[0.45, 0.07, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
        </mesh>
      )
    default:
      return null
  }
}

function Item({ name, position, rotation, color }: (typeof ITEMS)[number]) {
  return (
    <group position={position} rotation={rotation}>
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
        <ItemGeometry name={name} color={color} />
        <Html position={[0, -0.9, 0]} center distanceFactor={10}>
          <span className="pointer-events-none select-none text-[11px] font-semibold text-white/90 backdrop-blur-md px-2.5 py-1 rounded-full bg-slate-900/70 border border-white/20 whitespace-nowrap shadow-xl">
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </span>
        </Html>
      </Float>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 15, 10]} intensity={2.0} />
      <directionalLight position={[-10, -10, -10]} intensity={0.8} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#6366f1" />

      <Stars radius={50} depth={50} count={2500} factor={4} saturation={0} fade speed={1.5} />

      {ITEMS.map((item) => (
        <Item key={item.name} {...item} />
      ))}
    </>
  )
}

export function LandingScene() {
  return (
    <div className="w-full h-full relative">
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 6.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Scene />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate={true}
            autoRotateSpeed={0.6}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}