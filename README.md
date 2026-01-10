# n8n-nodes-binary-to-url

<div align="center">

**Binary Bridge - n8n Community Node**

Upload binary files to cloud storage and access them via public URLs

[![npm version](https://badge.fury.io/js/n8n-nodes-binary-to-url.svg)](https://www.npmjs.com/package/n8n-nodes-binary-to-url)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Features

- **Upload to Storage** - Upload binary files to S3 or Supabase storage
- **Public URL Proxy** - Get public URLs via built-in webhook proxy
- **Streaming Support** - High-performance streaming to avoid memory overflow
- **Multiple Storage Backends** - Support for AWS S3, S3-compatible services, and Supabase
- **File Type Detection** - Automatic MIME type detection with security validation
- **Flexible Configuration** - Support for custom endpoints and path-style addressing

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## Installation

### Install via npm

```bash
npm install n8n-nodes-binary-to-url
```

### Install in n8n

1. Go to your n8n installation directory
2. Run the npm install command above
3. Restart n8n
4. The "Binary Bridge" node will appear in the node palette

---

## Quick Start

### Basic Upload

1. Add a **Binary Bridge** node to your workflow
2. Select **AWS S3** or **Supabase** as storage driver
3. Configure your credentials
4. Set operation to **Upload**
5. Configure bucket name and region
6. Connect any node with binary data (e.g., HTTP Request, Read Binary File)
7. Execute the workflow

**Output:**

```json
{
  "fileKey": "1704801234567-abc123def456.jpg",
  "proxyUrl": "https://your-n8n.com/webhook/123/binarybridge/file/1704801234567-abc123def456.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245678
}
```

---

## Configuration

### Storage Drivers

#### AWS S3 / S3-Compatible

| Parameter             | Type    | Required | Description                                    |
| --------------------- | ------- | -------- | ---------------------------------------------- |
| **Access Key ID**     | string  | ✅ Yes   | AWS access key ID                              |
| **Secret Access Key** | string  | ✅ Yes   | AWS secret access key                          |
| **Region**            | string  | ✅ Yes   | AWS region (e.g., `us-east-1`)                 |
| **Bucket**            | string  | ✅ Yes   | S3 bucket name                                 |
| **Custom Endpoint**   | string  | ❌ No    | Custom endpoint URL for S3-compatible services |
| **Force Path Style**  | boolean | ❌ No    | Use path-style addressing (default: `false`)   |

**Supported S3-Compatible Services:**

- AWS S3
- Alibaba Cloud OSS
- Tencent Cloud COS
- MinIO
- DigitalOcean Spaces
- Wasabi
- Any S3-compatible storage

#### Supabase

| Parameter       | Type   | Required | Description                  |
| --------------- | ------ | -------- | ---------------------------- |
| **Project URL** | string | ✅ Yes   | Supabase project URL         |
| **API Key**     | string | ✅ Yes   | Supabase API key             |
| **Bucket**      | string | ✅ Yes   | Supabase storage bucket name |

### Operations

#### Upload Operation

| Parameter           | Type   | Required | Default | Description                             |
| ------------------- | ------ | -------- | ------- | --------------------------------------- |
| **Binary Property** | string | ❌ No    | `data`  | Name of binary property containing file |

#### Delete Operation

| Parameter    | Type   | Required | Default | Description               |
| ------------ | ------ | -------- | ------- | ------------------------- |
| **File Key** | string | ✅ Yes\* | -       | Key of the file to delete |

\*Can also be provided from previous node via `fileKey` property

---

## Usage Examples

### Example 1: Upload and Share Image

```yaml
Workflow: 1. HTTP Request (download image)
  2. Binary Bridge (upload to S3)
  3. Send email with image URL
```

**Output after step 2:**

```json
{
  "proxyUrl": "https://n8n.example.com/webhook/abc123/binarybridge/file/1704801234567-abc.jpg"
}
```

### Example 2: Upload Multiple Files

```yaml
Workflow: 1. Read Binary Files (from folder)
  2. Binary Bridge (upload to S3)
  3. Loop over results
  4. Create database record with URLs
```

### Example 3: Upload and Delete

```yaml
Workflow:
  1. Upload file → Binary Bridge (operation: Upload)
  2. Use URL temporarily
  3. After 24 hours → Binary Bridge (operation: Delete)
```

---

## Architecture

### Single-Node Proxy Pattern

This node implements a unique **Single-Node Proxy** architecture:

```
┌─────────────┐      Upload      ┌──────────────┐
│  n8n Node   │ ───────────────► │  S3/Supabase │
│  (Binary    │ ◄─────────────── │   Storage    │
│   Bridge)   │    Return URL    │              │
└──────┬──────┘                  └──────────────┘
       │
       │ GET Request (proxy file)
       ▼
┌─────────────────────────────────┐
│  Return file stream to client   │
│  - Content-Type header          │
│  - Cache-Control: 24h           │
│  - Content-Disposition: inline  │
└─────────────────────────────────┘
```

### Key Advantages

- **Zero External Dependencies** - No additional services needed
- **Memory Efficient** - Streaming prevents memory overflow in n8n Cloud
- **Automatic URL Generation** - Webhook URL auto-generated based on n8n instance
- **Secure File Keys** - Timestamp + random string prevents guessing
- **MIME Type Validation** - White-list of allowed file types for security

---

## API Reference

### Upload Response

```typescript
{
  fileKey: string; // Unique file identifier
  proxyUrl: string; // Public URL to access file
  contentType: string; // MIME type (e.g., "image/jpeg")
  fileSize: number; // File size in bytes
}
```

### Delete Response

```typescript
{
  success: boolean; // true if deletion succeeded
  deleted: string; // The file key that was deleted
}
```

### Supported File Types

**Images:**

- JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, AVIF

**Videos:**

- MP4, WebM, MOV, AVI, MKV

**Audio:**

- MP3, WAV, OGG, FLAC

**Documents:**

- PDF, ZIP, RAR, 7Z, TXT, CSV, JSON, XML, XLSX, DOCX

---

## Security

### File Type Validation

Files are validated against a white-list of allowed MIME types. The `file-type` library detects the actual file type from binary signature, not just the file extension.

### File Key Format

File keys follow the pattern: `{timestamp}-{random}.{extension}`

Example: `1704801234567-abc123def456.jpg`

This prevents unauthorized file enumeration.

### File Size Limits

- **Maximum file size:** 100 MB
- Configurable in source code (`MAX_FILE_SIZE` constant)

### Access Control

The webhook proxy inherits n8n's authentication and access control mechanisms.

---

## Troubleshooting

### Common Issues

#### 1. "Bucket not found" Error

**Problem:** The S3 bucket or Supabase storage bucket doesn't exist or is not accessible.

**Solution:**

- Verify bucket name is correct
- Check credentials have read/write access
- Ensure bucket is in the correct region

#### 2. "Access Denied" Error

**Problem:** Insufficient permissions.

**Solution:**

- Verify access keys are correct
- Check IAM policy includes `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
- For Supabase, ensure API key has storage permissions

#### 3. URL Returns 404

**Problem:** File not found or URL is incorrect.

**Solution:**

- Verify the workflow is active (webhooks only work in active workflows)
- Check the fileKey exists in storage
- Ensure node name hasn't changed (URL includes node name)

#### 4. Large Files Cause Memory Issues

**Problem:** Uploading files >10MB to Supabase consumes memory.

**Solution:**

- Use S3 instead for better streaming support
- Reduce file size before upload
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`

### Debug Mode

Enable debug logging in n8n:

```bash
export N8N_LOG_LEVEL=debug
npm start
```

---

## Development

### Project Structure

```
n8n-nodes-binary-to-url/
├── nodes/
│   └── BinaryBridge/
│       ├── BinaryBridge.node.ts    # Main node implementation
│       └── BinaryBridge.svg         # Node icon
├── drivers/
│   ├── index.ts                     # Driver factory
│   ├── S3Storage.ts                 # AWS S3 driver
│   └── SupabaseStorage.ts           # Supabase driver
├── dist/                            # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Build

```bash
npm install
npm run build
```

### Development

```bash
npm run dev  # Watch mode
```

### Lint & Format

```bash
npm run lint       # Check code quality
npm run lintfix    # Auto-fix lint issues
npm run format     # Format with Prettier
```

### Test

```bash
npm test
```

---

## Technical Details

- **Node Type:** Transform
- **Version:** 0.0.1
- **n8n Version:** >= 1.0.0
- **Dependencies:**
  - `@aws-sdk/client-s3` - AWS S3 client
  - `@supabase/supabase-js` - Supabase client
  - `file-type` - MIME type detection

---

## License

[MIT](LICENSE)

---

## Repository

[https://cnb.cool/ksxh-wwrs/n8n-nodes-binary-to-url](https://cnb.cool/ksxh-wwrs/n8n-nodes-binary-to-url)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Support

- Create an issue in the GitHub repository
- Check the [n8n community forum](https://community.n8n.io)

---

## Changelog

### 0.0.1 (2026-01-10)

- Initial release
- Support for AWS S3 and S3-compatible storage
- Support for Supabase storage
- Upload and Delete operations
- Built-in webhook proxy
- Streaming support for memory efficiency
- MIME type validation
- File size limits (100MB)
