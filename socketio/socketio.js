const { Server } = require('socket.io');
const passportJwtSocket = require('passport-jwt.socketio');
const Chat = require('../models/chat');
const User = require('../models/user');
const mongoose = require('mongoose');

let notifications_clients = [];
let chats_clients = [];

const io = new Server();
const notifications = io.of('/notifications');
const chats = io.of('/chats');

const extractToken = (req) => {
	let token = null;
	if (req && req.headers && req.headers.cookie) {
		token = req.headers.cookie.replace('token=', '');
	}
	return token;
};

io._nsps.forEach((ionamespace) => {
	ionamespace.use(
		passportJwtSocket.authorize(
			{
				jwtFromRequest: extractToken,
				secretOrKey: process.env.STRATEGY_SECRET,
			},
			async (jwtPayload, done) => {
				try {
					const user = await User.findOne({ _id: jwtPayload._id }).exec();
					if (!user) {
						return done(null, false, { msg: 'User not found' });
					}
					return done(null, user, { success: true });
				} catch (error) {
					done(error);
				}
			}
		)
	);
});

notifications.on('connection', (socket) => {
	if (
		!notifications_clients.find(
			(client) => client.userId == socket.handshake.user._id
		)
	) {
		notifications_clients.push({
			userId: socket.handshake.user._id,
			socket: socket,
		});
	}

	socket.on('subscribe_alerts', () => {
		if (
			!notifications_clients.find(
				(client) => client.userId == socket.handshake.user._id.toString()
			)
		) {
			notifications_clients.push({
				userId: socket.handshake.user._id,
				socket: socket,
			});
		}
	});

	socket.on('disconnect', () => {
		notifications_clients.splice(
			notifications_clients.findIndex(
				(client) => client.socket.id == socket.id
			),
			1
		);
	});
});

chats.on('connection', (socket) => {
	if (
		!chats_clients.find(
			(client) => client.userId == socket.handshake.user._id.toString()
		)
	) {
		chats_clients.push({
			userId: socket.handshake.user._id,
			socket: socket,
		});
	}

	socket.on('subscribe_chat', async (friendId) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(friendId)) {
				socket.emit('oops', 'Chat error');
				return;
			}
			const participantList = [socket.handshake.user._id, friendId].sort();
			const chatExists = await Chat.findOne({
				participants: participantList,
			}).exec();
			if (!chatExists) {
				const newChat = new Chat({ participants: participantList });
				const chat = await newChat.save();
				socket.join(chat._id.toString());
			} else {
				socket.join(chatExists._id.toString());
			}
		} catch (error) {
			socket.emit('oops', 'Chat error');
		}
	});

	socket.on('disconnect', () => {
		chats_clients.splice(
			chats_clients.findIndex((client) => client.socket.id == socket.id),
			1
		);
	});
});

const socketEmits = {
	notification_alert: (userId) => {
		const notificationsClient = notifications_clients.find(
			(client) => client.userId == userId
		);
		if (notificationsClient) {
			notifications
				.to(notificationsClient.socket.id)
				.emit('notification_alert');
		}
	},
	send_message: (friendId, chatData) => {
		const chatClient = chats_clients.find(
			(client) => client.userId == friendId.toString()
		);
		const notificationsClient = notifications_clients.find(
			(client) => client.userId == friendId.toString()
		);
		if (chatClient) {
			chats.to(chatClient.socket.id).emit('receive_message', chatData);
		}
		if (notificationsClient) {
			notifications.to(notificationsClient.socket.id).emit('message_alert');
		}
		chats.to(chatData._id.toString()).emit('receive_message', chatData);
	},
};

exports.socketEmits = socketEmits;
exports.io = io;
