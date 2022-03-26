const { Server } = require('socket.io');
const passportJwtSocket = require('passport-jwt.socketio');
const Chat = require('../models/chat');
const User = require('../models/user');

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

[io, notifications, chats].forEach((ionamespace) =>
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
					return done(null, user, { msg: 'Success' });
				} catch (error) {
					done(error);
				}
			}
		)
	)
);

// io.on('connection', (socket) => {
// 	if (
// 		!all_clients.find((client) => client.userId == socket.handshake.user._id)
// 	) {
// 		all_clients.push({
// 			userId: socket.handshake.user._id,
// 			socket: socket,
// 		});
// 	}

// 	socket.on('disconnect', () => {
// 		all_clients.splice(
// 			all_clients.findIndex((client) => client.socket.id == socket.id),
// 			1
// 		);
// 	});
// });

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

	socket.on('subscribe_alerts', (userId) => {
		if (!notifications_clients.find((c) => c.userId == userId)) {
			notifications_clients.push({ userId: userId, socket: socket });
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
		!chats_clients.find((client) => client.userId == socket.handshake.user._id)
	) {
		chats_clients.push({
			userId: socket.handshake.user._id,
			socket: socket,
		});
	}

	socket.on('subscribe_chat', async (participants) => {
		try {
			const chatExists = await Chat.findOne({ participants: participants })
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
				socket.join(chat._id.toString());
			} else {
				socket.join(chatExists._id.toString());
			}
		} catch (error) {
			socket.emit('oops', 'Chat error');
			console.log(error);
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
	send_message: (recipientId, chatData) => {
		const notificationsClient = notifications_clients.find(
			(client) => client.userId == recipientId
		);
		if (notificationsClient) {
			notifications.to(notificationsClient.socket.id).emit('message_alert');
		}
		chats.to(chatData._id.toString()).emit('receive_message', chatData);
	},
};

exports.socketEmits = socketEmits;
exports.io = io;
