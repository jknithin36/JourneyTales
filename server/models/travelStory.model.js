const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const travelStorySchema = new Schema({
  title: { type: String, required: true },
  story: { type: String, required: true },
  visitedLocation: { type: [String], default: [] }, // Corrected to String
  isFavorite: { type: Boolean, default: false },
  userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
  createdOn: { type: Date, default: Date.now }, // Removed parentheses
  imageUrl: { type: String, required: true },
  visitedDate: { type: Date, required: true },
});

module.exports = mongoose.model("TravelStory", travelStorySchema);
