import multer from 'multer';
import vision from '@google-cloud/vision';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Multer Setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.single('image');

// Google Cloud Vision API-Client initialisieren
const client = new vision.ImageAnnotatorClient();

const handler = async (req, res) => {
  try {
    // Handling file upload with multer
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("Received File:", req.file);

    // Step 1: Generate a description for the image using Google Cloud Vision API
    const [result] = await client.labelDetection(req.file.buffer);
    const labels = result.labelAnnotations.map(label => label.description);
    
    // Create a prompt using the detected labels
    const descriptionPrompt = `Beschreibe ein Bild, das die folgenden Elemente enthält: ${labels.join(', ')}.`;

    console.log("Labels in English:", labels);
    console.log("Description Prompt:", descriptionPrompt);

    // Step 2: Generate title and alt attributes based on the description
    const data = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher Assistent. Erstelle einen prägnanten Titel und einen detaillierten Alt-Text für das hochgeladene Bild basierend auf der folgenden Beschreibung.',
        },
        {
          role: 'user',
          content: descriptionPrompt,
        },
      ],
      temperature: 0.5,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API Error:", error);
      return res.status(500).json({ error: error.message });
    }

    const responseData = await response.json();
    if (!responseData.choices || !responseData.choices[0]) {
      return res.status(500).json({ error: 'Invalid response from OpenAI when generating title and alt text.' });
    }

    const completionText = responseData.choices[0].message.content;
    console.log("Completion Text:", completionText);

    // Using regex to find the title and alt text
    const titleMatch = completionText.match(/Titel:\s*(.*)/);
    const altMatch = completionText.match(/Alt-Text:\s*(.*)/);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const alt = altMatch ? altMatch[1].trim() : null;

    // Ensure both title and alt are provided
    if (!title || !alt) {
      return res.status(500).json({ error: 'The response did not contain both title and alt text.' });
    }

    // Step 3: Save the image with a good filename and provide a download link
    const sanitizedTitle = title
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae')
      .replace(/Ö/g, 'Oe')
      .replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filename = `${sanitizedTitle}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, req.file.buffer);

    return res.status(200).json({
      title,
      alt,
      downloadUrl: `/uploads/${filename}`
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export default handler;
