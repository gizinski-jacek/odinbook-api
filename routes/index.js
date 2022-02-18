const express = require('express');
const router = express.Router();

// Redirect to all posts.
router.get('/', (req, res, next) => {
	res.redirect('/api');
});

module.exports = router;
