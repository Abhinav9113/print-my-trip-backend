# 🛠️ AWS Lambda Functions for Image Upload and CMYK PDF Conversion

This project includes **two AWS Lambda functions** that handle the uploading of images to Amazon S3 and converting them into CMYK-colored PDF files.

---

## 📁 Function 1: `generatePresignedUploadUrl`

### 📌 Purpose:

Generates a **unique S3 file key** and returns a **pre-signed URL** that allows the frontend to upload an image securely to S3.

### 🔧 How It Works:

1. Lists existing folders in the S3 bucket (like `0001/`, `0002/`).
2. Determines the **next available folder name** based on existing numbered folders.
3. Creates a new key like `0003/0003.jpg`.
4. Generates a **pre-signed PUT URL** using `@aws-sdk/s3-request-presigner`.
5. Returns both the `uploadUrl` and the final `fileKey`.

### 🔐 IAM Permissions Required:

- `s3:ListBucket`
- `s3:PutObject`

### 📤 Example Response:

```json
{
  "uploadUrl": "https://print-your-trip-assets.s3...",
  "fileKey": "0003/0003.jpg"
}
```

---

## 🖼️ Function 2: `convertToCmykPdf`

### 📌 Purpose:

Downloads an image from S3, converts it to **CMYK color space**, and **generates a high-quality PDF**, then uploads the PDF back to S3.

### 🛠️ How It Works:

1. Downloads the image from S3 using the provided `s3Key`.
2. Converts the image to **CMYK JPEG** using `sharp`.
3. Embeds the image in a new PDF document using `pdf-lib`.
4. Uploads the PDF to the same folder in S3 as `{filename}-cmyk.pdf`.
5. Returns the URL to the uploaded PDF.

### 🧰 Tech Used:

- `sharp`: For color space conversion
- `pdf-lib`: For PDF creation and image embedding
- `@aws-sdk/client-s3`: For accessing S3

### 🔐 IAM Permissions Required:

- `s3:GetObject`
- `s3:PutObject`

### 📤 Example Response:

```json
{
  "cmykPdfUrl": "https://print-your-trip-assets.s3.../0003/0003-cmyk.pdf"
}
```

---

## 🧪 Example Use Case Flow

1. **Frontend** calls `generatePresignedUploadUrl` to get a signed URL.
2. Uploads cropped image using the URL.
3. Sends the `fileKey` to `convertToCmykPdf` Lambda.
4. PDF is generated and returned.

---

## 🔐 Security & Access

Both functions implement `CORS` headers for web access and rely on **IAM roles** to secure S3 operations.

- Add appropriate trust policies to Lambda execution roles.
- Ensure the bucket has no public access — all uploads/downloads happen via signed URLs.

---

## 🌍 S3 Bucket Naming

All files are stored under structured folders:

```
/0001/0001.jpg
/0001/0001-cmyk.pdf
...
```

Each new upload is placed in a new folder to **prevent overwriting**.

---

## 📌 Deployment Notes

- Make sure `sharp` is compiled for **Amazon Linux x64** when deploying.
- Use Docker or native Linux to `npm install` dependencies for compatibility.
- ZIP and deploy with required `node_modules` and entry file.

  ***
