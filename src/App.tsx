import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Schedule from '@/pages/Schedule';
import Conflict from '@/pages/Conflict';
import CheckIn from '@/pages/CheckIn';
import Priority from '@/pages/Priority';
import Results from '@/pages/Results';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="conflict" element={<Conflict />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="priority" element={<Priority />} />
          <Route path="results" element={<Results />} />
        </Route>
      </Routes>
    </Router>
  );
}
