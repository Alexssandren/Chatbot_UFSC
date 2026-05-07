import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SubmissionDetails } from './pages/SubmissionDetails';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="submission/:id" element={<SubmissionDetails />} />
      </Route>
    </Routes>
  );
}

export default App;
