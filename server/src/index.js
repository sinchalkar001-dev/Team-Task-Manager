require('dotenv').config();

const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function main() {
  await connectDB(process.env.MONGO_URI);

  const app = createApp();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
