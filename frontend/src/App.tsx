import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { SubmissionDetails } from './pages/SubmissionDetails';
import { Students } from './pages/Students';
import { StudentDetails } from './pages/StudentDetails';
import { Profile } from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="submission/:id" element={<SubmissionDetails />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
