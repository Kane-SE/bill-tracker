import { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { PumpSkeleton } from '@/apps/pump/components/PumpSkeleton'

// The page and its ~500 KB of chart data load only when Pump opens.
const PumpHome = lazy(() => import('@/apps/pump/pages/PumpHome'))

/** Route elements for the Pump app, mounted under /pump in App.tsx. */
export const pumpRoutes = (
  <>
    <Route
      path="/pump"
      element={
        <Suspense fallback={<PumpSkeleton />}>
          <PumpHome />
        </Suspense>
      }
    />
  </>
)
