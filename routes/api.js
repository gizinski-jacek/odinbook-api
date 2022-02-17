const express = require('express');
const router = express.Router();
const passport = require('passport');

const user_controller = require('../controllers/userController');
const post_controller = require('../controllers/postController');
const comment_controller = require('../controllers/commentController');

// Redirect to all posts.
router.get('/', (req, res, next) => {
	res.redirect('/api/posts');
});

router.get('/api', (req, res, next) => {
	res.redirect('/api/posts');
});

/////
// Authenticate user's JWT
router.use('/authUser', user_controller.authenticate_user_token);

// Log in user
router.post('/log-in', user_controller.log_in_user);

// Log out user
router.post('/log-out', user_controller.log_out_user);

// Sign up user
router.post('/sign-up', user_controller.sign_up_user);

/////
// Create new post
router.post('/posts', post_controller.create_post);

// Get single post
router.get('/posts/:postid', post_controller.get_single_post);

// Update a post
router.put('/posts/:postid', post_controller.update_post);

// Delete a post
router.delete('/posts/:postid', post_controller.delete_post);

// Like a post
router.put('/posts/like/:postid', post_controller.change_like_status);

/////
// Create new comment
router.post('/comments', comment_controller.create_comment);

// Get single comment
router.get('/comments/:commentid', comment_controller.get_single_comment);

// Update a comment
router.put('/comments/:commentid', comment_controller.update_comment);

// Delete a comment
router.delete('/comments/:commentid', comment_controller.delete_comment);

// Like a comment
router.put('/comments/like/:commentid', comment_controller.change_like_status);

module.exports = router;
