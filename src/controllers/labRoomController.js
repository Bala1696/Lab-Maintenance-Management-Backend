import { LabRoom, Department, User } from '../models/index.js';
import { streamToCloudinary, resolveLabFolder } from '../middleware/upload.js';

// ─── Helper: Upload lab image buffer → Cloudinary ────────────────────────────
// Returns the secure Cloudinary URL, or null if no file was provided.
async function uploadLabImage(req) {
  if (!req.file || !req.file.buffer) return null;

  const folder    = await resolveLabFolder(req);
  const baseName  = req.file.originalname
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/[^a-zA-Z0-9]/g, '_');    // sanitize

  console.log(`📁  Uploading to Cloudinary → ${folder}`);

  const result = await streamToCloudinary(req.file.buffer, {
    folder,
    public_id: `${Date.now()}-${baseName}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf']
  });

  console.log(`✅  Cloudinary upload success → ${result.secure_url}`);
  return result.secure_url;
}

// ─── Create Lab Room ──────────────────────────────────────────────────────────
// Admin → any dept;  HOD → only their own dept
export const createLabRoom = async (req, res) => {
  try {
    const { labName, labCode, roomNumber, floor, totalSystems, departmentId, status } = req.body;
    const caller = req.user;

    if (!labName || !labCode || !departmentId) {
      return res.status(400).json({ message: 'labName, labCode, and departmentId are required' });
    }

    // HOD scope check
    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only create lab rooms in their own department' });
      }
    }

    const existing = await LabRoom.findOne({ where: { labCode } });
    if (existing) {
      return res.status(400).json({ message: 'Lab code already exists' });
    }

    // Upload image to Cloudinary (null if no file was sent)
    const labImage = await uploadLabImage(req);

    const labRoom = await LabRoom.create({
      labName,
      labCode,
      roomNumber:   roomNumber   || null,
      floor:        floor        || null,
      totalSystems: totalSystems || 0,
      departmentId,
      status:       status !== undefined ? status : true,
      labImage
    });

    res.status(201).json({ message: 'Lab room created successfully', labRoom });
  } catch (error) {
    console.error('createLabRoom error:', error);
    res.status(500).json({ message: 'Error creating lab room', error: error.message });
  }
};

// ─── Get All Lab Rooms ────────────────────────────────────────────────────────
// Admin → all;  HOD → dept-scoped
export const getAllLabRooms = async (req, res) => {
  try {
    const caller = req.user;
    let where = {};

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      where = { departmentId: hodUser.departmentId };
    }

    const labRooms = await LabRoom.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: User,       as: 'technicians', attributes: ['id', 'name', 'email', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ labRooms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab rooms', error: error.message });
  }
};

// ─── Get Lab Room By ID ───────────────────────────────────────────────────────
export const getLabRoomById = async (req, res) => {
  try {
    const { id }   = req.params;
    const caller   = req.user;

    const labRoom = await LabRoom.findByPk(id, {
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: User,       as: 'technicians', attributes: ['id', 'name', 'email', 'status'] }
      ]
    });

    if (!labRoom) return res.status(404).json({ message: 'Lab room not found' });

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(labRoom.departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ labRoom });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab room', error: error.message });
  }
};

// ─── Update Lab Room ──────────────────────────────────────────────────────────
export const updateLabRoom = async (req, res) => {
  try {
    const { id }   = req.params;
    const { labName, labCode, roomNumber, floor, totalSystems, departmentId, status } = req.body;
    const caller   = req.user;

    const labRoom = await LabRoom.findByPk(id);
    if (!labRoom) return res.status(404).json({ message: 'Lab room not found' });

    // HOD scope checks
    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(labRoom.departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only update lab rooms in their own department' });
      }
      if (departmentId && String(departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'Cannot change department of lab room' });
      }
    }

    // Validate unique lab code if changing
    if (labCode && labCode !== labRoom.labCode) {
      const existing = await LabRoom.findOne({ where: { labCode } });
      if (existing) return res.status(400).json({ message: 'Lab code already exists' });
    }

    // Upload new image to Cloudinary if one was sent, otherwise keep existing
    const labImage = req.file ? await uploadLabImage(req) : labRoom.labImage;

    await labRoom.update({
      labName:      labName      || labRoom.labName,
      labCode:      labCode      || labRoom.labCode,
      roomNumber:   roomNumber   !== undefined ? roomNumber   : labRoom.roomNumber,
      floor:        floor        !== undefined ? floor        : labRoom.floor,
      totalSystems: totalSystems !== undefined ? totalSystems : labRoom.totalSystems,
      departmentId: caller.role === 'admin' && departmentId ? departmentId : labRoom.departmentId,
      status:       status       !== undefined ? status       : labRoom.status,
      labImage
    });

    res.json({ message: 'Lab room updated successfully', labRoom });
  } catch (error) {
    console.error('updateLabRoom error:', error);
    res.status(500).json({ message: 'Error updating lab room', error: error.message });
  }
};

// ─── Delete Lab Room ──────────────────────────────────────────────────────────
export const deleteLabRoom = async (req, res) => {
  try {
    const { id }  = req.params;
    const caller  = req.user;

    const labRoom = await LabRoom.findByPk(id);
    if (!labRoom) return res.status(404).json({ message: 'Lab room not found' });

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(labRoom.departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only delete lab rooms in their own department' });
      }
    }

    try {
      await labRoom.destroy();
      res.json({ message: 'Lab room deleted successfully' });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          message: 'Cannot delete lab room — it has equipment or technicians assigned. Deactivate it instead.'
        });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lab room', error: error.message });
  }
};
