import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

const PollPage = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [voted, setVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("voterId")) {
      localStorage.setItem("voterId", Math.random().toString(36).substring(2));
    }
  }, []);

  useEffect(() => {
    fetchPoll();

    socket.emit("joinPoll", id);

    socket.on("pollUpdated", (updatedPoll) => {
      setPoll(updatedPoll);
    });

    return () => socket.off("pollUpdated");
  }, [id]);

  const fetchPoll = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/polls/${id}`,
      );
      setPoll(res.data);

      const voterId = localStorage.getItem("voterId");
      if (res.data.votersIds?.includes(voterId)) {
        setVoted(true);
      }
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error("Error fetching poll");
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: poll.question,
      text: "Vote on this poll!",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing", err);
    }
  };

  useEffect(() => {
    if (!poll?.expiresAt) return;

    const updateTime = () => {
      const now = Date.now();
      const expiry = new Date(poll.expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft("00:00");
        setIsExpired(true);
        setVoted(true);
        return false;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`);
      return true;
    };

    updateTime();

    const interval = setInterval(() => {
      const active = updateTime();
      if (!active) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [poll]);

  const handleVote = async (index) => {
    if (isExpired) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/polls/${id}/vote`, {
        optionIndex: index,
        voterId: localStorage.getItem("voterId"),
      });

      setVoted(true);
    } catch (err) {
      alert(err.response?.data?.message || "Voting error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <nav className="px-20 py-6 border-b border-green-900/40">
          <h1 className="text-2xl font-semibold text-green-500">Suffragium</h1>
        </nav>

        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <h2 className="text-4xl font-bold text-red-400 mb-6">
            Poll Not Found
          </h2>

          <p className="text-slate-400 mb-10 text-lg max-w-md">
            This poll may have expired or has been removed from our system.
          </p>

          <a
            href="/"
            className="bg-green-600 hover:bg-green-700 transition px-8 py-3 rounded-xl font-medium shadow-lg shadow-green-900/40"
          >
            Create New Poll
          </a>
        </div>

        <footer className="py-8 text-center text-slate-500 border-t border-green-900/40">
          © {new Date().getFullYear()} Suffragium
        </footer>
      </div>
    );
  }

  if (!poll) return <div className="text-white p-10">Loading...</div>;

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);

  let winnerText = "";

  if (isExpired && totalVotes > 0) {
    const maxVotes = Math.max(...poll.options.map((opt) => opt.votes));
    const winners = poll.options.filter((opt) => opt.votes === maxVotes);

    if (winners.length === 1) {
      winnerText = `🏆 Winner: ${winners[0].text}`;
    } else {
      winnerText = `🤝 It's a tie between ${winners
        .map((w) => w.text)
        .join(" & ")}`;
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="px-20 py-6 border-b border-green-900/40 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-green-500">
          <Link to="/">Suffragium: Every vote counts</Link>
        </h1>

        <div className="flex items-center gap-3 bg-green-950/40 px-4 py-2 rounded-2xl border border-green-900">
          <button
            onClick={handleShare}
            className="bg-green-600 hover:bg-green-700 transition px-5 py-2 rounded-xl font-medium shadow-md shadow-green-900/40"
          >
            Share
          </button>

          <button
            onClick={handleCopy}
            className="bg-black hover:bg-green-900 border border-green-700 transition px-5 py-2 rounded-xl font-medium"
          >
            Copy Link
          </button>
        </div>
      </nav>

      <div className="flex justify-center mt-24">
        <div className="relative w-[720px]">
          <div
            className={`absolute -top-16 right-0 px-6 py-3 rounded-xl font-semibold text-lg tracking-wide shadow-lg
          ${
            isExpired
              ? "bg-red-900/80 border border-red-500 text-red-300"
              : "bg-green-900/80 border border-green-500 text-green-300"
          }`}
          >
            {isExpired ? "Poll Ended" : `Ends In: ${timeLeft}`}
          </div>

          <div className="bg-gradient-to-br from-green-950 to-black border border-green-900 rounded-3xl p-12 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
            <h2 className="text-3xl font-semibold mb-12 text-center leading-snug">
              {poll.question}
            </h2>

            <div className="space-y-6">
              {poll.options.map((option, index) => {
                const percentage =
                  totalVotes === 0
                    ? 0
                    : Math.round((option.votes / totalVotes) * 100);

                return (
                  <div key={index}>
                    {!voted && !isExpired ? (
                      <button
                        onClick={() => handleVote(index)}
                        className="w-full bg-black border border-green-800 p-5 rounded-2xl hover:bg-green-900 transition text-left text-lg font-medium"
                      >
                        {option.text}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-lg font-medium">
                          <span>{option.text}</span>
                          <span>
                            {percentage}% ({option.votes})
                          </span>
                        </div>

                        <div className="w-full bg-black border border-green-900 rounded-xl h-5 overflow-hidden">
                          <div
                            className="bg-green-600 h-full transition-all duration-700 ease-out"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 border-t border-green-900/40 pt-6 text-center space-y-4">
              <p className="text-green-400 text-lg font-medium">
                Total Votes: {totalVotes}
              </p>

              {isExpired && totalVotes > 0 && (
                <div className="bg-green-950 border border-green-600 rounded-xl p-6">
                  <p className="text-xl font-semibold text-green-300">
                    {winnerText}
                  </p>
                </div>
              )}

              {isExpired && totalVotes === 0 && (
                <p className="text-red-400 font-medium">
                  Poll ended with no votes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center text-slate-500 border-t border-green-900/40">
        © {new Date().getFullYear()} Suffragium
      </footer>
    </div>
  );
};

export default PollPage;
