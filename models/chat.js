const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ChatSchema = new Schema({
	participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
	message_list: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
});

module.exports = mongoose.model('Chat', ChatSchema);
