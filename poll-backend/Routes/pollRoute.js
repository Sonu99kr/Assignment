const express = require("express");
const router = express.Router();
const Poll = require("../Models/poll");
const rateLimit = require("express-rate-limit");

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many vote attempts. Please try again later." },
});

router.post("/", async (req, res) => {
  try {
    const { question, options, expiresIn } = req.body;

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ message: "Invalid poll" });
    }

    if (!expiresIn || expiresIn <= 0)
      return res.status(400).json({ message: "Invalid expiry time" });

    const expiresAt = new Date(Date.now() + expiresIn);

    const poll = await Poll.create({
      question,
      options: options.map((opt) => ({ text: opt })),
      expiresAt,
    });

    res.status(201).json(poll);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/vote", voteLimiter, async (req, res) => {
  try {
    const { optionIndex, voterId } = req.body;

    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (poll.expiresAt < new Date())
      return res.status(400).json({ message: "Poll has ended" });

    if (
      optionIndex == undefined ||
      optionIndex < 0 ||
      optionIndex >= poll.options.length
    ) {
      return res.status(400).json({ message: "Invalid options selected" });
    }

    if (!voterId)
      return res.status(400).json({ message: "Voter Id is required " });

    if (poll.votersIds.includes(voterId)) {
      return res.status(400).json({ message: "you have already voted." });
    }

    poll.options[optionIndex].votes += 1;

    poll.votersIds.push(voterId);

    await poll.save();

    const io = req.app.get("io");
    io.to(req.params.id).emit("pollUpdated", poll);

    res.json(poll);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(400).json({ message: "Poll not found" });
    res.json(poll);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
