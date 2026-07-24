import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import sequelize from './models/index.js';
import routes from './routes/index.js';

dotenv.config();

// Bypass self-signed certificate errors in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const app = express();
const PORT = process.env.PORT || 5000;

import path from 'path';

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
const corsOptions = {
  origin : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
  credentials: true, 
};
app.use(cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', routes);

// Health Check
app.get('/', (req, res) => {
    res.send('LabMaintain System API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle Multer file size limit errors
  if (err.code === 'LIMIT_FILE_SIZE' || err.message === 'File too large') {
    return res.status(400).json({ 
      message: 'The uploaded file is too large. Please select an image smaller than 5MB.' 
    });
  }

  res.status(500).json({ message: 'Internal server error', error: err.message });
});

import { User, Department, LabRoom } from './models/index.js';
import { hashPassword } from './middleware/auth.js';

// Auto-seed default database records if empty
const seedDefaultData = async () => {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Seeding default data...');

      const deptCse = await Department.create({
        departmentName: 'Computer Science & Engineering',
        departmentCode: 'CSE',
        status: true
      });
      // const deptIt = await Department.create({
      //   departmentName: 'Information Technology',
      //   departmentCode: 'IT',
      //   status: true
      // });

      // const labGenAi = await LabRoom.create({
      //   labName: 'GEN-AI LAB',
      //   labCode: 'GEN-AI',
      //   departmentId: deptCse.id,
      //   status: true
      // });
      // await LabRoom.create({
      //   labName: 'NETWORKING LAB',
      //   labCode: 'NET-LAB',
      //   departmentId: deptIt.id,
      //   status: true
      // });

      const adminHashed = await hashPassword('admin123');
      await User.create({
        name: 'System Administrator',
        email: 'admin@lab.com',
        password: adminHashed,
        role: 'admin',
        departmentId: deptCse.id,
        status: true
      });

      // const hodHashed = await hashPassword('hod123');
      // await User.create({
      //   name: 'HOD Computer Science',
      //   email: 'hod@lab.com',
      //   password: hodHashed,
      //   role: 'hod',
      //   departmentId: deptCse.id,
      //   status: true
      // });

      // const techHashed = await hashPassword('tech123');
      // await User.create({
      //   name: 'Lab Technician',
      //   email: 'tech@lab.com',
      //   password: techHashed,
      //   role: 'technician',
      //   departmentId: deptCse.id,
      //   assignedLabId: labGenAi.id,
      //   status: true
      // });

      console.log('✅ Database seeded successfully!');
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
  }
};

// Database sync and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');

    await seedDefaultData();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
