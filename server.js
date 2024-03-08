import express from 'express';
import routes from './routes/index';
/* create server here */

const app = express();

routes(app);

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
module.exports = app;
