import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  const { filename } = req.query;
  const filePath = path.join('/tmp/uploads', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'image/jpeg');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
};

export default handler;
