import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SharePage from './pages/SharePage';
import TrackerPage from './pages/TrackerPage';
import SessionEndedPage from './pages/SessionEndedPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/share/:sessionId" element={<SharePage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/session-ended" element={<SessionEndedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
