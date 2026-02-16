import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CreatePoll = () => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const handleCreatePoll = async () => {
    if (!question || options.some((opt) => !opt)) {
      return alert("Please fill all fields");
    }

    try {
      setLoading(true);

      const expiresIn = Number(expiryMinutes) * 60 * 1000;

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/polls`,
        {
          question,
          options,
          expiresIn,
        },
      );

      const pollId = res.data._id;

      navigate(`/poll/${pollId}`);
    } catch (err) {
      alert("Error creating poll");
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");
          * { font-family: "Poppins", sans-serif; }
        `}
      </style>

      <div className="min-h-screen bg-black text-white flex flex-col">
        <nav className="flex justify-between items-center px-20 py-6 border-b border-green-900/40 bg-black/80 backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-green-500 tracking-wide">
            Suffragium: Where ideas get voted on
          </h1>
        </nav>

        <div className="flex flex-col items-center text-center mt-20">
          <h2 className="text-5xl font-bold max-w-3xl leading-tight">
            Create & Share
            <span className="text-green-500"> Real-Time Polls</span>
          </h2>

          <p className="text-slate-400 mt-6 max-w-2xl text-lg">
            Instantly create polls, share with anyone, and watch votes update
            live — no refresh required.
          </p>
        </div>

        <div className="flex justify-center mt-20">
          <div className="w-[700px] bg-gradient-to-br from-green-950 to-black border border-green-900 rounded-3xl p-10 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
            <h3 className="text-3xl font-semibold mb-8 text-center">
              Create New Poll
            </h3>

            <input
              type="text"
              placeholder="Enter your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-4 rounded-xl bg-black border border-green-800 mb-6 focus:outline-none focus:border-green-500 transition"
            />

            {options.map((opt, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Option ${index + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className="w-full p-4 rounded-xl bg-black border border-green-800 mb-5 focus:outline-none focus:border-green-500 transition"
              />
            ))}

            <button
              onClick={addOption}
              className="text-green-400 hover:text-green-300 transition mb-8"
            >
              + Add another option
            </button>

            <div className="mb-8">
              <label className="block text-green-400 mb-2 font-medium">
                Poll Expiry (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(e.target.value)}
                className="w-full p-4 rounded-xl bg-black border border-green-800 focus:outline-none focus:border-green-500 transition"
              />
            </div>

            <button
              onClick={handleCreatePoll}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-95 transition-all duration-200 py-4 rounded-xl font-semibold shadow-lg shadow-green-900/40 disabled:opacity-60"
            >
              {loading ? "Creating Poll..." : "Create Poll"}
            </button>
          </div>
        </div>

        <footer className="mt-auto py-8 text-center text-slate-500 border-t border-green-900/40">
          <p>© {new Date().getFullYear()} Suffragium</p>
          <p className="text-xs mt-1">React • Node.js • MongoDB • Socket.io</p>
        </footer>
      </div>
    </>
  );
};

export default CreatePoll;
