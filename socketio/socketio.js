const { Server } = require('socket.io');
const Chat = require('../models/chat');
const Message = require('../models/message');

let client_list = [];

let all_new_messages_data = [];

const io = new Server();

io.on('connection', (socket) => {
	socket.chatId = '';

	socket.on('subscribe_alerts', (userId) => {
		if (!client_list.find((c) => c.userId == userId)) {
			client_list.push({ userId: userId, socketId: socket.id });
		}
	});

	socket.on('open_messages_menu', (userId) => {
		let user_data = all_new_messages_data.find((data) => data.userId == userId);
		if (user_data) {
			socket.emit('load_new_messages', user_data.message_list);
		}
	});

	socket.on('dismiss_message', (userId, messageId) => {
		let user_data = all_new_messages_data.find((data) => data.userId == userId);
		let messageIndex = user_data.message_list.findIndex(
			(message) => message._id == messageId
		);
		all_new_messages_data = all_new_messages_data.map((data) => {
			if (data.userId == userId) {
				data.message_list.splice(messageIndex, 1);
				return data;
			}
			return data;
		});
	});

	socket.on('subscribe_chat', async (participants) => {
		try {
			let theChat = await Chat.findOne({ participants: participants })
				.populate({
					path: 'message_list',
					populate: {
						path: 'author',
					},
				})
				.exec();
			if (!theChat) {
				let newChat = new Chat({ participants });
				let chat = await newChat.save();
				socket.chatId = chat._id.toString();
			} else {
				socket.chatId = theChat._id.toString();
			}
			socket.join(socket.chatId);
		} catch (error) {
			socket.emit('oops', 'Chat error');
			console.log(error);
		}
	});

	socket.on('open_chat', async (participants) => {
		try {
			let theChat = await Chat.findOne({ participants: participants })
				.populate({
					path: 'message_list',
					populate: {
						path: 'author',
					},
				})
				.exec();
			if (!theChat) {
				let newChat = new Chat({ participants });
				let chat = await newChat.save();
				socket.emit('load_chat', chat);
			} else {
				socket.emit('load_chat', theChat);
			}
			socket.join(socket.chatId);
		} catch (error) {
			socket.emit('oops', 'Chat error');
			console.log(error);
		}
	});

	socket.on('send_message', async (data, recipientId) => {
		try {
			let newMessage = new Message({
				chat_ref: data.chat_ref,
				author: data.author,
				text: data.text,
			});
			let message = await newMessage.save();
			let chat = await Chat.findByIdAndUpdate(
				data.chat_ref,
				{
					$addToSet: { message_list: message._id },
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
			if (all_new_messages_data.find((data) => data.userId == recipientId)) {
				all_new_messages_data = all_new_messages_data.map((data) => {
					if (data.userId == recipientId) {
						return {
							...data,
							message_list: [...data.message_list, message],
						};
					}
					return data;
				});
			} else {
				all_new_messages_data.push({
					userId: recipientId,
					message_list: [message],
				});
			}
			let client_connected = client_list.find(
				(client) => client.userId == recipientId
			);
			if (client_connected) {
				io.to(client_connected.socketId).emit('message_alert');
			}
			socket.to(socket.chatId).emit('message_alert');
			io.to(socket.chatId).emit('receive_message', chat);
		} catch (error) {
			socket.emit('oops', 'Chat error');
			console.log(error);
		}
	});

	socket.on('disconnect', () => {
		client_list.splice(
			client_list.findIndex((client) => client.socketId == socket.id),
			1
		);
	});
});

const socketEmits = {
	notification_alert: (userId) => {
		const client = client_list.find((client) => client.userId == userId);
		if (client) {
			io.to(client.socketId).emit('notification_alert');
		}
	},
};

exports.io = io;
exports.socketEmits = socketEmits;
