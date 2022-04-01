const multer = require('multer');
const path = require('path');

const usersFiles = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'public/photos/users');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '__' + file.originalname);
	},
});

const postsFiles = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'public/photos/posts');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '__' + file.originalname);
	},
});

const uploadUserFile = multer({
	storage: usersFiles,
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

const uploadPostFile = multer({
	storage: postsFiles,
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

module.exports = { uploadUserFile, uploadPostFile };
