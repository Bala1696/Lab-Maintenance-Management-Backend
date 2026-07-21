import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Department, LabRoom } from '../models/index.js';

// ─── Configure Cloudinary from CLOUDINARY_URL in .env ────────────────────────
// Format: cloudinary://api_key:api_secret@cloud_name
// NOTE: The v2 SDK does not accept a `cloudinary_url` config key, so we
//       parse the URL ourselves.
function parseCloudinaryUrl(url) {
  if (!url) return null;
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return { api_key: match[1], api_secret: match[2], cloud_name: match[3] };
}

const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
cloudinary.config({
  cloud_name: parsed?.cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    parsed?.api_key    || process.env.CLOUDINARY_API_KEY,
  api_secret: parsed?.api_secret || process.env.CLOUDINARY_API_SECRET
});

const { cloud_name } = cloudinary.config();
console.log(cloud_name
  ? `✅  Cloudinary ready → cloud: ${cloud_name}`
  : '❌  Cloudinary NOT configured — check CLOUDINARY_URL in .env'
);

// ─── Multer: Memory Storage ───────────────────────────────────────────────────
// Files are buffered in req.file.buffer.
// We do NOT use CloudinaryStorage here because it pre-signs requests with the
// system clock timestamp, causing "Stale request" errors when the server clock
// drifts vs Cloudinary's server time.
// Instead, we stream the buffer to Cloudinary inside the controller, where
// upload_stream generates a fresh timestamp at the exact moment of upload.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: jpg, png, webp, pdf`));
    }
  }
});

// ─── Helper: Resolve Cloudinary folder for a lab room ────────────────────────
// Folder structure: lab-assets/{DepartmentName}/{LabName}
// e.g. lab-assets/Artificial_Intelligence_and_Data_Science/GEN_AI_LAB
export const resolveLabFolder = async (req) => {
  let deptName = 'General';
  let labName  = 'General';

  try {
    // 1. Resolve Department Name
    if (req.body.departmentId) {
      const dept = await Department.findByPk(req.body.departmentId);
      if (dept) deptName = dept.departmentName.replace(/[^a-zA-Z0-9]/g, '_');
    }

    // 2. Resolve Lab Name
    //    - UPDATE (PUT /api/lab-rooms/:id): lab ID is in req.params.id
    //    - CREATE (POST /api/lab-rooms):    use req.body.labName (sent before file)
    const labRoomId = req.body.labRoomId || req.params?.id;
    if (labRoomId) {
      const lab = await LabRoom.findByPk(labRoomId);
      if (lab) {
        labName = lab.labName.replace(/[^a-zA-Z0-9]/g, '_');
        // Fallback: resolve dept from the lab record if not in body
        if (!req.body.departmentId && lab.departmentId) {
          const dept = await Department.findByPk(lab.departmentId);
          if (dept) deptName = dept.departmentName.replace(/[^a-zA-Z0-9]/g, '_');
        }
      }
    } else if (req.body.labName) {
      labName = req.body.labName.replace(/[^a-zA-Z0-9]/g, '_');
    }
  } catch (err) {
    console.error('resolveLabFolder error:', err.message);
  }

  return `lab-assets/${deptName}/${labName}`;
};

// ─── Helper: Get Cloudinary's server time via HTTP Date header ────────────────
// Uses Node's https module (with SSL bypass) to ping Cloudinary's API and read
// the Date header. This gives us Cloudinary's actual server time, which we use
// as the upload timestamp — solving "Stale request" errors from clock drift.
import https from 'https';

function getCloudinaryServerTime() {
  return new Promise((resolve) => {
    const { cloud_name } = cloudinary.config();
    const url = `https://api.cloudinary.com/v1_1/${cloud_name}/ping`;
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      const dateHeader = res.headers['date'];
      if (dateHeader) {
        const serverTs = Math.floor(new Date(dateHeader).getTime() / 1000);
        console.log(`🕐  Cloudinary server time synced: ${dateHeader} (unix: ${serverTs})`);
        resolve(serverTs);
      } else {
        console.warn('⚠️  No Date header from Cloudinary, using local clock');
        resolve(Math.floor(Date.now() / 1000));
      }
      res.resume(); // drain the response body
    });
    req.on('error', (e) => {
      console.warn('⚠️  Cloudinary time sync failed, using local clock:', e.message);
      resolve(Math.floor(Date.now() / 1000));
    });
    req.setTimeout(5000, () => {
      req.destroy();
      console.warn('⚠️  Cloudinary time sync timed out, using local clock');
      resolve(Math.floor(Date.now() / 1000));
    });
  });
}

// ─── Helper: Upload a buffer directly to Cloudinary ──────────────────────────
// Uses cloudinary.uploader.upload() with a base64 data URI.
// Always signs with Cloudinary's own server timestamp to avoid Stale request errors.
export const streamToCloudinary = async (buffer, options = {}) => {
  // 1. Get Cloudinary's server time FIRST to avoid clock-drift signing errors
  const timestamp = await getCloudinaryServerTime();

  // 2. Convert buffer → base64 data URI
  const base64 = buffer.toString('base64');
  // Detect MIME type from magic bytes
  let mime = 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) mime = 'image/png';
  else if (buffer[0] === 0x52 && buffer[1] === 0x49) mime = 'image/webp';
  else if (buffer[0] === 0x25 && buffer[1] === 0x50) mime = 'application/pdf';

  const dataUri = `data:${mime};base64,${base64}`;

  // 3. Upload with Cloudinary's timestamp embedded in options (SDK uses it for signing)
  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'auto',
    timestamp,
    ...options
  });
  return result;
};

// ─── Helper: Delete an asset from Cloudinary by public_id ────────────────────
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Cloudinary deletion error:', error.message);
    throw new Error('File deletion failed');
  }
};

export default upload;
