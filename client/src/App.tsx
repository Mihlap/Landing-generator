import { Navigate, Route, Routes } from "react-router-dom";
import { LabaPromoEditor, LabaPromoHome } from "./components/LabaPromo";
import Editor from "./pages/Editor";
import Home from "./pages/Home";

export default function App() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <LabaPromoHome />
      <LabaPromoEditor />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
