import sha1 from 'sha1';
import dbClient from '../utils/db';
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
      res.status(400).json({ error: 'Already exist' });
    } else {
      const hashedPassword = sha1(password);
      const user = { email, password: hashedPassword };
      const id = await UsersController.insert(user);
      res.status(201).json({ id, email });
    }
  }

  static async findUser(data) {
    const collection = dbClient.db.collection('users');
    const doc = await collection.findOne(data);
    return doc;
  }

  static async insert(user) {
    const inserted = await dbClient.db.collection('users').insertOne(user);
    const id = inserted.insertedId;
    return id;
  }
}
module.exports = UsersController;
