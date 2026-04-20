import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '@/components/common/PrivateRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import EmailVerificationPage from '@/pages/auth/EmailVerificationPage';
import StudentDashboard from '@/pages/dashboard/StudentDashboard';
import StudentPayments from '@/pages/dashboard/StudentPayments';
import TeacherDashboardPage from '@/pages/teacher/TeacherDashboardPage';
import TeacherMarketplace from '@/pages/teacher/TeacherMarketplace';
import TeacherPayments from '@/pages/teacher/TeacherPayments';
import TeacherMessages from '@/pages/teacher/TeacherMessages';
import TeacherNotifications from '@/pages/teacher/TeacherNotifications';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import TeacherList from '@/pages/marketplace/TeacherList';
import MyRequests from '@/pages/marketplace/MyRequests';
import PaymentSettings from '@/pages/settings/PaymentSettings';
import ProgressPage from '@/pages/dashboard/ProgressPage';
import { ThemeProvider } from '@/context/ThemeContext';

import MockTestSpeaking from '@/pages/mock-test/MockTestSpeaking';
import MockTestReading from '@/pages/mock-test/MockTestReading';
import MockTestListening from '@/pages/mock-test/MockTestListening';
import MockTestWriting from '@/pages/mock-test/MockTestWriting';
import MockTestSpeakingSession from '@/pages/mock-test/MockTestSpeakingSession';
import MockTestReadingSession from '@/pages/mock-test/MockTestReadingSession';
import MockTestListeningSession from '@/pages/mock-test/MockTestListeningSession';
import MockTestWritingSession from '@/pages/mock-test/MockTestWritingSession';
import ManageVocabulary from '@/pages/vocabulary/ManageVocabulary';
import StudentMessages from '@/pages/dashboard/StudentMessages';

function App() {
    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    {/* Redirect root to login */}
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Auth Routes (Public) */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/verify-email" element={<EmailVerificationPage />} />

                    {/* Protected: Student Routes */}
                    <Route element={<PrivateRoute allowedRoles={['student']} />}>
                        <Route path="/dashboard/student" element={<StudentDashboard />} />
                        <Route path="/vocabulary" element={<ManageVocabulary />} />
                        <Route path="/progress" element={<ProgressPage />} />
                        <Route path="/payments" element={<StudentPayments />} />
                        <Route path="/marketplace" element={<TeacherList />} />
                        <Route path="/my-requests" element={<MyRequests />} />
                        <Route path="/messages" element={<StudentMessages />} />
                        <Route path="/messages/:conversationId" element={<StudentMessages />} />
                        {/* Mock Test — test-set list pages */}
                        <Route path="/mock-test/speaking" element={<MockTestSpeaking />} />
                        <Route path="/mock-test/speaking/session" element={<MockTestSpeakingSession />} />
                        <Route path="/mock-test/reading" element={<MockTestReading />} />
                        <Route path="/mock-test/reading/session" element={<MockTestReadingSession />} />
                        <Route path="/mock-test/listening" element={<MockTestListening />} />
                        <Route path="/mock-test/listening/session" element={<MockTestListeningSession />} />
                        <Route path="/mock-test/writing" element={<MockTestWriting />} />
                        <Route path="/mock-test/writing/session" element={<MockTestWritingSession />} />
                    </Route>

                    {/* Protected: Teacher Routes */}
                    <Route element={<PrivateRoute allowedRoles={['teacher']} />}>
                        {/* Legacy route redirects kept for backwards-compat */}
                        <Route path="/dashboard/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
                        <Route path="/requests" element={<Navigate to="/teacher/marketplace" replace />} />
                        <Route path="/students" element={<Navigate to="/teacher/dashboard" replace />} />
                        <Route path="/schedule" element={<Navigate to="/teacher/dashboard" replace />} />
                        <Route path="/earnings" element={<Navigate to="/teacher/payments" replace />} />
                        
                        {/* New Teacher Workspace routes */}
                        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                        <Route path="/teacher/marketplace" element={<TeacherMarketplace />} />
                        <Route path="/teacher/payments" element={<TeacherPayments />} />
                        <Route path="/teacher/messages" element={<TeacherMessages />} />
                        <Route path="/teacher/messages/:conversationId" element={<TeacherMessages />} />
                        <Route path="/teacher/notifications" element={<TeacherNotifications />} />
                    </Route>

                    {/* Protected: Admin Routes */}
                    <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                        <Route path="/dashboard/admin" element={<AdminDashboard />} />
                    </Route>

                    {/* Protected: Shared Settings (any authenticated user) */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/settings/payment" element={<PaymentSettings />} />
                    </Route>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;


