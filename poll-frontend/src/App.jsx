import "./App.css";
import { Route, Routes } from "react-router-dom";
import CreatePoll from "./Pages/CreatePoll";
import PollPages from "./Pages/PollPages";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePoll />} />
      <Route path="/poll/:id" element={<PollPages />} />
    </Routes>
  );
}

export default App;
