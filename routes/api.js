const express = require('express');
const router = express.Router();
const passport = require('passport');

const user_controller = require('../controllers/userController');
const post_controller = require('../controllers/postController');
const comment_controller = require('../controllers/commentController');

// Redirect to all posts.
router.get('/', (req, res, next) => {
	res.redirect('/posts');
});

/////
// Verify user's JWT
router.get('/verify-token', user_controller.verify_user_token);

// Log in user
router.post('/log-in', user_controller.log_in_user);

// Log out user
router.get('/log-out', user_controller.log_out_user);

// Sign up user
router.post('/sign-up', user_controller.sign_up_user);

// Get user's friend list
router.get(
	'/user/user-friend-list',
	passport.authenticate('jwt', { session: false }),
	user_controller.get_user_friend_list
);

// Get user's friend requests
router.get(
	'/user/user-friend-requests',
	passport.authenticate('jwt', { session: false }),
	user_controller.get_user_friend_requests
);

// Get user's friend requests
router.get(
	'/user/user-friends-data',
	passport.authenticate('jwt', { session: false }),
	user_controller.get_user_friends_data
);

// Get user's friend list
router.post(
	'/user/accept-request/:requestid',
	passport.authenticate('jwt', { session: false }),
	user_controller.accept_friend_request
);

// Get user's friend requests
router.post(
	'/user/decline-request/:requestid',
	passport.authenticate('jwt', { session: false }),
	user_controller.decline_friend_request
);

/////
// Get user's posts
router.get(
	'/posts/user-posts',
	passport.authenticate('jwt', { session: false }),
	post_controller.get_user_posts
);

// Get user's friends posts
router.get(
	'/posts/user-friends-posts',
	passport.authenticate('jwt', { session: false }),
	post_controller.get_user_friends_posts
);

// Get user's timeline posts
router.get(
	'/posts/user-timeline-posts',
	passport.authenticate('jwt', { session: false }),
	post_controller.get_user_timeline_posts
);

// Create new post
router.post(
	'/posts',
	passport.authenticate('jwt', { session: false }),
	post_controller.create_post
);

// Get single post
router.get(
	'/posts/:postid',
	passport.authenticate('jwt', { session: false }),
	post_controller.get_single_post
);

// Update a post
router.put(
	'/posts/:postid',
	passport.authenticate('jwt', { session: false }),
	post_controller.update_post
);

// Delete a post
router.delete(
	'/posts/:postid',
	passport.authenticate('jwt', { session: false }),
	post_controller.delete_post
);

// Like a post
router.put(
	'/posts/like/:postid',
	passport.authenticate('jwt', { session: false }),
	post_controller.change_like_status
);

/////
// Create new comment
router.post(
	'/posts/:postid/comments',
	passport.authenticate('jwt', { session: false }),
	comment_controller.create_comment
);

// Get post comments
router.get(
	'/posts/:postid/comments',
	passport.authenticate('jwt', { session: false }),
	comment_controller.get_post_comments
);

// Update a comment
router.put(
	'/posts/:postid/comments/:commentid',
	passport.authenticate('jwt', { session: false }),
	comment_controller.update_comment
);

// Delete a comment
router.delete(
	'/posts/:postid/comments/:commentid',
	passport.authenticate('jwt', { session: false }),
	comment_controller.delete_comment
);

// Like a comment
router.put(
	'/posts/:postid/comments/like/:commentid',
	passport.authenticate('jwt', { session: false }),
	comment_controller.change_like_status
);

module.exports = router;
