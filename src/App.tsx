import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Launcher from './pages/Launcher'
import ComingSoon from './pages/ComingSoon'
import Ch1Productivity from './pages/demos/ch1'
import SuppABreakEven from './pages/demos/supp-a'
import Ch3ProcessAnalysis from './pages/demos/ch3'
import Ch4QualityPerformance from './pages/demos/ch4'
import Ch5LeanSystems from './pages/demos/ch5'
import Ch6CapacityPlanning from './pages/demos/ch6'
import SuppBWaitingLines from './pages/demos/supp-b'
import SuppDLinearProgramming from './pages/demos/supp-d'
import Ch7ConstraintManagement from './pages/demos/ch7'
import Ch8ProjectManagement from './pages/demos/ch8'
import Ch9Forecasting from './pages/demos/ch9'
import Ch10Inventory from './pages/demos/ch10'
import Ch14InventoryMetrics from './pages/demos/ch14'
import Ch15LogisticsManagement from './pages/demos/ch15'

/**
 * React Router keeps the scroll position across navigations; jump each new
 * page to the top ('instant' bypasses the html scroll-behavior: smooth).
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/**
 * Demo pages register here as they are built: import the page component
 * and add a <Route> for its slug above the catch-all. Until then, every
 * chapter slug falls through to the ComingSoon page.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/ch1" element={<Ch1Productivity />} />
          <Route path="/supp-a" element={<SuppABreakEven />} />
          <Route path="/ch3" element={<Ch3ProcessAnalysis />} />
          <Route path="/ch4" element={<Ch4QualityPerformance />} />
          <Route path="/ch5" element={<Ch5LeanSystems />} />
          <Route path="/ch6" element={<Ch6CapacityPlanning />} />
          <Route path="/supp-b" element={<SuppBWaitingLines />} />
          <Route path="/supp-d" element={<SuppDLinearProgramming />} />
          <Route path="/ch7" element={<Ch7ConstraintManagement />} />
          <Route path="/ch8" element={<Ch8ProjectManagement />} />
          <Route path="/ch9" element={<Ch9Forecasting />} />
          <Route path="/ch10" element={<Ch10Inventory />} />
          <Route path="/ch14" element={<Ch14InventoryMetrics />} />
          <Route path="/ch15" element={<Ch15LogisticsManagement />} />
          <Route path="/:slug" element={<ComingSoon />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
