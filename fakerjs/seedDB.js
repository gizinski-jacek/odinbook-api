#! /usr/bin / env node

// const mongoose = require('mongoose');
// const mongoDb = process.env.MONGODB_URI;
// mongoose.connect(mongoDb, { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

require('dotenv').config();
require('../mongo/mongoConfig');
const { faker } = require('@faker-js/faker');
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');

const users = [];
const posts = [];
const comments = [];

const addUser = () => {
	const test = {
		first_name: faker.name.firstName(),
		last_name: faker.name.lastName(),
		email: faker.internet.email(),
		password: faker.internet.password(),
		profile_picture_url: faker.image.image(),
		bio: faker.lorem.lines(),
	};
	const user = new User(test);
	users.push(user);
};

const addPosts = () => {
	users.forEach((user) => {
		for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
			addUserPost(user);
		}
	});
};

const addUserPost = (user) => {
	const post = new Post({
		author: user._id,
		text: faker.lorem.sentences(),
	});
	if (Math.random() > 0.9) {
		post.picture_url = faker.image.image();
	}
	posts.push(post);
};

const addLikesToPosts = () => {
	posts.forEach((post) => {
		users.forEach((user) => {
			if (Math.random() > 0.9) {
				post.likes.push(user._id);
			}
		});
	});
};

const addCommentsToPosts = () => {
	posts.forEach((post) => {
		users.forEach((user) => {
			if (Math.random() > 0.9) {
				const comment = new Comment({
					author: user._id,
					post_ref: post._id,
					text: faker.lorem.sentence(),
				});
				comments.push(comment);
				post.comments.push(comment._id);
			}
		});
	});
};

const addLikesToComments = () => {
	comments.forEach((comment) => {
		users.forEach((user) => {
			if (Math.random() > 0.95) {
				comment.likes.push(user._id);
			}
		});
	});
};

const seedDB = () => {
	for (let i = 0; i < 50; i++) {
		addUser();
	}

	addPosts();
	addLikesToPosts();
	addCommentsToPosts();
	addLikesToComments();

	users.forEach(async (user) => {
		try {
			await user.save();
		} catch (error) {
			console.log(error);
		}
	});

	posts.forEach(async (post) => {
		try {
			await post.save();
		} catch (error) {
			console.log(error);
		}
	});

	comments.forEach(async (comment) => {
		try {
			await comment.save();
		} catch (error) {
			console.log(error);
		}
	});

	return;
};

module.exports = seedDB;
