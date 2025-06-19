import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "print-your-trip-assets";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const s3Key = body.s3Key;

    if (!s3Key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing s3Key" }),
      };
    }

    // Step 1: Download image from S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    const s3Object = await s3.send(getCommand);
    const imageBuffer = await streamToBuffer(s3Object.Body);

    // Step 2: Convert RGB to CMYK using sharp
    const cmykBuffer = await sharp(imageBuffer)
      .toColourspace("cmyk")
      .jpeg()
      .toBuffer();

    // Step 3: Create PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(cmykBuffer);
    const page = pdfDoc.addPage([1800, 1200]); // size in pixels at 300 DPI
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: 1800,
      height: 1200,
    });

    const pdfBytes = await pdfDoc.save();

    // Step 4: Upload PDF back to S3
    const outputKey = s3Key.replace(/\.(jpg|jpeg|png)$/, "-cmyk.pdf");
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: outputKey,
      Body: Buffer.from(pdfBytes),
      ContentType: "application/pdf",
    });
    await s3.send(putCommand);

    const fileUrl = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${outputKey}`;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ cmykPdfUrl: fileUrl }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

// Helper: stream → buffer
const streamToBuffer = async (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
