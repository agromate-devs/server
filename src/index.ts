import { startServer } from './app/startServer';

startServer().catch((err) => {
    console.error(err);
    process.exit(1);
});
