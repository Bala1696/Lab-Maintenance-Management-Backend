import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import sequelize from './models/index.js';
import routes from './routes/index.js';
import path from 'path';
import { User, Department, LabRoom } from './models/index.js';
import { hashPassword } from './middleware/auth.js';

dotenv.config();

// Bypass self-signed certificate errors in development

const app = express();
const PORT = process.env.PORT || 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(morgan("dev"));

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ===========================
   Static Upload Folder
=========================== */

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

/* ===========================
   Home Route
=========================== */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Lab Maintenance Management API Running",
    version: "1.0.0",
  });
});

/* ===========================
   Health Check
=========================== */

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    database: "Connected",
  });
});

/* ===========================
   API Routes
=========================== */

app.use("/api", routes);

/* ===========================
   404 Handler
=========================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

/* ===========================
   Error Handler
=========================== */

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Maximum upload size is 5MB",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

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
    console.log("Database Connected Successfully");

    await sequelize.sync({
      alter: true,
    });

    console.log("Database Synced Successfully");

    await seedDefaultData();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server Running on Port ${PORT}`);
    });
  } catch (error) {
    console.error("Server Startup Error");
    console.error(error);

    process.exit(1);
  }
};

startServer();

export default app;