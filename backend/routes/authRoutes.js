const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "User Registered Successfully" });

    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// Login User
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid password" });

        // Create JWT Token
        const token = jwt.sign({ id: user._id }, "secret123", { expiresIn: "1d" });

        res.json({ message: "Login Successful", token });

    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
