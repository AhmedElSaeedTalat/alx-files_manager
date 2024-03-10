import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
/* module to handle users model */

class UsersController {
  static async postNew(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const data = { email };
    const doc = await UsersController.findUser(data);
    if (doc) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = sha1(password);
    const user = { email, password: hashedPassword };
    const id = await UsersController.insert(user);
    return res.status(201).json({ id, email });
  }

  /*
   * findUser
   *
   * @data: data used to find user whether it's email
   * or password
   *
   * @return - document found in the collection
   *
   */
  static async findUser(data) {
    const collection = dbClient.db.collection('users');
    const doc = await collection.findOne(data);
    return doc;
  }

  /*
   * insert
   *
   * @user: passed user to add in db
   *
   * @return - id of inserted user
   *
   */
  static async insert(user) {
    const inserted = await dbClient.db.collection('users').insertOne(user);
    const id = inserted.insertedId;
    return id;
  }

  /*
   * getMe
   *
   * @req: passed request
   * @res: passed response
   *
   */
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    const user = await UsersController.findUser({ _id: ObjectId(id) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ id: user._id, email: user.email });
  }
}
module.exports = UsersController;
