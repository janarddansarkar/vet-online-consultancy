import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Book } from "./pages/Book";
import { NotFound } from "./pages/NotFound";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AuthProvider } from "./context/AuthContext";
import { ScrollToHash } from "./components/ScrollToHash";
import { WhatsAppFloatingButton } from "./components/WhatsAppFloatingButton";

function App() {
  return (
    <AuthProvider>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/book" element={<Book />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <WhatsAppFloatingButton />
    </AuthProvider>
  );
}

export default App;
