"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Database, Trash2 } from "lucide-react";
import { SQLEditor } from "@/components/sql-editor";

interface QueryResult {
  columns: string[];
  values: any[][];
}

export default function SQLiteCodePad() {
  const [db, setDb] = useState<any>(null);
  const [query, setQuery] = useState(
    "SELECT * FROM EMPLOYEE where Salary > 30000;"
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sqliteReady, setSqliteReady] = useState(false);
  const sqliteRef = useRef<any>(null);

  useEffect(() => {
    // Load sqlite3 wasm
    const loadSQLite = async () => {
      try {
        const sqlite3InitModule = (await import("@sqlite.org/sqlite-wasm"))
          .default;
        const sqlite3 = await sqlite3InitModule();
        sqliteRef.current = sqlite3;
        setSqliteReady(true);
      } catch (err) {
        console.error("[v0] Failed to load sqlite3:", err);
        setError("Failed to load SQLite. Please refresh the page.");
      }
    };
    loadSQLite();
  }, []);

  useEffect(() => {
    const loadDatabaseFromFileSystem = async () => {
      if (!sqliteReady || !sqliteRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch the database file from the public folder
        const response = await fetch("/company.db");

        if (!response.ok) {
          throw new Error(
            "Database file not found. Please ensure database.db exists in the public folder."
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create database from file
        const sqlite3 = sqliteRef.current;
        const p = sqlite3.wasm.allocFromTypedArray(uint8Array);
        const newDb = new sqlite3.oo1.DB();
        const rc = sqlite3.capi.sqlite3_deserialize(
          newDb.pointer,
          "main",
          p,
          uint8Array.length,
          uint8Array.length,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
            sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
        );

        if (rc !== 0) {
          throw new Error("Failed to load database file");
        }

        setDb(newDb);
        setFileName("company.db");
        setError(null);
      } catch (err) {
        console.error("[v0] Error loading database:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load database file from file system"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabaseFromFileSystem();
  }, [sqliteReady]);

  const executeQuery = () => {
    if (!db) {
      setError("Database not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const trimmedQuery = query.trim().toUpperCase();

      // Check if it's a SELECT query
      if (
        trimmedQuery.startsWith("SELECT") ||
        trimmedQuery.startsWith("WITH")
      ) {
        // Use selectObjects for SELECT queries
        const rows = db.selectObjects(query);

        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const values = rows.map((row: any) => Object.values(row));
          setResult({ columns, values });
        } else {
          setResult({
            columns: ["Result"],
            values: [["Query returned no rows"]],
          });
        }
      } else {
        // For non-SELECT queries (INSERT, UPDATE, DELETE, CREATE, etc.)
        db.exec(query);
        const changes = db.changes();
        setResult({
          columns: ["Result"],
          values: [
            [`Query executed successfully. ${changes} row(s) affected.`],
          ],
        });
      }
    } catch (err) {
      console.error("[v0] Query error:", err);
      setError(err instanceof Error ? err.message : "Failed to execute query");
    } finally {
      setIsLoading(false);
    }
  };

  const createNewDatabase = () => {
    if (!sqliteRef.current) return;

    // Close existing database if any
    if (db) {
      db.close();
    }

    const sqlite3 = sqliteRef.current;
    const newDb = new sqlite3.oo1.DB();
    setDb(newDb);
    setFileName("New Database (in-memory)");
    setError(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Database className="h-10 w-10" />
            CS5040A/CS3040A HW5 database
          </h1>
          <p className="text-muted-foreground text-lg">
            Write SQL queries against the database instance shown in Figure 5.6
            of the textbook
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3"></div>
            {fileName && (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Loaded:</strong> {fileName}
                </AlertDescription>
              </Alert>
            )}
            {!sqliteReady && (
              <Alert>
                <AlertDescription>
                  Loading SQLite WebAssembly...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query Editor</CardTitle>
            <CardDescription>
              Enter your SQL query below and click Execute
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SQLEditor value={query} onChange={setQuery} disabled={!db} />
            <Button
              onClick={executeQuery}
              disabled={!db || isLoading || !query.trim()}
              className="w-full sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              Execute Query
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {result.values.length} row(s) returned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {result.columns.map((col, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left font-semibold text-sm"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.values.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-sm font-mono">
                            {cell === null ? (
                              <span className="text-muted-foreground italic">
                                NULL
                              </span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
