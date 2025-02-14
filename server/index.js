require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");

// Models
const User = require("./models/user.model");
const TravelStory = require("./models/travelStory.model");

// Utils
const { authenticateToken } = require("./utils");

mongoose.connect(config.connectionString);

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

// Create Account
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  const isUser = await User.findOne({ email });
  if (isUser) {
    return res
      .status(400)
      .json({ error: true, message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    fullName,
    email,
    password: hashedPassword,
  });

  await user.save();

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  );

  return res.status(201).json({
    error: false,
    user: { fullName: user.fullName, email: user.email },
    accessToken,
    message: "Registration Successful",
  });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Some fields are missing" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return res.status(400).json({ message: "Invalid credentials" });

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "72h" }
  );

  return res.json({
    error: false,
    message: "Login Successful",
    user: { fullName: user.fullName, email: user.email },
    accessToken,
  });
});

// Get User
app.get("/get-user", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  const isUser = await User.findOne({ _id: userId });
  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: isUser,
    message: "",
  });
});

// Add Travel Story
app.post("/add-travel-story", authenticateToken, async (req, res) => {
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  const parsedVisitedDate = new Date(visitedDate);

  try {
    const travelStory = new TravelStory({
      title,
      story,
      visitedLocation,
      userId,
      imageUrl,
      visitedDate: parsedVisitedDate,
    });

    await travelStory.save();
    res.status(201).json({ story: travelStory, message: "Added Successfully" });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Get All Stories
app.get("/get-travel-story", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const travelStories = await TravelStory.find({ userId: userId }).sort({
      isFavorite: -1,
    });
    res.status(200).json({ stories: travelStories });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Upload Image
app.post("/image-upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: true, message: "No image uploaded" });
    }

    const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
    res
      .status(201)
      .json({ error: false, message: "Image uploaded successfully", imageUrl });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Delete Image
app.delete("/delete-image", async (req, res) => {
  const { imageUrl } = req.query;

  if (!imageUrl) {
    return res
      .status(400)
      .json({ error: true, message: "imageUrl parameter is required" });
  }

  try {
    const fileName = path.basename(imageUrl);
    const filePath = path.join(__dirname, "uploads", fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: true, message: "File not found" });
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: "Failed to delete the file" });
      }
      res
        .status(200)
        .json({ error: false, message: "File deleted successfully" });
    });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Edit Travel Story
app.put("/edit-story/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, story, visitedLocation, imageUrl, visitedDate, isFavorite } =
    req.body;
  const { userId } = req.user;

  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    return res
      .status(400)
      .json({ error: true, message: "All fields are required" });
  }

  const parsedVisitedDate = new Date(visitedDate);

  try {
    const travelStory = await TravelStory.findOne({ _id: id, userId });

    if (!travelStory) {
      return res.status(404).json({ error: true, message: "Story not found" });
    }

    const placeholderImgUrl = `https://localhost:8000/assets/placeholder.jpg`;

    travelStory.title = title;
    travelStory.story = story;
    travelStory.visitedLocation = visitedLocation;
    travelStory.imageUrl = imageUrl || placeholderImgUrl;
    travelStory.visitedDate = parsedVisitedDate;
    travelStory.isFavorite = isFavorite;

    await travelStory.save();

    res
      .status(200)
      .json({ story: travelStory, message: "Story updated successfully" });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Delete Travel Story
app.delete("/delete-story/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try {
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });
    if (!travelStory) {
      return res.status(404).json({ error: true, message: "Story not found" });
    }

    await travelStory.deleteOne({ _id: id, userId: userId });

    const imageUrl = travelStory.imageUrl;
    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname, "uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Failed to delete file:", err);
        }
      });
    }

    res.status(200).json({ message: "Travel Story successfully deleted" });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Update isFavorite
app.put("/update-is-favorite/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isFavorite } = req.body;
  const { userId } = req.user;

  try {
    const travelStory = await TravelStory.findOne({ _id: id, userId: userId });

    if (!travelStory) {
      return res.status(404).json({ error: true, message: "Story not found" });
    }

    travelStory.isFavorite = isFavorite;
    await travelStory.save();

    res
      .status(200)
      .json({ story: travelStory, message: "Updated successfully" });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});

// Search Stories
app.get("/search", authenticateToken, async (req, res) => {
  const { query } = req.query;
  const { userId } = req.user;

  if (!query) {
    return res
      .status(400)
      .json({ error: true, message: "Query parameter is required" });
  }

  try {
    const searchResults = await TravelStory.find({
      userId,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { story: { $regex: query, $options: "i" } },
      ],
    });

    res.status(200).json({ stories: searchResults });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});
// FIND STORIES BY FILTER
app.get("/travel-stories/filter", authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const { userId } = req.user;

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const travelStories = await TravelStory.find({
      userId: userId,
      visitedDate: {
        $gte: start,
        $lte: end,
      },
    }).sort({ isFavorite: -1 });

    res.status(200).json({ stories: travelStories });
  } catch (e) {
    res.status(500).json({ error: true, message: e.message });
  }
});
app.listen(8000, () => {
  console.log("Server started on port 8000");
});
