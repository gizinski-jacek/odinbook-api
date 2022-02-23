require('dotenv').config();
const Comment = require('../models/comment');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_comment = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 8, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			const errors = validationResult(req);
			const newComment = new Comment({
				author: req.user._id,
				post_ref: req.params.postid,
				text: req.body.text,
				likes: [],
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const comment = await newComment.save();
			if (!comment) {
				return res
					.status(404)
					.json('Error creating comment, try again in a few minutes');
			}
			const comment_list = await Comment.find({
				post_ref: req.params.postid,
			})
				.sort({ createdAt: 'desc' })
				.exec();
			return res.status(200).json(comment_list);
		} catch (error) {
			next(error);
		}
	},
];

exports.get_post_comments = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		const comment_list = await Comment.find({
			post_ref: req.params.postid,
		})
			.sort({ createdAt: 'desc' })
			.exec();
		return res.status(200).json(comment_list);
	} catch (error) {
		next(error);
	}
};

exports.update_comment = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 8, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
				return res.status(404).json('Invalid comment Id');
			}
			const theComment = await Comment.findById(req.params.commentid).exec();
			const errors = validationResult(req);
			const updatedComment = new Comment({
				_id: theComment._id,
				author: theComment.author,
				post_ref: theComment.post_ref,
				text: req.body.text,
				likes: theComment.likes,
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				updatedComment,
				{ timestamps: true }
			);
			if (!comment) {
				return res.status(404).json('Comment not found. Nothing to update');
			}
			const comment_list = await Comment.find({
				post_ref: req.params.postid,
			})
				.sort({ createdAt: 'desc' })
				.exec();
			return res.status(200).json(comment_list);
		} catch (error) {
			next(error);
		}
	},
];

exports.delete_comment = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
			return res.status(404).json('Invalid comment Id');
		}
		const comment = await Comment.findByIdAndDelete(
			req.params.commentid
		).exec();
		if (!comment) {
			return res.status(404).json('Comment not found, nothing to delete');
		}
		const comment_list = await Comment.find({
			post_ref: req.params.postid,
		})
			.sort({ createdAt: 'desc' })
			.exec();
		return res.status(200).json(comment_list);
	} catch (error) {
		next(error);
	}
};

exports.change_like_status = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
			return res.status(404).json('Invalid comment Id');
		}
		const theComment = await Comment.findOne({
			_id: req.params.commentid,
			likes: { $in: req.user._id },
		}).exec();
		if (theComment) {
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				{ $pull: { likes: req.user._id } },
				{ timestamps: false }
			).exec();
			if (!comment) {
				return res.status(404).json('Comment not found, nothing to unlike');
			}
			const comment_list = await Comment.find({
				post_ref: req.params.postid,
			})
				.sort({ createdAt: 'desc' })
				.exec();
			return res.status(200).json(comment_list);
		} else {
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				{ $addToSet: { likes: req.user._id } },
				{ timestamps: false }
			).exec();
			if (!comment) {
				return res.status(404).json('Comment not found, nothing to like');
			}
			const comment_list = await Comment.find({
				post_ref: req.params.postid,
			})
				.sort({ createdAt: 'desc' })
				.exec();
			return res.status(200).json(comment_list);
		}
	} catch (error) {
		next(error);
	}
};
