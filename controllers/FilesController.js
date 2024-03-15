import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import Queue from 'bull';
import { promisify } from 'util';
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
    // decode data and create file in the folder path with the
    // decoded data
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
    // insert data about the file in a document in files collection
    const docId = await FilesController.insertDoctument(documentData);
    const foundFile = await FilesController.findFileById(docId);
    // if type image file is created
    // a queue to be created
    if (type === 'image') {
      const fileQueue = new Queue('fileQueue', {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      });
      fileQueue.add({ userId: foundFile.userId, fileId: foundFile._id.toString() });
    }
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

  /*
   * getShow
   *
   * @function: retrieves document based on
   * file id passed in the url and the linked
   * file to the requesting user
   *
   * @req: request object passed
   * @res: response object passed
   *
   * @return - file document found
   *
   */
  static async getShow(req, res) {
    // retrieve user through the token passed
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await FilesController.findFileById(id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }
    const data = {
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    };
    return res.json(data);
  }

  /*
   * getIndex
   *
   * @function: retrieve documents based on
   * passed params
   *
   * @req: request object passed
   * @res: response object passed
   *
   */
  static async getIndex(req, res) {
    // get user by token
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // access query parameter
    const { parentId } = req.query;
    let { page } = req.query;
    if (!page) {
      page = 1;
    }
    // data for paginating using aggrage
    // converting aggregate to a promise
    const pageSize = 20;
    const collection = dbClient.db.collection('files');
    const doAggregate = promisify(collection.aggregate).bind(collection);
    // checking if parent Id exists and return files
    // relevant to the parentId if exist
    if (parentId) {
      const parentFile = await FilesController.findFileById(parentId);
      if (!parentFile) {
        return res.json([]);
      }
      const result = await doAggregate([
        { $match: { parentId } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
      ]);
      const array = await result.toArray();
      const dataResponse = [];
      array.forEach((item) => {
        const data = {
          id: item._id.toString(),
          userId: item.userId.toString(),
          name: item.name,
          type: item.type,
          isPublic: item.isPublic,
          parentId: item.parentId,
        };
        dataResponse.push(data);
      });
      return res.json(dataResponse);
    }
    // if no parent Id is passed a query
    // parameter return all documents
    // while using pagination through
    // aggregate
    const result = await doAggregate([
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]);
    const array = await result.toArray();
    const dataResponse = [];
    array.forEach((item) => {
      const data = {
        id: item._id.toString(),
        userId: item.userId.toString(),
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      dataResponse.push(data);
    });
    return res.json(dataResponse);
  }

  /*
   * @putPublish
   *
   * @function: set isPublic to true
   *
   * @req: request Object passed as argument
   * @res: response object passed as argument
   *
   */
  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await FilesController.findFileById(id);
    if (file && user._id.toString() === file.userId.toString()) {
      const collection = dbClient.db.collection('files');
      await collection.updateOne({ _id: file._id }, { $set: { isPublic: true } });
      const updatedFile = await FilesController.findFileById(id);
      const data = {
        id: updatedFile._id.toString(),
        userId: updatedFile.userId.toString(),
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId,
      };
      res.json(data);
    }
    return res.status(404).json({ error: 'Not found' });
  }

  /*
   * @putUnpublish
   *
   * @function: sets isPublic to false
   *
   * @req: the request object passed as argument
   * @res: the response object passed as argument
   *
   * @return - send response of the updated file
   *
   */
  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await FilesController.findFileById(id);
    if (file && user._id.toString() === file.userId.toString()) {
      const collection = dbClient.db.collection('files');
      await collection.updateOne({ _id: file._id }, { $set: { isPublic: false } });
      const updatedFile = await FilesController.findFileById(id);
      const data = {
        id: updatedFile._id.toString(),
        userId: updatedFile.userId.toString(),
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId,
      };
      res.json(data);
    }
    return res.status(404).json({ error: 'Not found' });
  }

  /*
   * @getFile
   *
   * @function:
   *
   * @req: request object
   * @res: response object
   *
   */
  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;
    const acceptableSizes = [100, 250, 500];
    const file = await FilesController.findFileById(id);
    if (!file) {
      console.log('no file');
      return res.status(404).json({ error: 'Not found' });
    }
    const token = req.headers['x-token'];
    if (file.isPublic === false && !token) {
      console.log('no token');
      return res.status(404).json({ error: 'Not found' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(userId) });
    if (file.isPublic === false && user._id.toString() !== file.userId.toString()) {
      console.log('id == id');
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }
    try {
      await fs.promises.access(file.localPath, fs.constants.F_OK);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
    const type = mime.lookup(file.name) || 'text/plain';
    res.set('Content-Type', type);
    let content;
    if (size && acceptableSizes.includes(size)) {
      content = await fs.promises.readFile(`${file.localPath}_${size}`, 'utf-8');
    } else {
      content = await fs.promises.readFile(file.localPath, 'utf-8');
    }
    return res.send(content);
  }
}
module.exports = FilesController;
