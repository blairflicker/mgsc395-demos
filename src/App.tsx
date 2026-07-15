import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Launcher from './pages/Launcher'
import ComingSoon from './pages/ComingSoon'
import SuppBWaitingLines from './pages/demos/supp-b'
import Ch6TheoryOfConstraints from './pages/demos/ch6'
import Ch7ProjectManagement from './pages/demos/ch7'
import Ch8Forecasting from './pages/demos/ch8'
import Ch13FacilityLocation from './pages/demos/ch13'

/**
 * Demo pages register here as they are built: import the page component
 * and add a <Route> for its slug above the catch-all. Until then, every
 * chapter slug falls through to the ComingSoon page.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/supp-b" element={<SuppBWaitingLines />} />
          <Route path="/ch6" element={<Ch6TheoryOfConstraints />} />
          <Route path="/ch7" element={<Ch7ProjectManagement />} />
          <Route path="/ch8" element={<Ch8Forecasting />} />
          <Route path="/ch13" element={<Ch13FacilityLocation />} />
          <Route path="/:slug" element={<ComingSoon />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
