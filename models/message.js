const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MessageSchema = new Schema(
	{
		chat_ref: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		text: { type: String, minlength: 1, maxlength: 64, required: true },
		readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);
