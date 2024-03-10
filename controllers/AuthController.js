import { v4 } from 'uuid';
import sha1 from 'sha1';
import UsersController from './UsersController';
import redisClient from '../utils/redis';
/* auth module */
class AuthController {
  /*
   * getConnect
   *
   * @req: request object passed
   * @res: response object passed
   *
   */
  static async getConnect(req, res) {
    // decode base 64 to obtain email and password
    const { authorization } = req.headers;
    const pattern = '(?<=Basic ).+';
    const authData = authorization.match(pattern);
    const decodedString = Buffer.from(authData[0], 'base64').toString('utf-8');
    const authDataSplit = decodedString.split(':');
    const email = authDataSplit[0];
    const password = authDataSplit[1];

    // check if I can find the user and password
    // is valid
    const user = await UsersController.findUser({ email });
    const hashedPassword = sha1(password);
    if (!user || hashedPassword !== user.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = v4();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 86400);
    return res.json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    redisClient.del(`auth_${token}`);
    return res.status(204).send('');
  }
}
module.exports = AuthController;
