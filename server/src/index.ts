import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = createApp();
const PORT = Number(process.env.PORT) || 8787;

const server = http.createServer(app);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[API] Порт ${PORT} занят. Остановите другой процесс (например старый npm run dev) или задайте другой PORT в корневом .env.`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
