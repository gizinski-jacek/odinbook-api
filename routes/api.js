const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'public/photos/');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '__' + file.originalname);
	},
});

const upload = multer({
	storage: storage,
	limits: { fileSize: 2000000 },
	fileFilter: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
			let error = new Error('Only images (png, jpg, jpeg) are allowed');
			error.status = 415;
			return cb(error);
		}
		cb(null, true);
	},
});

const user_controller = require('../controllers/userController');
const post_controller = require('../controllers/postController');
const comment_controller = require('../controllers/commentController');
const message_controller = require('../controllers/messageController');

// Redirect to all posts.
router.get('/', (req, res, next) => {
	res.redirect('/posts');
});

/////
// Sign up user
router.post('/sign-up', user_controller.sign_up_user);

// Log in user
router.post('/log-in/email', user_controller.log_in_user);

// Facebook log in
router.get(
	'/log-in/facebook',
	passport.authenticate('facebook', {
		session: false,
		scope: ['email'],
	})
);

// Facebook log in callback;
router.get(
	'/log-in/facebook/callback',
	user_controller.log_in_facebook_user_callback
);

// Log out user
router.get('/log-out', user_controller.log_out_user);

// Verify user's JWT
router.get('/verify-token', user_controller.verify_user_token);

/////
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
// Get current user's contacts
router.put('/users/password-change', user_controller.password_change);

// Get current user's contacts
router.get('/users/contacts', user_controller.get_contacts_list);

// Get all users
router.get('/users/people', user_controller.get_people_list);

// Block a user
router.put('/users/block', user_controller.change_block_status);

// Send friend request
router.put('/users/friends/request', user_controller.send_friend_request);

// Accept friend request
router.put('/users/friends/accept', user_controller.accept_friend_request);

// Cancel/decline friend request
router.put('/users/friends/cancel', user_controller.cancel_friend_request);

// Remove friend
router.put('/users/friends/remove', user_controller.remove_friend);

// Get user's friend list
router.get(
	'/users/:userid/friends',
	user_controller.get_single_user_friend_list
);

// Get user's post list
router.get('/users/:userid/posts', user_controller.get_single_user_post_list);

// Get user's data
router.get('/users/:userid', user_controller.get_single_user);

// Handle multer errors on user's data update
router.put('/users', (req, res, next) => {
	upload.single('profile_picture')(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			return res.status(415).json(error);
		} else if (error) {
			return res.status(error.status).json(error.message);
		}
		next();
	});
});

// Update user's data
router.put('/users', user_controller.update_user_data);

// Delete user's picture
router.delete('/users/picture/:pictureId', user_controller.delete_user_picture);

/////
// Get current user's timeline posts
router.get('/posts/timeline', post_controller.get_timeline_posts);

// Create new post
router.post('/posts', post_controller.create_post);

// Update a post
router.put('/posts/:postid', post_controller.update_post);

// Delete a post
router.delete('/posts/:postid', post_controller.delete_post);

// Like a post
router.put('/posts/:postid/like', post_controller.change_like_status);

/////
// Create new comment
router.post('/posts/:postid/comments', comment_controller.create_comment);

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

/////
// Get chat messages
router.get('/chats/messages', message_controller.get_chat_message_list);

// Create chat message
router.post('/chats/messages', message_controller.create_chat_message);

// Get new messages
router.get('/chats/messages/new', message_controller.get_new_message_list);

// Mark message as viewed
router.put('/chats/messages/dismiss', message_controller.dismiss_message);

/////
// Search people
router.get('/search/users', user_controller.search_people);

// Search user's friend list
router.get('/search/:userid/friends', user_controller.search_user_friend_list);

// Search posts
router.get('/search/posts', post_controller.search_posts);

// Search messages
router.get('/search/messages', message_controller.search_messages);

module.exports = router;
