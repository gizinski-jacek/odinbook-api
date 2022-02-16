const express = require('express');
const router = express.Router();

// Redirect to all posts.
router.get('/', (req, res, next) => {
	res.redirect('/api/posts');
});

router.get('/api', (req, res, next) => {
	res.redirect('/api/posts');
});

module.exports = router;
