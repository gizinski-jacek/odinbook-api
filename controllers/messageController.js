require('dotenv').config();
const Chat = require('../models/chat');
const Message = require('../models/message');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const url = require('url');
const fs = require('fs');
const { socketEmits } = require('../socketio/socketio');

exports.create_message = [
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
			socketEmits.send_message(req.user._id, chatData);
			return res.status(200).json('Chat message sent');
		} catch (error) {
			next(error);
		}
	},
];
