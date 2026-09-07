import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Course } from '../models/Course.js';

async function clearDemoCourses() {
  await connectDb();
  const result = await Course.deleteMany({});
  console.log(`Deleted courses: ${result.deletedCount}`);
  await mongoose.disconnect();
}

clearDemoCourses().catch((error) => {
  console.error(error);
  process.exit(1);
});
