import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TimerProvider } from "@/contexts/TimerContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PersistentTimerPanel from "@/components/PersistentTimerPanel/PersistentTimerPanel";
import Index from "./pages/Index";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import CoursePage from "./pages/CoursePage";
import UploadPage from "./pages/UploadPage";
import ChatroomPage from "./pages/ChatroomPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPending from "./pages/AdminPending";
import AdminCourses from "./pages/AdminCourses";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerUsers from "./pages/OwnerUsers";
import OwnerNotes from "./pages/OwnerNotes";
import OwnerAINotes from "./pages/OwnerAINotes";
import BookmarksPage from "./pages/BookmarksPage";
import ContactOwner from "./pages/ContactOwner";
import EditProfile from "./pages/EditProfile";
import Leaderboard from "./pages/Leaderboard";
import NotificationsPage from "./pages/NotificationsPage";
import StudyTimerPage from "./pages/StudyTimerPage";
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";
import PageTracker from "./components/PageTracker";
import AINotesLandingPage from "./pages/AINotesLandingPage";
import AINotesCoursePage from "./pages/AINotesCoursePage";
import AINotesChapterPage from "./pages/AINotesChapterPage";
import AINotesDetailPage from "./pages/AINotesDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <TimerProvider>
              <PageTracker />
              <PersistentTimerPanel />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/courses" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><CoursePage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><UploadPage /></ProtectedRoute>} />
                <Route path="/bookmarks" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><BookmarksPage /></ProtectedRoute>} />
                <Route path="/chatroom" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><ChatroomPage /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><ContactOwner /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><EditProfile /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><Leaderboard /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><NotificationsPage /></ProtectedRoute>} />
                <Route path="/study-timer" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><StudyTimerPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/pending" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><AdminPending /></ProtectedRoute>} />
                <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><AdminCourses /></ProtectedRoute>} />
                <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
                <Route path="/owner/users" element={<ProtectedRoute allowedRoles={['owner']}><OwnerUsers /></ProtectedRoute>} />
                <Route path="/owner/notes" element={<ProtectedRoute allowedRoles={['owner']}><OwnerNotes /></ProtectedRoute>} />
                <Route path="/owner/ai-notes" element={<ProtectedRoute allowedRoles={['owner']}><OwnerAINotes /></ProtectedRoute>} />
                <Route path="/ai-notes" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><AINotesLandingPage /></ProtectedRoute>} />
                <Route path="/ai-notes/:course" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><AINotesCoursePage /></ProtectedRoute>} />
                <Route path="/ai-notes/:course/:lecture" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><AINotesChapterPage /></ProtectedRoute>} />
                <Route path="/ai-notes/:course/:lecture/:noteId" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><AINotesDetailPage /></ProtectedRoute>} />
                <Route path="/user/:userId" element={<ProtectedRoute allowedRoles={['student', 'admin', 'owner']}><UserProfile /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TimerProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
