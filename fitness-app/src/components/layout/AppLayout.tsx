import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Topbar } from './Topbar'
import { PageFallback } from './PageFallback'

export function AppLayout() {
  const location = useLocation()

  // route changes should always start at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-200 focus:rounded-xl focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-emerald-950"
      >
        Skip to main content
      </a>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-surface/80 backdrop-blur-xl lg:block">
        <Sidebar />
      </div>

      <div className="lg:pl-[264px]">
        <Topbar />
        <motion.main
          id="main-content"
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-12"
        >
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </div>

      <BottomNav />
    </div>
  )
}
