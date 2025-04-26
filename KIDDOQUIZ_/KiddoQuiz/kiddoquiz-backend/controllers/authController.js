const jwt = require('jsonwebtoken');

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // Find user in database
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate Token (Change 'your_secret_key' to an actual secret key)
    const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });

    res.json({ token }); // ✅ Send token to frontend
});


