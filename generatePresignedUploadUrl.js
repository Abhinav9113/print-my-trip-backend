import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "print-your-trip-assets";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { contentType } = body;

    // Step 1: List objects to find current folder numbers
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: "/",
    });

    const result = await s3.send(listCommand);

    // Extract current folder names like "0001/", "0002/"
    const prefixes =
      result.CommonPrefixes?.map((p) => p.Prefix.replace("/", "")) || [];
    const folderNumbers = prefixes
      .map((n) => parseInt(n))
      .filter((n) => !isNaN(n))
      .sort((a, b) => b - a); // Descending

    const nextFolderNum = folderNumbers.length > 0 ? folderNumbers[0] + 1 : 1;
    const folderName = String(nextFolderNum).padStart(4, "0");

    // Final file key
    const filename = `${folderName}.jpg`;
    const fileKey = `${folderName}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ uploadUrl, fileKey }),
    };
  } catch (err) {
    console.error("❌ Lambda Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to generate presigned URL" }),
    };
  }
};
