import Queue from 'bull';
import imageThumb from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';
/* worker module */

const fileQueue = new Queue('fileQueue', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

/*
 * @generateThumbnail: creates thumbnails and store
 * them in files same location as images passed
 *
 * @path: path for the image to create thumbnail of
 *
 */
const generateThumbnail = async (path) => {
  const options = [100, 250, 500];
  options.forEach(async (width) => {
    try {
      const thumbnail = await imageThumb(path, { width });
      const thumbPathName = `${path}_${width}`;
      await fs.promises.writeFile(thumbPathName, thumbnail);
    } catch (err) {
      console.log(err);
    }
  });
};

/*
 * @process: function to process jobs
 * in the queue fileQueue it calls generate
 * thumbnails using data in the jobs
 *
 * @job: jobs of this queue
 *
 */
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  const collection = dbClient.db.collection('files');
  const file = await collection.findOne({ _id: ObjectId(fileId), userId });
  if (!file) {
    throw new Error('File not found');
  }
  await generateThumbnail(file.localPath);
});
