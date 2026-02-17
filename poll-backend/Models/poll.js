const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [optionSchema],
      validate: (v) => v.length >= 2,
    },
    votersIds: [String],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 24 * 60 * 60 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("poll", pollSchema);
