import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/archive/Layout';
import HomePage from './pages/archive/HomePage';
import DocumentsPage from './pages/archive/DocumentsPage';
import DocumentDetailPage from './pages/archive/DocumentDetailPage';
import RegulationsPage from './pages/archive/RegulationsPage';
import AboutPage from './pages/archive/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/regulations" element={<RegulationsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
