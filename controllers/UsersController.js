import sha1 from 'sha1';
import dbClient from '../utils/db';
/* module to handle users model */

class UsersController {
  static async postNew(req, res) {
    const { email } = req.body;
    if (!email) {
      res.status(400).send('Missing email');
    }
    const { password } = req.body;
    if (!password) {
      res.status(400).send('Missing password');
    }
    const data = { email };
    const doc = await UsersController.findUser(data);
    if (doc) {
      res.status(400).send('Already exist');
    } else {
      const hashedPassword = sha1(password);
      const user = { email, password: hashedPassword };
      const id = await UsersController.insert(user);
      res.status(201).json({ email, id });
    }
  }

  static async findUser(data) {
    const collection = dbClient.db.collection('users');
    const doc = await collection.findOne(data);
    return doc;
  }

  static async insert(user) {
    const inserted = await dbClient.db.collection('users').insertOne(user);
    const id = inserted.inserted_id;
    return id;
  }
}
module.exports = UsersController;
