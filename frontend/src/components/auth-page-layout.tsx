import type { ReactNode } from "react"
import { Header } from "@/components/header"

interface AuthPageLayoutProps {
  title: string
  children: ReactNode
}

export function AuthPageLayout({ title, children }: AuthPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center px-4 -mt-16">
        <div className="w-full max-w-lg">
          <div className="sketch-lines space-y-8 py-2">
            <h1 className="text-2xl font-bold"># {title}</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
