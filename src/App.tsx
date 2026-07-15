import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Launcher from './pages/Launcher'
import ComingSoon from './pages/ComingSoon'
import SuppBWaitingLines from './pages/demos/supp-b'
import Ch6TheoryOfConstraints from './pages/demos/ch6'
import Ch7ProjectManagement from './pages/demos/ch7'
import Ch8Forecasting from './pages/demos/ch8'
import Ch9Inventory from './pages/demos/ch9'
import Ch12InventoryMetrics from './pages/demos/ch12'
import Ch13FacilityLocation from './pages/demos/ch13'

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
          <Route path="/supp-b" element={<SuppBWaitingLines />} />
          <Route path="/ch6" element={<Ch6TheoryOfConstraints />} />
          <Route path="/ch7" element={<Ch7ProjectManagement />} />
          <Route path="/ch8" element={<Ch8Forecasting />} />
          <Route path="/ch9" element={<Ch9Inventory />} />
          <Route path="/ch12" element={<Ch12InventoryMetrics />} />
          <Route path="/ch13" element={<Ch13FacilityLocation />} />
          <Route path="/:slug" element={<ComingSoon />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
