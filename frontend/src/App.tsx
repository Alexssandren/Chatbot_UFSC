import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SubmissionDetails } from './pages/SubmissionDetails';
import { Students } from './pages/Students';
import { StudentDetails } from './pages/StudentDetails';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetails />} />
        <Route path="submission/:id" element={<SubmissionDetails />} />
      </Route>
    </Routes>
  );
}

export default App;
