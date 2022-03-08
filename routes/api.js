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

/////
//
router.use(
	passport.authenticate('jwt', { session: false }),
	(req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}
		res.redirect('/');
	}
);
/////

// Get list of people not on logged user's friend list
router.get('/users/people', user_controller.get_people_list);

// Block user
router.put('/users/block', user_controller.change_block_status);

// Get logged user's friend requests
router.get('/users/requests', user_controller.get_request_list);

// Get logged user's friend list
router.get('/users/friends', user_controller.get_friend_list);

// Send friend request
router.put('/users/friends/request', user_controller.send_friend_request);

// Remove friend
router.put('/users/friends/remove', user_controller.remove_friend);

// Accept friend request
router.put('/users/friends/accept', user_controller.accept_friend_request);

// Cancel/decline friend request
router.put('/users/friends/cancel', user_controller.cancel_friend_request);

// Get single user's data
router.get('/users/:userid', user_controller.get_single_user);

// Get user's post list
router.get('/users/:userid/posts', post_controller.get_user_post_list);

/////
// Get logged user's timeline posts
router.get(
	'/posts/user-timeline-posts',
	post_controller.get_user_timeline_posts
);

// Create new post
router.post('/posts', post_controller.create_post);

// // // Get single post
// // router.get('/posts/:postid', post_controller.get_single_post);

// Update a post
router.put('/posts/:postid', post_controller.update_post);

// Delete a post
router.delete('/posts/:postid', post_controller.delete_post);

// Like a post
router.put('/posts/:postid/like', post_controller.change_like_status);

/////
// Create new comment
router.post('/posts/:postid/comments', comment_controller.create_comment);

// Get post comments
router.get('/posts/:postid/comments', comment_controller.get_post_comments);

// Update a comment
router.put(
	'/posts/:postid/comments/:commentid',
	comment_controller.update_comment
);

// Delete a comment
router.delete(
	'/posts/:postid/comments/:commentid',
	comment_controller.delete_comment
);

// Like a comment
router.put(
	'/posts/:postid/comments/:commentid/like',
	comment_controller.change_like_status
);

module.exports = router;
