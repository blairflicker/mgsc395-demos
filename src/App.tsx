import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Launcher from './pages/Launcher'
import ComingSoon from './pages/ComingSoon'
import SuppBWaitingLines from './pages/demos/supp-b'
import Ch7ProjectManagement from './pages/demos/ch7'

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
          <Route path="/ch7" element={<Ch7ProjectManagement />} />
          <Route path="/:slug" element={<ComingSoon />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
