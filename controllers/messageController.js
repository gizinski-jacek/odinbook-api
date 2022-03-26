require('dotenv').config();
const Chat = require('../models/chat');
const Message = require('../models/message');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const url = require('url');
const fs = require('fs');
const { socketEmits } = require('../socketio/socketio');

exports.get_chat_message_list = async (req, res, next) => {
	try {
		req.query.participants.forEach((participant) => {
			if (!mongoose.Types.ObjectId.isValid(participant)) {
				return res.status(404).json('Invalid post Id');
			}
		});
		const chatExists = await Chat.findOne({
			participants: req.query.participants,
		})
			.populate({
				path: 'message_list',
				populate: {
					path: 'author',
				},
			})
			.exec();
		if (!chatExists) {
			const newChat = new Chat({ participants: participants });
			const chat = await newChat.save();
			return res.status(200).json(chat);
		}
		return res.status(200).json(chatExists);
	} catch (error) {
		console.log(error);
	}
};

exports.create_chat_message = [
	body('text', 'Text is invalid').trim().isLength({ min: 1, max: 64 }).escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.body.chat_ref)) {
				return res.status(404).json('Invalid post Id');
			}
			const errors = validationResult(req);
			const newMessage = new Message({
				chat_ref: req.body.chat_ref,
				author: req.user._id,
				text: req.body.text,
			});
			const theMessage = await newMessage.save();
			const chatData = await Chat.findByIdAndUpdate(
				req.body.chat_ref,
				{
					$addToSet: { message_list: theMessage._id },
				},
				{ new: true }
			)
				.populate({
					path: 'message_list',
					populate: {
						path: 'author',
					},
				})
				.exec();
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			socketEmits.send_message(req.body.recipient, chatData);
			return res.status(200).json('Chat message sent');
		} catch (error) {
			next(error);
		}
	},
];

exports.get_new_message_list = async (req, res, next) => {
	try {
		const new_message_list = await Message.find({
			$and: [
				{ participants: { $in: req.user._id } },
				{
					author: { $ne: req.user._id },
				},
				{
					viewed: false,
				},
			],
		})
			.sort({ createdAt: 'desc' })
			.populate('author')
			.exec();
		return res.status(200).json(new_message_list);
	} catch (error) {
		next(error);
	}
};

exports.dismiss_message = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.messageId)) {
			return res.status(404).json('Invalid message Id');
		}
		const message = await Message.findByIdAndUpdate(req.body.messageId, {
			viewed: true,
		}).exec();
		if (!message) {
			return res.status(404).json('Message not found');
		}
		const new_message_list = await Message.find({
			$and: [
				{ participants: { $in: req.user._id } },
				{
					author: { $ne: req.user._id },
				},
				{
					viewed: false,
				},
			],
		})
			.sort({ createdAt: 'desc' })
			.populate('author')
			.exec();
		return res.status(200).json(new_message_list);
	} catch (error) {
		next(error);
	}
};
