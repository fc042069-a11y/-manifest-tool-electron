'use client'

import { AppProvider } from '@/lib/app-context'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MainContent } from '@/components/main-content'
import { Toast } from '@/components/toast'

export default function Home() {
  return (
    <AppProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex flex-1 overflow-hidden">
            <MainContent />
          </main>
        </div>
        <Toast />
      </div>
    </AppProvider>
  )
}
