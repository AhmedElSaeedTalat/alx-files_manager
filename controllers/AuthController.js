import { v4 } from 'uuid';
import sha1 from 'sha1';
import UsersController from './UsersController';
import redisClient from '../utils/redis';
/* auth module */
class AuthController {
  /*
   * @getConnect
   *
   * @str: string to check and decode
   *
   * @return - decoded string or null
   *
   */
  static isValid64(str) {
    let decodedString;
    try {
      decodedString = Buffer.from(str, 'base64').toString('utf-8');
      return decodedString;
    } catch (err) {
      return null;
    }
  }

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
    const decodedString = AuthController.isValid64(authData[0]);
    if (!decodedString) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const authDataSplit = decodedString.split(':');
    const email = authDataSplit[0];
    const password = authDataSplit[1];
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // check if I can find the user and password
    // is valid
    const user = await UsersController.findUser({ email });
    console.log('i reached this line');
    const hashedPassword = sha1(password);
    if (!user || hashedPassword !== user.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = v4().toString();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 86400);
    return res.json({ token });
  }

  /*
   * getDisconnect
   *
   * delete users token
   *
   * @req: request passed
   * @res: response object passed
   *
   * @return - empty response with status { 204 }
   *
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
module.exports = AuthController;
