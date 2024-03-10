import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import UsersController from './UsersController';
/* module for file controller */

class FilesController {
  /*
   * @method: postUpload
   *
   * @function:
   *
   * @req: request object passed
   * @res: response object passed
   *
   *
   */
  static async postUpload(req, res) {
    // retrieve user through the token passed
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(id) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // access posted data
    const acceptedTypes = ['folder', 'file', 'image'];
    const { name, type, data } = req.body;
    let { parentId } = req.body;
    if (!parentId) {
      parentId = 0;
    }
    let { isPublic } = req.body;
    if (!isPublic) {
      isPublic = false;
    }
    console.log(parentId);
    console.log(isPublic);
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).send('Missing data');
    }
    if (parentId !== 0) {
      const parentFile = await FilesController.findFileById(parentId);
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.static(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const documentData = {
        userId: user._id.toString(),
        name,
        type,
        isPublic,
        parentId,
      };
      const docId = await FilesController.insertDoctument(documentData);
      const foundFile = await FilesController.findFileById(docId);
      return res.status(201).json({
        id: foundFile._id.toString(),
        userId: foundFile.userId.toString(),
        name: foundFile.name,
        type: foundFile.type,
        isPublic: foundFile.isPublic,
        parentId: foundFile.parentId,
      });
    }
    const dirPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = v4();
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    await FilesController.createFile(dirPath, fileName, decodedData);
    const documentData = {
      userId: user._id.toString(),
      name,
      type,
      isPublic,
      parentId,
      localPath: path.join(dirPath, fileName),
    };
    const docId = await FilesController.insertDoctument(documentData);
    const foundFile = await FilesController.findFileById(docId);
    return res.status(201).json({
      id: foundFile._id.toString(),
      userId: foundFile.userId.toString(),
      name: foundFile.name,
      type: foundFile.type,
      isPublic: foundFile.isPublic,
      parentId: foundFile.parentId,
    });
  }

  /*
   * findFileById
   *
   * @function: the find the file by its id
   *
   * @id: passed id to find the file with
   *
   * @return - the file found
   *
   */
  static async findFileById(id) {
    const collection = dbClient.db.collection('files');
    const file = await collection.findOne({ _id: ObjectId(id) });
    return file;
  }

  /*
   * insertDoctument
   *
   * @function: insert file documents to user
   * collection
   *
   * @data: data passed to be inserted in the
   * collection
   *
   * @return - id of the inserted document
   *
   */
  static async insertDoctument(data) {
    const collection = dbClient.db.collection('files');
    const doc = await collection.insertOne(data);
    return doc.insertedId;
  }

  /*
   * createFile
   *
   * @function: it create new files based
   * on the path provided
   *
   * @path: path of the file to be created
   *
   */
  static async createFile(dirPath, fileName, data) {
    try {
      await fs.promises.access(dirPath, fs.constants.F_OK);
    } catch (err) {
      await FilesController.createFolder(dirPath);
    }
    const filePath = path.join(dirPath, fileName);
    await fs.promises.writeFile(filePath, data);
  }

  /*
   * createFolder
   *
   * @function: it create new folders based
   * on the path provided
   *
   * @path: path of the folder to be created
   *
   */
  static async createFolder(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}
module.exports = FilesController;
