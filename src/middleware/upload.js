const multer = require('multer');
const nextConnect = require('next-connect');

const upload = multer({ storage: multer.memoryStorage() });

const middleware = nextConnect();

middleware.use(upload.single('image'));

module.exports = middleware;
