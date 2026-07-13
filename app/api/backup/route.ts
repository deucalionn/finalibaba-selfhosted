import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { createGzip, gunzipSync } from "node:zlib";

// Split so pg_dump/psql never receive the password on argv (visible via `ps`);
// it's passed through the PGPASSWORD env var instead.
function parseDatabaseUrl(databaseUrl: string) {
  const u = new URL(databaseUrl);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || "5432",
    database: u.pathname.slice(1),
  };
}

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

export async function GET() {
  const { user, password, host, port, database } = parseDatabaseUrl(process.env.DATABASE_URL!);

  const dump = spawn(
    "pg_dump",
    ["-h", host, "-p", port, "-U", user, "-d", database, "--clean", "--if-exists", "--no-owner"],
    { env: { ...process.env, PGPASSWORD: password } }
  );

  let stderr = "";
  dump.stderr.on("data", (chunk) => (stderr += chunk));

  const gzip = createGzip();
  dump.stdout.pipe(gzip);

  // dump.on("close") can fire and error() the controller while gzip "data"
  // events already queued in the event loop are still pending — each one then
  // throws calling enqueue() on an already-settled controller. That throw
  // happens inside an event-emitter callback, so it becomes an uncaught
  // exception that crashes the whole process. Guard every controller call.
  let settled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      gzip.on("data", (chunk) => {
        if (settled) return;
        controller.enqueue(chunk);
      });
      gzip.on("end", () => {
        if (settled) return;
        settled = true;
        controller.close();
      });
      dump.on("error", (err) => {
        if (settled) return;
        settled = true;
        console.error("pg_dump failed to start:", err);
        controller.error(err);
      });
      dump.on("close", (code) => {
        if (code !== 0 && !settled) {
          settled = true;
          console.error(`pg_dump exited with code ${code}: ${stderr}`);
          controller.error(new Error(`pg_dump exited with code ${code}`));
        }
      });
    },
    cancel() {
      dump.kill();
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="finalibaba-backup-${timestamp}.sql.gz"`,
    },
  });
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("Failed to parse restore upload:", err);
    return NextResponse.json({ error: "No backup file provided." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No backup file provided." }, { status: 400 });
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  // Accept both gzip-compressed (backup.sh, the download button) and plain .sql uploads.
  if (buffer.subarray(0, 2).equals(GZIP_MAGIC)) {
    try {
      buffer = gunzipSync(buffer);
    } catch (err) {
      console.error("Failed to decompress uploaded backup:", err);
      return NextResponse.json({ error: "The uploaded file is not a valid gzip backup." }, { status: 400 });
    }
  }

  const { user, password, host, port, database } = parseDatabaseUrl(process.env.DATABASE_URL!);

  try {
    await new Promise<void>((resolve, reject) => {
      const psql = spawn(
        "psql",
        ["-h", host, "-p", port, "-U", user, "-d", database, "-v", "ON_ERROR_STOP=1", "--single-transaction"],
        { env: { ...process.env, PGPASSWORD: password } }
      );

      let stderr = "";
      psql.stderr.on("data", (chunk) => (stderr += chunk));
      psql.on("error", reject);
      psql.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `psql exited with code ${code}`));
      });

      psql.stdin.write(buffer);
      psql.stdin.end();
    });
  } catch (err) {
    // Full detail stays server-side only — never echo raw exception output to the client.
    console.error("Restore failed:", err);
    return NextResponse.json({ error: "Restore failed. Check server logs for details." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
